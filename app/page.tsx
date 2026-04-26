'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { SuggestionsPanel } from '@/components/SuggestionsPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { ExportButton } from '@/components/ExportButton';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSettings } from '@/hooks/useSettings';
import { TranscriptChunk, SuggestionBatch, ChatMessage, Suggestion } from '@/lib/types';

function uuid() {
  return crypto.randomUUID();
}

export default function Home() {
  const { settings, updateSettings, loaded } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
  const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const suggestionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const transcriptRef = useRef('');

  const fullTranscript = transcriptChunks.map((c) => c.text).join(' ');

  // Keep transcript ref in sync for timer callbacks
  useEffect(() => {
    transcriptRef.current = fullTranscript;
  }, [fullTranscript]);

  const fetchSuggestions = useCallback(
    async (transcript: string) => {
      if (!settings.groqApiKey || !transcript.trim()) return;
      setIsFetchingSuggestions(true);
      try {
        const res = await fetch('/api/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-groq-api-key': settings.groqApiKey,
          },
          body: JSON.stringify({
            transcript,
            prompt: settings.suggestionsPrompt,
            model: settings.suggestionModel,
            contextChars: settings.suggestionContextChars,
          }),
        });

        const data = await res.json();
        if (data.suggestions?.length > 0) {
          setSuggestionBatches((prev) => [
            ...prev,
            {
              id: uuid(),
              suggestions: data.suggestions,
              timestamp: new Date(),
              transcriptContext: transcript.slice(-settings.suggestionContextChars),
            },
          ]);
        }
      } catch {
        // suggestions are non-critical
      } finally {
        setIsFetchingSuggestions(false);
      }
    },
    [settings.groqApiKey, settings.suggestionModel, settings.suggestionsPrompt, settings.suggestionContextChars]
  );

  const transcribeChunk = useCallback(
    async (blob: Blob) => {
      if (!settings.groqApiKey) return;
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        formData.append('audio', blob, `audio.${ext}`);
        formData.append('model', settings.transcriptionModel);

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'x-groq-api-key': settings.groqApiKey },
          body: formData,
        });

        const data = await res.json();
        if (data.text?.trim()) {
          setTranscriptChunks((prev) => [
            ...prev,
            { id: uuid(), text: data.text.trim(), timestamp: new Date() },
          ]);
        }
      } catch {
        // silently ignore — don't break recording
      } finally {
        setIsTranscribing(false);
      }
    },
    [settings.groqApiKey, settings.transcriptionModel]
  );

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    chunkDurationMs: 30000,
    onChunk: ({ blob }) => transcribeChunk(blob),
    onError: (err) => setMicError(err),
  });

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Auto-refresh suggestions while recording
  useEffect(() => {
    if (isRecording) {
      suggestionTimerRef.current = setInterval(() => {
        if (isRecordingRef.current && transcriptRef.current.trim()) {
          fetchSuggestions(transcriptRef.current);
        }
      }, settings.refreshIntervalSeconds * 1000);
    } else {
      if (suggestionTimerRef.current) {
        clearInterval(suggestionTimerRef.current);
        suggestionTimerRef.current = null;
      }
    }
    return () => {
      if (suggestionTimerRef.current) clearInterval(suggestionTimerRef.current);
    };
  }, [isRecording, settings.refreshIntervalSeconds, fetchSuggestions]);

  const handleManualRefresh = () => {
    fetchSuggestions(fullTranscript);
  };

  const streamChat = useCallback(
    async (
      assistantMsgId: string,
      systemPrompt: string,
      messages: { role: 'user' | 'assistant'; content: string }[]
    ) => {
      setIsChatStreaming(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-groq-api-key': settings.groqApiKey,
          },
          body: JSON.stringify({
            messages,
            systemPrompt,
            transcript: transcriptRef.current,
            model: settings.chatModel,
            contextChars: settings.chatContextChars,
          }),
        });

        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') break;
            try {
              const { delta } = JSON.parse(payload);
              if (delta) {
                setChatMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: m.content + delta } : m
                  )
                );
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        const errorText = err instanceof Error ? err.message : 'Chat failed';
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: errorText } : m
          )
        );
      } finally {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
        );
        setIsChatStreaming(false);
      }
    },
    [settings.groqApiKey, settings.chatModel, settings.chatContextChars]
  );

  const handleSuggestionClick = useCallback(
    async (suggestion: Suggestion) => {
      if (!settings.groqApiKey) { setSettingsOpen(true); return; }

      const userMsg: ChatMessage = {
        id: uuid(),
        role: 'user',
        content: `Tell me more about: **${suggestion.title}**\n\n${suggestion.detail}`,
        timestamp: new Date(),
      };
      const assistantMsg: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setChatMessages((prev) => [...prev, userMsg, assistantMsg]);

      await streamChat(
        assistantMsg.id,
        settings.detailPrompt,
        [
          ...chatMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content: userMsg.content },
        ]
      );
    },
    [settings, chatMessages, streamChat]
  );

  const handleChatSend = useCallback(
    async (content: string) => {
      if (!settings.groqApiKey) { setSettingsOpen(true); return; }

      const userMsg: ChatMessage = { id: uuid(), role: 'user', content, timestamp: new Date() };
      const assistantMsg: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setChatMessages((prev) => [...prev, userMsg, assistantMsg]);

      await streamChat(
        assistantMsg.id,
        settings.chatPrompt,
        [
          ...chatMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content },
        ]
      );
    },
    [settings, chatMessages, streamChat]
  );

  const handleStartRecording = () => {
    if (!settings.groqApiKey) { setSettingsOpen(true); return; }
    setMicError(null);
    startRecording();
  };

  useEffect(() => {
    if (loaded && !settings.groqApiKey) setSettingsOpen(true);
  }, [loaded, settings.groqApiKey]);

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-600/80 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-zinc-100">TwinMind</span>
            <span className="text-xs text-zinc-600">Live Copilot</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
              </span>
              <span className="text-[11px] font-medium text-red-400">Recording</span>
            </div>
          )}

          <ExportButton
            transcript={transcriptChunks}
            suggestionBatches={suggestionBatches}
            chatHistory={chatMessages}
          />

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </header>

      {/* No API key banner */}
      {loaded && !settings.groqApiKey && (
        <div
          className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-all shrink-0"
          onClick={() => setSettingsOpen(true)}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-sm text-amber-300">Add your Groq API key to get started</span>
          </div>
          <span className="text-xs text-amber-400 font-medium">Open Settings →</span>
        </div>
      )}

      {/* Three columns */}
      <main className="flex-1 flex min-h-0 overflow-hidden p-4 pt-3 gap-3">
        <div className="w-[29%] shrink-0 bg-[#111115] rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col">
          <TranscriptPanel
            chunks={transcriptChunks}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            onStartRecording={handleStartRecording}
            onStopRecording={stopRecording}
            error={micError}
          />
        </div>

        <div className="w-[35%] shrink-0 bg-[#111115] rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col">
          <SuggestionsPanel
            batches={suggestionBatches}
            isLoading={isFetchingSuggestions}
            hasTranscript={fullTranscript.trim().length > 0}
            onRefresh={handleManualRefresh}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>

        <div className="flex-1 min-w-0 bg-[#111115] rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col">
          <ChatPanel
            messages={chatMessages}
            isStreaming={isChatStreaming}
            onSendMessage={handleChatSend}
          />
        </div>
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
      />
    </div>
  );
}
