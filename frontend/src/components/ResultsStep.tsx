import React, { useState } from 'react'
import { ArrowLeft, Plus, X, ZoomIn, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { ReviewResult, ServiceDebugInfo } from '../App'

interface ResultsStepProps {
  reviewResults: ReviewResult[]
  uploadedImageUrl: string | null
  debugInfo: ServiceDebugInfo | null
  onBack: () => void
}

const ResultsStep: React.FC<ResultsStepProps> = ({ reviewResults, uploadedImageUrl, debugInfo, onBack }) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'heading':
        return 'bg-blue-100 text-blue-800'
      case 'body':
        return 'bg-green-100 text-green-800'
      case 'form_label':
        return 'bg-purple-100 text-purple-800'
      case 'button_primary':
        return 'bg-orange-100 text-orange-800'
      case 'button_secondary':
        return 'bg-gray-100 text-gray-800'
      case 'footer_text':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'heading':
        return 'Heading'
      case 'body':
        return 'Body text'
      case 'form_label':
        return 'Form label'
      case 'button_primary':
        return 'Primary button'
      case 'button_secondary':
        return 'Secondary button'
      case 'footer_text':
        return 'Footer text'
      default:
        return type.replace('_', ' ')
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Copy Review Results</h1>
            <p className="text-gray-600">
              Copy rewritten following Elsevier brand guidelines with detailed explanations.
            </p>
          </div>
        </div>
        
        <button 
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Review New Design</span>
        </button>
      </div>

      {/* Debug Information */}
      {debugInfo && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Debug Information</h2>
          
          {/* Content Understanding Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
            <div className="flex items-center space-x-2 mb-3">
              {debugInfo.contentUnderstanding.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <h3 className="text-md font-semibold">
                Azure Content Understanding {debugInfo.contentUnderstanding.success ? 'Success' : 'Failed'}
              </h3>
            </div>
            
            {debugInfo.contentUnderstanding.error && (
              <div className="mb-3">
                <p className="text-sm text-red-600 font-medium">Error:</p>
                <p className="text-sm text-red-600">{debugInfo.contentUnderstanding.error}</p>
              </div>
            )}
            
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Response:</p>
              <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                {JSON.stringify(debugInfo.contentUnderstanding.response, null, 2)}
              </pre>
            </div>
          </div>

          {/* Prompt Flow Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-3">
              {debugInfo.promptFlow.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <h3 className="text-md font-semibold">
                Azure Prompt Flow {debugInfo.promptFlow.success ? 'Success' : 'Failed'}
              </h3>
            </div>
            
            {debugInfo.promptFlow.error && (
              <div className="mb-3">
                <p className="text-sm text-red-600 font-medium">Error:</p>
                <p className="text-sm text-red-600">{debugInfo.promptFlow.error}</p>
              </div>
            )}
            
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Response:</p>
              <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                {JSON.stringify(debugInfo.promptFlow.response, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Image and Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Uploaded Image */}
        {uploadedImageUrl && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Original Design</h2>
            <div className="flex justify-center">
              <div className="relative group cursor-pointer" onClick={() => setIsImageModalOpen(true)}>
                <img
                  src={uploadedImageUrl}
                  alt="Uploaded mockup"
                  className="max-w-full max-h-96 object-contain rounded-lg shadow-sm border border-gray-200 transition-opacity group-hover:opacity-90"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 rounded-lg">
                  <div className="bg-white rounded-full p-2 shadow-lg">
                    <ZoomIn className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 text-center mt-2">Click to view full size</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Text Elements Extracted</span>
              <span className="font-semibold text-gray-900">{reviewResults.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Improvements Made</span>
              <span className="font-semibold text-gray-900">
                {reviewResults.filter(result => result.changes.length > 0).length}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Text Categories</span>
              <div className="flex space-x-2">
                {Array.from(new Set(reviewResults.map(r => r.type))).map(type => (
                  <span key={type} className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(type)}`}>
                    {getTypeLabel(type)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="space-y-8">
        <h2 className="text-xl font-semibold text-gray-900">Detailed Copy Review</h2>
        {reviewResults.map((result, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(result.type)}`}>
                {getTypeLabel(result.type)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Original</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-gray-900 font-mono text-sm">"{result.original}"</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Rewritten</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-gray-900 font-mono text-sm">"{result.rewritten}"</p>
                </div>
              </div>
            </div>

            {result.changes.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Changes Made</h4>
                <ul className="list-disc list-inside space-y-1">
                  {result.changes.map((change, changeIndex) => (
                    <li key={changeIndex} className="text-sm text-gray-600">
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Rationale</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">{result.rationale}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {isImageModalOpen && uploadedImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <img
              src={uploadedImageUrl}
              alt="Uploaded mockup - full size"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultsStep
