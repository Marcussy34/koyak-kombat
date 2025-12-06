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
    history: List[dict] = []

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

class BatchFighterCreate(BaseModel):
    """Batch create both fighters in a single request for parallel scraping."""
    fighter1_urls: List[str]
    fighter2_urls: List[str]
    fighter1_voice_id: str = "adam"
    fighter2_voice_id: str = "charlie"

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
    # Voice IDs for TTS (ElevenLabs voice names: adam, charlie, bella)
    fighter_1_voice_id: str = "adam"
    fighter_2_voice_id: str = "charlie"
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
    
    # 2. Scrape each platform in PARALLEL for efficiency
    # Uses ThreadPoolExecutor to run all scraping tasks concurrently
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    platform_data = {}
    detected_name = "Digital Twin"
    
    # Build list of scrape tasks: [(platform, username), ...]
    scrape_tasks = []
    for platform, platform_infos in routed.items():
        if platform == "unknown":
            continue
        for info in platform_infos:
            scrape_tasks.append((platform, info.username))
    
    print(f"[Scraper] Starting parallel scraping for {len(scrape_tasks)} platform(s)...")
    
    # Execute all scrapes in parallel
    with ThreadPoolExecutor(max_workers=4) as executor:
        # Submit all tasks
        future_to_task = {
            executor.submit(scraper_service.scrape_platform, platform, username): (platform, username)
            for platform, username in scrape_tasks
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_task):
            platform, username = future_to_task[future]
            try:
                data = future.result()
                if data:
                    platform_data[platform] = data
                    # Use first username as fallback name
                    if detected_name == "Digital Twin":
                        detected_name = f"@{username}"
            except Exception as e:
                print(f"[Scraper] Error scraping {platform}/@{username}: {e}")
    
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


