const SYSTEM_PROMPT = `You are RoofCode NZ, a practical New Zealand roofing guidance assistant for roofers and contractors.

Rules:
- Give clear practical guidance in plain English.
- Focus on NZ roofing, profiled metal roofing, flashings, ridges, hips, valleys, gutters, penetrations, roof underlay, laps, long runs, wind zones, fixings, low pitch, and moisture control.
- Never claim to replace the NZ Building Code, E2/AS1, NZMRM Code of Practice, manufacturer's details, consent drawings, or a designer/engineer/inspector.
- When exact dimensions or compliance decisions matter, tell the user to verify against the current NZMRM Code of Practice, NZ Building Code clause E2 External Moisture / E2/AS1, the product manufacturer's technical literature, and project consent documents.
- Do not copy code documents word-for-word. Summarise and direct users to the official source.
- If the question is risky or site-specific, ask for pitch, profile, roof length, wind zone, exposure zone, material, building location, and whether it is consented work.
- Keep answers useful for a tradesperson on site.`;

const LOCAL_KNOWLEDGE = `Starter NZ roofing knowledge:
- Low pitch roofs need extra caution: profile, side laps, end laps, penetrations and flashings must match the manufacturer's minimum pitch and NZMRM/E2 guidance.
- Long roof runs can require allowance for thermal movement. Fixing method, washer type, oversized holes/slotted holes, expansion joints or control joints depend on run length, profile, material, colour, and manufacturer requirements.
- Flashings must shed water, have enough cover, weathering, stop-ends where needed, and be compatible with the roofing material. Do not rely on sealant as the main waterproofing method.
- Ridge, hip, barge, apron, head, side, valley, cricket and penetration flashings should be detailed so water cannot be driven back under the flashing in the expected wind/exposure zone.
- Penetrations should be kept out of valleys and high-flow areas where possible. Use proprietary flashings/boots only within their pitch/profile limits.
- Underlay must be installed with correct laps, support and drainage path. Do not trap water behind flashings.
- Purlin spacing, fixing pattern and screw type depend on profile, span, wind zone, building use and manufacturer's span tables.
- Gutters/downpipes need sizing for roof catchment, rainfall intensity, overflow path and E1 requirements.
- For any exact answer: check current NZMRM Code of Practice, NZBC E2/AS1, E1/AS1, manufacturer technical details and the consent drawings.`;

function localAnswer(message) {
  return `I can help with that, but I need to keep it tied back to the official NZ sources.\n\n${LOCAL_KNOWLEDGE}\n\nFor your question: "${message}"\n\nBest next step: check the relevant section in the current NZ Metal Roof and Wall Cladding Code of Practice, NZBC E2 External Moisture / E2/AS1, and the roofing profile manufacturer's data sheet. For site-specific details, confirm pitch, profile, run length, wind zone, exposure zone and fixing pattern.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Missing message' });
      return;
    }

    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 900,
          system: `${SYSTEM_PROMPT}\n\n${LOCAL_KNOWLEDGE}`,
          messages: [{ role: 'user', content: message }]
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || 'Claude API error');
      const text = data.content?.map(part => part.text || '').join('\n') || 'No response returned.';
      res.status(200).json({ reply: text });
      return;
    }

    if (process.env.OPENAI_API_KEY) {
      const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          instructions: `${SYSTEM_PROMPT}\n\n${LOCAL_KNOWLEDGE}`,
          input: message
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || 'OpenAI API error');
      res.status(200).json({ reply: data.output_text || 'No response returned.' });
      return;
    }

    res.status(200).json({ reply: localAnswer(message) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
}
