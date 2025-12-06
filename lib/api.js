const API_BASE_URL = 'http://localhost:8000/api/v1';

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
  }
};