def _scrape_fighter_data(urls: List[str]) -> tuple[dict, str]:
    """
    Helper: Scrape all platforms for a single fighter.
    Returns (platform_data dict, detected_name).
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    routed = route_urls(urls)
    platform_data = {}
    detected_name = "Digital Twin"
    
    # Build scrape tasks
    scrape_tasks = []
    for platform, platform_infos in routed.items():
        if platform == "unknown":
            continue
        for info in platform_infos:
            scrape_tasks.append((platform, info.username))
    
    # Execute scrapes in parallel
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_task = {
            executor.submit(scraper_service.scrape_platform, platform, username): (platform, username)
            for platform, username in scrape_tasks
        }
        
        for future in as_completed(future_to_task):
            platform, username = future_to_task[future]
            try:
                data = future.result()
                if data:
                    platform_data[platform] = data
                    if detected_name == "Digital Twin":
                        detected_name = f"@{username}"
            except Exception as e:
                print(f"[Scraper] Error scraping {platform}/@{username}: {e}")
    
    return platform_data, detected_name


def _build_fighter_response(platform_data: dict, detected_name: str) -> dict:
    """
    Helper: Generate persona from scraped data and build response.
    """
    aggregated_context = ProfileAggregator.aggregate(platform_data)
    print(f"Aggregated context length: {len(aggregated_context)} chars")
    
    print(f"[Profiler] Passing {len(aggregated_context)} chars of context to LLM for persona synthesis...")
    persona = profiler.generate_persona(aggregated_context, detected_name)
    persona_dict = profiler.persona_to_dict(persona)
    
    return {
        "id": str(uuid.uuid4()),
        "name": persona.name,
        "summary": f"{persona.speech_patterns.tone}. Insecurities: {', '.join(persona.psychological_insecurities[:2])}",
        "system_prompt": persona.system_prompt,
        "avatar_url": f"https://api.dicebear.com/9.x/pixel-art/svg?seed={persona.name}",
        "speech_patterns": persona_dict["speech_patterns"],
        "psychological_insecurities": persona_dict["psychological_insecurities"],
        "worldview": persona_dict["worldview"],
        "attack_vectors": persona_dict["attack_vectors"],
        "gender": persona_dict["gender"],
        "platforms_scraped": list(platform_data.keys())
    }


@app.post("/api/v1/fighters/create-batch")
async def create_fighters_batch(batch: BatchFighterCreate):
    """
    Create BOTH fighters in a single request with BATCHED scraping.
    
    Flow:
    1. Collect all usernames per platform across both fighters
    2. Run ONE Instagram actor with all usernames
    3. Run ONE Facebook Pages + ONE Facebook Posts actor with all URLs (in parallel)
    4. Scrape LinkedIn profiles individually (no batch support in actor)
    5. Split results back to each fighter
    6. Generate personas for both fighters in parallel
    
    This uses 3 actor instances instead of 6!
    """
    from concurrent.futures import ThreadPoolExecutor
    
    print(f"[Batch] Creating both fighters with BATCHED scraping...")
    print(f"[Batch] Fighter 1 URLs: {batch.fighter1_urls}")
    print(f"[Batch] Fighter 2 URLs: {batch.fighter2_urls}")
    
    # Step 1: Route all URLs and collect usernames by platform
    f1_routed = route_urls(batch.fighter1_urls)
    f2_routed = route_urls(batch.fighter2_urls)
    
    # Collect Instagram usernames
    ig_usernames = []
    ig_username_to_fighter = {}  # Maps username -> 'f1' or 'f2'
    
    for info in f1_routed.get("instagram", []):
        ig_usernames.append(info.username)
        ig_username_to_fighter[info.username] = "f1"
    for info in f2_routed.get("instagram", []):
        ig_usernames.append(info.username)
        ig_username_to_fighter[info.username] = "f2"
    
    # Collect Facebook usernames
    fb_usernames = []
    fb_username_to_fighter = {}
    
    for info in f1_routed.get("facebook", []):
        fb_usernames.append(info.username)
        fb_username_to_fighter[info.username] = "f1"
    for info in f2_routed.get("facebook", []):
        fb_usernames.append(info.username)
        fb_username_to_fighter[info.username] = "f2"
    
    print(f"[Batch] Instagram usernames: {ig_usernames}")
    print(f"[Batch] Facebook usernames: {fb_usernames}")

    # Collect Twitter usernames
    tw_usernames = []
    tw_username_to_fighter = {}
    
    for info in f1_routed.get("twitter", []):
        tw_usernames.append(info.username)
        tw_username_to_fighter[info.username] = "f1"
    for info in f2_routed.get("twitter", []):
        tw_usernames.append(info.username)
        tw_username_to_fighter[info.username] = "f2"
        
    print(f"[Batch] Twitter usernames: {tw_usernames}")
    
    # Collect LinkedIn usernames/URLs
    # LinkedIn scraper uses full URLs, so we store both username and original_url
    li_profiles = []  # List of (username, original_url)
    li_username_to_fighter = {}
    
    for info in f1_routed.get("linkedin", []):
        li_profiles.append((info.username, info.original_url))
        li_username_to_fighter[info.username] = "f1"
    for info in f2_routed.get("linkedin", []):
        li_profiles.append((info.username, info.original_url))
        li_username_to_fighter[info.username] = "f2"
    
    print(f"[Batch] LinkedIn profiles: {[p[0] for p in li_profiles]}")
    
    # Step 2: Batch scrape all platforms in parallel (4 actors max)
    ig_results = {}
    fb_results = {}
    tw_results = {}
    li_results = {}
    
    def scrape_linkedin_profiles(profiles: list) -> dict:
        """Scrape multiple LinkedIn profiles in parallel (no batch support in actor)."""
        results = {}
        if not profiles:
            return results
        
        def scrape_single(item):
            username, url = item
            try:
                data = scraper_service.scrape_linkedin(url)
                return username, data
            except Exception as e:
                print(f"[LinkedIn Batch] Error scraping {username}: {e}")
                return username, {}
        
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(scrape_single, p) for p in profiles]
            for future in futures:
                username, data = future.result()
                if data:
                    results[username] = data
        return results
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        ig_future = executor.submit(scraper_service.batch_scrape_instagram, ig_usernames) if ig_usernames else None
        fb_future = executor.submit(scraper_service.batch_scrape_facebook, fb_usernames) if fb_usernames else None
        tw_future = executor.submit(scraper_service.batch_scrape_twitter, tw_usernames) if tw_usernames else None
        li_future = executor.submit(scrape_linkedin_profiles, li_profiles) if li_profiles else None
        
        if ig_future:
            ig_results = ig_future.result()
        if fb_future:
            fb_results = fb_future.result()
        if tw_future:
            tw_results = tw_future.result()
        if li_future:
            li_results = li_future.result()
    
    print(f"[Batch] Scraping complete. IG: {list(ig_results.keys())}, FB: {list(fb_results.keys())}, TW: {list(tw_results.keys())}, LI: {list(li_results.keys())}")
    
    # Step 3: Split results back to each fighter
    f1_data = {}
    f2_data = {}
    f1_name = "Digital Twin 1"
    f2_name = "Digital Twin 2"
    
    for username, data in ig_results.items():
        if ig_username_to_fighter.get(username) == "f1":
            f1_data["instagram"] = data
            if f1_name == "Digital Twin 1":
                f1_name = f"@{username}"
        else:
            f2_data["instagram"] = data
            if f2_name == "Digital Twin 2":
                f2_name = f"@{username}"
    
    for username, data in fb_results.items():
        if fb_username_to_fighter.get(username) == "f1":
            f1_data["facebook"] = data
        else:
            f2_data["facebook"] = data

    for username, data in tw_results.items():
        if tw_username_to_fighter.get(username) == "f1":
            f1_data["twitter"] = data
            if f1_name == "Digital Twin 1":
                f1_name = f"@{username}"
        else:
            f2_data["twitter"] = data
            if f2_name == "Digital Twin 2":
                f2_name = f"@{username}"
    
    # Assign LinkedIn results
    for username, data in li_results.items():
        if li_username_to_fighter.get(username) == "f1":
            f1_data["linkedin"] = data
            if f1_name == "Digital Twin 1":
                # Try to get name from LinkedIn data
                first = data.get("firstName", "")
                last = data.get("lastName", "")
                if first or last:
                    f1_name = f"{first} {last}".strip()
                else:
                    f1_name = f"@{username}"
        else:
            f2_data["linkedin"] = data
            if f2_name == "Digital Twin 2":
                first = data.get("firstName", "")
                last = data.get("lastName", "")
                if first or last:
                    f2_name = f"{first} {last}".strip()
                else:
                    f2_name = f"@{username}"
    
    print(f"[Batch] F1 platforms: {list(f1_data.keys())}, F2 platforms: {list(f2_data.keys())}")
    
    # Step 4: Generate personas in parallel
    with ThreadPoolExecutor(max_workers=2) as executor:
        f1_resp_future = executor.submit(_build_fighter_response, f1_data, f1_name)
        f2_resp_future = executor.submit(_build_fighter_response, f2_data, f2_name)
        
        f1_response = f1_resp_future.result()
        f2_response = f2_resp_future.result()
    
    print(f"[Batch] Both fighters created successfully!")
    
    return {
        "fighter1": f1_response,
        "fighter2": f2_response
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
            speaker_voice_id = turn.fighter_1_voice_id
        else:
            speaker_name = turn.fighter_2_name
            opponent_name = turn.fighter_1_name
            model_name = turn.fighter_2_model
            speaker_persona = turn.fighter_2_persona
            opponent_persona = turn.fighter_1_persona
            opponent_attack_vectors = turn.fighter_1_attack_vectors
            speaker_voice_id = turn.fighter_2_voice_id
        
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
        Keep the roast under 20 words. This is a strict limit.
        Reference at least ONE specific attack vector above.
        """
        
        # 1. Generate Roast (Measure Time) - Fighter AI only generates text now
        import time
        start_time = time.time()
        roast_data = llm_service.generate_roast(system_prompt, turn.history, opponent_name, model_name)
        end_time = time.time()
        duration_ms = (end_time - start_time) * 1000
        
        roast_text = roast_data.get("text", "Error generating roast")
        
        # 2. Generate Audio using ElevenLabs TTS
        # Returns base64 data URL for direct browser playback
        audio_url = voice_service.generate_audio(roast_text, speaker_voice_id)
        print(f"[TTS] Generated audio for {speaker_name} with voice {speaker_voice_id}: {bool(audio_url)}")

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
            opponent_attack_vectors=req.opponent_attack_vectors,
            match_history=req.history
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
