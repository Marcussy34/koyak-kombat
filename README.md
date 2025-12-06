# 🔥 Koyak Kombat

> **The world's first generative AI roast arcade.**

![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-Alpha-orange)

---

## 🎮 What is Koyak Kombat?

**Koyak Kombat** is where players pit hyper-realistic "Digital Twins" against each other in fully autonomous verbal warfare. By simply pasting a social media URL, the system uses **Apify** to scrape a target's digital footprint—mining personality quirks, writing styles, and hidden insecurities—while **ElevenLabs** synthesizes a matching vocal identity using advanced voice design or user-selected presets.

This data spawns a fighter that **thinks, speaks, and roasts exactly like the target**, allowing users to orchestrate a terrifyingly accurate simulation of an argument between any two personas—from tech moguls to their own friends.

### The Experience

The game is wrapped in a nostalgic **"Street Fighter" aesthetic** where the visuals are as weaponized as the words:

1.  **Spawn Your Fighters:** Paste social media URLs. The AI scrapes, analyzes, and generates persona-accurate "Digital Twins."
2.  **Choose Your Weapon:** Select specific AI models (GPT-4o, Gemini, Llama, etc.) to power your fighter's wit.
3.  **Watch the Carnage:** The match erupts into a real-time verbal war. Roasts are generated, damage is dealt, and health bars deplete.
4.  **Dynamic Vibe Engine:** *(Coming Soon)* As insults land, the environment transforms from a peaceful dojo to a fiery hellscape based on the "Judge AI's" emotional damage scoring.
5.  **Fatality & Highlight Reel:** *(Coming Soon)* Sketch a rough "fatality" concept, rendered into a cinematic video, automatically stitched into a viral-ready highlight reel.

---

## 🚀 Features

| Feature | Status |
| :--- | :---: |
| **AI-Powered Roasts** (OpenRouter: Gemini, GPT-4o, Llama, Mistral) | ✅ |
| **Digital Twin Generation** (Apify Twitter Scraping) | ✅ |
| **Retro Arcade Aesthetic** (16-bit pixel art, CRT effects) | ✅ |
| **Multi-Model Combat** (Pit different AI models against each other) | ✅ |
| **Performance Stats** (Real-time latency & generation time) | ✅ |
| **Round System** (Roulette animation, "X STARTS!" indicator) | ✅ |
| **Instant KO Visuals** (Skull icon on health drop to 0) | ✅ |
| **Background Music** (Looping BGM) | ✅ |
| **ElevenLabs Voice Synthesis** | 🚧 |
| **Dynamic Backgrounds** (Vertex AI video generation) | 🚧 |
| **Fatality Mechanic** (User-drawn finishing moves) | 🚧 |
| **Match Persistence** (Supabase integration) | 🚧 |

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js, React, Tailwind CSS, Shadcn UI |
| **Backend** | FastAPI (Python) |
| **AI/LLM** | OpenRouter (Gemini, GPT-4o, Llama, Mistral, Claude) |
| **Scraping** | Apify (Twitter/X Profile Scraper) |
| **Voice** | ElevenLabs *(Planned)* |
| **Video** | Google Vertex AI *(Planned)* |
| **Queue** | Redis (RQ) |
| **Database** | Supabase *(Planned)* |

---

## 🏁 Getting Started

### Prerequisites

*   Node.js 18+
*   Python 3.10+
*   API Keys: `OPENROUTER_API_KEY`, `APIFY_API_TOKEN`

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/roastai.git
cd roastai

# Frontend
npm install

# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env.local` file in the root:

```env
OPENROUTER_API_KEY=sk-or-...
APIFY_API_TOKEN=apify_api_...
```

### 3. Run the App

```bash
# Terminal 1: Backend
source venv/bin/activate
python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2: Frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter the arena!

---

## 🗺️ Roadmap

### ✅ Phase 1: Core Battle System (Complete)

*   [x] Next.js & FastAPI foundation
*   [x] OpenRouter LLM integration
*   [x] Apify Twitter scraping
*   [x] Retro battle UI (split-screen, health bars, speech bubbles)
*   [x] Turn-based combat with damage scaling
*   [x] Multi-model selection for each fighter
*   [x] Performance stats display (latency, generation time)
*   [x] Round system with roulette animation
*   [x] Immediate KO visuals
*   [x] Looping background music

### 🚧 Phase 2: Audio & Voice (In Progress)

*   [ ] ElevenLabs text-to-speech integration
*   [ ] Voice preset selection per fighter
*   [ ] Real-time audio playback during roasts

### 🔮 Phase 3: Dynamic World (Planned)

*   [ ] "Vibe Engine" - Dynamic background changes based on damage
*   [ ] Vertex AI video generation for backgrounds
*   [ ] Sound effects for hits, criticals, and KOs

### 💀 Phase 4: Fatality & Virality (Planned)

*   [ ] Fatality drawing canvas
*   [ ] AI-generated fatality video rendering
*   [ ] Automatic highlight reel generation
*   [ ] Social media sharing

### 💾 Phase 5: Persistence & Polish (Planned)

*   [ ] Supabase match history
*   [ ] Fighter profiles & stats
*   [ ] Mobile optimization
*   [ ] Leaderboards

---

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

<p align="center">
  <b>Built with 🔥 and AI.</b>
</p>
