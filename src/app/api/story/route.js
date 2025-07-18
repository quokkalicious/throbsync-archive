// src/app/api/story/route.js
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request) {
  // 1) Validate env vars
  const GROK_PROXY_URL      = process.env.GROK_PROXY_URL;
  const ELEVENLABS_API_KEY  = process.env.ELEVENLABS_API_KEY;
  const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
  if (!GROK_PROXY_URL) {
    return NextResponse.json({ error: 'Missing GROK_PROXY_URL' }, { status: 500 });
  }
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'Missing ELEVENLABS_API_KEY' }, { status: 500 });
  }
  if (!ELEVENLABS_VOICE_ID) {
    return NextResponse.json({ error: 'Missing ELEVENLABS_VOICE_ID' }, { status: 500 });
  }

  // 2) Forward to Grok proxy
  let proxyRes;
  try {
    proxyRes = await fetch(`${GROK_PROXY_URL}/story`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    await request.text(), // forward raw JSON body
    });
  } catch (e) {
    return NextResponse.json({ error: 'Proxy fetch failed', details: e.message }, { status: 502 });
  }

  // 3) Proxy returned non-OK?
  if (!proxyRes.ok) {
    const text = await proxyRes.text().catch(() => '');
    return NextResponse.json(
      { error: 'Proxy error', details: text },
      { status: proxyRes.status || 500 }
    );
  }

  // 4) Read grok’s generated story & optional audio URL (stubbed proxy may send null)
  const { story, audio: existingAudio } = await proxyRes.json();

  // 5) If the proxy already gave us base64 audio, just return it
  if (existingAudio) {
    return NextResponse.json({ story, audio: existingAudio });
  }

  // 6) Otherwise, call ElevenLabs TTS on the generated story
  let ttsRes;
  try {
    ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'xi-api-key':     ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: story,
          voice_settings: { stability: 0.5, similarity_boost: 0.5 },
        }),
      }
    );
  } catch (e) {
    return NextResponse.json({ error: 'TTS fetch failed', details: e.message }, { status: 502 });
  }

  if (!ttsRes.ok) {
    const text = await ttsRes.text().catch(() => '');
    return NextResponse.json(
      { error: 'TTS error', details: text },
      { status: ttsRes.status || 500 }
    );
  }

  // 7) Bundle up the audio bytes as base64
  const buf = await ttsRes.arrayBuffer();
  const base64 = Buffer.from(buf).toString('base64');
  const audioData = `data:audio/mpeg;base64,${base64}`;

  // 8) Return both story text and the new audio
  return NextResponse.json({ story, audio: audioData });
}
