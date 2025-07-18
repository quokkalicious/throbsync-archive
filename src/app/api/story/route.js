// src/app/api/story/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  // pull in whatever JSON you need from the client:
  const body = await request.json();
  const { name, orientation, tone, sessionType, scenario, anatomy, size, duration } = body;

  //  ———————————————————————————————
  //  1) Call your already-live Grok proxy directly:
  //  ———————————————————————————————
  const proxyRes = await fetch(
    'https://grok-proxy-dnkj.vercel.app/api/grok',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // whatever shape your proxy expects—here’s an example:
        orientation,
        tone,
        sessionType,
        scenario,
        anatomy,
        size,
        duration,
        name,
      }),
    }
  );

  if (!proxyRes.ok) {
    // bubble up a clear error
    const text = await proxyRes.text().catch(() => '');
    return NextResponse.json(
      { error: 'Proxy error', details: text },
      { status: proxyRes.status || 500 }
    );
  }

  const { story, audio } = await proxyRes.json();

  //  ———————————————————————————————
  //  2) Return the story + base64-audio to the client
  //  ———————————————————————————————
  return NextResponse.json({ story, audio });
}
