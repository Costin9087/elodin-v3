module.exports = async function (context, req) {
    context.log('Extract-text function called via', req.method);
    
    try {
        // Check for mock mode (for testing deployment)
        const useMockData = process.env.USE_MOCK_DATA === 'true';
        if (useMockData) {
            context.log('Using mock data for testing...');
            const mockResponse = {
                success: true,
                data: {
                    id: 'mock-test-id',
                    status: 'Succeeded',
                    result: {
                        analyzerId: 'mock-analyzer',
                        apiVersion: 'test',
                        createdAt: new Date().toISOString(),
                        warnings: [],
                        contents: [{
                            fields: {
                                ui_text: {
                                    type: 'array',
                                    valueArray: [{
                                        type: 'object',
                                        valueObject: {
                                            role: { type: 'string', valueString: 'body' },
                                            text: { type: 'string', valueString: 'Mock text extraction result - deployment is working!' },
                                            count: { type: 'number', valueNumber: 50 },
                                            description: { type: 'string', valueString: 'Mock test data' }
                                        }
                                    }]
                                },
                                mockup_summary: {
                                    type: 'string',
                                    valueString: 'Mock data for testing Azure Function deployment'
                                },
                                experience_archetype: {
                                    type: 'string',
                                    valueString: 'test_deployment'
                                }
                            }
                        }]
                    }
                }
            };
            
            context.res = {
                status: 200,
                body: mockResponse,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }
        
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
            context.log('No image data found, using mock response');
            // Return a successful mock response
            const extractionResult = await callAzureContentUnderstandingAPI(null, endpoint, apiKey, context);
            
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
    // If no image buffer, return mock response
    if (!imageBuffer) {
        context.log('No image provided, returning mock response');
        return {
            id: 'mock-no-image-id',
            status: 'Succeeded',
            result: {
                analyzerId: 'mock-analyzer',
                apiVersion: '2024-07-31-preview',
                createdAt: new Date().toISOString(),
                warnings: ['No image provided - mock response'],
                contents: [{
                    fields: {
                        ui_text: {
                            type: 'array',
                            valueArray: [{
                                type: 'object',
                                valueObject: {
                                    role: { type: 'string', valueString: 'body' },
                                    text: { type: 'string', valueString: 'Azure Function is ready to process images!' },
                                    count: { type: 'number', valueNumber: 42 },
                                    description: { type: 'string', valueString: 'Mock response - function is working' }
                                }
                            }]
                        },
                        mockup_summary: {
                            type: 'string',
                            valueString: 'Ready to process real images with Azure Content Understanding'
                        },
                        experience_archetype: {
                            type: 'string',
                            valueString: 'function_ready'
                        }
                    }
                }]
            }
        };
    }
    
    try {
        context.log('Calling Azure Content Understanding API...');
        
        // Use the older, more reliable Form Recognizer API
        const axios = require('axios');
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

        // Start the analysis
        const response = await axios.post(analyzeUrl, imageBuffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Ocp-Apim-Subscription-Key': apiKey,
            },
            timeout: 30000,
            validateStatus: function (status) {
                return status < 500;
            }
        });

        context.log('Azure response status:', response.status);

        if (response.status !== 202) {
            throw new Error(`Azure API returned ${response.status}: ${response.statusText}`);
        }

        const operationLocation = response.headers['operation-location'];
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
            
            const pollResponse = await axios.get(operationLocation, {
                headers: {
                    'Ocp-Apim-Subscription-Key': apiKey,
                },
                timeout: 10000
            });

            result = pollResponse.data;
            
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
            throw new Error('Analysis timed out');
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
        
        // Return a fallback mock response if API fails
        return {
            id: 'fallback-mock-id',
            status: 'Succeeded',
            result: {
                analyzerId: 'fallback-mock',
                apiVersion: 'fallback',
                createdAt: new Date().toISOString(),
                warnings: [`API Error: ${apiError.message}`],
                contents: [{
                    fields: {
                        ui_text: {
                            type: 'array',
                            valueArray: [{
                                type: 'object',
                                valueObject: {
                                    role: { type: 'string', valueString: 'body' },
                                    text: { type: 'string', valueString: `Mock fallback result (API failed: ${apiError.message})` },
                                    count: { type: 'number', valueNumber: 50 },
                                    description: { type: 'string', valueString: 'Fallback mock data due to API error' }
                                }
                            }]
                        },
                        mockup_summary: {
                            type: 'string',
                            valueString: 'Fallback mock data due to Azure API error'
                        },
                        experience_archetype: {
                            type: 'string',
                            valueString: 'api_error_fallback'
                        }
                    }
                }]
            }
        };
    }
}