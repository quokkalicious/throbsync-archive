// src/app/api/story/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  // 1) Read incoming JSON
  const body = await request.json();

  // 2) Forward to your Grok proxy
  const proxyRes = await fetch(`${process.env.GROK_PROXY_URL}/api/grok`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!proxyRes.ok) {
    const details = await proxyRes.text().catch(() => '');
    return NextResponse.json(
      { error: 'Proxy error', details },
      { status: proxyRes.status || 500 }
    );
  }

  // 3) Extract story text from Grok
  const { story } = await proxyRes.json();

  // 4) Call ElevenLabs TTS
  const ttsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ELEVENLABS_API_KEY}`,
      },
      body: JSON.stringify({ text: story }),
    }
  );
  if (!ttsRes.ok) {
    const details = await ttsRes.text().catch(() => '');
    return NextResponse.json(
      { error: 'TTS error', details },
      { status: ttsRes.status || 500 }
    );
  }

  // 5) Read audio bytes and encode as base64
  const buf = await ttsRes.arrayBuffer();
  const b64 = Buffer.from(buf).toString('base64');
  const audio = `data:audio/mpeg;base64,${b64}`;

  // 6) Return story + audio
  return NextResponse.json({ story, audio });
}
