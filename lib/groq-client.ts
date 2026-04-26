import type { Suggestion } from './types';

const GROQ_BASE = 'https://api.groq.com/openai/v1';

function authHeader(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function transcribeAudio(
  apiKey: string,
  blob: Blob,
  model: string
): Promise<string> {
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const formData = new FormData();
  formData.append('file', blob, `audio.${ext}`);
  formData.append('model', model);
  formData.append('response_format', 'json');

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: authHeader(apiKey),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Transcription failed (${res.status})`);
  }

  const data = await res.json();
  return (data.text as string) ?? '';
}

export async function generateSuggestions(
  apiKey: string,
  transcript: string,
  prompt: string,
  model: string,
  contextChars: number
): Promise<Suggestion[]> {
  const recentTranscript = transcript.slice(-contextChars);

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { ...authHeader(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: `Current conversation transcript:\n\n${recentTranscript}\n\nGenerate exactly 3 suggestions now.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Suggestions failed (${res.status})`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { suggestions?: Suggestion[] };
  return (parsed.suggestions ?? []).slice(0, 3);
}

export async function* streamChatCompletion(
  apiKey: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt: string,
  transcript: string,
  model: string,
  contextChars: number
): AsyncGenerator<string> {
  const recentTranscript = transcript.slice(-contextChars);
  const contextBlock = recentTranscript
    ? `\n\nCurrent meeting transcript (for context):\n${recentTranscript}`
    : '';

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { ...authHeader(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt + contextBlock },
        ...messages,
      ],
      temperature: 0.6,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Chat failed (${res.status})`);
  }

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
      if (payload === '[DONE]') return;
      try {
        const chunk = JSON.parse(payload);
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}
