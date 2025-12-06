# 🔥 Koyak Kombat

> **The world's first generative AI roast battle arcade.**

![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-Alpha-orange)

---

## 🎮 What is Koyak Kombat?

**Koyak Kombat** is an AI-powered roast battle arena where players pit **Digital Twins** against each other in fully autonomous verbal warfare. By pasting social media URLs (Twitter, Instagram, LinkedIn, Facebook), the system scrapes the target's digital footprint—mining personality quirks, writing styles, and hidden insecurities—then spawns a fighter that **thinks, speaks, and roasts exactly like them**.

### The Experience

1. **Spawn Your Fighters:** Paste up to 3 social media URLs per fighter. The AI scrapes, analyzes, and generates persona-accurate Digital Twins.
2. **Choose Your Weapon:** Select AI models (GPT-4o, Gemini, Llama, Claude) and voice presets for each fighter.
3. **Select Your Arena:** Pick from 6 themed battle backgrounds.
4. **Watch the Carnage:** The match erupts into real-time verbal warfare with streaming roasts, TTS audio, and an independent AI Judge scoring damage.
5. **Draw Your Fatality:** The winner sketches a finishing move, analyzed by AI and rendered into video.

---

## 🚀 Features

| Feature | Status |
| :--- | :---: |
| **Digital Twin Generation** (Multi-platform persona synthesis) | ✅ |
| **Multi-Platform Scraping** (Twitter, Instagram, LinkedIn, Facebook) | ✅ |
| **AI-Powered Roasts** (OpenRouter + Groq: Gemini, GPT-4o, Llama, Claude) | ✅ |
| **Independent AI Judge** (GPT-5 Mini scoring with anti-repetition) | ✅ |
| **ElevenLabs TTS** (7 voice presets with real-time audio) | ✅ |
| **Retro Arcade Aesthetic** (CRT effects, pixel art, animations) | ✅ |
| **Performance Stats** (Real-time latency & generation time) | ✅ |
| **Speed Bonus System** (Fast roasts deal more damage) | ✅ |
| **Round System** (Roulette animation, "X STARTS!" indicator) | ✅ |
| **KO Visuals** (Skull icon, health bar depletion) | ✅ |
| **Background Music** (Phase-aware BGM with dynamic volume) | ✅ |
| **Arena Selection** (6 themed battle backgrounds) | ✅ |
| **Finishing Move Canvas** (tldraw integration) | ✅ |
| **AI Drawing Analysis** (Intent detection from sketches) | ✅ |
| **Battle Screenshot Capture** (For video generation) | ✅ |
| **Batch Fighter Creation** (Parallel scraping for both fighters) | ✅ |
| **Finishing Move Video** (Veo 3 generation) | 🚧 |
| **Match Persistence** (Supabase integration) | 🔮 |
| **Leaderboards** | 🔮 |

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js, React, Tailwind CSS, Framer Motion, tldraw |
| **Backend** | FastAPI (Python), Pydantic |
| **AI/LLM** | OpenRouter (GPT-4o, Gemini, Claude, Llama), Groq (Llama 3) |
| **AI Judge** | GPT-5 Mini via OpenRouter |
| **Scraping** | SocialData.tools (Twitter), Apify (Instagram, LinkedIn, Facebook) |
| **Voice** | ElevenLabs (7 voice presets, Turbo v2.5) |
| **Video** | Google Vertex AI / Veo 3 *(In Progress)* |
| **Queue** | Redis (RQ) |
| **UI Components** | Shadcn UI, Lucide Icons |

---

## 🏁 Getting Started

### Prerequisites

* Node.js 18+
* Python 3.10+
* Redis (for background jobs)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/koyak-kombat.git
cd koyak-kombat

# Frontend
npm install

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env.local` file in the `backend/` directory:

```env
# Required for AI model inference
OPENROUTER_API_KEY=sk-or-...

# Optional: For Groq-hosted models (Llama)
GROQ_API_KEY=gsk_...

# Required for Twitter scraping
SOCIALDATA_API_KEY=your_socialdata_key

