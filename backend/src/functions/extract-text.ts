import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function extractText(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('HTTP trigger function processed a request.');
        context.log('Starting text extraction process...');
        
        // Check environment variables first
        const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
        const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
        
        context.log('Environment check:', {
            hasEndpoint: !!endpoint,
            hasApiKey: !!apiKey,
            endpointPreview: endpoint ? endpoint.substring(0, 30) + '...' : 'not set'
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

        context.log(`Processing image: ${imageFile.name}, Size: ${imageFile.size}, Type: ${imageFile.type}`);

        // Convert File to Buffer for Azure service
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        context.log(`Image buffer created, size: ${buffer.length} bytes`);

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
