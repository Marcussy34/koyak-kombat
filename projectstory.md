# Project Story

## Inspiration

We've all been there: scrolling through someone's social media, noticing contradictions, quirks, and hidden insecurities. But what if those digital personas could come alive and roast each other? What if AI could capture someone's essence so accurately that it thinks, speaks, and argues exactly like them?

**Koyak Kombat** was born from a simple question: "What would happen if you could see your best friend and your sibling battle it out with AI-powered roasts?" We wanted to build something that's both **entertaining AND revealing**. A fun way to discover personality traits, hidden contradictions, and digital footprints of people you actually know. By analyzing their Twitter posts, Instagram captions, LinkedIn achievements, and Facebook updates together, we can build a complete picture of who they really are, then watch them roast each other.

We were inspired by classic arcade fighters like Street Fighter and Mortal Kombat, but instead of physical combat, we wanted **verbal warfare powered by real personality data**. The challenge was clear: scrape social media, synthesize personas, generate roasts, judge them fairly, and wrap it all in a retro arcade aesthetic. Oh, and make it actually work in real-time.

---

## What it does

**Koyak Kombat** turns any social media profile into an AI fighter that battles with persona-accurate roasts:

1. **Spawn Fighters**: Paste up to 3 social media URLs per fighter (Twitter, Instagram, LinkedIn, Facebook). The system scrapes their profiles in parallel, analyzing posts, bios, work history, and engagement patterns.

2. **AI Persona Synthesis**: A specialized LLM (GPT-5 Mini) processes scraped data and generates a structured `FighterPersona` containing:
   - Speech patterns (vocabulary, tone, sentence structure)
   - Psychological insecurities (defensive topics, contradictions)
   - Attack vectors (embarrassing facts, hypocrisies, meme-able quotes)
   - System prompt (500+ word detailed persona for the fighter AI)

3. **Real-Time Battle**: 
   - Fighters alternate turns generating 20-word roasts
   - Text streams at 60fps with easing for natural reading
   - ElevenLabs TTS voices each roast (7 voice presets)
   - Dynamic BGM volume adjusts during thinking/speaking phases

4. **Independent AI Judge**: A separate GPT-5 Mini judges each roast on:
   - **Specificity** (30%): How personal is the attack?
   - **Creativity** (30%): Unique burn or cliché?
   - **Accuracy** (40%): Based on real profile content?
   - Calculates weighted score: `(Specificity × 0.3) + (Creativity × 0.3) + (Accuracy × 0.4)` = Base Score (0-100)
   - Base Damage = `Base Score × 0.6` (scales to max 60 damage per turn)
   - Final Damage = `Base Damage × Speed Multiplier`
   - **Speed bonuses**: <2s (+15%), <3s (+10%), >5s (-10%)
   - **Anti-repetition**: Detects repeated topics → 0 damage

5. **Finishing Move**: When health reaches 0, the winner draws a finishing move on a tldraw canvas. GPT-4o Vision analyzes the sketch, sanitizes the prompt, and Google Veo 3 generates a 6-second video of the fatality.

---

## How we built it

### **Frontend** (Next.js + React)
- **Retro Arcade UI**: Built with Tailwind CSS, Framer Motion for animations, custom CRT effects
- **Real-time Streaming**: 60fps RAF-based text streaming with ease-out-cubic easing
- **Dynamic Audio**: BGM volume ducking during AI thinking/speaking phases
- **tldraw Integration**: Canvas for drawing finishing moves
- **html-to-image**: Screenshot capture for video generation

### **Backend** (FastAPI + Python)
- **Multi-Platform Scraping**:
  - Twitter: SocialData.tools API (reliable, fast)
  - Instagram/LinkedIn/Facebook: Apify actors (parallel execution)
  - Batch API endpoint scrapes BOTH fighters simultaneously (~50% faster)
  
- **ProfileAggregator**: Normalizes different JSON structures into unified context