# Required for Instagram, LinkedIn, Facebook scraping
APIFY_API_TOKEN=apify_api_...

# Required for voice synthesis
ELEVENLABS_API_KEY=sk_...

# Optional: For video generation
VERTEX_AI_PROJECT=your-gcp-project
VERTEX_AI_LOCATION=us-central1
```

> **Note**: See `backend/SOCIALDATA_INTEGRATION.md` for detailed API setup instructions.

### 3. Run the App

```bash
# Terminal 1: Backend API
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter the arena!

---

## 🎮 Gameplay Mechanics

### Damage System

Each roast is scored by an independent AI Judge on three criteria:

| Criterion | Weight | Description |
| :--- | :---: | :--- |
| **Specificity** | 30% | How personal is the attack? Generic = low damage |
| **Creativity** | 30% | Unique burns hit harder than clichés |
| **Accuracy** | 40% | Roasts based on real profile content deal extra damage |

**Formula:** `Final Damage = AI Score × 0.6 × Speed Multiplier`

### Speed Bonuses

| Response Time | Modifier |
| :--- | :---: |
| < 2 seconds | +15% |
| < 3 seconds | +10% |
| > 5 seconds | -10% |

### Anti-Repetition System

The Judge AI detects repeated topics and penalizes recycled attacks:
- Topic categorization (appearance, career, dating, etc.)
- Exhausted topics tracked across turns
- Repetition = 0 damage

---

## 📁 Project Structure

```
koyak-kombat/
├── pages/                    # Next.js pages
│   ├── index.js              # Landing page
│   ├── character.js          # Fighter selection & spawning
│   ├── battle.js             # Main battle arena
│   └── about.js              # About page
├── components/
│   ├── FinishingMoveDrawer.js # tldraw canvas for fatality
│   └── ui/                   # Shadcn UI components
├── lib/
│   └── api.js                # Frontend API client
├── backend/
│   ├── main.py               # FastAPI routes
│   ├── services.py           # Scraping, LLM, Voice, Judge services
│   ├── profiler.py           # Persona synthesis & aggregation
│   ├── platform_router.py    # URL → Platform routing
│   └── worker.py             # Redis background jobs
├── public/
│   ├── backgrounds/          # 6 battle arenas
│   ├── characters/           # Fighter sprites (male/female)
│   └── music/                # BGM tracks
└── styles/
    └── globals.css           # Tailwind + custom styles
```

---

## 🗺️ Roadmap

### ✅ Phase 1: Core Battle System (Complete)

* [x] Next.js & FastAPI foundation
* [x] OpenRouter + Groq LLM integration
* [x] Multi-platform scraping (Twitter, Instagram, LinkedIn, Facebook)
* [x] AI Persona Profiler with structured output
* [x] Independent AI Judge with scoring breakdown
* [x] Anti-repetition system
* [x] Retro battle UI with health bars and speech bubbles
* [x] Streamed roast text with typewriter effect
* [x] Round system with roulette animation
* [x] Arena selection (6 backgrounds)

### ✅ Phase 2: Audio & Voice (Complete)

* [x] ElevenLabs TTS integration
* [x] 7 voice presets per fighter
* [x] Real-time audio playback during roasts
* [x] Dynamic BGM volume (lower during speech/judging)

### ✅ Phase 3: Finishing Move (Complete)

* [x] tldraw canvas for drawing
* [x] AI analysis of drawing intent
* [x] "FINISH HIM/HER!" intro animation
* [x] 30-second countdown timer
* [x] Battle screenshot capture

### 🚧 Phase 4: Video Generation (In Progress)

* [ ] Veo 3 video rendering
* [ ] Highlight reel generation
* [ ] Social media sharing

### 🔮 Phase 5: Persistence & Polish (Planned)

* [ ] Supabase match history
* [ ] Fighter profiles & stats
* [ ] Mobile optimization
* [ ] Leaderboards

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Built with 🔥 and AI. No feelings were spared.</b>
</p>
