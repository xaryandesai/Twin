import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { Suggestion } from '@/lib/types';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-api-key');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  const body = await req.json();
  const { transcript, prompt, model, contextChars } = body as {
    transcript: string;
    prompt: string;
    model: string;
    contextChars: number;
  };

  if (!transcript?.trim()) {
    return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
  }

  const recentTranscript = transcript.slice(-contextChars);
  const groq = new Groq({ apiKey });

  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Current conversation transcript:\n\n${recentTranscript}\n\nGenerate exactly 3 suggestions now.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as { suggestions?: Suggestion[] };
    const suggestions: Suggestion[] = (parsed.suggestions ?? []).slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Suggestion generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
