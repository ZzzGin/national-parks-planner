'use client';

import { useState, useEffect, useCallback } from 'react';
import { MarkdownFile } from '@/types';
import FileTabList from '@/components/FileTabList';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownPreview from '@/components/MarkdownPreview';
import SettingsModal from '@/components/SettingsModal';

const DEFAULT_WELCOME_CONTENT = '# 🏞️ Welcome to National Parks Planner\n\nAn AI-powered markdown editor designed to help you plan and document your national parks adventures!\n\n## 📝 Getting Started\n\n### File Management\n- **Create Files**: Click the "+" button in the left panel to create new planning documents\n- **Organize**: Create separate files for different parks, itineraries, packing lists, etc.\n- **Include/Exclude**: Use checkboxes to control which files provide context for AI features\n- **Start Over**: Click the refresh button to reset all files and begin fresh\n\n## 🤖 AI-Powered Features\n\n### Generate Templates\nWrap any topic in an **ai-template** code block to generate a structured writing plan:\n\n````text\n\\^\\^\\^ai-template\nYellowstone National Park 3-day itinerary\n\\^\\^\\^\n````\n\nClick the AI icon (sparkle) in the left gutter to generate the template.\n\n### Write Content\nWrap any topic in an **ai-write** code block to generate detailed content:\n\n````text\n\\^\\^\\^ai-write\nBest hiking trails for beginners in Yosemite\n\\^\\^\\^\n````\n\nThe AI will research current information and provide comprehensive details.\n\n### Update Existing Content\nWrap existing content in an **ai-update** code block with your feedback to improve it:\n\n````text\n\\^\\^\\^ai-update\nmake this sound more professional and add specific details\n\nYosemite is a cool park with big rocks and waterfalls. You can hike and camp there.\n\\^\\^\\^\n````\n\nThe AI will rewrite the content based on your feedback while preserving the core information.\n\n## 💡 Tips for Best Results\n\n1. **Context Matters**: The AI uses all "included" files as context, so organize related information together\n2. **Be Specific**: More detailed prompts yield better results\n3. **Iterate**: Generate templates first, then use ai-write to fill in sections, and ai-update to refine content\n4. **Real-time Preview**: See your formatted markdown instantly in the right panel\n5. **Visual Cues**: ai-update blocks appear with gray background, ai-write blocks with yellow background\n\n## ⚙️ Setup\n\n**Important**: Configure your Google Gemini API key using the settings button (gear icon) at the bottom-right corner. Without an API key, AI features will not work.\n\nGet your free API key at: https://aistudio.google.com/apikey\n\n## 🎯 Example Use Cases\n\n- **Trip Planning**: Create detailed itineraries with daily schedules\n- **Park Guides**: Document trails, viewpoints, and camping spots\n- **Packing Lists**: Organize gear for different seasons and activities\n- **Travel Journals**: Write about your experiences and memories\n- **Research Notes**: Compile information about wildlife, geology, and history\n- **Content Refinement**: Use ai-update to improve and polish existing content\n\n---\n\n*Ready to start planning? Create a new file or try the AI features with the examples above!*';

