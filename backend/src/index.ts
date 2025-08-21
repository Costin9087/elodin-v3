import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { extractTextFromImage } from './services/azureContentUnderstanding';
import { reviewCopyWithPromptFlow } from './services/azurePromptFlow';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Copy Review Backend API is running!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/config', (req, res) => {
  res.json({
    promptFlowEndpoint: process.env.AZURE_PROMPT_FLOW_ENDPOINT,
    promptFlowDeployment: process.env.AZURE_PROMPT_FLOW_DEPLOYMENT || 'default',
    hasPromptFlowKey: !!process.env.AZURE_PROMPT_FLOW_KEY,
    contentUnderstandingEndpoint: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
    hasContentUnderstandingKey: !!process.env.AZURE_FORM_RECOGNIZER_KEY
  });
});

// Text extraction endpoint
app.post('/api/extract-text', upload.single('image'), async (req, res) => {
  try {
    console.log('Received extract-text request');
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image file provided',
        message: 'Please upload an image file'
      });
    }

    console.log('Processing image:', req.file.originalname, 'Size:', req.file.size);

    // Extract text using Azure Content Understanding
    const extractionResult = await extractTextFromImage(req.file.buffer);
    
    console.log('Text extraction completed');
    res.json({
      success: true,
      data: extractionResult
    });

  } catch (error) {
    console.error('Text extraction error:', error);
    
    // Provide more helpful error messages based on error type
    let statusCode = 500;
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (error instanceof Error && error.message.includes('not configured')) {
      statusCode = 503; // Service Unavailable
    } else if (error instanceof Error && error.message.includes('placeholder values')) {
      statusCode = 503; // Service Unavailable  
    }
    
    res.status(statusCode).json({
      error: 'Azure Content Understanding Failed',
      message: errorMessage,
      service: 'Azure Content Understanding'
    });
  }
});

// Copy review endpoint
app.post('/api/review-copy', async (req, res) => {
  try {
    console.log('Received review-copy request');
    console.log('Request body keys:', Object.keys(req.body));
    
    const { contentUnderstandingData, extractionData } = req.body;
    const dataToProcess = contentUnderstandingData || extractionData;
    
    if (!dataToProcess) {
      return res.status(400).json({
        error: 'No extraction data provided',
        message: 'Please provide contentUnderstandingData or extractionData for review'
      });
    }

    console.log('Processing copy review...');
    
    // Extract the actual Azure Content Understanding data
    // The frontend sends the full API response, we need just the data portion
    let azureData = dataToProcess;
    if (dataToProcess.success && dataToProcess.data) {
      azureData = dataToProcess.data;
    }
    
    console.log('Azure Content Understanding data to process:', JSON.stringify(azureData, null, 2));

    // Review copy using Azure Prompt Flow
    const reviewResults = await reviewCopyWithPromptFlow(azureData);
    
    console.log('Copy review completed');
    res.json({
      success: true,
      data: reviewResults
    });

  } catch (error) {
    console.error('Copy review error:', error);
    
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
    
    res.status(statusCode).json({
      error: 'Azure Prompt Flow Failed',
      message: errorMessage,
      service: 'Azure Prompt Flow'
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Please upload an image smaller than 10MB'
      });
    }
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
