module.exports = async function (context, req) {
    context.log('Extract-text function called via', req.method);
    
    try {
        
        // Check environment variables first
        const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
        const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
        
        context.log('Environment check:', {
            hasEndpoint: !!endpoint,
            hasApiKey: !!apiKey,
            endpointPreview: endpoint ? endpoint.substring(0, 30) + '...' : 'not set',
            method: req.method
        });
        
        if (!endpoint || !apiKey) {
            context.res = {
                status: 503,
                body: {
                    error: 'Azure Content Understanding not configured',
                    message: 'Azure service credentials not found in environment variables',
                    details: {
                        hasEndpoint: !!endpoint,
                        hasApiKey: !!apiKey
                    }
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }
        
        // If GET request, return status
        if (req.method === 'GET') {
            const response = {
                message: "Extract-text function is working!",
                method: req.method,
                timestamp: new Date().toISOString(),
                status: "ready",
                note: "Function can process image uploads via POST with form data",
                azureConfigured: true
            };
            
            context.res = {
                status: 200,
                body: response,
                headers: {
                    "Content-Type": "application/json"
                }
            };
            return;
        }
        
        // Handle POST request with image upload
        context.log('Processing image upload request...');
        
        // Get the image from the request
        let imageBuffer;
        
        // Try to get image from req.body (multipart form data)
        if (req.body && req.body.image) {
            context.log('Found image in req.body.image');
            if (Buffer.isBuffer(req.body.image)) {
                imageBuffer = req.body.image;
            } else if (typeof req.body.image === 'string') {
                // Try base64 decode
                try {
                    imageBuffer = Buffer.from(req.body.image, 'base64');
                } catch (e) {
                    imageBuffer = Buffer.from(req.body.image);
                }
            }
        } else if (req.rawBody) {
            context.log('Found image in req.rawBody');
            imageBuffer = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
        } else {
            context.res = {
                status: 400,
                body: {
                    error: 'No image data provided',
                    message: 'Please upload an image file for text extraction',
                    details: {
                        method: req.method,
                        hasBody: !!req.body,
                        hasRawBody: !!req.rawBody
                    }
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }
        
        context.log(`Image buffer created, size: ${imageBuffer.length} bytes`);
        
        // Call Azure Content Understanding API
        const extractionResult = await callAzureContentUnderstandingAPI(imageBuffer, endpoint, apiKey, context);
        
        context.log('Text extraction completed');
        
        const responseBody = {
            success: true,
            data: extractionResult
        };
        
        context.res = {
            status: 200,
            body: responseBody,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        context.log('Extract-text response sent successfully');
        
    } catch (error) {
        context.log('Extract-text error:', error);
        
        const errorResponse = {
            error: 'Azure Content Understanding Failed',
            message: error.message || 'Unknown error occurred',
            service: 'Azure Content Understanding',
            details: {}
        };
        
        context.res = {
            status: 500,
            body: errorResponse,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

async function callAzureContentUnderstandingAPI(imageBuffer, endpoint, apiKey, context) {
    const https = require('https');
    const url = require('url');
    
    try {
        context.log('Calling Azure Content Understanding API...');
        
        const apiVersion = '2023-07-31';
        
        let analyzeUrl;
        if (endpoint.includes('cognitiveservices.azure.com')) {
            // Form Recognizer API format
            analyzeUrl = `${endpoint.replace(/\/$/, '')}/formrecognizer/documentModels/prebuilt-layout:analyze?api-version=${apiVersion}`;
        } else {
            // Document Intelligence API format  
            analyzeUrl = `${endpoint.replace(/\/$/, '')}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${apiVersion}`;
        }
        
        context.log('Sending request to:', analyzeUrl);

        // Start the analysis using built-in https module
        const initialResponse = await makeHttpsRequest(analyzeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Ocp-Apim-Subscription-Key': apiKey,
            },
            body: imageBuffer
        });

        context.log('Azure response status:', initialResponse.statusCode);

        if (initialResponse.statusCode !== 202) {
            throw new Error(`Azure API returned ${initialResponse.statusCode}: ${initialResponse.statusMessage}`);
        }

        const operationLocation = initialResponse.headers['operation-location'];
        if (!operationLocation) {
            throw new Error('No operation location received from Azure API');
        }

        context.log('Analysis started, polling for results...');

        // Poll for results
        let result;
        let attempts = 0;
        const maxAttempts = 20; // 40 seconds max wait time
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            
            const pollResponse = await makeHttpsRequest(operationLocation, {
                method: 'GET',
                headers: {
                    'Ocp-Apim-Subscription-Key': apiKey,
                }
            });

            if (pollResponse.statusCode !== 200) {
                throw new Error(`Polling failed with status ${pollResponse.statusCode}`);
            }

            result = JSON.parse(pollResponse.body);
            
            if (result.status === 'succeeded') {
                context.log('Analysis completed successfully');
                break;
            } else if (result.status === 'failed') {
                throw new Error(`Analysis failed: ${result.error?.message || 'Unknown error'}`);
            }
            
            attempts++;
            context.log(`Polling attempt ${attempts}, status: ${result.status}`);
        }

        if (!result || result.status !== 'succeeded') {
            throw new Error('Analysis timed out after 40 seconds');
        }

        // Convert to expected format
        const textElements = [];
        if (result.analyzeResult?.paragraphs) {
            for (const paragraph of result.analyzeResult.paragraphs) {
                textElements.push({
                    type: 'object',
                    valueObject: {
                        role: { type: 'string', valueString: 'body' },
                        text: { type: 'string', valueString: paragraph.content },
                        count: { type: 'number', valueNumber: paragraph.content.length },
                        description: { type: 'string', valueString: 'Extracted paragraph content' }
                    }
                });
            }
        }

        return {
            id: result.operationId || 'azure-api-result',
            status: 'Succeeded',
            result: {
                analyzerId: 'form-recognizer',
                apiVersion: apiVersion,
                createdAt: new Date().toISOString(),
                warnings: [],
                contents: [{
                    fields: {
                        ui_text: {
                            type: 'array',
                            valueArray: textElements
                        },
                        mockup_summary: {
                            type: 'string',
                            valueString: 'Text extracted using Form Recognizer API'
                        },
                        experience_archetype: {
                            type: 'string',
                            valueString: 'document_content'
                        }
                    }
                }]
            }
        };
        
    } catch (apiError) {
        context.log('Azure API error:', apiError.message);
        throw new Error(`Azure Content Understanding API failed: ${apiError.message}`);
    }
}

function makeHttpsRequest(urlString, options) {
    return new Promise((resolve, reject) => {
        const https = require('https');
        const url = require('url');
        
        const parsedUrl = new url.URL(urlString);
        
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 30000
        };

        const req = https.request(requestOptions, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    headers: res.headers,
                    body: body
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}