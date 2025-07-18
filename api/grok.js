// api/grok.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const GROK_KEY = process.env.GROK_API_KEY;
  if (!GROK_KEY) {
    return res.status(500).json({ error: 'Missing GROK_API_KEY' });
  }

  const { name } = await req.json();
  const grokRes = await fetch(
    'https://api.x.ai/v1/engines/grok-4-0709/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_KEY}`,
      },
      body: JSON.stringify({
        prompt: `Generate a story for ${name}`,
        max_tokens: 200,
      }),
    }
  );

  if (!grokRes.ok) {
    const text = await grokRes.text().catch(() => '');
    return res.status(grokRes.status).json({ error: 'Grok error', details: text });
  }

  const data = await grokRes.json();
  const story = data.choices?.[0]?.text || '';
  res.status(200).json({ story });
}
