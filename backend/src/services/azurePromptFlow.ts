import axios from 'axios';

interface ExtractedText {
  type: string;
  content: string;
  confidence: number;
}

interface ReviewResult {
  original: string;
  rewritten: string;
  changes: string[];
  rationale: string;
  type: string;
}

export async function reviewCopyWithPromptFlow(contentUnderstandingData: any): Promise<ReviewResult[]> {
  // Check if Azure Prompt Flow is configured
  const endpoint = process.env.AZURE_PROMPT_FLOW_ENDPOINT;
  const apiKey = process.env.AZURE_PROMPT_FLOW_KEY;
  const deployment = process.env.AZURE_PROMPT_FLOW_DEPLOYMENT || 'default';

  if (!endpoint || !apiKey) {
    throw new Error('Azure Prompt Flow not configured. Please set AZURE_PROMPT_FLOW_ENDPOINT, AZURE_PROMPT_FLOW_KEY, and AZURE_PROMPT_FLOW_DEPLOYMENT in your .env file.');
  }

  if (endpoint.includes('your-prompt-flow-endpoint') || apiKey.includes('your-prompt-flow-key')) {
    throw new Error('Azure Prompt Flow credentials are placeholder values. Please update with your actual Azure ML endpoint details.');
  }

  console.log('Prompt Flow config:', {
    endpoint: endpoint,
    deployment: deployment,
    hasApiKey: !!apiKey
  });

  try {
    console.log('Using Azure Prompt Flow API...');
    
    // Prepare the input data for Prompt Flow exactly as you specified
    const inputData = {
      mockup_analysis: JSON.stringify(contentUnderstandingData),
      styleguide: getElsevierStyleGuide(),
      context: "no context available"
    };

    console.log('Sending to Prompt Flow:', JSON.stringify(inputData, null, 2));

    const response = await axios.post(
      endpoint,
      inputData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'azureml-model-deployment': deployment
        },
        timeout: 60000 // 60 second timeout for Prompt Flow
      }
    );

    console.log('Prompt Flow response received');
    
    // Handle the response from Prompt Flow
    const result = response.data;
    
    console.log('Raw Prompt Flow response:', JSON.stringify(result, null, 2));
    
    // Parse the Prompt Flow response to match our UI format
    let parsedData;
    
    if (typeof result === 'string') {
      try {
        parsedData = JSON.parse(result);
      } catch (e) {
        console.error('Failed to parse Prompt Flow response:', e);
        throw new Error('Failed to parse Prompt Flow response: ' + e);
      }
    } else if (result && result.result && typeof result.result === 'string') {
      // Handle case where result is wrapped in a result field as string
      let jsonString = result.result;
      
      // Remove markdown code block wrapper if present (```json ... ```)
      if (jsonString.trim().startsWith('```json')) {
        console.log('Removing markdown code block wrapper from Prompt Flow response');
        // Extract JSON from ```json ... ``` wrapper
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      }
      
      try {
        parsedData = JSON.parse(jsonString);
      } catch (e) {
        console.error('Failed to parse nested Prompt Flow response:', e);
        console.error('Raw response was:', result.result);
        throw new Error('Failed to parse nested Prompt Flow response: ' + e);
      }
    } else if (result && result.items) {
      parsedData = result;
    } else {
      throw new Error('Unexpected Prompt Flow response format: ' + JSON.stringify(result));
    }
    
    return convertPromptFlowResponse(parsedData);

  } catch (error) {
    console.error('Azure Prompt Flow error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      console.error('Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      
      // Provide more specific error messages based on status code
      if (error.response?.status === 404) {
        throw new Error(`Azure ML deployment '${deployment}' not found on endpoint '${endpoint}'. Please verify:
1. Your AZURE_PROMPT_FLOW_DEPLOYMENT is correct (currently: '${deployment}')
2. Your AZURE_PROMPT_FLOW_ENDPOINT is correct
3. The deployment exists and is running in Azure ML Studio
Azure error: ${error.response?.data || error.message}`);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(`Azure ML authentication failed. Please verify:
1. Your AZURE_PROMPT_FLOW_KEY is correct and not expired
2. The key has permissions to access the endpoint
Azure error: ${error.response?.data || error.message}`);
      } else {
        throw new Error(`Azure ML request failed with status ${error.response?.status}. 
Endpoint: ${endpoint}
Deployment: ${deployment}
Azure error: ${error.response?.data || error.message}`);
      }
    }
    // Re-throw the error instead of falling back to mock data
    throw error;
  }
}

