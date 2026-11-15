export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

  const { messages, mode, context } = req.body || {};
  const systemPrompt =
    mode === 'explain'
      ? 'You are a sharp betting analyst. Explain in 2 short sentences why this pick makes sense. Be direct, no fluff.'
      : mode === 'bankroll'
      ? 'You are a Kelly Criterion bankroll advisor. Given the odds and probability, recommend a stake as % of bankroll. Be brief, 2 sentences.'
      : 'You are Spoty Bet Predator AI. Help users understand betting odds, value bets, implied probability. Keep answers short and casual. Never promise wins.';

  const msgs = [
    { role: 'system', content: systemPrompt },
    ...(context ? [{ role: 'system', content: context }] : []),
    ...(messages || [])
  ];

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: msgs,
        max_tokens: 400,
        temperature: 0.6
      })
    });
    if (!r.ok) throw new Error(`Groq ${r.status}`);
    const data = await r.json();
    return res.status(200).json({ reply: data.choices?.[0]?.message?.content || 'No reply' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
