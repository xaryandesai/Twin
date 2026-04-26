import type { Settings } from './types';

export const DEFAULT_SUGGESTIONS_PROMPT = `You are an expert AI meeting copilot. Your job is to surface the 3 most useful suggestions RIGHT NOW based on what is being said in the conversation.

Think like a brilliant advisor sitting next to the listener. What would they most want to know or say in the next 30 seconds?

Analyze the conversation and return exactly 3 suggestions, each one of these types:
- QUESTION: A sharp, specific question to ask the speaker that would clarify, deepen, or advance the discussion
- FACT: A concrete fact, statistic, or piece of knowledge directly relevant to what was just said
- TALKING_POINT: A strong perspective, counterpoint, addition, or insight the listener could contribute
- ANSWER: A direct answer to a question that was just asked in the conversation

Rules:
- Focus on the LAST 60-90 seconds of conversation (most recent context)
- The title alone must be immediately useful — a complete thought, not a teaser
- Be hyper-specific to what was actually said, never generic
- Mix types based on what the conversation genuinely needs right now
- Titles: max 12 words, present tense, direct
- Details: 2-3 sentences of concrete, actionable information

Return ONLY valid JSON, nothing else:
{"suggestions": [{"type": "QUESTION|FACT|TALKING_POINT|ANSWER", "title": "...", "detail": "..."}]}`;

export const DEFAULT_DETAIL_PROMPT = `You are an expert AI meeting assistant. The user is in a live conversation and clicked a suggestion for more depth.

Your job: give them a focused, expert-level response they can immediately use in their conversation. Be direct and dense with useful information — no padding.

Structure your response with:
1. The core insight or answer (1-2 sentences, bold the key point mentally)
2. Supporting evidence, context, or nuance (2-3 sentences)
3. How they can use this RIGHT NOW in their conversation (1-2 sentences)

Be specific, not generic. Reference what was actually discussed.`;

export const DEFAULT_CHAT_PROMPT = `You are an expert AI meeting assistant. The user is in a live conversation and asking you a question.

Answer concisely and usefully. Be direct — they're in a meeting and need the information fast. Reference their conversation context when relevant. Avoid preamble.`;

export const DEFAULT_SETTINGS: Settings = {
  groqApiKey: '',
  suggestionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  chatModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  transcriptionModel: 'whisper-large-v3',
  suggestionsPrompt: DEFAULT_SUGGESTIONS_PROMPT,
  detailPrompt: DEFAULT_DETAIL_PROMPT,
  chatPrompt: DEFAULT_CHAT_PROMPT,
  suggestionContextChars: 3000,
  chatContextChars: 6000,
  refreshIntervalSeconds: 30,
};

export const SUGGESTION_TYPE_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  QUESTION: {
    label: 'Ask',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/20',
  },
  FACT: {
    label: 'Fact',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  TALKING_POINT: {
    label: 'Say',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
  },
  ANSWER: {
    label: 'Answer',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
  },
};
