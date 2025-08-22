"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.health = health;
const functions_1 = require("@azure/functions");
async function health(request, context) {
    try {
        context.log('Health check requested');
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
            message: 'Azure Function is running successfully'
        };
        context.log('Health check response:', JSON.stringify(healthResponse, null, 2));
        return {
            status: 200,
            jsonBody: healthResponse,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    catch (error) {
        context.log('Health check error:', error);
        return {
            status: 500,
            jsonBody: {
                status: 'ERROR',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error),
                message: 'Azure Function health check failed'
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
}
functions_1.app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: health
});
//# sourceMappingURL=health.js.map