'use client';

import { useState } from 'react';
import { MarkdownFile } from '@/types';
import { Plus, X, Edit2, Check, RotateCcw } from 'lucide-react';

interface FileTabListProps {
  files: MarkdownFile[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: () => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  onStartOver: () => void;
  onToggleFile: (id: string) => void;
}

export default function FileTabList({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onStartOver,
  onToggleFile,
}: FileTabListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleFinishEdit = () => {
    if (editingId && editingName.trim()) {
      onRenameFile(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleStartOver = () => {
    if (window.confirm('Are you sure you want to start over? This will delete all files and cannot be undone.')) {
      onStartOver();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 space-y-2">
        <button
          onClick={onCreateFile}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} />
          New File
        </button>
        <button
          onClick={handleStartOver}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <RotateCcw size={18} />
          Start Over
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            className={`group flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
              activeFileId === file.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
            onClick={() => onSelectFile(file.id)}
          >
            {editingId === file.id ? (
              <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleFinishEdit}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Check size={16} className="text-green-600" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X size={16} className="text-red-600" />
                </button>
              </div>
            ) : (
              <>
                <input
                  type="checkbox"
                  checked={file.isIncluded !== false}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleFile(file.id);
                  }}
                  className="mr-2 cursor-pointer"
                  title="Include in AI context"
                />
                <span className="flex-1 text-sm text-gray-900 truncate">{file.name}</span>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(file.id, file.name);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Edit2 size={14} className="text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X size={14} className="text-red-600" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}