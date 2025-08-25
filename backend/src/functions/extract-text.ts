import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

interface FileSignatureResult {
    isValid: boolean;
    detectedType?: string;
    reason?: string;
}

function validateFileSignature(buffer: Buffer, fileName: string, mimeType: string): FileSignatureResult {
    if (buffer.length < 4) {
        return { isValid: false, reason: 'File is too small to validate' };
    }
    
    const firstBytes = buffer.subarray(0, 16);
    
    // Common file signatures
    const signatures = {
        'image/jpeg': [
            [0xFF, 0xD8, 0xFF], // JPEG
        ],
        'image/png': [
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] // PNG
        ],
        'image/bmp': [
            [0x42, 0x4D] // BMP
        ],
        'image/tiff': [
            [0x49, 0x49, 0x2A, 0x00], // TIFF little endian
            [0x4D, 0x4D, 0x00, 0x2A]  // TIFF big endian
        ],
        'application/pdf': [
            [0x25, 0x50, 0x44, 0x46] // PDF
        ]
    };
    
    // Check if the file signature matches expected type
    const expectedSignatures = signatures[mimeType as keyof typeof signatures];
    if (expectedSignatures) {
        for (const signature of expectedSignatures) {
            const matches = signature.every((byte, index) => 
                index < firstBytes.length && firstBytes[index] === byte
            );
            if (matches) {
                return { isValid: true, detectedType: mimeType };
            }
        }
    }
    
    // Try to detect what file type it actually is
    for (const [type, typeSignatures] of Object.entries(signatures)) {
        for (const signature of typeSignatures) {
            const matches = signature.every((byte, index) => 
                index < firstBytes.length && firstBytes[index] === byte
            );
            if (matches) {
                return { 
                    isValid: false, 
                    detectedType: type,
                    reason: `File appears to be ${type} but was uploaded as ${mimeType}. Please ensure the file extension matches the actual file type.`
                };
            }
        }
    }
    
    return { 
        isValid: false, 
        reason: 'File signature does not match any supported format. The file may be corrupted or in an unsupported format.'
    };
}

export async function extractText(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('HTTP trigger function processed a request.');
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
            
            return {
                status: 200,
                jsonBody: mockResponse,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }
        
        // Check environment variables first
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
            return {
                status: 503,
                jsonBody: {
                    error: 'Azure Content Understanding not configured',
                    message: 'Azure service credentials not found in environment variables',
                    details: {
                        hasEndpoint: !!endpoint,
                        hasApiKey: !!apiKey
                    }
                }
            };
        }

        // Import the service function
        const { extractTextFromImage } = await import('../services/azureContentUnderstanding');
        
        // Handle the multipart form data
        const formData = await request.formData();
        const imageFile = formData.get('image') as File;
        
        if (!imageFile) {
            return {
                status: 400,
                jsonBody: { 
                    error: 'No image file provided',
                    message: 'Please upload an image file'
                }
            };
        }

        // Validate file type and size
        const supportedTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/bmp',
            'image/tiff',
            'image/tif',
            'application/pdf'
        ];
        
        const isSupported = supportedTypes.includes(imageFile.type.toLowerCase()) ||
            supportedTypes.some(type => imageFile.name.toLowerCase().endsWith(type.split('/')[1]));
        
        if (!isSupported) {
            return {
                status: 400,
                jsonBody: {
                    error: 'Unsupported file format',
                    message: 'Please upload a file in one of these formats: JPEG, PNG, BMP, PDF, or TIFF',
                    details: {
                        uploadedType: imageFile.type,
                        fileName: imageFile.name,
                        supportedFormats: ['JPEG', 'PNG', 'BMP', 'PDF', 'TIFF']
                    }
                }
            };
        }
        
        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (imageFile.size > maxSize) {
            return {
                status: 400,
                jsonBody: {
                    error: 'File too large',
                    message: 'File size must be less than 10MB',
                    details: {
                        fileSize: imageFile.size,
                        maxSize: maxSize,
                        fileSizeMB: Math.round(imageFile.size / (1024 * 1024) * 100) / 100
                    }
                }
            };
        }
        
        // Check if file is not empty
        if (imageFile.size === 0) {
            return {
                status: 400,
                jsonBody: {
                    error: 'Empty file',
                    message: 'The uploaded file appears to be empty. Please select a valid file.'
                }
            };
        }

        context.log(`Processing image: ${imageFile.name}, Size: ${imageFile.size}, Type: ${imageFile.type}`);

        // Convert File to Buffer for Azure service
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        context.log(`Image buffer created, size: ${buffer.length} bytes`);
        
        // Basic validation of file content
        if (buffer.length === 0) {
            return {
                status: 400,
                jsonBody: {
                    error: 'Empty file buffer',
                    message: 'The file could not be read properly. Please try uploading again.'
                }
            };
        }
        
        // Log first few bytes to help debug file format issues
        const firstBytes = buffer.subarray(0, Math.min(16, buffer.length));
        context.log(`File header bytes: ${Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        
        // Basic file signature validation
        const fileSignature = validateFileSignature(buffer, imageFile.name, imageFile.type);
        if (!fileSignature.isValid) {
            context.log(`File signature validation failed: ${fileSignature.reason}`);
            return {
                status: 400,
                jsonBody: {
                    error: 'Invalid file format',
                    message: fileSignature.reason || 'The file format could not be verified. Please ensure you are uploading a valid image file.',
                    details: {
                        fileName: imageFile.name,
                        detectedType: fileSignature.detectedType,
                        expectedType: imageFile.type
                    }
                }
            };
        }

        // Extract text using Azure Content Understanding
        const extractionResult = await extractTextFromImage(buffer);
        
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
        
        const response = {
            status: 200,
            jsonBody: responseBody,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        context.log('Final Azure Function response:', JSON.stringify(response, null, 2));
        return response;

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
        let details: any = {};
        
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
            const axiosError = error as any;
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
        
        return {
            status: statusCode,
            jsonBody: errorResponse,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
}

app.http('extract-text', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: extractText
});
