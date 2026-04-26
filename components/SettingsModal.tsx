'use client';

import { useState, useEffect } from 'react';
import { Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/defaults';

interface SettingsModalProps {
  isOpen: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (updates: Partial<Settings>) => void;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-300">{label}</label>
      {hint && <p className="text-xs text-zinc-600 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.07] transition-all duration-150';

const textareaClass =
  inputClass + ' resize-y font-mono text-xs leading-relaxed';

export function SettingsModal({ isOpen, settings, onClose, onSave }: SettingsModalProps) {
  const [form, setForm] = useState<Settings>(settings);
  const [tab, setTab] = useState<'api' | 'prompts' | 'advanced'>('api');

  useEffect(() => {
    setForm(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const resetPrompts = () => {
    setForm((prev) => ({
      ...prev,
      suggestionsPrompt: DEFAULT_SETTINGS.suggestionsPrompt,
      detailPrompt: DEFAULT_SETTINGS.detailPrompt,
      chatPrompt: DEFAULT_SETTINGS.chatPrompt,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#111115] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Settings</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Configure your API key, models, and prompts</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {(['api', 'prompts', 'advanced'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`
                px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all duration-150
                ${tab === t
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }
              `}
            >
              {t === 'api' ? 'API & Models' : t === 'prompts' ? 'Prompts' : 'Advanced'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {tab === 'api' && (
            <>
              <Field
                label="Groq API Key"
                hint="Get your key at console.groq.com. Never stored on our servers."
              >
                <input
                  type="password"
                  value={form.groqApiKey}
                  onChange={(e) => setForm({ ...form, groqApiKey: e.target.value })}
                  placeholder="gsk_..."
                  className={inputClass}
                />
              </Field>

              <Field label="Transcription Model">
                <input
                  value={form.transcriptionModel}
                  onChange={(e) => setForm({ ...form, transcriptionModel: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <Field label="Suggestions Model">
                <input
                  value={form.suggestionModel}
                  onChange={(e) => setForm({ ...form, suggestionModel: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <Field label="Chat Model">
                <input
                  value={form.chatModel}
                  onChange={(e) => setForm({ ...form, chatModel: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </>
          )}

          {tab === 'prompts' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">Edit the prompts that drive suggestion quality.</p>
                <button
                  onClick={resetPrompts}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
                >
                  Reset to defaults
                </button>
              </div>

              <Field
                label="Live Suggestions Prompt"
                hint="System prompt for generating the 3 contextual suggestions."
              >
                <textarea
                  value={form.suggestionsPrompt}
                  onChange={(e) => setForm({ ...form, suggestionsPrompt: e.target.value })}
                  rows={10}
                  className={textareaClass}
                />
              </Field>

              <Field
                label="Detail Prompt (on click)"
                hint="System prompt when expanding a suggestion for a detailed answer."
              >
                <textarea
                  value={form.detailPrompt}
                  onChange={(e) => setForm({ ...form, detailPrompt: e.target.value })}
                  rows={8}
                  className={textareaClass}
                />
              </Field>

              <Field
                label="Chat Prompt"
                hint="System prompt for the general chat panel."
              >
                <textarea
                  value={form.chatPrompt}
                  onChange={(e) => setForm({ ...form, chatPrompt: e.target.value })}
                  rows={6}
                  className={textareaClass}
                />
              </Field>
            </>
          )}

          {tab === 'advanced' && (
            <>
              <Field
                label="Auto-refresh interval (seconds)"
                hint="How often suggestions refresh automatically while recording."
              >
                <input
                  type="number"
                  value={form.refreshIntervalSeconds}
                  onChange={(e) => setForm({ ...form, refreshIntervalSeconds: Number(e.target.value) })}
                  min={10}
                  max={300}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Suggestion context window (characters)"
                hint="How much of the recent transcript to feed for suggestions."
              >
                <input
                  type="number"
                  value={form.suggestionContextChars}
                  onChange={(e) => setForm({ ...form, suggestionContextChars: Number(e.target.value) })}
                  min={500}
                  max={10000}
                  step={500}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Chat context window (characters)"
                hint="How much of the transcript to include with each chat message."
              >
                <input
                  type="number"
                  value={form.chatContextChars}
                  onChange={(e) => setForm({ ...form, chatContextChars: Number(e.target.value) })}
                  min={1000}
                  max={20000}
                  step={1000}
                  className={inputClass}
                />
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600/80 hover:bg-violet-600 text-white transition-all"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
