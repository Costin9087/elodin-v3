const { reviewCopyWithPromptFlow } = require('../../dist/services/azurePromptFlow');

module.exports = async function (context, req) {
    try {
        context.log('Review-copy function processed a request.');
        context.log('Request body keys:', Object.keys(req.body || {}));
        
        const { contentUnderstandingData, extractionData } = req.body || {};
        const dataToProcess = contentUnderstandingData || extractionData;
        
        if (!dataToProcess) {
            context.res = {
                status: 400,
                body: {
                    error: 'No extraction data provided',
                    message: 'Please provide contentUnderstandingData or extractionData for review'
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
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
        
        context.res = {
            status: 200,
            body: responseBody,
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        context.log('Copy review error:', error);
        
        let statusCode = 500;
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (error instanceof Error) {
            if (error.message.includes('not configured')) {
                statusCode = 503;
            } else if (error.message.includes('placeholder values')) {
                statusCode = 503;
            } else if (error.message.includes('deployment') && error.message.includes('not found')) {
                statusCode = 404;
            }
        }
        
        const errorResponse = {
            error: 'Azure Prompt Flow Failed',
            message: errorMessage,
            service: 'Azure Prompt Flow'
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
