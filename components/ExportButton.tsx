'use client';

import { TranscriptChunk, SuggestionBatch, ChatMessage, SessionData } from '@/lib/types';

interface ExportButtonProps {
  transcript: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatHistory: ChatMessage[];
}

export function ExportButton({ transcript, suggestionBatches, chatHistory }: ExportButtonProps) {
  const handleExport = () => {
    const data: SessionData = {
      transcript,
      suggestionBatches,
      chatHistory,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twinmind-session-${new Date().toISOString().slice(0, 16).replace('T', '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isEmpty = transcript.length === 0 && suggestionBatches.length === 0 && chatHistory.length === 0;

  return (
    <button
      onClick={handleExport}
      disabled={isEmpty}
      title="Export session as JSON"
      className="
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        text-zinc-500 hover:text-zinc-300 border border-white/[0.06] hover:border-white/[0.12]
        hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed
        transition-all duration-150
      "
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      Export
    </button>
  );
}