- **PersonaProfiler**: 
  - Uses GPT-5 Mini for structured persona synthesis
  - Generates 15+ attack vectors per fighter
  - Creates 500+ word system prompts with knowledge bases

- **LLMService**: 
  - OpenRouter + Groq API routing (supports 8+ models)
  - Anti-repetition system: tracks exhausted topics by keyword matching
  - Temperature 0.9 for creative variety

- **JudgeService**: 
  - Independent GPT-5 Mini for fair scoring
  - Weighted scoring: `(Specificity × 0.3) + (Creativity × 0.3) + (Accuracy × 0.4)` = Base Score (0-100)
  - Base Damage = `Base Score × 0.6` (scales damage to max 60 per turn)
  - Final Damage = `Base Damage × Speed Multiplier`
  - Speed bonuses: <2s (+15%), <3s (+10%), >5s (-10%)

- **VoiceService**: 
  - ElevenLabs API (Turbo v2.5)
  - Returns base64 audio data URLs for direct browser playback
  - 7 voice presets for personality matching

### **AI Video Generation** (Next.js API Routes)
- Google Vertex AI with Veo 3 Fast
- GPT-4o-mini prompt sanitization to bypass content filters
- Image-to-video approach (6s duration, 16:9 aspect)
- Long-running operation polling with 3-minute timeout

### **Deployment**
- Frontend: Vercel (instant deployment from GitHub)
- Backend: Render (free tier, cold start ~50s)
- Environment variables for API keys (OpenRouter, ElevenLabs, Apify, SocialData, Vertex AI)

---

## Challenges we ran into

### **1. ElevenLabs Free Tier Abuse Detection**
**Problem**: ElevenLabs flagged our Vercel deployment for "unusual activity" and disabled the free tier.  
**Root Cause**: Requests from cloud hosting IPs (Vercel/Render) triggered abuse detection.  
**Solution**: Documented limitation in README. Voice synthesis works locally but disabled in production.

### **2. tldraw License Requirements**
**Problem**: tldraw requires a commercial license for production deployments.  
**Temporary Solution**: Drawing works locally. Production has limited features.  
**Learning**: Always check OSS license restrictions before deploying.

### **3. Veo 3 Content Filters**
**Problem**: Veo 3 rejected prompts containing "devastating kick", "brutal attack", etc.  
**Solution**: Built a two-stage prompt sanitization:
   1. GPT-4o-mini rewrites descriptions in "arcade game" language
   2. Removes violent adjectives while keeping core actions
   3. Frames everything as "stylized arcade K.O. finish"  
**Result**: 90%+ generation success rate after sanitization.

### **4. Render Free Tier Cold Starts**
**Problem**: Backend spins down after inactivity, causing 50+ second delays.  
**Impact**: First battle after idle period is slow.  
**Solution**: Documented in README. Users just need patience on first load.

### **5. Multi-Platform Data Normalization**
**Problem**: Each platform returns different JSON structures:
   - Twitter: `screen_name` vs `username`
   - Instagram: `caption` vs `edge_media_to_caption`
   - LinkedIn: `positions` vs `experience` vs `workExperience`  
**Solution**: Built `ProfileAggregator` with platform-specific normalizers that handle field variations.

### **6. Anti-Repetition System for Small Models**
**Problem**: Initial approach passed full roast history (300+ tokens), breaking small models.  
**Solution**: Switched to topic categorization with keyword matching. Now passes only ~30 tokens of "exhausted topics" (e.g., "appearance, career, dating").  
**Result**: Works even with Llama 3.1 8B.

### **7. Real-Time Audio Sync**
**Problem**: Text streaming and TTS audio were out of sync.  
**Solution**: 
   - Text streams for exactly 4 seconds (matches typical TTS duration)
   - Dynamic BGM volume (0.4 → 0.15) during thinking/speaking
   - RAF-based streaming at 60fps for smooth animation

---

## Accomplishments that we're proud of

