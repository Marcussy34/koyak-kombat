import os
import uuid
import random
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from redis import Redis
from rq import Queue
from services import MultiPlatformScraperService, LLMService, VoiceService, JudgeService
from platform_router import detect_platform, route_urls
from profiler import ProfileAggregator, PersonaProfiler

load_dotenv(".env.local")
load_dotenv()

app = FastAPI(title="Koyak Kombat API", version="1.0.0")

# Services
scraper_service = MultiPlatformScraperService()
llm_service = LLMService()
voice_service = VoiceService()
judge_service = JudgeService()  # GPT-5 Mini for independent roast scoring
profiler = PersonaProfiler()

# Redis Queue
redis_conn = Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))
q = Queue(connection=redis_conn)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class GenerateResponse(BaseModel):
    text: str
    audio_url: Optional[str] = None
    duration_ms: float = 0.0

class JudgeTurnRequest(BaseModel):
    match_id: str
    roast_text: str
    opponent_name: str
    opponent_attack_vectors: List[str]

class JudgeResponse(BaseModel):
    damage: int
    is_critical: bool
    specificity: int
    creativity: int
    accuracy: int
    reasoning: str

class FighterCreate(BaseModel):
    urls: List[str]  # Array of social media URLs (Twitter, Instagram, LinkedIn)
    voice_id: str

class MatchStart(BaseModel):
    fighter_1_id: str
    fighter_2_id: str

class MatchTurn(BaseModel):
    match_id: str
    history: List[dict] # Pass full history for statelessness in Phase 2
    fighter_1_name: str
    fighter_2_name: str
    fighter_1_model: str = "google/gemini-2.0-flash-001"
    fighter_2_model: str = "google/gemini-2.0-flash-001"
    fighter_1_persona: str = "You are a generic roast fighter."
    fighter_2_persona: str = "You are a generic roast fighter."
    # Attack vectors are specific embarrassing facts/weaknesses to exploit
    fighter_1_attack_vectors: List[str] = []
    fighter_2_attack_vectors: List[str] = []
    current_turn: str # 'fighter1' or 'fighter2'

class FatalityGenerate(BaseModel):
    match_id: str
    fighter_1_id: str
    fighter_2_id: str
    fighter_1_name: str
    fighter_2_name: str
    fighter_1_persona: str
    fighter_2_persona: str
    history: List[dict]

@app.get("/health")
async def health_check():
    # Check for critical keys
    missing = []
    if not os.getenv("OPENROUTER_API_KEY"): missing.append("OPENROUTER_API_KEY")
    if not os.getenv("ELEVENLABS_API_KEY"): missing.append("ELEVENLABS_API_KEY")
    
    return {
        "status": "ok", 
        "env": "loaded" if not missing else "missing_keys",
        "missing": missing
    }

@app.post("/api/v1/fighters/create")
async def create_fighter(fighter: FighterCreate):
    """
    Create a fighter from one or more social media URLs.
    
    Flow:
    1. Route each URL to its platform (regex-based)
    2. Scrape each platform in parallel (low maxItems for cost efficiency)
    3. Aggregate raw outputs into unified context
    4. Pass to Profiler LLM for structured persona synthesis
    5. Return Fighter Persona with speech patterns, insecurities, etc.
    """
    print(f"Creating fighter from URLs: {fighter.urls}")
    
    # 1. Route URLs to platforms using regex (no LLM needed)
    routed = route_urls(fighter.urls)
    print(f"Routed platforms: {list(routed.keys())}")
    
    # 2. Scrape each platform
    platform_data = {}
    detected_name = "Digital Twin"
    
    for platform, platform_infos in routed.items():
        if platform == "unknown":
            continue
        
        for info in platform_infos:
            data = scraper_service.scrape_platform(platform, info.username)
            if data:
                platform_data[platform] = data
                # Use first username as fallback name
                if detected_name == "Digital Twin":
                    detected_name = f"@{info.username}"
    
    # 3. Aggregate raw outputs into unified context block
    aggregated_context = ProfileAggregator.aggregate(platform_data)
    print(f"Aggregated context length: {len(aggregated_context)} chars")
    
    # 4. Pass to Profiler LLM for structured persona synthesis
    print(f"[Profiler] Passing {len(aggregated_context)} chars of context to LLM for persona synthesis...")
    persona = profiler.generate_persona(aggregated_context, detected_name)
    persona_dict = profiler.persona_to_dict(persona)
    
    # 5. Return structured Fighter Persona
    return {
        "id": str(uuid.uuid4()),
        "name": persona.name,
        "summary": f"{persona.speech_patterns.tone}. Insecurities: {', '.join(persona.psychological_insecurities[:2])}",
        "system_prompt": persona.system_prompt,
        "avatar_url": f"https://api.dicebear.com/9.x/pixel-art/svg?seed={persona.name}",
        # NEW: Structured persona fields
        "speech_patterns": persona_dict["speech_patterns"],
        "psychological_insecurities": persona_dict["psychological_insecurities"],
        "worldview": persona_dict["worldview"],
        "attack_vectors": persona_dict["attack_vectors"],
        "gender": persona_dict["gender"],
        "platforms_scraped": list(platform_data.keys())
    }

