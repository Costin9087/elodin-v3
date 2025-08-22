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

        // Handle multipart form data (simplified for Azure Functions v3)
        if (!req.body || !req.body.image) {
            context.res = {
                status: 400,
                body: { 
                    error: 'No image file provided',
                    message: 'Please upload an image file'
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }

        context.log(`Processing image data, Size: ${req.body.image.length}`);

        // Convert base64 to buffer if needed
        let buffer;
        if (typeof req.body.image === 'string') {
            buffer = Buffer.from(req.body.image, 'base64');
        } else {
            buffer = Buffer.from(req.body.image);
        }

        context.log(`Image buffer created, size: ${buffer.length} bytes`);

        // For now, return mock data since we need to fix the module loading
        // const extractionResult = await extractTextFromImage(buffer);
        
        context.log('Returning mock extraction result for testing...');
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
