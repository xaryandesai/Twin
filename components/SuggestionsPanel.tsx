'use client';

import { SuggestionBatch, Suggestion } from '@/lib/types';
import { SUGGESTION_TYPE_META } from '@/lib/defaults';

interface SuggestionsPanelProps {
  batches: SuggestionBatch[];
  isLoading: boolean;
  hasTranscript: boolean;
  onRefresh: () => void;
  onSuggestionClick: (suggestion: Suggestion, batchTranscript: string) => void;
}

function SuggestionCard({
  suggestion,
  onClick,
  isNew,
}: {
  suggestion: Suggestion;
  onClick: () => void;
  isNew: boolean;
}) {
  const meta = SUGGESTION_TYPE_META[suggestion.type] ?? SUGGESTION_TYPE_META.FACT;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-xl border transition-all duration-200 group
        bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12]
        ${isNew ? 'animate-in' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${meta.bg} ${meta.color} ${meta.border} border`}>
          {meta.label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 leading-snug mb-1.5 group-hover:text-white transition-colors">
            {suggestion.title}
          </p>
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 group-hover:text-zinc-400 transition-colors">
            {suggestion.detail}
          </p>
        </div>
        <svg
          className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5 group-hover:text-zinc-400 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </button>
  );
}

function BatchGroup({
  batch,
  isLatest,
  onSuggestionClick,
}: {
  batch: SuggestionBatch;
  isLatest: boolean;
  onSuggestionClick: (s: Suggestion) => void;
}) {
  const time = batch.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className={`text-[10px] font-semibold tracking-widest uppercase ${isLatest ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {isLatest ? 'Latest' : time}
        </span>
        {isLatest && (
          <span className="text-[10px] text-zinc-600 font-mono">{time}</span>
        )}
      </div>
      <div className="space-y-2">
        {batch.suggestions.map((s, i) => (
          <SuggestionCard
            key={i}
            suggestion={s}
            onClick={() => onSuggestionClick(s)}
            isNew={isLatest}
          />
        ))}
      </div>
    </div>
  );
}

export function SuggestionsPanel({
  batches,
  isLoading,
  hasTranscript,
  onRefresh,
  onSuggestionClick,
}: SuggestionsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-violet-400 animate-pulse' : 'bg-zinc-500'}`} />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
            Suggestions
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading || !hasTranscript}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          title="Refresh suggestions"
        >
          <svg
            className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 min-h-0">
        {!hasTranscript && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Suggestions will appear<br />once you start recording
            </p>
          </div>
        )}

        {hasTranscript && batches.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
            <p className="text-sm text-zinc-500">
              Hit refresh or wait for auto-refresh
            </p>
          </div>
        )}

        {isLoading && batches.length === 0 && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/[0.07] animate-pulse" />
            ))}
          </div>
        )}

        {/* Batches — newest at top */}
        {[...batches].reverse().map((batch, idx) => (
          <BatchGroup
            key={batch.id}
            batch={batch}
            isLatest={idx === 0}
            onSuggestionClick={(s) => onSuggestionClick(s, batch.transcriptContext)}
          />
        ))}
      </div>
    </div>
  );
}
