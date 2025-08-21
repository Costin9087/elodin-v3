import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { reviewCopyWithPromptFlow } from '../services/azurePromptFlow';

export async function reviewCopy(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request.');

    try {
        const requestBody = await request.json() as any;
        context.log('Request body keys:', Object.keys(requestBody));
        
        const { contentUnderstandingData, extractionData } = requestBody;
        const dataToProcess = contentUnderstandingData || extractionData;
        
        if (!dataToProcess) {
            return {
                status: 400,
                jsonBody: {
                    error: 'No extraction data provided',
                    message: 'Please provide contentUnderstandingData or extractionData for review'
                }
            };
        }

        context.log('Processing copy review...');
        
        // Extract the actual Azure Content Understanding data
        // The frontend sends the full API response, we need just the data portion
        let azureData = dataToProcess;
        if (dataToProcess.success && dataToProcess.data) {
            azureData = dataToProcess.data;
        }
        
        context.log('Azure Content Understanding data to process:', JSON.stringify(azureData, null, 2));

        // Review copy using Azure Prompt Flow
        const reviewResults = await reviewCopyWithPromptFlow(azureData);
        
        context.log('Copy review completed');
        
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: reviewResults
            }
        };

    } catch (error) {
        context.log('Copy review error:', error);
        
        // Provide more helpful error messages based on error type
        let statusCode = 500;
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (error instanceof Error && error.message.includes('not configured')) {
            statusCode = 503; // Service Unavailable
        } else if (error instanceof Error && error.message.includes('placeholder values')) {
            statusCode = 503; // Service Unavailable
        } else if (error instanceof Error && error.message.includes('deployment') && error.message.includes('not found')) {
            statusCode = 404; // Not Found
        }
        
        return {
            status: statusCode,
            jsonBody: {
                error: 'Azure Prompt Flow Failed',
                message: errorMessage,
                service: 'Azure Prompt Flow'
            }
        };
    }
}

app.http('review-copy', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: reviewCopy
});
