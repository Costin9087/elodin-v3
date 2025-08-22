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
        
        // Get the image from the request with detailed debugging
        let imageBuffer;
        
        context.log('Request debugging info:', {
            method: req.method,
            hasBody: !!req.body,
            hasRawBody: !!req.rawBody,
            bodyType: typeof req.body,
            bodyKeys: req.body ? Object.keys(req.body) : null,
            contentType: req.headers['content-type'],
            contentLength: req.headers['content-length']
        });
        
        // Try to get image from req.body (multipart form data)
        if (req.body && req.body.image) {
            context.log('Found image in req.body.image, type:', typeof req.body.image);
            if (Buffer.isBuffer(req.body.image)) {
                imageBuffer = req.body.image;
                context.log('Using image buffer directly from req.body.image');
            } else if (typeof req.body.image === 'string') {
                context.log('Converting string image data to buffer');
                // Try base64 decode
                try {
                    imageBuffer = Buffer.from(req.body.image, 'base64');
                    context.log('Successfully decoded base64 image');
                } catch (e) {
                    imageBuffer = Buffer.from(req.body.image);
                    context.log('Using string as raw buffer');
                }
            } else if (req.body.image.data) {
                // Sometimes the image comes as an object with data property
                context.log('Found image.data object');
                imageBuffer = Buffer.from(req.body.image.data);
            }
        } else if (req.rawBody) {
            context.log('Found image in req.rawBody, type:', typeof req.rawBody);
            imageBuffer = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
        } else if (req.body && typeof req.body === 'string') {
            context.log('Request body is a string, trying to parse as image data');
            try {
                imageBuffer = Buffer.from(req.body, 'base64');
                context.log('Successfully parsed body as base64 image');
            } catch (e) {
                imageBuffer = Buffer.from(req.body);
                context.log('Using body string as raw buffer');
            }
        } else {
            context.res = {
                status: 400,
                body: {
                    error: 'No image data provided',
                    message: 'Please upload an image file for text extraction',
                    details: {
                        method: req.method,
                        hasBody: !!req.body,
                        hasRawBody: !!req.rawBody,
                        bodyType: typeof req.body,
                        contentType: req.headers['content-type']
                    }
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }
        
        if (!imageBuffer || imageBuffer.length === 0) {
            context.res = {
                status: 400,
                body: {
                    error: 'Invalid image data',
                    message: 'Image buffer is empty or invalid',
                    details: {
                        bufferLength: imageBuffer ? imageBuffer.length : 0,
                        bufferType: typeof imageBuffer
                    }
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }
        
        context.log(`Image buffer created successfully, size: ${imageBuffer.length} bytes`);
        
        // Validate image buffer (basic checks)
        if (imageBuffer.length < 100) {
            context.log('Warning: Image buffer seems very small, might not be a valid image');
        }
        
        // Check for common image signatures
        const isValidImage = checkImageSignature(imageBuffer);
        context.log('Image signature validation:', isValidImage);
        
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
        
        // Try multiple API versions and endpoints until one works
        const apiVersions = ['2023-07-31', '2022-08-31', '2024-02-29-preview', '2023-10-31-preview'];
        const endpointPaths = [
            'formrecognizer/documentModels/prebuilt-layout:analyze',
            'documentintelligence/documentModels/prebuilt-layout:analyze',
            'formrecognizer/v2.1/layout/analyze'
        ];
        
        let lastError;
        for (const apiVersion of apiVersions) {
            for (const path of endpointPaths) {
                try {
                    let analyzeUrl;
                    if (path.includes('v2.1')) {
                        // v2.1 doesn't use query parameters the same way
                        analyzeUrl = `${endpoint.replace(/\/$/, '')}/${path}`;
                    } else {
                        analyzeUrl = `${endpoint.replace(/\/$/, '')}/${path}?api-version=${apiVersion}`;
                    }
                    
                    context.log(`Trying ${apiVersion} with ${path}...`);
                    context.log('URL:', analyzeUrl);
        
                    // Start the analysis using built-in https module
                    context.log(`Sending ${imageBuffer.length} bytes to Azure...`);
                    const initialResponse = await makeHttpsRequest(analyzeUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Ocp-Apim-Subscription-Key': apiKey,
                            'Content-Length': imageBuffer.length.toString()
                        },
                        body: imageBuffer
                    });

                    context.log('Azure response:', {
                        status: initialResponse.statusCode,
                        statusMessage: initialResponse.statusMessage,
                        headers: Object.keys(initialResponse.headers || {}),
                        bodyPreview: initialResponse.body ? initialResponse.body.substring(0, 200) : 'empty'
                    });

                    if (initialResponse.statusCode === 202) {
                        // Success! Continue with this endpoint
                        context.log(`Success with ${apiVersion} and ${path}`);
                        return await pollForResults(initialResponse.headers['operation-location'], apiKey, context, apiVersion);
                    } else if (initialResponse.statusCode === 200) {
                        // Synchronous response (v2.1)
                        context.log('Got synchronous response');
                        const result = JSON.parse(initialResponse.body);
                        return convertAzureResultToExpectedFormat(result, apiVersion);
                    } else {
                        // Log detailed error information for debugging
                        context.log('Azure API error details:', {
                            status: initialResponse.statusCode,
                            statusMessage: initialResponse.statusMessage,
                            body: initialResponse.body,
                            headers: initialResponse.headers
                        });
                        throw new Error(`Status ${initialResponse.statusCode}: ${initialResponse.statusMessage}. Response: ${initialResponse.body}`);
                    }
                } catch (apiError) {
                    lastError = apiError;
                    context.log(`Failed with ${apiVersion}/${path}: ${apiError.message}`);
                    continue; // Try next combination
                }
            }
        }
        
        // All attempts failed
        throw new Error(`All API versions failed. Last error: ${lastError.message}`);

    } catch (apiError) {
        context.log('Azure API error:', apiError.message);
        throw new Error(`Azure Content Understanding API failed: ${apiError.message}`);
    }
}

