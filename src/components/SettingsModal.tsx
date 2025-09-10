'use client';

import { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [modelType, setModelType] = useState<string>('gemini-pro-2.5');
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const savedSettings = localStorage.getItem('llm-settings');
    if (savedSettings) {
      const { modelType: savedModel, apiKey: savedKey } = JSON.parse(savedSettings);
      setModelType(savedModel || 'gemini-pro-2.5');
      setApiKey(savedKey || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    const settings = {
      modelType,
      apiKey,
    };
    localStorage.setItem('llm-settings', JSON.stringify(settings));
    onClose();
  };

  const handleClearSettings = () => {
    setApiKey('');
    localStorage.removeItem('llm-settings');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">LLM Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="model-type" className="block text-sm font-medium text-gray-700 mb-1">
              Model Type
            </label>
            <select
              id="model-type"
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Choose between Pro (higher quality) or Flash (faster) models</p>
          </div>

          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your API key is stored locally and never sent to our servers
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={handleClearSettings}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            Clear Settings
          </button>
          <div className="space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}