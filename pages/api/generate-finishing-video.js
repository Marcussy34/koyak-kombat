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
    const keyPath = path.join(process.cwd(), 'vertex-ai-key.json');
    
    // Create auth client
    const auth = new GoogleAuth({
      keyFilename: keyPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    // Extract base64 data from data URL (remove "data:image/png;base64," prefix)
    const base64Image = screenshot.replace(/^data:image\/\w+;base64,/, '');
    
    // Determine mime type
    const mimeType = screenshot.includes('data:image/jpeg') ? 'image/jpeg' : 'image/png';

    // Create the prompt for video generation
    const prompt = `Based on this fighting game screenshot, create a dramatic finishing move animation where ${winner} performs a ${intent} attack on ${loser}. ${description}. Keep the exact same art style, characters, and background from the reference image. Make the animation smooth, dramatic, and victorious. Style: ${style} attack. The video should show the finishing move being executed.`;

    console.log('[GenerateFinishingVideo] Prompt:', prompt);

    // Call Veo 3 API via REST - using official request format
    // Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/video/use-reference-images-to-guide-video-generation
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning`;

    const requestBody = {
      instances: [
        {
          prompt: prompt,
          // Use referenceImages array per official docs
          referenceImages: [
            {
              image: {
                bytesBase64Encoded: base64Image,
                mimeType: mimeType,
              },
              referenceType: 'subject', // Use 'subject' to maintain character consistency
            },
          ],
        },
      ],
      parameters: {
        aspectRatio: '16:9',
        sampleCount: 1,
        durationSeconds: 5,
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

        // Extract video from response
        const predictions = pollData.response?.predictions || pollData.predictions || [];
        console.log('[GenerateFinishingVideo] Predictions:', JSON.stringify(predictions, null, 2));
        
        if (predictions.length > 0) {
          // Check for video in different possible locations
          const prediction = predictions[0];
          const videoBase64 = prediction.video?.bytesBase64Encoded || prediction.bytesBase64Encoded;
          
          if (videoBase64) {
            console.log('[GenerateFinishingVideo] Video generated successfully!');
            return res.status(200).json({
              videoUrl: `data:video/mp4;base64,${videoBase64}`,
            });
          }
          
          // Check for GCS URI
          if (prediction.video?.gcsUri || prediction.gcsUri) {
            const gcsUri = prediction.video?.gcsUri || prediction.gcsUri;
            console.log('[GenerateFinishingVideo] Video at GCS:', gcsUri);
            // For now, return the URI - we'd need to fetch from GCS
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
