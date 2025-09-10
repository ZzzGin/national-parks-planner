'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Components } from 'react-markdown';

interface MarkdownPreviewProps {
  content: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const cleanContent = content.replace(/\^\^\^ai-(template|write)[\s\S]*?\^\^\^/g, '');
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: TocItem[] = [];
    let match;
    
    while ((match = headingRegex.exec(cleanContent)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      items.push({ id, text, level });
    }
    
    setTocItems(items);
  }, [cleanContent]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const components: Partial<Components> = {
    h1: ({children}) => {
      const text = children?.toString() || '';
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return <h1 id={id} className="text-3xl font-bold mb-4 mt-6 scroll-mt-4">{children}</h1>;
    },
    h2: ({children}) => {
      const text = children?.toString() || '';
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return <h2 id={id} className="text-2xl font-semibold mb-3 mt-5 scroll-mt-4">{children}</h2>;
    },
    h3: ({children}) => {
      const text = children?.toString() || '';
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return <h3 id={id} className="text-xl font-semibold mb-2 mt-4 scroll-mt-4">{children}</h3>;
    },
    h4: ({children}) => {
      const text = children?.toString() || '';
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return <h4 id={id} className="text-lg font-semibold mb-2 mt-3 scroll-mt-4">{children}</h4>;
    },
    h5: ({children}) => {
      const text = children?.toString() || '';
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return <h5 id={id} className="text-base font-semibold mb-2 mt-3 scroll-mt-4">{children}</h5>;
    },
    h6: ({children}) => {
      const text = children?.toString() || '';
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return <h6 id={id} className="text-sm font-semibold mb-2 mt-3 scroll-mt-4">{children}</h6>;
    },
    p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
    ul: ({children}) => <ul className="mb-4 ml-6 list-disc space-y-1">{children}</ul>,
    ol: ({children}) => <ol className="mb-4 ml-6 list-decimal space-y-1">{children}</ol>,
    li: ({children}) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({children}) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">{children}</blockquote>
    ),
    code: ({className, children, ...props}) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;
      
      if (isInline) {
        return (
          <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
            {children}
          </code>
        );
      }
      
      return (
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code className="text-sm font-mono" {...props}>
            {children}
          </code>
        </pre>
      );
    },
    a: ({href, children}) => (
      <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    hr: () => <hr className="my-6 border-gray-300" />,
    table: ({children}) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border-collapse border border-gray-300">{children}</table>
      </div>
    ),
    thead: ({children}) => <thead className="bg-gray-100">{children}</thead>,
    tbody: ({children}) => <tbody>{children}</tbody>,
    tr: ({children}) => <tr className="border-b border-gray-300">{children}</tr>,
    th: ({children}) => <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{children}</th>,
    td: ({children}) => <td className="border border-gray-300 px-4 py-2">{children}</td>,
  };

  return (
    <div className="h-full flex">
      {/* Main Preview Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-2 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-700">Preview</h2>
        </div>
        
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-none text-gray-800">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={components}
            >
              {cleanContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Table of Contents Sidebar - Right Side */}
      <div className={`${isTocOpen ? 'w-64' : 'w-12'} border-l border-gray-200 bg-gray-50 transition-all duration-300 flex flex-col`}>
        <div className="p-2 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setIsTocOpen(!isTocOpen)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title={isTocOpen ? 'Collapse TOC' : 'Expand TOC'}
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isTocOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
          {isTocOpen && <h3 className="text-sm font-medium text-gray-700">Table of Contents</h3>}
        </div>
        
        {isTocOpen && (
          <div className="flex-1 overflow-y-auto p-3">
            {tocItems.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No headings found</p>
            ) : (
              <ul className="space-y-1">
                {tocItems.map((item, index) => (
                  <li
                    key={index}
                    style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                  >
                    <button
                      onClick={() => scrollToHeading(item.id)}
                      className="text-left w-full text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}