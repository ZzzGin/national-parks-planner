'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Components } from 'react-markdown';

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const cleanContent = content.replace(/```ai-(template|write)[\s\S]*?```/g, '');

  const components: Partial<Components> = {
    h1: ({children}) => <h1 className="text-3xl font-bold mb-4 mt-6">{children}</h1>,
    h2: ({children}) => <h2 className="text-2xl font-semibold mb-3 mt-5">{children}</h2>,
    h3: ({children}) => <h3 className="text-xl font-semibold mb-2 mt-4">{children}</h3>,
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
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-700">Preview</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
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
  );
}