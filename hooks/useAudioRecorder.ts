'use client';

import { useState, useRef, useCallback } from 'react';

interface AudioChunk {
  blob: Blob;
  timestamp: Date;
}

interface UseAudioRecorderOptions {
  chunkDurationMs?: number;
  onChunk: (chunk: AudioChunk) => void;
  onError: (error: string) => void;
}

export function useAudioRecorder({
  chunkDurationMs = 30000,
  onChunk,
  onError,
}: UseAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  const flushChunk = useCallback(() => {
    if (!mediaRecorderRef.current || chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
    chunksRef.current = [];
    if (blob.size > 1000) {
      onChunk({ blob, timestamp: new Date() });
    }
  }, [onChunk]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(1000);
      setIsRecording(true);

      chunkTimerRef.current = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.requestData();
          flushChunk();
        }
      }, chunkDurationMs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      onError(msg);
    }
  }, [chunkDurationMs, flushChunk, onError]);

  const stopRecording = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // flush remaining
    setTimeout(() => {
      flushChunk();
    }, 200);

    setIsRecording(false);
  }, [flushChunk]);

  return { isRecording, startRecording, stopRecording };
}