export default function Home() {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Scroll synchronization state
  const [editorScrollSync, setEditorScrollSync] = useState<{ scrollTop: number; scrollHeight: number; clientHeight: number } | undefined>();
  const [previewScrollSync, setPreviewScrollSync] = useState<{ scrollTop: number; scrollHeight: number; clientHeight: number } | undefined>();

  useEffect(() => {
    // Check for API key
    const savedSettings = localStorage.getItem('llm-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setHasApiKey(!!settings.apiKey);
    }

    const savedFiles = localStorage.getItem('markdown-files');
    if (savedFiles) {
      const parsedFiles = JSON.parse(savedFiles);
      setFiles(parsedFiles);
      if (parsedFiles.length > 0) {
        setActiveFileId(parsedFiles[0].id);
      }
    } else {
      const defaultFile: MarkdownFile = {
        id: crypto.randomUUID(),
        name: 'Welcome',
        content: DEFAULT_WELCOME_CONTENT,
        createdAt: new Date(),
        updatedAt: new Date(),
        isIncluded: true,
      };
      setFiles([defaultFile]);
      setActiveFileId(defaultFile.id);
    }
  }, []);

  useEffect(() => {
    if (files.length > 0) {
      localStorage.setItem('markdown-files', JSON.stringify(files));
    }
  }, [files]);

  const activeFile = files.find(f => f.id === activeFileId);

  const handleCreateFile = useCallback(() => {
    const newFileId = crypto.randomUUID();
    const newFile: MarkdownFile = {
      id: newFileId,
      name: `New File ${files.length + 1}`,
      content: '# New Document\n\nStart writing here...',
      createdAt: new Date(),
      updatedAt: new Date(),
      isIncluded: true,
    };
    setFiles(prevFiles => [...prevFiles, newFile]);
    setActiveFileId(newFileId);
  }, [files.length]);

  const handleDeleteFile = useCallback((id: string) => {
    setFiles(prevFiles => {
      const newFiles = prevFiles.filter(f => f.id !== id);
      if (activeFileId === id) {
        setActiveFileId(newFiles.length > 0 ? newFiles[0].id : null);
      }
      return newFiles;
    });
  }, [activeFileId]);

  const handleRenameFile = useCallback((id: string, newName: string) => {
    setFiles(prevFiles => prevFiles.map(f => 
      f.id === id ? { ...f, name: newName, updatedAt: new Date() } : f
    ));
  }, []);

  const handleToggleFile = useCallback((id: string) => {
    setFiles(prevFiles => prevFiles.map(f => 
      f.id === id ? { ...f, isIncluded: f.isIncluded === false ? true : false } : f
    ));
  }, []);

  const handleContentChange = useCallback((content: string) => {
    if (activeFileId) {
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === activeFileId ? { ...f, content, updatedAt: new Date() } : f
      ));
    }
  }, [activeFileId]);

  const getAllContext = useCallback(() => {
    return files
      .filter(f => f.isIncluded !== false)
      .map(f => `File Name: ${f.name}\n\n${f.content}`)
      .join('\n\n---\n\n');
  }, [files]);

  const handleStartOver = useCallback(() => {
    const defaultFile: MarkdownFile = {
      id: crypto.randomUUID(),
      name: 'Welcome',
      content: DEFAULT_WELCOME_CONTENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      isIncluded: true,
    };
    setFiles([defaultFile]);
    setActiveFileId(defaultFile.id);
    localStorage.removeItem('markdown-files');
  }, []);

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    // Re-check for API key after settings modal closes
    const savedSettings = localStorage.getItem('llm-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setHasApiKey(!!settings.apiKey);
    }
  };
  
  const handleEditorScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    setPreviewScrollSync({ scrollTop, scrollHeight, clientHeight });
  }, []);
  
  const handlePreviewScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    setEditorScrollSync({ scrollTop, scrollHeight, clientHeight });
  }, []);

  return (
    <>
      <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
      
      {/* API Key Warning Banner */}
      {!hasApiKey && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 px-4 py-2 z-50">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-yellow-800">
                API key not configured. AI features will not work until you configure your Gemini API key.
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="ml-4 px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            >
              Configure Now
            </button>
          </div>
        </div>
      )}
      
      <div className={`flex h-screen bg-gray-50 ${!hasApiKey ? 'pt-12' : ''}`}>
      <div className="w-64 border-r border-gray-200 bg-white">
        <FileTabList
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onStartOver={handleStartOver}
          onToggleFile={handleToggleFile}
        />
      </div>

      <div className="flex-1 flex">
        <div className="w-2/5 border-r border-gray-200">
          {activeFile && (
            <MarkdownEditor
              key={activeFile.id}
              content={activeFile.content}
              onChange={handleContentChange}
              getAllContext={getAllContext}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              onScrollSync={handleEditorScroll}
              scrollSyncTarget={editorScrollSync}
            />
          )}
        </div>

        <div className="w-3/5 bg-white">
          {activeFile && (
            <MarkdownPreview 
              key={activeFile.id} 
              content={activeFile.content}
              onScrollSync={handlePreviewScroll}
              scrollSyncTarget={previewScrollSync}
            />
          )}
        </div>
      </div>
      
      {/* Settings Button - Fixed at bottom right */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
        aria-label="Open Settings"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
    </>
  );
}