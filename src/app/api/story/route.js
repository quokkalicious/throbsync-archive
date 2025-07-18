// File: src/app/api/story/route.js
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: '✅ ThrobSync App‐Router is live!',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request) {
  try {
    // 1) Parse your inputs (later expand to orientation, tone, etc.)
    const { name /*, orientation, tone, ... */ } = await request.json();

    // 2) Build Grok payload
    const grokPayload = {
      name,
      /* orientation, tone, sessionType, scenario, anatomy, size, duration */
    };

    // 3) Call your Grok proxy
    const GROK_URL = process.env.GROK_API_URL;
    const GROK_KEY = process.env.GROK_API_KEY;
    if (!GROK_URL || !GROK_KEY) {
      return NextResponse.json({ error: 'Missing GROK env vars' }, { status: 500 });
    }
    const grokRes = await fetch(GROK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_KEY}`
      },
      body: JSON.stringify(grokPayload)
    });
    if (!grokRes.ok) {
      const details = await grokRes.text().catch(() => '');
      return NextResponse.json({ error: 'Grok proxy error', details }, { status: grokRes.status });
    }
    const grokJson = await grokRes.json();
    const storyText = grokJson.story || grokJson.text || grokJson.output;
    if (!storyText) {
      return NextResponse.json({ error: 'Grok returned no text' }, { status: 502 });
    }

    // 4) Send storyText to ElevenLabs TTS
    const ELEVEN_KEY     = process.env.ELEVENLABS_API_KEY;
    const ELEVEN_VOICEID = process.env.ELEVENLABS_VOICE_ID;
    if (!ELEVEN_KEY || !ELEVEN_VOICEID) {
      return NextResponse.json({ error: 'Missing ElevenLabs env vars' }, { status: 500 });
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
      const details = await elevenRes.text().catch(() => '');
      return NextResponse.json({ error: 'TTS error', details }, { status: elevenRes.status });
    }
    const buf = await elevenRes.arrayBuffer();
    const audio = `data:audio/mp3;base64,${Buffer.from(buf).toString('base64')}`;

    // 5) Return both story and audio
    return NextResponse.json({ story: storyText, audio });

  } catch (err) {
    console.error('ThrobSync route error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}
