export interface MarkdownFile {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isIncluded?: boolean;
}

export interface AITrigger {
  type: 'ai-template' | 'ai-write';
  topic: string;
  startIndex: number;
  endIndex: number;
}