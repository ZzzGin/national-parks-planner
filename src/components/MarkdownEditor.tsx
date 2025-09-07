'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';

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
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [triggers, setTriggers] = useState<AITrigger[]>([]);
  const decorationsRef = useRef<string[]>([]);
  const aiResponseRef = useRef<string>('');
  const currentTriggerRef = useRef<AITrigger | null>(null);
  const baseContentRef = useRef<string>('');

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


  const processAITriggerWithContent = async (trigger: AITrigger, currentContent: string) => {
    if (isProcessing) return;
    
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
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction,
          userPrompt: context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
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
      alert('Failed to process AI request. Please check your API key.');
    } finally {
      setIsProcessing(false);
      aiResponseRef.current = '';
      currentTriggerRef.current = null;
    }
  };


  const updateDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Always detect triggers from current editor content (not stale props)
    const currentContent = editor.getValue();
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
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

    // Add new decorations for fresh AI triggers
    const newDecorations = freshTriggers.map((trigger) => ({
      range: new monaco.Range(trigger.startLine + 1, 1, trigger.startLine + 1, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'ai-trigger-glyph',
        glyphMarginHoverMessage: {
          value: `Click to process ${trigger.type}`,
        },
      },
    }));

    decorationsRef.current = editor.deltaDecorations([], newDecorations);
  }, []);

  useEffect(() => {
    updateDecorations();
  }, [triggers, updateDecorations]);

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add custom CSS for glyph margin if not already added
    if (!document.getElementById('ai-trigger-styles')) {
      const style = document.createElement('style');
      style.id = 'ai-trigger-styles';
      style.textContent = `
        .ai-trigger-glyph {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
          width: 14px !important;
          height: 14px !important;
          margin-left: 3px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .ai-trigger-glyph::before {
          content: '✨';
          font-size: 10px;
          position: relative;
          top: -1px;
        }
        .ai-trigger-glyph:hover {
          transform: scale(1.2);
          transition: transform 0.2s;
        }
      `;
      document.head.appendChild(style);
    }

    // Handle glyph margin clicks - always detect fresh triggers from current content
    const handleClick = (e: any) => {
      // Check for glyph margin click (type 2) or line number click (type 3)
      if (e.target.type === 2 || e.target.type === 3) { 
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber && !isProcessing) {
          // Always get fresh content and detect triggers dynamically
          const currentContent = editor.getValue();
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

    editor.onMouseDown(handleClick);

    // Update decorations when content changes (manual edits)
    editor.onDidChangeModelContent(() => {
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
            <span className="text-xs text-gray-500 animate-pulse">Processing AI request...</span>
          )}
          {triggers.length > 0 && !isProcessing && (
            <span className="text-xs text-gray-500">
              {triggers.length} AI trigger{triggers.length > 1 ? 's' : ''} detected - Click the ✨ in the gutter to process
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