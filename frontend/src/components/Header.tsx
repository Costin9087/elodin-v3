import React from 'react'
import { Menu, ArrowLeft } from 'lucide-react'

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Menu className="w-6 h-6 text-gray-600" />
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Product:</span>
            <select className="text-sm border border-gray-300 rounded px-2 py-1">
              <option>Generic Elsevier Product</option>
            </select>
          </div>
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900">Copy Reviewer</h1>
        
        <button className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>
    </header>
  )
}

export default Header





