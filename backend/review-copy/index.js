"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCopy = reviewCopy;
const functions_1 = require("@azure/functions");
async function reviewCopy(request, context) {
    context.log('HTTP trigger function processed a request.');
    try {
        // Import the service function
        const { reviewCopyWithPromptFlow } = await Promise.resolve().then(() => __importStar(require('../services/azurePromptFlow')));
        const requestBody = await request.json();
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
    }
    catch (error) {
        context.log('Copy review error:', error);
        let statusCode = 500;
        let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        if (error instanceof Error && error.message.includes('not configured')) {
            statusCode = 503;
        }
        else if (error instanceof Error && error.message.includes('deployment') && error.message.includes('not found')) {
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
functions_1.app.http('review-copy', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: reviewCopy
});
//# sourceMappingURL=review-copy.js.map