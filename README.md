# TwinMind — Live Meeting Copilot

A real-time AI meeting copilot that listens to your conversation, surfaces contextual suggestions every 30 seconds, and lets you click into detailed answers or chat freely — all powered by Groq.

## What it does

Three-panel layout:

| Panel | What's inside |
|---|---|
| **Transcript (left)** | Live mic → Whisper transcription in 30s chunks, auto-scrolling |
| **Suggestions (middle)** | 3 fresh AI suggestions every ~30s, stacked newest-first, each clickable |
| **Chat (right)** | Click a suggestion for a detailed answer, or type anything |

Suggestions are typed — **Ask** (question to raise), **Fact** (relevant data), **Say** (talking point), **Answer** (response to a question just asked) — and the model picks the right mix based on what is actually being discussed.

## Stack

- **Frontend / Backend**: Next.js 15 (App Router, API routes)
- **Transcription**: Groq `whisper-large-v3`
- **Suggestions + Chat**: Groq `meta-llama/llama-4-scout-17b-16e-instruct`
- **Streaming**: SSE via `ReadableStream` in `/api/chat`
- **Styling**: Tailwind CSS v4, Geist font
- **Persistence**: `localStorage` for settings only — no backend, no login

## Setup

```bash
git clone <repo>
cd Twin
npm install
npm run dev
```

Open `http://localhost:3000`, click **Settings**, paste your [Groq API key](https://console.groq.com/keys), and start recording.

No `.env` file needed — the key lives only in your browser's `localStorage`.

## Prompt Strategy

### Suggestions prompt
Generates exactly 3 suggestions useful in the next 30 seconds. Key decisions:

- **Recency bias**: Explicitly focuses on the last 60-90 seconds, not the full transcript. Keeps suggestions anchored to what was just said.
- **Typed suggestions**: Forces the model to categorize each as Ask / Fact / Say / Answer — makes it reason about *what kind of help is needed* rather than defaulting to generic summaries.
- **Title = standalone value**: The preview title must be a complete, useful thought — not a teaser. A user in a live meeting shouldn't have to click to get value.
- **JSON mode**: `response_format: { type: 'json_object' }` guarantees parseable output.
- **Temperature 0.7**: High enough for variety across refreshes, low enough to stay grounded.

### Detail prompt (on click)
Structured as: core insight → supporting evidence → how to use it right now. Forces the model to be immediately actionable rather than encyclopedic.

### Chat prompt
Minimal — "you're in a meeting, be fast and direct." The full transcript context is injected separately so the prompt stays clean and reusable.

### Context window choices
- **Suggestions**: Last 3,000 chars (~2-3 minutes of speech). Enough to understand the topic without burying the model in old context.
- **Chat**: Last 6,000 chars — users asking follow-ups might reference earlier parts of the conversation.

Both are configurable in Settings.

## Tradeoffs

**30s audio chunks**: Whisper works best on audio of a few seconds or more. 30s is a good tradeoff between latency and transcription quality. The timer flushes any remaining audio when recording stops.

**No sentence boundary detection**: The current implementation sends raw 30s blobs to Whisper. A production improvement would use VAD (Voice Activity Detection) to chunk at natural pauses, reducing mid-word cuts.

**Model choice**: `llama-4-scout-17b-16e-instruct` is fast on Groq with strong enough reasoning for good suggestion quality. The model ID is configurable in Settings if you want to trade latency for quality.

**No persistence**: Session state is in-memory; the JSON export is the intentional mechanism for saving sessions.

## Export

Click **Export** in the header to download a timestamped JSON file containing:
- Full transcript (chunked with timestamps)
- Every suggestion batch (with the transcript context snapshot used to generate it)
- Full chat history

## Deployment

Works on Vercel, Railway, Render, or any Node.js host that supports Next.js.

```bash
npm run build
npm start
```

No environment variables required — users bring their own Groq API key via the Settings panel.

## Settings (all configurable at runtime)

- Groq API key
- Model IDs for transcription, suggestions, and chat
- All three system prompts
- Context window sizes (chars)
- Auto-refresh interval (seconds)
