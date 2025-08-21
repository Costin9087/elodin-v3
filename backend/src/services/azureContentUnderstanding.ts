import axios from 'axios';

interface ExtractedText {
  type: string;
  content: string;
  confidence: number;
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<any> {
  // Check if Azure credentials are configured
  const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
  const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;

  if (!endpoint || !apiKey) {
    throw new Error('Azure Content Understanding not configured. Please set AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY in your .env file.');
  }

  if (endpoint.includes('your-resource') || apiKey === 'your-api-key') {
    throw new Error('Azure Content Understanding credentials are placeholder values. Please update AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY with your actual Azure resource details.');
  }

  try {
    console.log('Using Azure Content Understanding API...');
    
    // Use the custom Content Understanding analyzer
    const analyzerId = 'extract-copy'; // Your custom analyzer
    const apiVersion = '2025-05-01-preview';
    
    const analyzeUrl = `${endpoint.replace(/\/$/, '')}/contentunderstanding/analyzers/${analyzerId}:analyze?api-version=${apiVersion}&stringEncoding=utf16`;
    
    console.log('Sending request to:', analyzeUrl);

    // Start the analysis
    console.log(`Sending ${imageBuffer.length} bytes to Azure Content Understanding...`);
    
    const response = await axios.post(analyzeUrl, imageBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': apiKey,
        'x-ms-useragent': 'copy-review-app'
      },
      timeout: 30000,
      validateStatus: function (status) {
        return status < 500; // Allow 4xx responses to be handled
      }
    });

    console.log('Azure response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.keys(response.headers),
      dataType: typeof response.data,
      dataPreview: response.data ? JSON.stringify(response.data).substring(0, 200) : 'empty'
    });

    if (response.status !== 202) {
      throw new Error(`Azure Content Understanding API returned ${response.status}: ${response.statusText}. Response: ${JSON.stringify(response.data)}`);
    }

    const operationLocation = response.headers['operation-location'];
    if (!operationLocation) {
      throw new Error('No operation location received from Azure API');
    }

    console.log('Analysis started, polling for results at:', operationLocation);

    // Poll for results
    let result;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 2 = 60 seconds max wait time
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const pollResponse = await axios.get(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        validateStatus: function (status) {
          return status < 500; // Allow 4xx responses to be handled
        }
      });

      console.log(`Poll response ${attempts + 1}:`, {
        status: pollResponse.status,
        statusText: pollResponse.statusText,
        dataType: typeof pollResponse.data,
        dataPreview: pollResponse.data ? JSON.stringify(pollResponse.data).substring(0, 200) : 'empty'
      });

      if (pollResponse.status !== 200) {
        throw new Error(`Polling failed with status ${pollResponse.status}: ${pollResponse.statusText}. Response: ${JSON.stringify(pollResponse.data)}`);
      }

      result = pollResponse.data;
      
      if (result.status === 'Succeeded') {
        console.log('Analysis completed successfully');
        break;
      } else if (result.status === 'Failed') {
        throw new Error(`Analysis failed: ${result.error?.message || JSON.stringify(result.error) || 'Unknown error'}`);
      }
      
      attempts++;
      console.log(`Polling attempt ${attempts}, status: ${result.status}`);
    }

    if (!result || result.status !== 'Succeeded') {
      throw new Error('Analysis timed out or failed');
    }

    console.log('Content Understanding analysis completed:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('Azure Content Understanding error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    // Re-throw the error instead of falling back to mock data
    throw error;
  }
}

function getMockContentUnderstandingResponse(): any {
  return {
    "id": "mock-id",
    "status": "Succeeded",
    "result": {
      "analyzerId": "extract-copy",
      "apiVersion": "2025-05-01-preview",
      "createdAt": new Date().toISOString(),
      "warnings": [],
      "contents": [
        {
          "fields": {
            "ui_text": {
              "type": "array",
              "valueArray": [
                {
                  "type": "object",
                  "valueObject": {
                    "role": {
                      "type": "string",
                      "valueString": "heading"
                    },
                    "text": {
                      "type": "string",
                      "valueString": "Welcome Back!"
                    },
                    "count": {
                      "type": "number",
                      "valueNumber": 13
                    },
                    "description": {
                      "type": "string",
                      "valueString": "Main heading for user login"
                    }
                  }
                },
                {
                  "type": "object",
                  "valueObject": {
                    "role": {
                      "type": "string",
                      "valueString": "body"
                    },
                    "text": {
                      "type": "string",
                      "valueString": "Sign in to your account to continue your research journey."
                    },
                    "count": {
                      "type": "number",
                      "valueNumber": 56
                    },
                    "description": {
                      "type": "string",
                      "valueString": "Subheading description for login"
                    }
                  }
                },
                {
                  "type": "object",
                  "valueObject": {
                    "role": {
                      "type": "string",
                      "valueString": "form_label"
                    },
                    "text": {
                      "type": "string",
                      "valueString": "Email Address"
                    },
                    "count": {
                      "type": "number",
                      "valueNumber": 13
                    },
                    "description": {
                      "type": "string",
                      "valueString": "Form label for email input"
                    }
                  }
                },
                {
                  "type": "object",
                  "valueObject": {
                    "role": {
                      "type": "string",
                      "valueString": "form_label"
                    },
                    "text": {
                      "type": "string",
                      "valueString": "Password"
                    },
                    "count": {
                      "type": "number",
                      "valueNumber": 8
                    },
                    "description": {
                      "type": "string",
                      "valueString": "Form label for password input"
                    }
                  }
                },
                {
                  "type": "object",
                  "valueObject": {
                    "role": {
                      "type": "string",
                      "valueString": "button_primary"
                    },
                    "text": {
                      "type": "string",
                      "valueString": "Sign In"
                    },
                    "count": {
                      "type": "number",
                      "valueNumber": 7
                    },
                    "description": {
                      "type": "string",
                      "valueString": "Primary action button for login"
                    }
                  }
                }
              ]
            },
            "mockup_summary": {
              "type": "string",
              "valueString": "Login screen with email and password fields, featuring a welcoming header and primary sign-in button"
            },
            "experience_archetype": {
              "type": "string",
              "valueString": "sign_in"
            }
          }
        }
      ]
    }
  };
}

function getMockExtractedText(): ExtractedText[] {
  return [
    {
      type: 'heading',
      content: 'Welcome Back!',
      confidence: 0.95
    },
    {
      type: 'body',
      content: 'Sign in to your account to continue your research journey.',
      confidence: 0.92
    },
    {
      type: 'label',
      content: 'Email Address',
      confidence: 0.88
    },
    {
      type: 'label',
      content: 'Password',
      confidence: 0.90
    },
    {
      type: 'body',
      content: 'Forgot your password?',
      confidence: 0.85
    }
  ];
}