@app.post("/api/v1/match/start")
async def start_match(match: MatchStart):
    return {
        "match_id": str(uuid.uuid4()),
        "status": "started",
        "background": "neutral"
    }

@app.post("/api/v1/match/generate")
async def generate_turn(turn: MatchTurn):
    try:
        print(f"Received turn generation request: {turn}")
        # Determine who is speaking and who is the opponent
        if turn.current_turn == 'fighter1':
            speaker_name = turn.fighter_1_name
            opponent_name = turn.fighter_2_name
            model_name = turn.fighter_1_model
            speaker_persona = turn.fighter_1_persona
            opponent_persona = turn.fighter_2_persona
            opponent_attack_vectors = turn.fighter_2_attack_vectors
        else:
            speaker_name = turn.fighter_2_name
            opponent_name = turn.fighter_1_name
            model_name = turn.fighter_2_model
            speaker_persona = turn.fighter_2_persona
            opponent_persona = turn.fighter_1_persona
            opponent_attack_vectors = turn.fighter_1_attack_vectors
        
        # Format attack vectors as bullet points
        attack_vectors_text = "\n".join([f"- {av}" for av in opponent_attack_vectors]) if opponent_attack_vectors else "- No specific weaknesses known"
        
        # Construct the system prompt using the full personas + attack vectors
        system_prompt = f"""
        IDENTITY:
        You are {speaker_name}.
        {speaker_persona}

        TARGET:
        You are roasting {opponent_name}.
        {opponent_persona}
        
        AMMUNITION (use these SPECIFIC facts to attack them):
        {attack_vectors_text}

        CONSTRAINT:
        Keep the roast under 30 words. This is a strict limit.
        Reference at least ONE specific attack vector above.
        """
        
        # 1. Generate Roast (Measure Time) - Fighter AI only generates text now
        import time
        start_time = time.time()
        roast_data = llm_service.generate_roast(system_prompt, turn.history, opponent_name, model_name)
        end_time = time.time()
        duration_ms = (end_time - start_time) * 1000
        
        roast_text = roast_data.get("text", "Error generating roast")
        
        # 2. Generate Audio
        # audio_url = voice_service.generate_audio(roast_data["text"], "voice_id_placeholder")
        audio_url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" # Mock for speed

        return GenerateResponse(
            text=roast_text,
            audio_url=audio_url,
            duration_ms=duration_ms
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return GenerateResponse(
            text=f"Backend Error: {str(e)}",
            audio_url=None,
            duration_ms=0.0
        )

@app.post("/api/v1/match/judge")
async def judge_turn(req: JudgeTurnRequest):
    try:
        # Judge AI scores the roast independently (GPT-5 Mini)
        # Uses Specificity (30%), Creativity (30%), Accuracy (40%)
        judge_result = judge_service.judge_roast(
            roast_text=req.roast_text,
            opponent_name=req.opponent_name,
            opponent_attack_vectors=req.opponent_attack_vectors
        )
        
        damage = int(judge_result.get("damage", 50))
        print(f"[Judge AI] Scored roast: {damage} (Spec: {judge_result.get('specificity')}, Crea: {judge_result.get('creativity')}, Acc: {judge_result.get('accuracy')})")
        print(f"[Judge AI] Reasoning: {judge_result.get('reasoning', 'N/A')}")
        
        # Check for Critical Hit -> Trigger Background Change
        if damage > 80:
            print(f"Critical Hit! Enqueuing video generation for match {req.match_id}")
            from worker import generate_background_video
            q.enqueue(generate_background_video, f"Burning dojo, pixel art style, intense fire", req.match_id)

        return JudgeResponse(
            damage=damage,
            is_critical=damage > 80,
            specificity=judge_result.get("specificity", 0),
            creativity=judge_result.get("creativity", 0),
            accuracy=judge_result.get("accuracy", 0),
            reasoning=judge_result.get("reasoning", "N/A")
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JudgeResponse(
            damage=10,
            is_critical=False,
            specificity=0,
            creativity=0,
            accuracy=0,
            reasoning=f"Judge Error: {str(e)}"
        )

@app.post("/api/v1/fatality/generate")
async def generate_fatality(fatality: FatalityGenerate):
    return {"video_url": "https://www.w3schools.com/html/mov_bbb.mp4"}
