'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  getAllContext: () => string;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

interface AITrigger {
  line: number;
  type: string;
  topic: string;
  startLine: number;
  endLine: number;
}

export default function MarkdownEditor({
  content,
  onChange,
  getAllContext,
  isProcessing,
  setIsProcessing,
}: MarkdownEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [triggers, setTriggers] = useState<AITrigger[]>([]);
  const decorationsRef = useRef<string[]>([]);
  const processingDecorationsRef = useRef<string[]>([]);
  const aiResponseRef = useRef<string>('');
  const currentTriggerRef = useRef<AITrigger | null>(null);
  const baseContentRef = useRef<string>('');
  const processingTriggersRef = useRef<Set<string>>(new Set());

  const detectAITriggers = useCallback((text: string) => {
    const lines = text.split('\n');
    const detectedTriggers: AITrigger[] = [];
    
    let inBlock = false;
    let blockType = '';
    let blockContent: string[] = [];
    let blockStartLine = 0;

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```ai-template') || line.trim().startsWith('```ai-write')) {
        inBlock = true;
        blockType = line.trim().startsWith('```ai-template') ? 'ai-template' : 'ai-write';
        blockStartLine = index;
        blockContent = [];
      } else if (inBlock && line.trim() === '```') {
        detectedTriggers.push({
          line: blockStartLine,
          type: blockType,
          topic: blockContent.join('\n').trim(),
          startLine: blockStartLine,
          endLine: index,
        });
        inBlock = false;
        blockType = '';
        blockContent = [];
      } else if (inBlock) {
        blockContent.push(line);
      }
    });

    setTriggers(detectedTriggers);
  }, []);

  useEffect(() => {
    detectAITriggers(content);
  }, [content, detectAITriggers]);


  const updateProcessingDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;
    
    const editorInstance = editorRef.current;
    const monaco = monacoRef.current;
    
    // Clear old processing decorations
    processingDecorationsRef.current = editorInstance.deltaDecorations(processingDecorationsRef.current, []);
    
    // Add decorations for all currently processing triggers
    const processingDecorations: editor.IModelDeltaDecoration[] = [];
    processingTriggersRef.current.forEach(triggerKey => {
      const [startLine, endLine] = triggerKey.split('-').map(Number);
      for (let line = startLine + 1; line <= endLine + 1; line++) {
        processingDecorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'ai-processing-line',
          },
        });
      }
    });
    
    if (processingDecorations.length > 0) {
      processingDecorationsRef.current = editorInstance.deltaDecorations([], processingDecorations);
    }
  }, []);

  const addProcessingTrigger = useCallback((trigger: AITrigger) => {
    const triggerKey = `${trigger.startLine}-${trigger.endLine}`;
    processingTriggersRef.current.add(triggerKey);
    updateProcessingDecorations();
  }, [updateProcessingDecorations]);

  const removeProcessingTrigger = useCallback((trigger: AITrigger) => {
    const triggerKey = `${trigger.startLine}-${trigger.endLine}`;
    processingTriggersRef.current.delete(triggerKey);
    updateProcessingDecorations();
  }, [updateProcessingDecorations]);

  const processAITriggerWithContent = async (trigger: AITrigger, currentContent: string) => {
    // Quick fix: prevent multiple simultaneous requests to avoid conflicts
    if (isProcessing) return;
    
    const triggerKey = `${trigger.startLine}-${trigger.endLine}`;
    
    // Add this trigger to processing set
    addProcessingTrigger(trigger);
    
    setIsProcessing(true);
    
    currentTriggerRef.current = trigger;
    aiResponseRef.current = ''; // Clear response
    baseContentRef.current = currentContent; // Store base content
    
    // Get context from all files including current updated content
    const allFilesContext = getAllContext();
    // Replace the stale current file content with the fresh editor content
    const context = allFilesContext + '\n\n--- CURRENT FILE (LATEST) ---\n\n' + currentContent;
    
    let systemInstruction = '';
    if (trigger.type === 'ai-template') {
      systemInstruction = `You are a helpful writer helping user to write articles in Markdown format.

The full context is (will be) provided.

Now, the user is requesting to generate a concise template, or a writing plan for this topic:

${trigger.topic}

IMPORTANT NOTES:

1. You should output and only output the template or the writing plan. NEVER use Markdown code block (triple backticks) to wrap the whole output.
2. The template or writing plan should use markdown level 2 title (##) to represent sections.
3. For each section, use ai-write codeblocks to describe your plan so that it is easier for users.
4. User might read your template and use AI to write section by section, so make sure you plan the order well for the sections. For example, if section B needs some information from section A, it should be placed after section A.
5. For each section, if available, add emojis to make the document more lively.
`;
    } else {
      systemInstruction = `You are a helpful writer helping user to write articles in Markdown format.

The full context is (will be) provided.

Now, the user is requesting to write about this topic:

${trigger.topic}

You should check the latest information from the Internet and provide details about this topic.

IMPORTANT NOTES:

1. You should output and only output the section. NEVER use Markdown code block (triple backticks) to wrap the whole output.
2. Your output will be used to replace the original lines.
3. You should strictly focus on the topics user requested and don't include anything else.
`;
    }

    try {
      // Get LLM settings from localStorage
      const savedSettings = localStorage.getItem('llm-settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction,
          userPrompt: context,
          modelType: settings.modelType || 'gemini-pro-2.5',
          apiKey: settings.apiKey || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let updateCounter = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // CRITICAL FIX: Use stream: true to handle partial UTF-8 sequences properly
          const chunk = decoder.decode(value, { stream: true });
          // Add chunk to response
          aiResponseRef.current += chunk;
          
          // Only update the editor every few chunks to avoid excessive re-renders
          updateCounter++;
          if (updateCounter % 3 === 0 || done) {
            // Always use the original base content and replace the entire trigger block
            // Split the AI response into lines to handle multi-line content properly
            const lines = baseContentRef.current.split('\n');
            const responseLines = aiResponseRef.current.split('\n');
            
            // Replace the original trigger block (from startLine to endLine) with all response lines
            lines.splice(trigger.startLine, trigger.endLine - trigger.startLine + 1, ...responseLines);
            const newContent = lines.join('\n');
            onChange(newContent);
          }
        }
        
        // Final update to ensure all content is displayed
        const lines = baseContentRef.current.split('\n');
        const responseLines = aiResponseRef.current.split('\n');
        lines.splice(trigger.startLine, trigger.endLine - trigger.startLine + 1, ...responseLines);
        const finalContent = lines.join('\n');
        onChange(finalContent);
      }
    } catch (error) {
      console.error('Error processing AI trigger:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process AI request';
      
      // Show more informative error message
      if (errorMessage.includes('API key not configured')) {
        alert('API key not configured. Please click the settings button (gear icon) at the bottom-right corner to configure your Gemini API key.');
      } else if (errorMessage.includes('API key not valid')) {
        alert('Invalid API key. Please check your Gemini API key in the settings.');
      } else {
        alert(`Error: ${errorMessage}`);
      }
    } finally {
      // Remove this trigger from processing set
      removeProcessingTrigger(trigger);
      
      setIsProcessing(false);
      
      aiResponseRef.current = '';
      currentTriggerRef.current = null;
    }
  };


  const updateDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }

    const editorInstance = editorRef.current;
    const monaco = monacoRef.current;

    // Always detect triggers from current editor content (not stale props)
    const currentContent = editorInstance.getValue();
    const lines = currentContent.split('\n');
    const freshTriggers: AITrigger[] = [];
    
    let inBlock = false;
    let blockType = '';
    let blockContent: string[] = [];
    let blockStartLine = 0;

    lines.forEach((line: string, index: number) => {
      if (line.trim().startsWith('```ai-template') || line.trim().startsWith('```ai-write')) {
        inBlock = true;
        blockType = line.trim().startsWith('```ai-template') ? 'ai-template' : 'ai-write';
        blockStartLine = index;
        blockContent = [];
      } else if (inBlock && line.trim() === '```') {
        freshTriggers.push({
          line: blockStartLine,
          type: blockType,
          topic: blockContent.join('\n').trim(),
          startLine: blockStartLine,
          endLine: index,
        });
        inBlock = false;
        blockType = '';
        blockContent = [];
      } else if (inBlock) {
        blockContent.push(line);
      }
    });

    // Clear old decorations
    decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, []);

    // Add new decorations for fresh AI triggers (remove when processing)
    const newDecorations = isProcessing ? [] : freshTriggers.map((trigger) => ({
      range: new monaco.Range(trigger.startLine + 1, 1, trigger.startLine + 1, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'ai-trigger-glyph',
        glyphMarginHoverMessage: {
          value: `Click to process ${trigger.type}`,
        },
      },
    }));

    decorationsRef.current = editorInstance.deltaDecorations([], newDecorations);
  }, [isProcessing]);

  useEffect(() => {
    updateDecorations();
  }, [triggers, isProcessing, updateDecorations]);

  const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;

    // Add custom CSS for glyph margin if not already added
    if (!document.getElementById('ai-trigger-styles')) {
      const style = document.createElement('style');
      style.id = 'ai-trigger-styles';
      style.textContent = `
        .ai-trigger-glyph {
          border-radius: 50%;
          cursor: pointer;
          width: 20px !important;
          height: 20px !important;
          margin-left: 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .ai-trigger-glyph::before {
          content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 48 48"><path fill="%232196f3" d="M23.426,31.911l-1.719,3.936c-0.661,1.513-2.754,1.513-3.415,0l-1.719-3.936    c-1.529-3.503-4.282-6.291-7.716-7.815l-4.73-2.1c-1.504-0.668-1.504-2.855,0-3.523l4.583-2.034    c3.522-1.563,6.324-4.455,7.827-8.077l1.741-4.195c0.646-1.557,2.797-1.557,3.443,0l1.741,4.195    c1.503,3.622,4.305,6.514,7.827,8.077l4.583,2.034c1.504,0.668,1.504,2.855,0,3.523l-4.73,2.1    C27.708,25.62,24.955,28.409,23.426,31.911z"></path><path fill="%237e57c2" d="M38.423,43.248l-0.493,1.131c-0.361,0.828-1.507,0.828-1.868,0l-0.493-1.131    c-0.879-2.016-2.464-3.621-4.44-4.5l-1.52-0.675c-0.822-0.365-0.822-1.56,0-1.925l1.435-0.638c2.027-0.901,3.64-2.565,4.504-4.65    l0.507-1.222c0.353-0.852,1.531-0.852,1.884,0l0.507,1.222c0.864,2.085,2.477,3.749,4.504,4.65l1.435,0.638    c0.822,0.365,0.822,1.56,0,1.925l-1.52,0.675C40.887,39.627,39.303,41.232,38.423,43.248z"></path></svg>');
          width: 16px;
          height: 16px;
        }
        .ai-trigger-glyph:hover {
          transform: scale(1.2);
          transition: transform 0.2s;
        }
        
        .ai-trigger-glyph-disabled {
          border-radius: 50%;
          cursor: not-allowed;
          width: 20px !important;
          height: 20px !important;
          margin-left: 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          opacity: 0.4;
          filter: grayscale(100%);
        }
        .ai-trigger-glyph-disabled::before {
          content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 48 48"><path fill="%23888888" d="M23.426,31.911l-1.719,3.936c-0.661,1.513-2.754,1.513-3.415,0l-1.719-3.936    c-1.529-3.503-4.282-6.291-7.716-7.815l-4.73-2.1c-1.504-0.668-1.504-2.855,0-3.523l4.583-2.034    c3.522-1.563,6.324-4.455,7.827-8.077l1.741-4.195c0.646-1.557,2.797-1.557,3.443,0l1.741,4.195    c1.503,3.622,4.305,6.514,7.827,8.077l4.583,2.034c1.504,0.668,1.504,2.855,0,3.523l-4.73,2.1    C27.708,25.62,24.955,28.409,23.426,31.911z"></path><path fill="%23888888" d="M38.423,43.248l-0.493,1.131c-0.361,0.828-1.507,0.828-1.868,0l-0.493-1.131    c-0.879-2.016-2.464-3.621-4.44-4.5l-1.52-0.675c-0.822-0.365-0.822-1.56,0-1.925l1.435-0.638c2.027-0.901,3.64-2.565,4.504-4.65    l0.507-1.222c0.353-0.852,1.531-0.852,1.884,0l0.507,1.222c0.864,2.085,2.477,3.749,4.504,4.65l1.435,0.638    c0.822,0.365,0.822,1.56,0,1.925l-1.52,0.675C40.887,39.627,39.303,41.232,38.423,43.248z"></path></svg>');
          width: 16px;
          height: 16px;
        }
        
        .ai-processing-line {
          background-color: rgba(33, 150, 243, 0.2) !important;
        }
        
        .processing-text {
          background: linear-gradient(45deg, #2196f3, #64b5f6, #2196f3, #64b5f6);
          background-size: 400% 400%;
          animation: breathing-bg 2s ease-in-out infinite;
        }
        
        @keyframes breathing-bg {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Handle glyph margin clicks - always detect fresh triggers from current content
    const handleClick = (e: editor.IEditorMouseEvent) => {
      // Check for glyph margin click (type 2) or line number click (type 3)
      if (e.target.type === 2 || e.target.type === 3) { 
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber && !isProcessing) {
          // Always get fresh content and detect triggers dynamically
          const currentContent = editorInstance.getValue();
          const lines = currentContent.split('\n');
          const detectedTriggers: AITrigger[] = [];
          
          let inBlock = false;
          let blockType = '';
          let blockContent: string[] = [];
          let blockStartLine = 0;

          lines.forEach((line: string, index: number) => {
            if (line.trim().startsWith('```ai-template') || line.trim().startsWith('```ai-write')) {
              inBlock = true;
              blockType = line.trim().startsWith('```ai-template') ? 'ai-template' : 'ai-write';
              blockStartLine = index;
              blockContent = [];
            } else if (inBlock && line.trim() === '```') {
              detectedTriggers.push({
                line: blockStartLine,
                type: blockType,
                topic: blockContent.join('\n').trim(),
                startLine: blockStartLine,
                endLine: index,
              });
              inBlock = false;
              blockType = '';
              blockContent = [];
            } else if (inBlock) {
              blockContent.push(line);
            }
          });
          
          const trigger = detectedTriggers.find((t: AITrigger) => t.startLine + 1 === lineNumber);
          if (trigger) {
            processAITriggerWithContent(trigger, currentContent);
          }
        }
      }
    };

    editorInstance.onMouseDown(handleClick);

    // Update decorations when content changes (manual edits)
    editorInstance.onDidChangeModelContent(() => {
      // Debounce the decoration updates to avoid excessive re-rendering
      setTimeout(() => {
        updateDecorations();
      }, 300);
    });

    // Initial decoration update
    setTimeout(() => {
      updateDecorations();
    }, 100);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Editor</h2>
          {isProcessing && (
            <span className="text-xs text-white px-2 py-1 rounded-md animate-pulse processing-text">Processing AI request...</span>
          )}
          {triggers.length > 0 && !isProcessing && (
            <span className="text-xs text-gray-500">
              {triggers.length} AI trigger{triggers.length > 1 ? 's' : ''} detected - Click the AI icon in the gutter to process
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={content}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorMount}
          theme="vs"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            glyphMargin: true,
            folding: false,
          }}
        />
      </div>
    </div>
  );
}