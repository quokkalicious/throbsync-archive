// src/app/api/story/route.js

import { NextResponse } from 'next/server'
import fetch from 'node-fetch'
import { Readable } from 'stream'

// In-memory rate limiter: 3 requests/min per IP
const rateLimitMap = new Map()
const RATE_LIMIT_TOKENS = 3
const REFILL_INTERVAL = 60_000

export async function POST(request) {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.ip ||
    'unknown-client'

  // Rate-limiting logic
  let bucket = rateLimitMap.get(ip)
  const now = Date.now()
  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_TOKENS, lastRefill: now }
    rateLimitMap.set(ip, bucket)
  }
  if (now - bucket.lastRefill > REFILL_INTERVAL) {
    bucket.tokens = RATE_LIMIT_TOKENS
    bucket.lastRefill = now
  }
  if (bucket.tokens <= 0) {
    return NextResponse.json(
      { error: 'Rate limit exceeded, try again in a minute.' },
      { status: 429 }
    )
  }
  bucket.tokens--

  // Parse + validate inputs
  const body = await request.json()
  const {
    orientation,
    session_type,
    tone,
    voice,
    length,
    anatomy,
    ball_play,
    cock_size,
    scenario,
    your_name,
    partner_name,
  } = body

  if (!orientation || !session_type || !scenario) {
    return NextResponse.json(
      { error: 'Missing orientation, session_type or scenario.' },
      { status: 400 }
    )
  }

  // Sanitize (basic)
  const safe = (str) =>
    str ? str.replace(/[<>/]/g, '') : ''

  const prompt = `
Create an explicit, arousing guided masturbation story for a male user, using teasing language like "your cock throbs" and "stroke that shaft slowly". Tailor to:
- Orientation: ${safe(orientation)}
- Session Type: ${safe(session_type)}
- Tone: ${safe(tone)}
- Scenario: ${safe(scenario)}
- Length: ${safe(length)} minutes
- Anatomy cue: ${safe(anatomy)}
- Ball play? ${ball_play ? 'Yes' : 'No'}
- Cock size mention? ${cock_size ? 'Yes' : 'No'}
- Your name: ${safe(your_name)}
- Partner name: ${safe(partner_name)}
End with a cliffhanger to entice the next session.
`

  // 1) Call Grok
  const grokRes = await fetch(
    'https://api.x.ai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a seductive storyteller of explicit male masturbation fantasies.',
          },
          { role: 'user', content: prompt.trim() },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    }
  )
  if (!grokRes.ok) {
    return NextResponse.json(
      { error: 'Grok API error' },
      { status: 502 }
    )
  }
  const grokData = await grokRes.json()
  const storyText = grokData.choices[0].message.content

  // 2) Call ElevenLabs TTS (streaming)
  const ttsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: storyText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    }
  )
  if (!ttsRes.ok) {
    return NextResponse.json(
      { error: 'ElevenLabs TTS error' },
      { status: 502 }
    )
  }

  // Stream MP3 back
  const audioStream = Readable.from(await ttsRes.arrayBuffer())
  return new NextResponse(audioStream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition':
        'inline; filename="throbsync.mp3"',
    },
  })
}
