import React, { useRef, useState } from 'react'
import { Upload, Edit } from 'lucide-react'

interface UploadStepProps {
  onFileUpload: (file: File) => void
  isProcessing: boolean
}

const UploadStep: React.FC<UploadStepProps> = ({ onFileUpload, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelection(files[0])
    }
  }

  const handleFileSelection = (file: File) => {
    // Azure Content Understanding supported formats: JPEG, PNG, BMP, PDF, TIFF
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/bmp',
      'image/tiff',
      'image/tif',
      'application/pdf'
    ]
    
    // Check file type
    const isSupported = supportedTypes.some(type => 
      file.type.toLowerCase() === type || 
      file.name.toLowerCase().endsWith(type.split('/')[1])
    )
    
    if (!isSupported) {
      alert('Please select a supported file format: JPEG, PNG, BMP, PDF, or TIFF')
      return
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      alert('File size must be less than 10MB')
      return
    }
    
    // Check if file is not empty
    if (file.size === 0) {
      alert('File appears to be empty. Please select a valid file.')
      return
    }
    
    onFileUpload(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelection(files[0])
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Copy Reviewer</h1>
        <p className="text-gray-600 text-lg">
          Upload a design to extract and improve copy using Elsevier guidelines.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Step 1: Upload Design
          </h2>
          <p className="text-gray-600">
            Upload an image of your design to extract all text content
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-lg text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-400">
              JPEG, PNG, BMP, PDF, TIFF up to 10MB
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/bmp,image/tiff,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <button
          onClick={handleUploadClick}
          disabled={isProcessing}
          className={`w-full mt-6 py-3 px-6 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
            isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          <Edit className="w-5 h-5" />
          <span>
            {isProcessing ? 'Processing...' : 'Extract Copy from Design'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default UploadStep





