module.exports = async function (context, req) {
    context.log('Health check function called');
    
    const healthResponse = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            functionApp: process.env.WEBSITE_SITE_NAME || 'local',
            azureEnvironment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'unknown',
            hasContentUnderstandingEndpoint: !!process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
            hasContentUnderstandingKey: !!process.env.AZURE_FORM_RECOGNIZER_KEY,
            hasPromptFlowEndpoint: !!process.env.AZURE_PROMPT_FLOW_ENDPOINT,
            hasPromptFlowKey: !!process.env.AZURE_PROMPT_FLOW_KEY,
            useMockData: process.env.USE_MOCK_DATA === 'true'
        },
        message: 'Azure Function is running successfully in Azure Static Web Apps'
    };
    
    context.log('Health check response:', JSON.stringify(healthResponse, null, 2));
    
    context.res = {
        status: 200,
        body: healthResponse,
        headers: {
            'Content-Type': 'application/json'
        }
    };
};
