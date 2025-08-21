# Elodin Copy Review App

A powerful AI-driven copy review application that helps ensure content compliance with Elsevier's style guidelines.

## 🚀 Features

- **📄 Document Upload**: Upload images or documents for content analysis
- **🤖 AI-Powered Review**: Uses Azure Content Understanding for text extraction
- **📝 Style Guide Compliance**: Automated review against Elsevier style guidelines
- **💡 Smart Suggestions**: Azure Prompt Flow provides intelligent copy improvements
- **⚡ Real-time Processing**: Fast, efficient content analysis
- **🎨 Modern UI**: Clean, responsive interface built with React and TailwindCSS

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Lucide React** for icons

### Backend
- **Express.js** with TypeScript
- **Azure Content Understanding** for document processing
- **Azure Prompt Flow** for AI-powered copy review

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Azure account (for cloud services)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Costin9087/elodin-v3.git
   cd elodin-v3
   ```

2. **Install dependencies**:
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**:
   ```bash
   # Copy example environment file
   cp backend/env.example backend/.env
   # Add your Azure service credentials
   ```

4. **Start development servers**:
   ```bash
   npm run dev
   ```

   This starts both:
   - **Frontend**: http://localhost:3000
   - **Backend**: http://localhost:3001

### Environment Variables

Create a `.env` file in the `backend` directory with:

```env
AZURE_FORM_RECOGNIZER_ENDPOINT=your-endpoint
AZURE_FORM_RECOGNIZER_KEY=your-key
AZURE_PROMPT_FLOW_ENDPOINT=your-prompt-flow-endpoint
AZURE_PROMPT_FLOW_KEY=your-prompt-flow-key
AZURE_PROMPT_FLOW_DEPLOYMENT=default
PORT=3001
```

## 📁 Project Structure

```
elodin-v3/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.tsx         # Main application component
│   │   └── main.tsx        # Application entry point
│   ├── index.html          # HTML template
│   └── package.json        # Frontend dependencies
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── services/       # Azure service integrations
│   │   └── index.ts        # Express server
│   ├── env.example         # Environment variables template
│   └── package.json        # Backend dependencies
├── Context/                 # Documentation and examples
└── package.json            # Root package.json
```

## 🎯 Usage

1. **Upload Document**: Select and upload an image or document
2. **AI Processing**: The app extracts text using Azure Content Understanding
3. **Style Review**: Content is analyzed against Elsevier style guidelines
4. **Get Suggestions**: Receive intelligent recommendations for improvements
5. **Review Results**: See original text, suggestions, and rationale

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend
- `npm run install:all` - Install all dependencies
- `npm run build` - Build both frontend and backend

### Frontend
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend
- `npm run dev` - Start Express server with hot reload
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server

## 🧪 Testing the App

1. Start the development servers: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Upload a test image with text
4. Review the AI-generated suggestions

## 🔧 Technologies

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **AI Services**: Azure Content Understanding, Azure Prompt Flow
- **Development**: Hot reload, TypeScript compilation

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or support, please open an issue in this repository.