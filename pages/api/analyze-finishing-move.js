/**
 * API Route: Analyze Finishing Move Drawing
 * 
 * Takes a base64 PNG image from tldraw canvas and sends it to OpenRouter
 * vision model to analyze the intent of the finishing move drawing.
 * 
 * POST /api/analyze-finishing-move
 * Body: { image: "data:image/png;base64,..." , winner: string, loser: string }
 * Response: { intent: string, description: string, style: string, damage_modifier: number }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, winner, loser } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[AnalyzeFinishingMove] OPENROUTER_API_KEY not found');
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  try {
    // Use a vision-capable model (GPT-4o or similar)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://koyak-kombat.vercel.app',
        'X-Title': 'Koyak Kombat - Finishing Move Analyzer',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Vision-capable, cheap, fast
        messages: [
          {
            role: 'system',
            content: `You are analyzing a hand-drawn "finishing move" from a fighting game. The winner "${winner}" drew this attack against "${loser}".

Analyze the drawing and return a JSON object with these fields:
- intent: A short 2-4 word name for the finishing move (e.g., "HADOUKEN BLAST", "SPINNING KICK", "FIRE TORNADO")
- description: A dramatic 1-sentence description of what the move does, written like an arcade announcer
- style: The attack type - one of: "energy", "physical", "fire", "ice", "lightning", "psychic", "combo", "unknown"
- damage_modifier: A number from 1.0 to 2.0 based on how creative/clear the drawing is (1.0 = unclear, 2.0 = amazing)

ONLY respond with valid JSON, no markdown or explanation.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: image, // base64 data URL
                },
              },
              {
                type: 'text',
                text: `Analyze this finishing move drawing by ${winner} against ${loser}. Return JSON only.`,
              },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AnalyzeFinishingMove] OpenRouter error:', errorText);
      return res.status(500).json({ error: 'Failed to analyze image', details: errorText });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response from the AI
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const analysis = JSON.parse(cleanedContent);
      
      console.log('[AnalyzeFinishingMove] Analysis:', analysis);
      return res.status(200).json(analysis);
    } catch (parseError) {
      console.error('[AnalyzeFinishingMove] Failed to parse AI response:', content);
      // Return a fallback response
      return res.status(200).json({
        intent: 'MYSTERY STRIKE',
        description: `${winner} unleashes an incomprehensible but devastating attack!`,
        style: 'unknown',
        damage_modifier: 1.2,
      });
    }
  } catch (error) {
    console.error('[AnalyzeFinishingMove] Error:', error);
    return res.status(500).json({ error: 'Failed to analyze finishing move' });
  }
}
