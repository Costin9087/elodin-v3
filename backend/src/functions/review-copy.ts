import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function reviewCopy(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request.');

    try {
        // Import the service function
        const { reviewCopyWithPromptFlow } = await import('../services/azurePromptFlow');
        
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
        let azureData = dataToProcess;
        if (dataToProcess.success && dataToProcess.data) {
            azureData = dataToProcess.data;
        }
        
        context.log('Azure Content Understanding data to process:', JSON.stringify(azureData, null, 2));

        // Review copy using Azure Prompt Flow
        const reviewResults = await reviewCopyWithPromptFlow(azureData);
        
        context.log('Copy review completed');
        
        const responseBody = {
            success: true,
            data: reviewResults
        };
        
        context.log('Returning review response:', JSON.stringify(responseBody, null, 2));
        
        return {
            status: 200,
            jsonBody: responseBody,
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        context.log('Copy review error:', error);
        
        let statusCode = 500;
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (error instanceof Error && error.message.includes('not configured')) {
            statusCode = 503;
        } else if (error instanceof Error && error.message.includes('deployment') && error.message.includes('not found')) {
            statusCode = 404;
        }
        
        const errorResponse = {
            error: 'Azure Prompt Flow Failed',
            message: errorMessage,
            service: 'Azure Prompt Flow'
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

app.http('review-copy', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: reviewCopy
});