function getElsevierStyleGuide(): string {
  return `**Elsevier Style and Terminology Guidance**

## A–Z Word List of Conventions

abbreviations and acronyms: When using abbreviations or acronyms, it is best to spell out the term in its first usage, followed by its abbreviation/acronym in parentheses. After the first full instance, the abbreviation/acronym will suffice.

afterward: Preferred over afterwards

AI: Preferred use versus artificial intelligence. AI is the overarching system; it includes machine learning, deep learning and neural networks.

among: Preferred to denote choice or comparison among three or more elements (generally use between if only two elements). Do not use amongst.

between: Generally used to denote choice or comparison between two elements.

## Grammar, Punctuation & Writing Conventions

Active and passive voice: Use the active voice whenever possible. When writing, we have the option to construct sentences using the active or the passive voice.

Capitalization (title case vs sentence case): With sentence case, only the first word is capitalized. Use sentence case for everything else except published work, organization names, people's names, and product names.

Commas: Elsevier style does not use serial commas (also called the Oxford comma) — commas after every element in a list including the item before the and. The exception to this rule is when it's unclear if the last two nouns in the sentence are part of a group.

Numbers: Numbers lower than 10 are spelled out in running copy except in headlines, social media or fields when number count is a concern. Numbers 10 and above should not be spelled out.

Percentages: Use the % sign when you are pairing with a number, with no space.

## Writing for a Digital Product

General best practices for product writing:
- Consistency is key
- Short, clear, concise
- Benefits over features
- Focus on how the product improves the user's life
- User-centric language

Writing UI copy:
- Use short labels
- Use active verbs
- Use words that explain what happens next
- Use sentence case and no ending punctuation
- Use positive phrasing

Error messages:
- Don't blame the user
- Use clear and simple language
- Be precise and describe exact problems
- Provide actions or solutions

## Writing for Inclusion, Accessibility, Readability

Inclusive language:
- Ask about preferences
- Describe people in a neutral, relevant and precise way
- Choose your words carefully
- Check your biases and assumptions
- Avoid cliches and idioms

Readability:
- Use simple sentences (average 15 words long, maximum 25 words)
- Choose short words
- Avoid jargon
- Structure content with clear hierarchy
- Important information first
- Use clear and meaningful headings

## Tone and Voice
- Professional but approachable
- Authoritative without being condescending
- Helpful and supportive
- Clear and direct
- Avoid exclamation marks in professional content`;
}

function convertPromptFlowResponse(promptFlowResult: any): ReviewResult[] {
  const results: ReviewResult[] = [];
  
  if (promptFlowResult.items && Array.isArray(promptFlowResult.items)) {
    for (const item of promptFlowResult.items) {
      results.push({
        original: item.original || '',
        rewritten: item.suggestion || item.original || '',
        changes: item.original !== item.suggestion ? [`Original: "${item.original}" → Suggested: "${item.suggestion}"`] : [],
        rationale: item.rationale || 'No changes needed',
        type: item.role || 'body'
      });
    }
  }
  
  return results;
}

function getMockReviewResults(contentUnderstandingData: any): ReviewResult[] {
  // Mock review logic based on your actual Prompt Flow response format
  const mockResponse = {
    "items": [
      {
        "role": "heading",
        "original": "Welcome Back!",
        "suggestion": "Welcome back",
        "rationale": "Removed exclamation mark for a more professional tone and used sentence case as per Elsevier style guide.",
        "within_limit": true,
        "max": 13
      },
      {
        "role": "body",
        "original": "Sign in to your account to continue your research journey.",
        "suggestion": "Sign in to your account to access your research tools and continue your work.",
        "rationale": "Replaced 'research journey' with more specific and action-oriented language that focuses on practical benefits.",
        "within_limit": true,
        "max": 56
      },
      {
        "role": "form_label",
        "original": "Email Address",
        "suggestion": "Email Address",
        "rationale": "The original text is clear and follows Elsevier style guide conventions.",
        "within_limit": true,
        "max": 13
      },
      {
        "role": "form_label",
        "original": "Password",
        "suggestion": "Password",
        "rationale": "The original text is clear and follows Elsevier style guide conventions.",
        "within_limit": true,
        "max": 8
      },
      {
        "role": "button_primary",
        "original": "Sign In",
        "suggestion": "Sign In",
        "rationale": "Concise button text that clearly indicates the action.",
        "within_limit": true,
        "max": 7
      }
    ],
    "notes": "Overall, the text was mostly clear and professional. Minor adjustments made for tone consistency and actionable language."
  };

  return convertPromptFlowResponse(mockResponse);
}
