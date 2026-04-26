export type SuggestionType = 'QUESTION' | 'FACT' | 'TALKING_POINT' | 'ANSWER';

export interface Suggestion {
  type: SuggestionType;
  title: string;
  detail: string;
}

export interface SuggestionBatch {
  id: string;
  suggestions: Suggestion[];
  timestamp: Date;
  transcriptContext: string;
}

export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface SessionData {
  transcript: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatHistory: ChatMessage[];
  exportedAt: string;
}

export interface Settings {
  groqApiKey: string;
  suggestionModel: string;
  chatModel: string;
  transcriptionModel: string;
  suggestionsPrompt: string;
  detailPrompt: string;
  chatPrompt: string;
  suggestionContextChars: number;
  chatContextChars: number;
  refreshIntervalSeconds: number;
}
