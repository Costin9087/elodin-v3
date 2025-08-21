# Copy Reviewer - Azure AI Proof of Concept

A 2-step proof of concept application that uses Azure Content Understanding and Azure Prompt Flow to extract and improve copy from design mockups according to Elsevier brand guidelines.

## Architecture

```
Frontend (React + TypeScript) → Backend (Express + TypeScript) → Azure Services
                                                                      ├── Azure Form Recognizer (Content Understanding)
                                                                      └── Azure Prompt Flow
```

## Features

1. **Image Upload & Text Extraction**: Upload design mockups and extract text using Azure Content Understanding
2. **Copy Review**: Automatically review and improve extracted text using Azure Prompt Flow with Elsevier brand guidelines
3. **Clean Results UI**: Display original vs improved copy with detailed explanations

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Azure subscription with Form Recognizer and Prompt Flow resources (optional - app works with mock data)

### Installation

1. **Install dependencies for all packages:**
   ```bash
   npm run install:all
   ```

2. **Configure Azure services (optional):**
   ```bash
   cp backend/env.example backend/.env
   # Edit backend/.env with your Azure credentials
   ```

3. **Start the development servers:**
   ```bash
   npm run dev
   ```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

## Project Structure

```
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Header.tsx
│   │   │   ├── UploadStep.tsx
│   │   │   └── ResultsStep.tsx
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   └── package.json
├── backend/                  # Express TypeScript backend
│   ├── src/
│   │   ├── services/        # Azure service integrations
│   │   │   ├── azureContentUnderstanding.ts
│   │   │   └── azurePromptFlow.ts
│   │   └── index.ts         # Express server
│   └── package.json
└── package.json             # Root package with dev scripts
```

## Azure Services Integration

### Azure Form Recognizer (Content Understanding)

The app uses Azure Form Recognizer's `prebuilt-read` model to extract text from uploaded images. Text is automatically categorized into:
- **Headings**: Short text that appears to be titles
- **Body**: Longer descriptive text
- **Labels**: Form field labels and short descriptive text

### Azure Prompt Flow

Extracted text is sent to Azure Prompt Flow for copy improvement based on Elsevier brand guidelines. The service returns:
- Improved copy suggestions
- List of changes made
- Detailed rationale for each change

## Mock Data Mode

The application includes comprehensive mock data for development and testing:
- **Mock text extraction**: Simulates Azure Form Recognizer responses
- **Mock copy review**: Demonstrates Elsevier brand guideline improvements
- Automatic fallback when Azure services are not configured

## Configuration

Set up your Azure credentials in `backend/.env`:

```env
# Azure Form Recognizer
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=your-api-key

# Azure Prompt Flow  
AZURE_PROMPT_FLOW_ENDPOINT=https://your-prompt-flow-endpoint.azureml.net/score
AZURE_PROMPT_FLOW_KEY=your-prompt-flow-key
```

## API Endpoints

- `POST /api/extract-text` - Upload image for text extraction
- `POST /api/review-copy` - Review extracted text with Prompt Flow
- `GET /api/health` - Health check endpoint

## Development Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only frontend development server
- `npm run dev:backend` - Start only backend development server
- `npm run install:all` - Install dependencies for all packages
- `npm run build` - Build both frontend and backend for production

## Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons

**Backend:**
- Express.js with TypeScript
- Multer for file uploads
- Azure SDK for JavaScript
- CORS enabled for development

## Next Steps

This proof of concept demonstrates the core functionality. For production use, consider:

1. **Authentication & Authorization**: Add user authentication
2. **File Storage**: Implement proper file storage (Azure Blob Storage)
3. **Error Handling**: Enhanced error handling and user feedback
4. **Performance**: Image optimization and caching
5. **Monitoring**: Application insights and logging
6. **Security**: Input validation and rate limiting





