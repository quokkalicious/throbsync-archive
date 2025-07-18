// File: src/app/api/story/route.js
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: '✅ ThrobSync is live (stub)!',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    const storyText = `Hello ${name}, this is a stub story. Your real Grok integration will replace this.`;

    const ELEVEN_KEY     = process.env.ELEVENLABS_API_KEY;
    const ELEVEN_VOICEID = process.env.ELEVENLABS_VOICE_ID;
    if (!ELEVEN_KEY || !ELEVEN_VOICEID) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICEID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_KEY
        },
        body: JSON.stringify({
          text: storyText,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      }
    );
    if (!elevenRes.ok) {
      const err = await elevenRes.text().catch(() => '');
      return NextResponse.json({ error: 'TTS error', details: err }, { status: elevenRes.status });
    }

    const buf = await elevenRes.arrayBuffer();
    const audio = `data:audio/mp3;base64,${Buffer.from(buf).toString('base64')}`;
    return NextResponse.json({ story: storyText, audio });
  } catch (err) {
    console.error('Stub route error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}
