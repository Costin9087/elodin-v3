// const { extractTextFromImage } = require('../../dist/services/azureContentUnderstanding');

module.exports = async function (context, req) {
    try {
        context.log('Extract-text function processed a request.');
        context.log('Starting text extraction process...');
        
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
            
            context.log('Returning mock response:', JSON.stringify(mockResponse, null, 2));
            
            context.res = {
                status: 200,
                body: mockResponse,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }
        
        // Check environment variables
        const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
        const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
        
        context.log('Environment check:', {
            hasEndpoint: !!endpoint,
            hasApiKey: !!apiKey,
            endpointPreview: endpoint ? endpoint.substring(0, 30) + '...' : 'not set',
            nodeVersion: process.version,
            platform: process.platform,
            timestamp: new Date().toISOString(),
            functionApp: process.env.WEBSITE_SITE_NAME || 'local',
            azureEnvironment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'unknown'
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

        // Handle multipart form data in Azure Static Web Apps
        context.log('Request body type:', typeof req.body);
        context.log('Request body keys:', req.body ? Object.keys(req.body) : 'no body');
        context.log('Request headers:', req.headers);
        
        // Azure Static Web Apps parses multipart data differently
        // Try different ways to access the image data
        let imageData = null;
        let buffer = null;
        
        if (req.body) {
            // Try direct access
            if (req.body.image) {
                imageData = req.body.image;
                context.log('Found image in req.body.image');
            }
            // Try as base64 string
            else if (typeof req.body === 'string') {
                imageData = req.body;
                context.log('Found image as string in req.body');
            }
            // Try as buffer
            else if (Buffer.isBuffer(req.body)) {
                buffer = req.body;
                context.log('Found image as buffer in req.body');
            }
        }
        
        // Also check req.rawBody which Azure Functions sometimes uses
        if (!imageData && !buffer && req.rawBody) {
            context.log('Trying req.rawBody');
            if (Buffer.isBuffer(req.rawBody)) {
                buffer = req.rawBody;
                context.log('Found image in req.rawBody as buffer');
            } else if (typeof req.rawBody === 'string') {
                imageData = req.rawBody;
                context.log('Found image in req.rawBody as string');
            }
        }
        
        if (!imageData && !buffer) {
            context.log('No image data found in request');
            context.res = {
                status: 400,
                body: { 
                    error: 'No image file provided',
                    message: 'Please upload an image file',
                    debug: {
                        bodyType: typeof req.body,
                        bodyKeys: req.body ? Object.keys(req.body) : null,
                        hasRawBody: !!req.rawBody,
                        rawBodyType: typeof req.rawBody
                    }
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }
        
        // Convert to buffer if we have string data
        if (!buffer) {
            if (typeof imageData === 'string') {
                // Try base64 decode first
                try {
                    buffer = Buffer.from(imageData, 'base64');
                    context.log('Converted base64 string to buffer');
                } catch (e) {
                    // If base64 fails, try as regular string
                    buffer = Buffer.from(imageData);
                    context.log('Converted string to buffer');
                }
            } else {
                buffer = Buffer.from(imageData);
                context.log('Converted data to buffer');
            }
        }

        context.log(`Image buffer created, size: ${buffer.length} bytes`);

        // First, let's test with mock data but include real buffer size for debugging
        if (process.env.USE_MOCK_DATA === 'true' || buffer.length < 100) {
            context.log('Using mock data (USE_MOCK_DATA=true or small buffer for testing)');
            const extractionResult = {
            id: 'mock-extraction-id',
            status: 'Succeeded',
            result: {
                analyzerId: 'mock-test',
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
                                    text: { type: 'string', valueString: 'Mock text from Azure Static Web Apps function!' },
                                    count: { type: 'number', valueNumber: 45 },
                                    description: { type: 'string', valueString: 'Mock test data from deployed function' }
                                }
                            }]
                        },
                        mockup_summary: {
                            type: 'string',
                            valueString: 'Mock extraction result from Azure Static Web Apps'
                        },
                        experience_archetype: {
                            type: 'string',
                            valueString: 'test_deployment'
                        }
                    }
                }]
            }
        };
        } else {
            // Use real Azure Content Understanding API
            context.log('Using real Azure Content Understanding API...');
            
            // For now, we'll need to implement a simplified version since we can't easily import the compiled module
            // Let's add axios directly here for the API call
            const axios = require('axios');
            
            const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
            const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
            
            try {
                // Simple direct API call to Form Recognizer
                const apiVersion = '2023-07-31';
                const analyzeUrl = `${endpoint.replace(/\/$/, '')}/formrecognizer/documentModels/prebuilt-layout:analyze?api-version=${apiVersion}`;
                
                context.log('Calling Azure API:', analyzeUrl);
                
                const response = await axios.post(analyzeUrl, buffer, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Ocp-Apim-Subscription-Key': apiKey,
                    },
                    timeout: 30000,
                    validateStatus: function (status) {
                        return status < 500;
                    }
                });
                
                if (response.status !== 202) {
                    throw new Error(`Azure API returned ${response.status}: ${response.statusText}`);
                }
                
                const operationLocation = response.headers['operation-location'];
                if (!operationLocation) {
                    throw new Error('No operation location received from Azure API');
                }
                
                // Poll for results (simplified)
                let result;
                let attempts = 0;
                const maxAttempts = 15; // 30 seconds max
                
                while (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const pollResponse = await axios.get(operationLocation, {
                        headers: {
                            'Ocp-Apim-Subscription-Key': apiKey,
                        },
                        timeout: 10000
                    });
                    
                    result = pollResponse.data;
                    
                    if (result.status === 'succeeded') {
                        context.log('Azure Content Understanding completed successfully');
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
                
                const extractionResult = {
                    id: result.operationId || 'azure-api-result',
                    status: 'Succeeded',
                    result: {
                        analyzerId: 'azure-form-recognizer',
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
                                    valueString: 'Text extracted using Azure Form Recognizer API'
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
                context.log('Azure API error:', apiError);
                // Return mock data as fallback
                context.log('Falling back to mock data due to API error');
                const extractionResult = {
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
        
        context.log('Text extraction completed, result:', JSON.stringify(extractionResult, null, 2));
        
        // Ensure we have valid data to return
        if (!extractionResult) {
            throw new Error('Azure Content Understanding returned empty result');
        }
        
        const responseBody = {
            success: true,
            data: extractionResult
        };
        
        context.log('Returning response:', JSON.stringify(responseBody, null, 2));
        
        context.res = {
            status: 200,
            body: responseBody,
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        context.log('Text extraction error:', error);
        context.log('Error type:', typeof error);
        context.log('Error details:', error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : error);
        
        let statusCode = 500;
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        let details = {};
        
        if (error instanceof Error) {
            if (error.message.includes('not configured')) {
                statusCode = 503;
            } else if (error.message.includes('JSON parse error') || error.message.includes('Unexpected EOF')) {
                statusCode = 502;
                errorMessage = 'Azure service returned invalid response (empty or malformed JSON)';
                details.originalError = error.message;
            }
        }

        // Add axios error details if available
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error;
            details.httpStatus = axiosError.response?.status;
            details.httpStatusText = axiosError.response?.statusText;
            details.responseData = axiosError.response?.data;
        }
        
        const errorResponse = {
            error: 'Azure Content Understanding Failed',
            message: errorMessage,
            service: 'Azure Content Understanding',
            details: details
        };
        
        context.log('Returning error response:', JSON.stringify(errorResponse, null, 2));
        
        context.res = {
            status: statusCode,
            body: errorResponse,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