async function pollForResults(operationLocation, apiKey, context, apiVersion) {
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

    return convertAzureResultToExpectedFormat(result, apiVersion);
}

function convertAzureResultToExpectedFormat(result, apiVersion) {
    // Convert to expected format
    const textElements = [];
    
    // Handle different response formats
    if (result.analyzeResult?.paragraphs) {
        // v3.x format
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
    } else if (result.analyzeResult?.readResults) {
        // v2.x format
        for (const page of result.analyzeResult.readResults) {
            if (page.lines) {
                for (const line of page.lines) {
                    textElements.push({
                        type: 'object',
                        valueObject: {
                            role: { type: 'string', valueString: 'body' },
                            text: { type: 'string', valueString: line.text },
                            count: { type: 'number', valueNumber: line.text.length },
                            description: { type: 'string', valueString: 'Extracted text content' }
                        }
                    });
                }
            }
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
                        valueString: 'Text extracted using Azure API'
                    },
                    experience_archetype: {
                        type: 'string',
                        valueString: 'document_content'
                    }
                }
            }]
        }
    };

}

function checkImageSignature(buffer) {
    if (!buffer || buffer.length < 4) {
        return { valid: false, reason: 'Buffer too small' };
    }
    
    // Check for common image signatures
    const signatures = {
        'JPEG': [0xFF, 0xD8, 0xFF],
        'PNG': [0x89, 0x50, 0x4E, 0x47],
        'GIF': [0x47, 0x49, 0x46],
        'BMP': [0x42, 0x4D],
        'WEBP': [0x52, 0x49, 0x46, 0x46], // First 4 bytes, WEBP has WEBP at offset 8
        'PDF': [0x25, 0x50, 0x44, 0x46]
    };
    
    for (const [format, signature] of Object.entries(signatures)) {
        if (signature.every((byte, index) => buffer[index] === byte)) {
            return { valid: true, format: format };
        }
    }
    
    // Check WEBP more thoroughly (RIFF....WEBP)
    if (buffer.length >= 12 && 
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return { valid: true, format: 'WEBP' };
    }
    
    return { valid: false, reason: 'Unknown format', firstBytes: Array.from(buffer.slice(0, 8)) };
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