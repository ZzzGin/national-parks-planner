'use client';

import { useState, useEffect, useCallback } from 'react';
import { MarkdownFile } from '@/types';
import FileTabList from '@/components/FileTabList';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownPreview from '@/components/MarkdownPreview';

export default function Home() {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
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
        content: '# Welcome to National Parks Planner\n\nStart planning your trip by creating a new file or editing this one.\n\n## How to use\n\n1. Create or select a file from the left panel\n2. Edit the content in the middle editor\n3. Use AI features:\n   - Wrap text with \\`\\`\\`ai-template\\`\\`\\` to generate a template\n   - Wrap text with \\`\\`\\`ai-write\\`\\`\\` to enrich a section\n4. Preview your markdown on the right',
        createdAt: new Date(),
        updatedAt: new Date(),
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

  const handleContentChange = useCallback((content: string) => {
    if (activeFileId) {
      setFiles(prevFiles => prevFiles.map(f => 
        f.id === activeFileId ? { ...f, content, updatedAt: new Date() } : f
      ));
    }
  }, [activeFileId]);

  const getAllContext = useCallback(() => {
    return files.map(f => `## ${f.name}\n\n${f.content}`).join('\n\n---\n\n');
  }, [files]);

  const handleStartOver = useCallback(() => {
    const defaultFile: MarkdownFile = {
      id: crypto.randomUUID(),
      name: 'Welcome',
      content: '# Welcome to National Parks Planner\n\nStart planning your trip by creating a new file or editing this one.\n\n## How to use\n\n1. Create or select a file from the left panel\n2. Edit the content in the middle editor\n3. Use AI features:\n   - Wrap text with \\`\\`\\`ai-template\\`\\`\\` to generate a template\n   - Wrap text with \\`\\`\\`ai-write\\`\\`\\` to enrich a section\n4. Preview your markdown on the right',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setFiles([defaultFile]);
    setActiveFileId(defaultFile.id);
    localStorage.removeItem('markdown-files');
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 border-r border-gray-200 bg-white">
        <FileTabList
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onStartOver={handleStartOver}
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
            />
          )}
        </div>

        <div className="w-3/5 bg-white">
          {activeFile && (
            <MarkdownPreview key={activeFile.id} content={activeFile.content} />
          )}
        </div>
      </div>
    </div>
  );
}