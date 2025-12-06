# 🔧 Technical Documentation

> Architecture and flow diagrams for Koyak Kombat

---

## 📐 System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Next.js)"]
        LP[Landing Page]
        CS[Character Select]
        BA[Battle Arena]
        FM[Finishing Move]
        API_CLIENT[API Client]
    end

    subgraph Backend["Backend (FastAPI)"]
        ROUTER[Platform Router]
        SCRAPER[Multi-Platform Scraper]
        PROFILER[Persona Profiler]
        LLM[LLM Service]
        JUDGE[Judge AI Service]
        VOICE[Voice Service]
    end

    subgraph External["External APIs"]
        SD[SocialData.tools]
        APIFY[Apify Actors]
        OR[OpenRouter]
        GROQ[Groq API]
        EL[ElevenLabs]
        VEO[Veo 3 / Vertex AI]
    end

    subgraph Storage["Storage"]
        LS[LocalStorage]
        REDIS[(Redis Queue)]
    end

    LP --> CS
    CS --> BA
    BA --> FM
    
    CS --> API_CLIENT
    BA --> API_CLIENT
    FM --> API_CLIENT
    
    API_CLIENT --> |HTTP| ROUTER
    
    ROUTER --> SCRAPER
    SCRAPER --> SD
    SCRAPER --> APIFY
    
    SCRAPER --> PROFILER
    PROFILER --> LLM
    LLM --> OR
    LLM --> GROQ
    
    BA --> JUDGE
    JUDGE --> OR
    
    BA --> VOICE
    VOICE --> EL
    
    FM --> VEO
    
    CS --> LS
    BA --> LS
    
    ROUTER --> REDIS
```

---

## 🎮 User Flow

```mermaid
flowchart LR
    subgraph Landing["1. Landing"]
        A[Insert Coin] --> B[Character Select]
    end
    
    subgraph Select["2. Fighter Selection"]
        B --> C[Enter URLs]
        C --> D[Select Voice]
        D --> E[Select Model]
        E --> F[Choose Arena]
        F --> G[Spawn Fighters]
    end
    
    subgraph Battle["3. Battle"]
        G --> H[Fight!]
        H --> I{Health > 0?}
        I --> |Yes| J[Next Turn]
        J --> H
        I --> |No| K[KO!]
    end
    
    subgraph Finish["4. Finishing Move"]
        K --> L[Draw Fatality]
        L --> M[AI Analysis]
        M --> N[Video Generation]
        N --> O[Game Over]
    end
    
    O --> B
```

---

## 🤖 Fighter Creation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant R as Router
    participant S as Scraper
    participant P as Profiler
    participant LLM as OpenRouter

    U->>FE: Enter URLs (Twitter, IG, LinkedIn)
    FE->>API: POST /fighters/create-batch
    
    API->>R: route_urls(urls)
    R-->>API: {twitter: [...], instagram: [...], linkedin: [...]}
    
    par Parallel Scraping
        API->>S: batch_scrape_twitter(usernames)
        S->>SocialData: GET /twitter/user/{username}
        SocialData-->>S: Profile + Bio
    and
        API->>S: batch_scrape_instagram(usernames)
        S->>Apify: instagram-profile-scraper
        Apify-->>S: Profile + Posts
    and
        API->>S: scrape_linkedin(username)
        S->>Apify: linkedin-profile-detail
        Apify-->>S: Profile + Experience + Posts
    end
    
    S-->>API: Raw platform data
    
    API->>P: ProfileAggregator.aggregate(data)
    P-->>API: Unified context block
    
    API->>P: PersonaProfiler.generate_persona(context)
    P->>LLM: GPT-5 Mini (JSON mode)
    LLM-->>P: Structured FighterPersona
    
    P-->>API: Fighter with system_prompt, attack_vectors
    API-->>FE: {fighter1: {...}, fighter2: {...}}
    FE->>FE: Store in localStorage
    FE->>U: Navigate to Battle
```

---

