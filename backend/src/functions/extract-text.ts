import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { extractTextFromImage } from '../services/azureContentUnderstanding';

export async function extractText(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request.');

    try {
        // For Azure Functions, we need to handle multipart data differently
        const contentType = request.headers.get('content-type');
        
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return {
                status: 400,
                jsonBody: { 
                    error: 'No image file provided',
                    message: 'Please upload an image file using multipart/form-data'
                }
            };
        }

        // Get the image data from the request
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

        context.log(`Processing image: ${imageFile.name}, Size: ${imageFile.size}`);

        // Convert File to Buffer for Azure service
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract text using Azure Content Understanding
        const extractionResult = await extractTextFromImage(buffer);
        
        context.log('Text extraction completed');
        
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: extractionResult
            }
        };

    } catch (error) {
        context.log('Text extraction error:', error);
        
        // Provide more helpful error messages based on error type
        let statusCode = 500;
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (error instanceof Error && error.message.includes('not configured')) {
            statusCode = 503; // Service Unavailable
        } else if (error instanceof Error && error.message.includes('placeholder values')) {
            statusCode = 503; // Service Unavailable  
        }
        
        return {
            status: statusCode,
            jsonBody: {
                error: 'Azure Content Understanding Failed',
                message: errorMessage,
                service: 'Azure Content Understanding'
            }
        };
    }
}

app.http('extract-text', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: extractText
});
