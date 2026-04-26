import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-api-key');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  const formData = await req.formData();
  const audio = formData.get('audio') as File | null;
  const model = (formData.get('model') as string) || 'whisper-large-v3';

  if (!audio) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  const groq = new Groq({ apiKey });

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model,
      response_format: 'json',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