1. **Batch Scraping Architecture**: Reduced fighter creation time by 50% through parallel scraping. One API call handles BOTH fighters across 4 platforms simultaneously.

2. **Independent Judge AI**: Separate LLM prevents self-bias. Fighters can't "cheat" by scoring their own roasts high.

3. **Persona Quality**: The `PersonaProfiler` generates shockingly accurate digital twins. During testing, friends recognized themselves instantly from the attack vectors.

4. **60fps Streaming UX**: RAF-based text streaming with ease-out-cubic easing feels like a real arcade game. BGM volume ducking adds professional polish.

5. **Full Production Deployment**: Despite being a hackathon project, it's actually deployed and playable at [koyak-kombat.vercel.app](https://koyak-kombat.vercel.app).

6. **Multi-Model Support**: Works with 8+ AI models (Gemini, GPT-4o, Claude, Llama) through OpenRouter + Groq routing.

7. **Veo 3 Integration**: Successfully generated finishing move videos using Google's latest image-to-video model with custom prompt sanitization.

---

## What we learned

### **Technical Learnings**
- **Parallel API Design**: Batching requests across multiple services can dramatically reduce latency
- **Prompt Engineering**: Sanitization layers are essential for content-filtered APIs like Veo 3
- **Real-time UX**: 60fps streaming + dynamic audio mixing creates arcade-like responsiveness
- **LLM Routing**: Small models (Llama 3.1 8B) can work great if you minimize context length
- **Structured Output**: Using Pydantic dataclasses for persona synthesis ensures consistency

### **AI Service Learnings**
- ElevenLabs free tier has strict abuse detection (cloud IPs flagged)
- Veo 3 is incredibly fast (~30s for 6s video) but has conservative content filters
- GPT-5 Mini is perfect for structured output (persona synthesis, judging)
- OpenRouter makes multi-model support trivial (8 models with one integration)
- SocialData.tools is far more reliable than web scraping for Twitter

### **Deployment Learnings**
- Vercel + Render is a powerful free-tier combo for hackathons
- Always document limitations transparently (builds trust)
- Free tiers have trade-offs: Render cold starts, ElevenLabs IP restrictions
- License compliance matters: tldraw caught us off-guard

### **Design Learnings**
- Retro arcade aesthetic resonates with people
- Real-time progress updates (loading logs) reduce perceived wait time
- Independent judge adds legitimacy (people trust the scoring)

---

## What's next for Koyak Kombat

### **Immediate Fixes**
- **Upgrade ElevenLabs**: Purchase paid plan to re-enable TTS in production
- **tldraw License**: Get commercial license for full deployment support
- **Render Upgrade**: Move to paid tier for always-on backend (no cold starts)

### **Feature Roadmap**

**v1.1: Multiplayer Mode**
- Real-time battles between actual users (not just AI vs AI)
- Spectator mode with live chat
- Leaderboard system

**v1.2: Match Persistence**
- Save battle history to database (PostgreSQL)
- Shareable battle replays with video highlights
- Fighter profiles with win/loss records

**v1.3: Advanced Persona Features**
- Voice cloning from social media videos (ElevenLabs Voice Design API)
- Fighting style analysis (aggressive vs defensive patterns)
- Combo system: chain roasts for damage multipliers

**v1.4: Tournament Mode**
- 8-player bracket tournaments
- Crowd-sourced voting for winner (if judge is close)
- Challenge your friends and family in group battles

**v1.5: Mobile App**
- React Native port for iOS/Android
- Push notifications when friends challenge you
- Quick battle mode (30s rounds)

### **Long-term Vision**
- **Web3 Integration**: NFT fighter cards with on-chain battle history
- **Creator Economy**: Let influencers create official fighter personas, earn from battles
- **AI Training**: Use battle data to improve roast quality over time
- **Global Leaderboard**: Top roasters ranked by damage dealt, creativity scores
- **Twitch Integration**: Stream battles live with chat-controlled votes

---

**Built with 🔥 and AI. No feelings were spared.**

