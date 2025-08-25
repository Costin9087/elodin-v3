import { useState } from 'react'
import UploadStep from './components/UploadStep'
import ResultsStep from './components/ResultsStep'
import Header from './components/Header'

export interface ReviewResult {
  original: string;
  rewritten: string;
  changes: string[];
  rationale: string;
  type: string;
}

export interface ServiceDebugInfo {
  contentUnderstanding: {
    success: boolean;
    data?: any;
    error?: string;
    response?: any;
  };
  promptFlow: {
    success: boolean;
    data?: any;
    error?: string;
    response?: any;
  };
}

function App() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'results'>('upload')
  const [, setContentUnderstandingData] = useState<any>(null)
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<ServiceDebugInfo | null>(null)

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    
    // Create a URL for the uploaded image to display later
    const imageUrl = URL.createObjectURL(file)
    setUploadedImageUrl(imageUrl)
    
    const debugInfo: ServiceDebugInfo = {
      contentUnderstanding: { success: false },
      promptFlow: { success: false }
    }

    try {
      // Step 1: Extract text using Azure Content Understanding
      console.log('Converting file to base64 for reliable upload...')
      
      // Convert file to base64 to avoid multipart form issues with Azure Static Web Apps
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove the data URL prefix (data:image/jpeg;base64,)
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      console.log('Calling Content Understanding API with base64 data...')
      const extractResponse = await fetch('/api/extract-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          filename: file.name,
          mimeType: file.type,
          size: file.size
        }),
      })
      
      console.log('Extract response status:', extractResponse.status, extractResponse.statusText)
      console.log('Extract response headers:', Object.fromEntries(extractResponse.headers.entries()))
      
      const extractResponseText = await extractResponse.text()
      console.log('Extract response text length:', extractResponseText.length)
      console.log('Extract response text preview:', extractResponseText.substring(0, 200))
      
      let contentUnderstandingData
      
      try {
        contentUnderstandingData = JSON.parse(extractResponseText)
      } catch (parseError) {
        console.error('JSON parse error details:', {
          error: parseError,
          responseLength: extractResponseText.length,
          responsePreview: extractResponseText.substring(0, 500),
          responseStatus: extractResponse.status,
          responseHeaders: Object.fromEntries(extractResponse.headers.entries())
        })
        
        debugInfo.contentUnderstanding = {
          success: false,
          error: `JSON parse error: ${parseError}`,
          response: extractResponseText.length > 0 ? extractResponseText : '(Empty response)'
        }
        throw new Error(`Invalid JSON response from Content Understanding: ${parseError}`)
      }

      if (!extractResponse.ok) {
        debugInfo.contentUnderstanding = {
          success: false,
          error: `HTTP ${extractResponse.status}: ${extractResponse.statusText}`,
          response: contentUnderstandingData
        }
        
        // Provide more user-friendly error messages
        let userMessage = 'Content Understanding API failed';
        if (contentUnderstandingData?.message) {
          userMessage = contentUnderstandingData.message;
        } else if (extractResponse.status === 400) {
          userMessage = 'Invalid file format or corrupted file. Please try a different image.';
        } else if (extractResponse.status === 413) {
          userMessage = 'File is too large. Please use a file smaller than 10MB.';
        } else if (extractResponse.status === 503) {
          userMessage = 'Service temporarily unavailable. Please try again later.';
        }
        
        throw new Error(userMessage)
      }

      debugInfo.contentUnderstanding = {
        success: true,
        data: contentUnderstandingData,
        response: contentUnderstandingData
      }
      
      setContentUnderstandingData(contentUnderstandingData)
      
      // Step 2: Review copy using Azure Prompt Flow
      console.log('Calling Prompt Flow API...')
      const reviewResponse = await fetch('/api/review-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentUnderstandingData }),
      })
      
      const reviewResponseText = await reviewResponse.text()
      let reviewResults
      
      try {
        reviewResults = JSON.parse(reviewResponseText)
      } catch (parseError) {
        debugInfo.promptFlow = {
          success: false,
          error: `JSON parse error: ${parseError}`,
          response: reviewResponseText
        }
        throw new Error('Invalid JSON response from Prompt Flow')
      }

      if (!reviewResponse.ok) {
        debugInfo.promptFlow = {
          success: false,
          error: `HTTP ${reviewResponse.status}: ${reviewResponse.statusText}`,
          response: reviewResults
        }
        throw new Error('Prompt Flow API failed')
      }

      debugInfo.promptFlow = {
        success: true,
        data: reviewResults,
        response: reviewResults
      }
      
      // Extract the actual review data from the API response
      const reviewData = reviewResults.success ? reviewResults.data : reviewResults;
      setReviewResults(reviewData)
      setDebugInfo(debugInfo)
      setCurrentStep('results')
      
    } catch (error) {
      console.error('Error processing file:', error)
      setDebugInfo(debugInfo)
      setCurrentStep('results') // Still go to results to show debug info
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBackToUpload = () => {
    setCurrentStep('upload')
    setContentUnderstandingData(null)
    setReviewResults([])
    setDebugInfo(null)
    // Clean up the image URL to prevent memory leaks
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl)
      setUploadedImageUrl(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {currentStep === 'upload' ? (
          <UploadStep 
            onFileUpload={handleFileUpload} 
            isProcessing={isProcessing}
          />
        ) : (
          <ResultsStep 
            reviewResults={reviewResults}
            uploadedImageUrl={uploadedImageUrl}
            debugInfo={debugInfo}
            onBack={handleBackToUpload}
          />
        )}
      </main>
    </div>
  )
}

export default App
