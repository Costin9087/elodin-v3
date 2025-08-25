const axios = require('axios');

module.exports = async function (context, req) {
    context.log('Review copy function called - v2');
    
    // Handle GET requests for testing
    if (req.method === 'GET') {
        context.res = {
            status: 200,
            body: {
                message: "Review-copy function is working!",
                method: req.method,
                timestamp: new Date().toISOString(),
                status: "ready",
                note: "Function can process copy review via POST with content understanding data"
            },
            headers: {
                "Content-Type": "application/json"
            }
        };
        return;
    }
    
    try {
        // Check environment variables first
        const endpoint = process.env.AZURE_PROMPT_FLOW_ENDPOINT;
        const apiKey = process.env.AZURE_PROMPT_FLOW_KEY;
        const deployment = process.env.AZURE_PROMPT_FLOW_DEPLOYMENT || 'default';
        
        context.log('Environment check:', {
            hasEndpoint: !!endpoint,
            hasApiKey: !!apiKey,
            deployment: deployment,
            endpointPreview: endpoint ? endpoint.substring(0, 40) + '...' : 'not set'
        });
        
        if (!endpoint || !apiKey) {
            context.res = {
                status: 503,
                body: {
                    error: 'Azure Prompt Flow not configured',
                    message: 'Azure Prompt Flow credentials not found in environment variables',
                    details: {
                        hasEndpoint: !!endpoint,
                        hasApiKey: !!apiKey,
                        deployment: deployment
                    }
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }

        // Get the content understanding data from request
        const contentUnderstandingData = req.body;
        
        if (!contentUnderstandingData) {
            context.res = {
                status: 400,
                body: {
                    error: 'No content understanding data provided',
                    message: 'Please provide content understanding data for review'
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return;
        }

        context.log('Processing content understanding data for review...');

        // Prepare the input data for Prompt Flow
        const inputData = {
            mockup_analysis: JSON.stringify(contentUnderstandingData),
            styleguide: getElsevierStyleGuide(),
            context: "no context available"
        };

        context.log('Calling Azure Prompt Flow...');
        context.log('Input data keys:', Object.keys(inputData));

        const response = await axios.post(
            endpoint,
            inputData,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'azureml-model-deployment': deployment
                },
                timeout: 30000 // 30 second timeout for Azure Static Web Apps
            }
        );

        context.log('Prompt Flow response received');
        context.log('Response status:', response.status);
        context.log('Response data type:', typeof response.data);
        
        // Handle the response from Prompt Flow
        const result = response.data;
        
        // Parse the Prompt Flow response to match our UI format
        let parsedData;
        
        if (typeof result === 'string') {
            try {
                parsedData = JSON.parse(result);
            } catch (e) {
                context.log('Failed to parse Prompt Flow response:', e);
                throw new Error('Failed to parse Prompt Flow response: ' + e.message);
            }
        } else if (result && result.result && typeof result.result === 'string') {
            try {
                // Remove markdown code block wrapper if present
                let cleanResult = result.result;
                if (cleanResult.startsWith('```json') && cleanResult.endsWith('```')) {
                    context.log('Removing markdown code block wrapper from Prompt Flow response');
                    cleanResult = cleanResult.slice(7, -3);
                }
                parsedData = JSON.parse(cleanResult);
            } catch (e) {
                context.log('Failed to parse nested Prompt Flow response:', e);
                throw new Error('Failed to parse nested Prompt Flow response: ' + e.message);
            }
        } else {
            parsedData = result;
        }

        // Convert to the expected format for the frontend
        let reviewResults;
        if (parsedData && parsedData.items && Array.isArray(parsedData.items)) {
            reviewResults = parsedData.items.map(item => ({
                role: item.role || 'body',
                original: item.original || '',
                suggestion: item.suggestion || item.original || '',
                rationale: item.rationale || 'No rationale provided',
                within_limit: item.within_limit !== false,
                max: item.max || 50
            }));
        } else {
            context.log('Unexpected Prompt Flow response format:', parsedData);
            throw new Error('Unexpected response format from Prompt Flow');
        }

        context.log('Copy review completed, returning', reviewResults.length, 'items');

        const responseBody = {
            success: true,
            data: reviewResults
        };

        context.res = {
            status: 200,
            body: responseBody,
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        context.log('Review copy error:', error);
        
        let statusCode = 500;
        let errorMessage = error.message || 'Unknown error occurred';
        let details = {};
        
        if (error.response) {
            // Axios error with response
            statusCode = error.response.status;
            details.httpStatus = error.response.status;
            details.httpStatusText = error.response.statusText;
            details.responseData = error.response.data;
            
            if (error.response.status === 404) {
                errorMessage = `Azure ML deployment '${process.env.AZURE_PROMPT_FLOW_DEPLOYMENT || 'default'}' not found. Please verify your deployment configuration.`;
            } else if (error.response.status === 401 || error.response.status === 403) {
                errorMessage = 'Azure ML authentication failed. Please verify your API key.';
            }
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout - Azure Prompt Flow took too long to respond';
            statusCode = 504;
        }
        
        const errorResponse = {
            error: 'Azure Prompt Flow Failed',
            message: errorMessage,
            service: 'Azure Prompt Flow',
            details: details
        };
        
        context.res = {
            status: statusCode,
            body: errorResponse,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

function getElsevierStyleGuide() {
    return `# Elsevier Style Guide

## Writing Guidelines

### Capitalization
- Use sentence case for headings and labels
- Capitalize proper nouns (product names, company names)
- Use title case sparingly, mainly for main page titles

### Language and Tone
- Use American English spelling (e.g., "organization" not "organisation")
- Write in active voice when possible
- Use clear, concise language
- Avoid jargon and technical terms unless necessary

### Formatting
- Use hyphens for compound adjectives (e.g., "14-day trial")
- Use commas to separate items in lists
- Add colons after introductory labels for clarity

### Content Guidelines
- Keep sentences under 20 words when possible
- Use parallel structure in lists
- Remove unnecessary words and punctuation
- Ensure text is accessible and inclusive

### Digital Content
- Optimize for screen reading
- Use descriptive link text
- Ensure color contrast meets accessibility standards
- Write meaningful alt text for images

### Common Corrections
- "Organisation" → "Organization"
- "Sign-in" instead of "Signin" 
- Sentence case for most headings
- Remove excessive punctuation
- Use "and" instead of "&" in body text
- Copyright symbol "©" instead of "@"`;
}
