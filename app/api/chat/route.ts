import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-api-key');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing Groq API key' }), { status: 401 });
  }

  const body = await req.json();
  const { messages, systemPrompt, transcript, model, contextChars } = body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    systemPrompt: string;
    transcript: string;
    model: string;
    contextChars: number;
  };

  const recentTranscript = transcript ? transcript.slice(-contextChars) : '';
  const contextBlock = recentTranscript
    ? `\n\nCurrent meeting transcript (for context):\n${recentTranscript}`
    : '';

  const groq = new Groq({ apiKey });

  const stream = await groq.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt + contextBlock,
      },
      ...messages,
    ],
    temperature: 0.6,
    max_tokens: 1024,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
