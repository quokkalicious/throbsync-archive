// File: src/app/api/story/route.js
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: '✅ ThrobSync is live!',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request) {
  try {
    const {
      orientation, tone, sessionType,
      scenario, anatomy, size,
      name, duration
    } = await request.json();

    const GROK_KEY       = process.env.GROK_API_KEY;
    const ELEVEN_KEY     = process.env.ELEVENLABS_API_KEY;
    const ELEVEN_VOICEID = process.env.ELEVENLABS_VOICE_ID;
    if (!GROK_KEY || !ELEVEN_KEY || !ELEVEN_VOICEID) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    const prompt = `Generate an explicit erotic story for a ${orientation} user named ${name}, ` +
      `with a ${tone} tone, session ${sessionType}, scenario ${scenario}, ` +
      `${anatomy}${anatomy==='size'?` size ${size}`:''}, lasting ${duration} minutes. ` +
      `Use vivid, body-positive language and end on a tease.`;

    // <-- NEW: OpenAI-compatible completions endpoint -->
    const grokRes = await fetch(
      'https://api.x.ai/v1/engines/grok-4/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_KEY}`
        },
        body: JSON.stringify({
          prompt,
          max_tokens: 300,
          temperature: 0.7
        })
      }
    );
    if (!grokRes.ok) {
      const err = await grokRes.text().catch(()=>'');
      return NextResponse.json({ error:'Grok error', details:err }, { status:grokRes.status });
    }
    const data = await grokRes.json();
    const storyText = data.choices?.[0]?.text;
    if (!storyText) {
      return NextResponse.json({ error:'No story returned' }, { status:502 });
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
          voice_settings: { stability:0.5, similarity_boost:0.75 }
        })
      }
    );
    if (!elevenRes.ok) {
      const e = await elevenRes.text().catch(()=> '');
      return NextResponse.json({ error:'TTS error', details:e }, { status:elevenRes.status });
    }
    const buf = await elevenRes.arrayBuffer();
    const audio = `data:audio/mp3;base64,${Buffer.from(buf).toString('base64')}`;

    return NextResponse.json({ story: storyText, audio });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error:'Internal error', message:err.message }, { status:500 });
  }
}
