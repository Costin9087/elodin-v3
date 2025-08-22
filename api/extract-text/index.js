module.exports = async function (context, req) {
    context.log('Extract-text function called');
    
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
        
        // For testing without file upload, create a simple mock response
        context.log('Processing image upload request');
        
        const extractionResult = {
            id: 'azure-function-test',
            status: 'Succeeded', 
            result: {
                analyzerId: 'mock-azure-function',
                apiVersion: '2024-07-31-preview',
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
                                    text: { type: 'string', valueString: 'Successfully processed image upload request' },
                                    count: { type: 'number', valueNumber: 42 },
                                    description: { type: 'string', valueString: 'Azure Function is working - processing successful' }
                                }
                            }]
                        },
                        mockup_summary: {
                            type: 'string',
                            valueString: 'Azure Function successfully processes files and returns structured data'
                        },
                        experience_archetype: {
                            type: 'string',
                            valueString: 'function_test_success'
                        }
                    }
                }]
            }
        };
        
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