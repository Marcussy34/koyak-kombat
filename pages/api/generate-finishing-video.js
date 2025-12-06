/**
 * API Route: Generate Finishing Move Video with Veo 3 Fast
 * 
 * Takes a screenshot of the battle and the finishing move intent,
 * generates a 5-second video using Google Veo 3 Fast.
 * 
 * Based on official Vertex AI docs:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/video/
 * 
 * POST /api/generate-finishing-video
 * Body: { 
 *   screenshot: "data:image/png;base64,...",
 *   intent: "FLYING KICK",
 *   description: "...",
 *   style: "physical",
 *   winner: string,
 *   loser: string
 * }
 * Response: { videoUrl: "data:video/mp4;base64,..." }
 */

import { GoogleAuth } from 'google-auth-library';
import path from 'path';

// Configuration
const PROJECT_ID = 'gen-lang-client-0234590293';
const LOCATION = 'us-central1';
const MODEL_ID = 'veo-3.0-fast-generate-preview';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { screenshot, intent, description, style, winner, loser } = req.body;

  if (!screenshot) {
    return res.status(400).json({ error: 'No screenshot provided' });
  }

  console.log('[GenerateFinishingVideo] Starting generation...');
  console.log(`[GenerateFinishingVideo] Intent: ${intent}, Style: ${style}`);

  try {
    // Set up authentication with service account
    // Priority: 1) GOOGLE_CREDENTIALS_JSON env var (for Vercel)
    //           2) Local file vertex-ai-key.json (for development)
    let auth;
    
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      // Parse credentials from environment variable (Vercel deployment)
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      auth = new GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      console.log('[GenerateFinishingVideo] Using credentials from GOOGLE_CREDENTIALS_JSON env var');
    } else {
      // Fallback to local file (local development)
      const keyPath = path.join(process.cwd(), 'vertex-ai-key.json');
      auth = new GoogleAuth({
        keyFilename: keyPath,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      console.log('[GenerateFinishingVideo] Using credentials from local file');
    }
    
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    // Handle both URL paths and base64 data URLs
    let base64Image;
    let mimeType = 'image/png';
    
    if (screenshot.startsWith('data:image')) {
      // Already a data URL - extract base64 and mime type
      base64Image = screenshot.replace(/^data:image\/\w+;base64,/, '');
      mimeType = screenshot.includes('data:image/jpeg') ? 'image/jpeg' : 'image/png';
      console.log('[GenerateFinishingVideo] Using provided base64 image');
    } else if (screenshot.startsWith('/') || screenshot.startsWith('http')) {
      // It's a URL - we need to fetch and convert to base64
      console.log('[GenerateFinishingVideo] Screenshot is URL, fetching and converting...');
      
      try {
        // For local paths, we need to read from filesystem
        if (screenshot.startsWith('/') && !screenshot.startsWith('//')) {
          const fs = await import('fs/promises');
          const publicPath = path.join(process.cwd(), 'public', screenshot);
          const imageBuffer = await fs.readFile(publicPath);
          base64Image = imageBuffer.toString('base64');
          mimeType = screenshot.endsWith('.jpg') || screenshot.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
          console.log('[GenerateFinishingVideo] Loaded local image from:', publicPath);
        } else {
          // For remote URLs
          const imageResponse = await fetch(screenshot);
          const arrayBuffer = await imageResponse.arrayBuffer();
          base64Image = Buffer.from(arrayBuffer).toString('base64');
          const contentType = imageResponse.headers.get('content-type');
          mimeType = contentType || 'image/png';
          console.log('[GenerateFinishingVideo] Fetched remote image');
        }
      } catch (fetchError) {
        console.error('[GenerateFinishingVideo] Failed to fetch image:', fetchError);
        return res.status(400).json({ error: 'Failed to fetch screenshot image', details: fetchError.message });
      }
    } else {
      // Assume it's raw base64 without prefix
      base64Image = screenshot;
      console.log('[GenerateFinishingVideo] Using raw base64 (no prefix)');
    }

    if (!base64Image) {
      return res.status(400).json({ error: 'Could not process screenshot' });
    }

    console.log(`[GenerateFinishingVideo] Image ready: ${base64Image.length} chars, type: ${mimeType}`);

    // ========================================================
    // STEP 1: Use GPT-4o-mini to sanitize the prompt
    // This ensures the description is rewritten in safe language
    // that won't trigger Veo 3's content filters
    // ========================================================
    
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      console.error('[GenerateFinishingVideo] OPENROUTER_API_KEY not found');
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    // Create the raw prompt that needs sanitization
    const rawPrompt = `${winner} performs a "${intent}" finishing move on ${loser}. ${description}. ${loser} is defeated.`;
    
    console.log('[GenerateFinishingVideo] Raw prompt (before sanitization):', rawPrompt);

    // System prompt for sanitization - keep the action but tone down violence
    const sanitizationSystemPrompt = `You are a prompt rewriter for a video generation AI that creates retro arcade game animations.

Your job is to take a "finishing move" description and rewrite it in STYLIZED, ARCADE-GAME language that avoids explicit violence but KEEPS the action.

RULES:
1. KEEP the core action (kicks, punches, uppercuts, etc.) - these are fine in arcade game context
2. REMOVE brutal adjectives like: devastating, brutal, violent, blood, gore, gruesome, savage, deadly, lethal, crushing
3. ADD stylized/arcade descriptors like: stylized, dramatic, powerful, swift, classic arcade-style
4. The loser CAN be "knocked out" or "defeated" - this is normal arcade game language
5. Frame it as a CLASSIC ARCADE GAME finishing move, like Street Fighter or Mortal Kombat (but without gore)
6. Keep the same characters and action, just make language appropriate for a T-rated game
7. Output ONLY the rewritten prompt, nothing else. No explanations.

EXAMPLE:
Input: "Mario performs a devastating flying kick finishing move on Luigi. Luigi is brutally knocked out."
Output: "Mario performs a dramatic flying kick in classic arcade style. Luigi is knocked back and falls to the ground in defeat. Mario lands in a triumphant victory pose as the K.O. text appears."`;

    // Call GPT-4o-mini via OpenRouter for sanitization
    console.log('[GenerateFinishingVideo] Calling GPT-4o-mini for prompt sanitization...');
    
    const sanitizeResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://koyak-kombat.vercel.app',
        'X-Title': 'Koyak Kombat',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: sanitizationSystemPrompt },
          { role: 'user', content: rawPrompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!sanitizeResponse.ok) {
      const errorText = await sanitizeResponse.text();
      console.error('[GenerateFinishingVideo] Sanitization API error:', errorText);
      // Fall back to basic regex sanitization if API fails
      console.log('[GenerateFinishingVideo] Falling back to regex sanitization...');
    }

    let sanitizedDescription;
    
    if (sanitizeResponse.ok) {
      const sanitizeData = await sanitizeResponse.json();
      sanitizedDescription = sanitizeData.choices?.[0]?.message?.content?.trim();
      console.log('[GenerateFinishingVideo] Sanitized by GPT-4o-mini:', sanitizedDescription);
    }
    
    // Fallback: basic regex sanitization if API failed
    if (!sanitizedDescription) {
      sanitizedDescription = description
        .replace(/attack|kill|blood|gore|violent|devastating|kick|punch|strike|hit|slam|crush|smash|knock|hurt|pain|damage|destroy/gi, 'celebration')
        .replace(/opponent|enemy|victim/gi, 'other player')
        .replace(/defeat|knocked out|unconscious/gi, 'impressed');
      console.log('[GenerateFinishingVideo] Using fallback regex sanitization:', sanitizedDescription);
    }

    // Create the final safe prompt for Veo 3 - arcade game style K.O. finish
    const prompt = `Create a short animated video based on this retro arcade game screenshot. Keep the EXACT same characters, background, art style, and colors. This is a CLASSIC ARCADE GAME K.O. FINISH: ${sanitizedDescription}. ${winner} wins and ${loser} is knocked out. Style it like a Street Fighter or classic fighting game victory screen. End with ${winner} in a victory pose. This is stylized arcade game action, not realistic violence.`;

    console.log('[GenerateFinishingVideo] Final Veo 3 Prompt:', prompt);

    // Call Veo 3 API via REST - using official request format
    // Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/video/use-reference-images-to-guide-video-generation
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning`;

    const requestBody = {
      instances: [
        {
          prompt: prompt,
          // Use image as first frame (image-to-video approach)
          // Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/video/
          image: {
            bytesBase64Encoded: base64Image,
            mimeType: mimeType,
          },
        },
      ],
      parameters: {
        aspectRatio: '16:9',
        sampleCount: 1,
        durationSeconds: 6, // Supported: 4, 6, or 8
        personGeneration: 'allow_adult',
      },
    };

    console.log('[GenerateFinishingVideo] Calling Veo 3 API...');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GenerateFinishingVideo] Veo API error:', errorText);
      return res.status(500).json({ error: 'Video generation failed', details: errorText });
    }

    const data = await response.json();
    console.log('[GenerateFinishingVideo] Veo response:', JSON.stringify(data, null, 2));

    // The response contains an operation name for long-running operation
    const operationName = data.name;
    
    if (!operationName) {
      // If we got a direct result (unlikely for video)
      if (data.predictions?.[0]?.video?.bytesBase64Encoded) {
        const videoBase64 = data.predictions[0].video.bytesBase64Encoded;
        return res.status(200).json({
          videoUrl: `data:video/mp4;base64,${videoBase64}`,
        });
      }
      console.error('[GenerateFinishingVideo] No operation name in response:', data);
      throw new Error('No operation name or direct result in response');
    }

    // Poll for operation completion using fetchPredictOperation
    // Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/video/
    const pollEndpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:fetchPredictOperation`;
    
    let attempts = 0;
    const maxAttempts = 90; // 90 attempts * 2 seconds = 3 minutes max

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
      attempts++;

      console.log(`[GenerateFinishingVideo] Polling attempt ${attempts}/${maxAttempts}...`);

      const pollResponse = await fetch(pollEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationName: operationName,
        }),
      });

      if (!pollResponse.ok) {
        console.error('[GenerateFinishingVideo] Poll error:', await pollResponse.text());
        continue; // Keep trying
      }

      const pollData = await pollResponse.json();

      if (pollData.done) {
        if (pollData.error) {
          console.error('[GenerateFinishingVideo] Operation failed:', pollData.error);
          return res.status(500).json({ error: 'Video generation failed', details: pollData.error });
        }

        // Extract video from response - check multiple possible locations
        // Response format: { response: { videos: [{ video: { bytesBase64Encoded, gcsUri } }] } }
        const videos = pollData.response?.videos || pollData.videos || [];
        const predictions = pollData.response?.predictions || pollData.predictions || [];
        
        console.log('[GenerateFinishingVideo] Videos:', JSON.stringify(videos, null, 2));
        console.log('[GenerateFinishingVideo] Predictions:', JSON.stringify(predictions, null, 2));
        
        // Check videos array first (Veo 3 format)
        if (videos.length > 0) {
          const video = videos[0];
          const videoBase64 = video.video?.bytesBase64Encoded || video.bytesBase64Encoded;
          
          if (videoBase64) {
            console.log('[GenerateFinishingVideo] Video generated successfully from videos array!');
            return res.status(200).json({
              videoUrl: `data:video/mp4;base64,${videoBase64}`,
            });
          }
          
          // Check for GCS URI
          const gcsUri = video.video?.gcsUri || video.gcsUri;
          if (gcsUri) {
            console.log('[GenerateFinishingVideo] Video at GCS:', gcsUri);
            return res.status(200).json({
              videoUrl: gcsUri,
              isGcsUri: true,
            });
          }
        }
        
        // Fallback: check predictions array
        if (predictions.length > 0) {
          const prediction = predictions[0];
          const videoBase64 = prediction.video?.bytesBase64Encoded || prediction.bytesBase64Encoded;
          
          if (videoBase64) {
            console.log('[GenerateFinishingVideo] Video generated successfully from predictions!');
            return res.status(200).json({
              videoUrl: `data:video/mp4;base64,${videoBase64}`,
            });
          }
          
          // Check for GCS URI
          if (prediction.video?.gcsUri || prediction.gcsUri) {
            const gcsUri = prediction.video?.gcsUri || prediction.gcsUri;
            console.log('[GenerateFinishingVideo] Video at GCS:', gcsUri);
            return res.status(200).json({
              videoUrl: gcsUri,
              isGcsUri: true,
            });
          }
        }

        console.error('[GenerateFinishingVideo] No video in response:', pollData);
        throw new Error('No video in completed response');
      }

      // Log progress
      if (pollData.metadata?.progress) {
        console.log(`[GenerateFinishingVideo] Progress: ${pollData.metadata.progress}%`);
      }
    }

    return res.status(500).json({ error: 'Video generation timed out after 3 minutes' });

  } catch (error) {
    console.error('[GenerateFinishingVideo] Error:', error);
    return res.status(500).json({ error: 'Failed to generate video', details: error.message });
  }
}

// Increase body size limit for base64 images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
