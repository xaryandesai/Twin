'use client';

import { useEffect, useRef } from 'react';
import { TranscriptChunk } from '@/lib/types';

interface TranscriptPanelProps {
  chunks: TranscriptChunk[];
  isRecording: boolean;
  isTranscribing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  error: string | null;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function TranscriptPanel({
  chunks,
  isRecording,
  isTranscribing,
  onStartRecording,
  onStopRecording,
  error,
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasTranscript = chunks.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chunks]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
            Transcript
          </span>
        </div>
        {isTranscribing && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span>Transcribing</span>
          </div>
        )}
      </div>

      {/* Transcript area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {!hasTranscript && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Start recording to capture<br />your conversation
              </p>
            </div>
          </div>
        )}

        {chunks.map((chunk, idx) => (
          <div key={chunk.id} className="group">
            <div className="flex items-start gap-3">
              <span className="text-[10px] text-zinc-600 mt-0.5 shrink-0 font-mono tabular-nums pt-[1px]">
                {formatTime(chunk.timestamp)}
              </span>
              <p className={`text-sm leading-relaxed text-zinc-300 ${idx === chunks.length - 1 ? 'text-zinc-200' : ''}`}>
                {chunk.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Mic button */}
      <div className="px-5 pb-5 pt-3 border-t border-white/5">
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          className={`
            w-full py-3 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2.5
            ${isRecording
              ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/20'
              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }
          `}
        >
          {isRecording ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
              </span>
              Stop Recording
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              Start Recording
            </>
          )}
        </button>
      </div>
    </div>
  );
}