## ⚔️ Battle Turn Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as FastAPI
    participant F as Fighter LLM
    participant J as Judge AI
    participant V as Voice Service

    Note over FE: Turn starts
    FE->>FE: Show "THINKING..."
    
    FE->>API: POST /match/generate
    Note right of API: Includes: persona, attack_vectors, history
    
    API->>F: Generate roast (20 words max)
    Note right of F: Anti-repetition: exhausted_topics
    F-->>API: {text: "roast..."}
    
    par Generate Audio
        API->>V: generate_audio(text, voice_id)
        V->>ElevenLabs: TTS (Turbo v2.5)
        ElevenLabs-->>V: MP3 base64
        V-->>API: Base64 audio data URL
    end
    
    API-->>FE: {text, audio_url, duration_ms}
    
    FE->>FE: Stream text (4s typewriter)
    FE->>FE: Play TTS audio
    
    FE->>FE: Show "AI JUDGE IS DECIDING..."
    FE->>API: POST /match/judge
    
    API->>J: Judge roast (GPT-5 Mini)
    Note right of J: Score: Specificity, Creativity, Accuracy
    Note right of J: Check for repetition → 0 damage
    J-->>API: {damage, specificity, creativity, accuracy}
    
    API-->>FE: JudgeResponse
    
    FE->>FE: Show verdict overlay
    FE->>FE: Apply damage (with speed bonus)
    FE->>FE: Check health → Game Over or Next Turn
```

---

## 🏗️ Component Architecture

```mermaid
flowchart TB
    subgraph Pages["Pages"]
        INDEX[index.js<br/>Landing]
        CHAR[character.js<br/>Fighter Select]
        BATTLE[battle.js<br/>Arena]
        ABOUT[about.js<br/>Info]
    end

    subgraph Components["Components"]
        FMD[FinishingMoveDrawer<br/>tldraw canvas]
        BGM[BackgroundMusic<br/>Audio player]
        UI[UI Components<br/>Shadcn]
    end

    subgraph Lib["Library"]
        API[api.js<br/>HTTP client]
        UTILS[utils.js<br/>Helpers]
    end

    INDEX --> CHAR
    CHAR --> BATTLE
    BATTLE --> FMD
    
    CHAR --> API
    BATTLE --> API
    FMD --> API
    
    BATTLE --> BGM
    
    CHAR --> UI
    BATTLE --> UI
    ABOUT --> UI
```

---

## 🔌 Backend Services

```mermaid
classDiagram
    class MultiPlatformScraperService {
        +scrape_twitter(username)
        +scrape_instagram(username)
        +scrape_linkedin(url)
        +scrape_facebook(username)
        +batch_scrape_twitter(usernames)
        +batch_scrape_instagram(usernames)
        +batch_scrape_facebook(usernames)
    }
    
    class SocialDataService {
        +get_user_profile(username)
        +format_profile_for_profiler(profile)
    }
    
    class ProfileAggregator {
        +normalize_twitter(data)
        +normalize_instagram(data)
        +normalize_linkedin(data)
        +normalize_facebook(data)
        +aggregate(platform_data)
    }
    
    class PersonaProfiler {
        +generate_persona(context, name)
        +persona_to_dict(persona)
    }
    
    class LLMService {
        +generate_persona(scrape_data)
        +generate_roast(prompt, history, opponent, model)
        -_is_groq_model(model)
        -_get_client_and_model(model)
    }
    
    class JudgeService {
        +judge_roast(text, opponent, attack_vectors, history)
    }
    
    class VoiceService {
        +generate_audio(text, voice_id)
    }
    
    MultiPlatformScraperService --> SocialDataService : Twitter
    MultiPlatformScraperService --> ProfileAggregator : Output
    ProfileAggregator --> PersonaProfiler : Context
    PersonaProfiler --> LLMService : Uses
    JudgeService --> LLMService : Uses
