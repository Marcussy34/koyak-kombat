// Use environment variable for production, fallback to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = {
  async startMatch(fighter1Id, fighter2Id) {
    try {
      const response = await fetch(`${API_BASE_URL}/match/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fighter_1_id: fighter1Id, fighter_2_id: fighter2Id }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error starting match:', error);
      return null;
    }
  },

  async generateTurn(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/match/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (error) {
      console.error('Error generating turn:', error);
      return null;
    }
  },

  async judgeTurn(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/match/judge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (error) {
      console.error('Error judging turn:', error);
      return null;
    }
  },

  /**
   * Create a fighter from multiple social media URLs.
   * @param {string[]} urls - Array of social media URLs (Twitter, Instagram, LinkedIn)
   * @param {string} voiceId - ElevenLabs voice ID
   */
  async createFighter(urls, voiceId) {
    try {
      const response = await fetch(`${API_BASE_URL}/fighters/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, voice_id: voiceId }),
      });
      if (!response.ok) throw new Error('Failed to spawn fighter');
      return await response.json();
    } catch (error) {
      console.error('Error creating fighter:', error);
      throw error;
    }
  },

  /**
   * Create BOTH fighters in a single batch request for parallel scraping.
   * This is ~50% faster than making two separate createFighter calls.
   * @param {string[]} fighter1Urls - Array of social media URLs for Fighter 1
   * @param {string[]} fighter2Urls - Array of social media URLs for Fighter 2
   * @param {string} fighter1VoiceId - ElevenLabs voice ID for Fighter 1
   * @param {string} fighter2VoiceId - ElevenLabs voice ID for Fighter 2
   * @returns {Promise<{fighter1: Object, fighter2: Object}>}
   */
  async createFightersBatch(fighter1Urls, fighter2Urls, fighter1VoiceId, fighter2VoiceId) {
    try {
      const response = await fetch(`${API_BASE_URL}/fighters/create-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fighter1_urls: fighter1Urls,
          fighter2_urls: fighter2Urls,
          fighter1_voice_id: fighter1VoiceId,
          fighter2_voice_id: fighter2VoiceId,
        }),
      });
      if (!response.ok) throw new Error('Failed to spawn fighters');
      return await response.json();
    } catch (error) {
      console.error('Error creating fighters batch:', error);
      throw error;
    }
  }
};