```

---

## 📊 Data Models

```mermaid
erDiagram
    FIGHTER {
        string id
        string name
        string summary
        string system_prompt
        string avatar_url
        string gender
        json speech_patterns
        json psychological_insecurities
        json worldview
        json attack_vectors
        string[] platforms_scraped
    }
    
    SPEECH_PATTERNS {
        string[] vocabulary
        string sentence_structure
        string tone
    }
    
    WORLDVIEW {
        string[] core_beliefs
        string[] contradictions
    }
    
    MATCH_TURN {
        string match_id
        string current_turn
        json history
        string fighter_1_name
        string fighter_2_name
        string fighter_1_model
        string fighter_2_model
        string fighter_1_persona
        string fighter_2_persona
        string[] fighter_1_attack_vectors
        string[] fighter_2_attack_vectors
    }
    
    JUDGE_RESPONSE {
        int damage
        bool is_critical
        int specificity
        int creativity
        int accuracy
        string reasoning
    }
    
    FIGHTER ||--|| SPEECH_PATTERNS : has
    FIGHTER ||--|| WORLDVIEW : has
    MATCH_TURN ||--o{ FIGHTER : involves
    MATCH_TURN ||--|| JUDGE_RESPONSE : produces
```

---

## 🎯 Damage Calculation

```mermaid
flowchart LR
    subgraph Judge["AI Judge Scoring"]
        S[Specificity<br/>0-100]
        C[Creativity<br/>0-100]
        A[Accuracy<br/>0-100]
    end
    
    subgraph Weights["Weights"]
        SW[× 0.30]
        CW[× 0.30]
        AW[× 0.40]
    end
    
    subgraph Calc["Calculation"]
        BASE[Base Score]
        SCALE[× 0.60]
        SPEED[Speed Multiplier]
        FINAL[Final Damage]
    end
    
    S --> SW --> BASE
    C --> CW --> BASE
    A --> AW --> BASE
    
    BASE --> SCALE --> SPEED --> FINAL
    
    subgraph SpeedBonuses["Speed Bonuses"]
        F1["< 2s: × 1.15"]
        F2["< 3s: × 1.10"]
        F3["> 5s: × 0.90"]
    end
    
    SpeedBonuses -.-> SPEED
```

---

## 🔄 Anti-Repetition System

```mermaid
flowchart TB
    subgraph Input["Match History"]
        H1[Turn 1: appearance attack]
        H2[Turn 2: career attack]
        H3[Turn 3: social_media attack]
    end
    
    subgraph Categories["Topic Categories"]
        CAT1[appearance: ugly, face, look...]
        CAT2[dating: single, lonely...]
        CAT3[career: job, work, unemployed...]
        CAT4[personality: boring, cringe...]
        CAT5[social_media: followers, likes...]
        CAT6[intelligence: dumb, iq...]
        CAT7[hobbies: gaming, gym...]
        CAT8[family: mom, dad, parents...]
    end
    
    subgraph Process["Processing"]
        EXTRACT[Extract keywords<br/>from history]
        MATCH[Match to categories]
        EXHAUST[Mark exhausted]
    end
    
    subgraph Output["To Fighter LLM"]
        PROMPT["EXHAUSTED TOPICS:<br/>appearance, career, social_media"]
    end
    
    subgraph JudgeCheck["Judge AI Check"]
        DETECT[Detect repetition]
        ZERO[Force damage = 0]
    end
    
    Input --> EXTRACT
    Categories --> MATCH
    EXTRACT --> MATCH --> EXHAUST --> PROMPT
    
    PROMPT --> |"Fighter generates roast"| JudgeCheck
    JudgeCheck --> |"If repeated topic"| ZERO
```

---

## 🎬 Finishing Move Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FM as FinishingMoveDrawer
    participant TD as tldraw
    participant API as /api/analyze-finishing-move
    participant VEO as /api/generate-finishing-video
    participant AI as Gemini Vision

    Note over FM: Phase: intro
    FM->>FM: Show "FINISH HIM/HER!"
    FM->>FM: Wait 2.5s
    
    Note over FM: Phase: drawing
    FM->>TD: Mount canvas
    FM->>FM: Start 30s countdown
    U->>TD: Draw finishing move
    
    alt Timer expires OR user clicks Done
        FM->>TD: Export shapes as SVG
        TD-->>FM: SVG string
        FM->>FM: Convert SVG → PNG base64
    end
    
    Note over FM: Phase: analyzing
    FM->>API: POST {image, winner, loser}
    API->>AI: Analyze drawing intent
    AI-->>API: {intent, description, style, damage_modifier}
    API-->>FM: Analysis result
    
    Note over FM: Phase: generating
    FM->>VEO: POST {screenshot, intent, description}
    VEO->>VEO: Veo 3 video generation
    VEO-->>FM: {videoUrl}
    
    Note over FM: Phase: playing
    FM->>FM: Play video
    U->>FM: Skip or wait
    
    FM->>FM: onComplete(analysis)
    Note over FM: Return to Battle → Game Over screen
```

---

## 🌐 API Endpoints

```mermaid
flowchart LR
    subgraph Endpoints["FastAPI Endpoints"]
        E1[GET /health]
        E2[POST /api/v1/fighters/create]
        E3[POST /api/v1/fighters/create-batch]
        E4[POST /api/v1/match/start]
        E5[POST /api/v1/match/generate]
        E6[POST /api/v1/match/judge]
        E7[POST /api/v1/fatality/generate]
    end
    
    subgraph Frontend["Frontend Calls"]
        F1[createFighter]
        F2[createFightersBatch]
        F3[startMatch]
        F4[generateTurn]
        F5[judgeTurn]
    end
    
    subgraph Next["Next.js API Routes"]
        N1["/api/analyze-finishing-move"]
        N2["/api/generate-finishing-video"]
    end
    
    F1 --> E2
    F2 --> E3
    F3 --> E4
    F4 --> E5
    F5 --> E6
    
    N1 --> |Gemini Vision| External
    N2 --> |Veo 3| External
```

---

## 🔊 Voice System

```mermaid
flowchart TB
    subgraph Presets["Voice Presets"]
        V1[adam → Brian<br/>Energetic Male]
        V2[charlie → Josh<br/>Deep Male]
        V3[bella → Sarah<br/>Expressive Female]
        V4[clyde → Clyde<br/>Aggressive Male]
        V5[rachel → Rachel<br/>Confident Female]
        V6[mal_male → Chris<br/>Fast Casual Male]
        V7[mal_female → Grace<br/>Malaysian Female]
    end
    
    subgraph Service["VoiceService"]
        MAP[Map friendly name → ElevenLabs ID]
        GEN[Generate TTS]
        ENC[Encode as base64 data URL]
    end
    
    subgraph Output["Frontend"]
        AUDIO[Audio element]
        PLAY[Autoplay]
    end
    
    Presets --> MAP --> GEN --> ENC --> AUDIO --> PLAY
```

---

## 📦 External Dependencies

| Service | Purpose | API Type |
|---------|---------|----------|
| **SocialData.tools** | Twitter profile scraping | REST API |
| **Apify** | Instagram, LinkedIn, Facebook scraping | Actor API |
| **OpenRouter** | GPT-4o, Gemini, Claude routing | OpenAI-compatible |
| **Groq** | Fast Llama inference | OpenAI-compatible |
| **ElevenLabs** | Text-to-Speech | REST API |
| **Vertex AI / Veo 3** | Finishing move video generation | Google Cloud |

---

## 🔐 Environment Variables

```mermaid
flowchart TB
    subgraph Required["Required"]
        R1[OPENROUTER_API_KEY]
        R2[SOCIALDATA_API_KEY]
        R3[APIFY_API_TOKEN]
        R4[ELEVENLABS_API_KEY]
    end
    
    subgraph Optional["Optional"]
        O1[GROQ_API_KEY]
        O2[VERTEX_AI_PROJECT]
        O3[VERTEX_AI_LOCATION]
        O4[PROFILER_MODEL]
        O5[REDIS_URL]
    end
    
    subgraph Services["Services Using"]
        S1[LLMService]
        S2[MultiPlatformScraperService]
        S3[VoiceService]
        S4[JudgeService]
    end
    
    R1 --> S1
    R1 --> S4
    O1 --> S1
    R2 --> S2
    R3 --> S2
    R4 --> S3
```

---

<p align="center">
  <b>Built with 🔥 and AI</b>
</p>

