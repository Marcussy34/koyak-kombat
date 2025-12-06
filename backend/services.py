import os
import json
import requests
from openai import OpenAI
from apify_client import ApifyClient
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv

load_dotenv()

# --- SocialData.tools Service ---
# Modern Twitter API alternative using socialdata.tools
class SocialDataService:
    """
    Twitter scraper using socialdata.tools API.
    More reliable and faster than web scraping methods.
    
    Features:
    - Get user profile (followers, bio, verification status)
    - Fetch recent tweets (up to 5 most recent)
    - Normalize data for persona generation
    
    API Docs: 
    - User Profile: https://docs.socialdata.tools/reference/get-user-profile/
    - Individual Tweet: https://docs.socialdata.tools/reference/get-tweet/
    """
    
    BASE_URL = "https://api.socialdata.tools"
    
    def __init__(self):
        # Get API key from environment
        self.api_key = os.getenv("SOCIALDATA_API_KEY")
        self.has_key = bool(self.api_key)
        
        if not self.has_key:
            print("[SocialData] Warning: SOCIALDATA_API_KEY not found in environment")
    
    def get_user_profile(self, username: str) -> dict:
        """
        Get Twitter user profile by username.
        
        Args:
            username: Twitter username without @ symbol
            
        Returns:
            User profile dict with follower counts, bio, etc.
            
        Example response:
            {
                "id": 44196397,
                "name": "Elon Musk",
                "screen_name": "elonmusk",
                "description": "...",
                "followers_count": 166213974,
                "verified": true,
                ...
            }
        """
        if not self.has_key:
            print(f"[SocialData] No API key, cannot fetch profile for @{username}")
            return {}
        
        url = f"{self.BASE_URL}/twitter/user/{username}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }
        
        try:
            print(f"[SocialData] Fetching profile for @{username}...")
            response = requests.get(url, headers=headers, timeout=10)
            
            # Check for errors
            if response.status_code == 404:
                print(f"[SocialData] User @{username} not found")
                return {}
            elif response.status_code == 402:
                print(f"[SocialData] Insufficient credits")
                return {}
            elif response.status_code != 200:
                print(f"[SocialData] API error: {response.status_code}")
                return {}
            
            data = response.json()
            print(f"[SocialData] Successfully fetched profile for @{username}")
            print(f"[SocialData] Profile data: {json.dumps(data, indent=2)}")
            return data
            
        except requests.exceptions.RequestException as e:
            print(f"[SocialData] Request error: {e}")
            return {}
        except Exception as e:
            print(f"[SocialData] Unexpected error: {e}")
            return {}
    
    def format_profile_for_profiler(self, profile: dict) -> list[dict]:
        """
        Pass raw profile data to profiler.
        """
        if not profile:
            return []
        # Return raw profile wrapped in list
        return [profile]

# --- Multi-Platform Scraper Service ---
# Lightweight Apify actors with low maxItems for cost efficiency (~$0.01-0.02/fighter)
class MultiPlatformScraperService:
    """
    Scrapes Twitter, Instagram, and LinkedIn using different services:
    - Twitter: SocialData.tools API (more reliable)
    - Instagram: Apify actor (apify/instagram-profile-scraper)
    - LinkedIn: Apify actor (curious_coder/linkedin-profile-scraper)
    Configured with low maxItems limits to minimize costs.
    """
    
    # Actor IDs for each platform
    # NOTE: Twitter now uses SocialData.tools API instead of Apify
    # Instagram and LinkedIn still use Apify actors
    ACTORS = {
        "instagram": "apify/instagram-profile-scraper",   # No browser, fast
        "linkedin": "curious_coder/linkedin-profile-scraper",  # No cookies required
    }
    
    # Low maxItems limits to control costs
    MAX_ITEMS = {
        "twitter": 15,    # Latest 15 tweets
        "instagram": 10,  # Latest 10 posts + profile
        "linkedin": 1,    # Single profile (includes experience)
    }
    
    # Hardcoded fallbacks for famous people (bypass Apify during testing)
    # These get passed to the LLM Profiler to generate personas
    # Keys can be "{username}" or "{username}_{platform}" for platform-specific fallbacks
    FALLBACK_DATA = {
        "elonmusk": {
            "platform": "twitter",
            "data": [
                {"text": "The algorithm is the problem. We're fixing it.", "likeCount": 50000},
                {"text": "Mars is looking good. Starship test soon. Humanity must become multiplanetary.", "likeCount": 180000},
                {"text": "Population collapse is the real crisis. Nobody talks about it.", "likeCount": 130000},
                {"text": "The woke mind virus must be stopped or nothing else matters", "likeCount": 245000},
                {"text": "Dogecoin to the moon! 🚀 The people's crypto", "likeCount": 500000},
                {"text": "Tesla FSD is improving exponentially. Soon will be 10x safer than human drivers", "likeCount": 95000},
                {"text": "I didn't buy Twitter to make money. I did it to help humanity.", "likeCount": 320000},
                {"text": "Sleep is overrated. I work 120 hours a week. That's what it takes.", "likeCount": 88000},
                {"text": "My ex won't let me see the kids as much as I want. Very sad.", "likeCount": 150000},
                {"text": "AI will be smarter than any human by 2025. We need to be careful.", "likeCount": 200000},
                {"text": "Just had an amazing conversation with my son X Æ A-12. He's so smart.", "likeCount": 175000},
                {"text": "Mainstream media is dying. Citizen journalism is the future.", "likeCount": 110000},
                {"text": "I'm not saying aliens exist, but... 👽", "likeCount": 400000},
                {"text": "Gonna put a Cybertruck on Mars. Why not?", "likeCount": 250000},
                {"text": "My companies have created more jobs than any politician. Facts.", "likeCount": 95000},
            ]
        },
        # Mark Zuckerberg - Twitter version (for twitter.com/finkd)
        "finkd": {
            "platform": "twitter",
            "data": [
                {"text": "Just finished a great sparring session. Got submitted twice but learned a lot. 🥋", "likeCount": 250000},
                {"text": "Meta AI is going to change everything. We're building the future of human connection.", "likeCount": 180000},
                {"text": "Smoking some Sweet Baby Ray's brisket this weekend. The secret is low and slow. 🍖", "likeCount": 320000},
                {"text": "The Metaverse isn't a fad. It's the next chapter of the internet. Believe.", "likeCount": 95000},
                {"text": "Training for my next MMA fight. Cardio is brutal but worth it. No excuses.", "likeCount": 145000},
                {"text": "Privacy is important. That's why we're investing billions in encryption.", "likeCount": 88000},
                {"text": "Threads just hit 200M users. Grateful for the support. LFG 🚀", "likeCount": 400000},
                {"text": "Congress doesn't understand technology. But we're trying to educate them.", "likeCount": 220000},
                {"text": "Just sparred with a professional UFC fighter. Survived 3 rounds. Small wins. �", "likeCount": 350000},
                {"text": "Priscilla and I celebrating 10 years. She makes me a better person every day. ❤️", "likeCount": 500000},
                {"text": "VR is the future of work. Imagine meetings in the Metaverse instead of Zoom.", "likeCount": 120000},
                {"text": "Kids asked why I wear the same gray t-shirt every day. Less decisions = more focus.", "likeCount": 280000},
                {"text": "Surfing in Hawaii with the hydrofoil. Fell about 50 times before getting it right. 🏄", "likeCount": 195000},
                {"text": "Just finished reading 25 books this year. Knowledge is power. 📚", "likeCount": 110000},
                {"text": "Building AI that works for everyone. Not just the privileged few.", "likeCount": 175000},
            ]
        },
        # Mark Zuckerberg - Instagram version (for instagram.com/zuck or finkd)
        "zuck": {
            "platform": "instagram",
            "data": {
                "fullName": "Mark Zuckerberg",
                "biography": "Building the future. Smoking meats. Jiu Jitsu.",
                "followersCount": 14000000,
                "posts": [
                    {"caption": "Great session training with the team today. The journey continues. 🥋"},
                    {"caption": "New Meta AI features dropping soon. Excited to share what we've been building."},
                    {"caption": "Family time is the best time. Grateful for every moment with Priscilla and the kids."},
                ]
            }
        },
    }
    
    def __init__(self):
        # Apify client for Instagram and LinkedIn
        token = os.getenv("APIFY_API_TOKEN")
        self.client = ApifyClient(token) if token else None
        self.has_token = bool(token)
        
        # SocialData.tools for Twitter (more reliable)
        self.socialdata = SocialDataService()
    
    def scrape_twitter(self, username: str) -> list[dict]:
        """
        Scrape Twitter user profile and recent tweets using SocialData.tools API.
        Returns combined profile info and real tweets for persona generation.
        """
        print(f"[Twitter] Scraping @{username} via SocialData.tools...")
        
        # Check for fallback data first (for testing with hardcoded profiles)
        if username.lower() in self.FALLBACK_DATA:
            fallback = self.FALLBACK_DATA[username.lower()]
            if fallback["platform"] == "twitter":
                print(f"[Twitter] Using fallback data for @{username}")
                return fallback["data"]
        
        # Use SocialData.tools API
        if self.socialdata.has_key:
            # Step 1: Get user profile
            profile = self.socialdata.get_user_profile(username)
            
            if profile:
                # Return raw profile data (wrapped in list for compatibility)
                formatted_data = self.socialdata.format_profile_for_profiler(profile)
                print(f"[Twitter] Got profile data for @{username}")
                return formatted_data
            else:
                print(f"[Twitter] Could not fetch profile for @{username}, using mock data")
        else:
            print(f"[Twitter] No SOCIALDATA_API_KEY, using mock data")
        
        # Fallback: return mock data if API fails or no key
        return [{"text": f"Mock tweet from @{username}. They post about tech and memes.", "likeCount": 100}]
    
    def scrape_instagram(self, username: str) -> dict:
        """
        Scrape Instagram profile and recent posts.
        Returns profile object with bio, followers, and latest posts.
        """
        print(f"[Instagram] Scraping @{username}...")
        
        # Check for fallback data
        if username.lower() in self.FALLBACK_DATA:
            fallback = self.FALLBACK_DATA[username.lower()]
            if fallback["platform"] == "instagram":
                print(f"[Instagram] Using fallback data for @{username}")
                return fallback["data"]
        
        if not self.has_token:
            print("[Instagram] No APIFY_API_TOKEN, returning mock data")
            return {
                "fullName": username.title(),
                "biography": f"Mock bio for {username}. Lifestyle and vibes.",
                "followersCount": 10000,
                "posts": [{"caption": "Living my best life ✨"}]
            }
        
        try:
            run_input = {
                "usernames": [username],
                "resultsLimit": self.MAX_ITEMS["instagram"],
            }
            
            run = self.client.actor(self.ACTORS["instagram"]).call(run_input=run_input)
            items = self.client.dataset(run["defaultDatasetId"]).list_items().items
            
            # Instagram scraper returns profile as first item
            return items[0] if items else {}
            
        except Exception as e:
            print(f"[Instagram] Error: {e}")
            return {"biography": f"Error scraping @{username}.", "posts": []}
    
    def scrape_linkedin(self, username: str) -> dict:
        """
        Scrape LinkedIn profile.
        Returns profile object with headline, summary, experience.
        """
        print(f"[LinkedIn] Scraping {username}...")
        
        if not self.has_token:
            print("[LinkedIn] No APIFY_API_TOKEN, returning mock data")
            return {
                "firstName": username.split("-")[0].title() if "-" in username else username.title(),
                "lastName": username.split("-")[1].title() if "-" in username else "",
                "headline": "Professional at Company",
                "summary": f"Mock LinkedIn profile for {username}.",
                "positions": [{"title": "Job Title", "companyName": "Company Name"}]
            }
        
        try:
            run_input = {
                "profileUrls": [f"https://linkedin.com/in/{username}"],
                "maxItems": self.MAX_ITEMS["linkedin"],
            }
            
            run = self.client.actor(self.ACTORS["linkedin"]).call(run_input=run_input)
            items = self.client.dataset(run["defaultDatasetId"]).list_items().items
            
            return items[0] if items else {}
            
        except Exception as e:
            print(f"[LinkedIn] Error: {e}")
            return {"summary": f"Error scraping {username}.", "positions": []}
    
    def scrape_platform(self, platform: str, username: str) -> any:
        """
        Route to the correct scraper based on platform.
        
        Args:
            platform: 'twitter', 'instagram', or 'linkedin'
            username: Username/handle on that platform
            
        Returns:
            Raw scraper output (list for Twitter, dict for Instagram/LinkedIn)
        """
        if platform == "twitter":
            return self.scrape_twitter(username)
        elif platform == "instagram":
            return self.scrape_instagram(username)
        elif platform == "linkedin":
            return self.scrape_linkedin(username)
        else:
            print(f"[Scraper] Unknown platform: {platform}")
            return None


# Legacy alias for backward compatibility
ApifyService = MultiPlatformScraperService

# --- LLM Service (OpenRouter) ---
class LLMService:
    def __init__(self):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY", "missing_key"),
        )
        # Default to a good model, e.g., Llama 3 or Gemini Pro via OpenRouter
        self.model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001") 

    def generate_persona(self, scrape_data: str) -> str:
        """
        Analyzes scraped data to create a 'Digital Twin' system prompt.
        """
        prompt = f"""
        Analyze the following social media posts and create a "Digital Twin" persona.
        Identify their deepest insecurities, writing style, slang usage, and 3 specific embarrassing facts or contradictions.
        
        Output a SYSTEM PROMPT that I can feed into an LLM to make it roleplay as this person in a roast battle.
        The persona should be ruthless, defensive, and hyper-specific.
        
        POSTS:
        {scrape_data[:5000]} # Truncate to avoid limits
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert profiler."},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"LLM Error: {e}")
            return f"You are a generic roast fighter. Be mean. (Error: {str(e)})"

    def generate_roast(self, system_prompt: str, chat_history: list, opponent_name: str, model_name: str = None) -> dict:
        """
        Generates a roast based on the persona and conversation history.
        Returns JSON: { "text": "..." } - NO damage scoring (Judge AI handles that)
        """
        history_text = "\n".join([f"{msg['speaker']}: {msg['text']}" for msg in chat_history[-5:]])
        
        prompt = f"""
        {system_prompt}
        
        CONTEXT:
        You are in a high-stakes roast battle against {opponent_name}.
        Current Match History:
        {history_text}
        
        INSTRUCTIONS:
        1. Adopt your persona completely. Use your specific slang, insecurities, and writing style.
        2. Attack the opponent based on the "TARGET" info provided above. Be hyper-specific about their known traits.
        3. Respond with a short, brutal, and FUNNY roast (max 2 sentences).
        4. Humor is key. Make the audience laugh while destroying the opponent.
        
        Return JSON format ONLY:
        {{
            "text": "Your roast here"
        }}
        """
        
        # Use the requested model or fall back to default
        target_model = model_name if model_name else self.model
        
        try:
            response = self.client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": "You are a roast battle expert. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" }
            )
            content = response.choices[0].message.content
            print(f"LLM Raw Response: {content}")
            data = json.loads(content)
            
            if isinstance(data, list):
                if len(data) > 0 and isinstance(data[0], dict):
                    return data[0]
                else:
                    return {"text": "Error: LLM returned a list without a valid roast object."}
            
            return data
        except Exception as e:
            print(f"LLM Error: {e}")
            return {"text": f"You are a generic roast fighter. Be mean. (Error: {str(e)})"}


# --- Judge AI Service (GPT-5 Mini) ---
# Separate AI that independently scores roasts on Specificity, Creativity, and Accuracy
class JudgeService:
    """
    Independent Judge AI that scores roasts fairly.
    Uses GPT-5 Mini via OpenRouter for fast, accurate judging.
    
    Scoring Criteria:
    - Specificity (30%): How personal is the attack?
    - Creativity (30%): Unique burns vs clichés
    - Accuracy (40%): Based on real content from opponent's profile
    """
    
    # GPT-5 Mini via OpenRouter - fast and accurate
    JUDGE_MODEL = "openai/gpt-5-mini"
    
    def __init__(self):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY", "missing_key"),
        )
    
    def judge_roast(self, roast_text: str, opponent_name: str, opponent_attack_vectors: list) -> dict:
        """
        Independently score a roast on Specificity, Creativity, and Accuracy.
        
        Args:
            roast_text: The roast to judge
            opponent_name: Name of the person being roasted
            opponent_attack_vectors: List of real facts/weaknesses about opponent
            
        Returns:
            { "damage": 0-100, "specificity": 0-100, "creativity": 0-100, "accuracy": 0-100 }
        """
        
        # Format attack vectors for context
        vectors_text = "\n".join([f"- {av}" for av in opponent_attack_vectors]) if opponent_attack_vectors else "- No known facts"
        
        prompt = f"""
        You are an impartial JUDGE in a roast battle. Score the following roast independently.
        
        ROAST: "{roast_text}"
        
        TARGET: {opponent_name}
        KNOWN FACTS ABOUT TARGET:
        {vectors_text}
        
        SCORE THE ROAST ON THESE CRITERIA (0-100 each):
        
        1. SPECIFICITY (30% weight): How personal is the attack?
           - Generic insults like "you're ugly" = 0-30
           - Mentions specific traits about the target = 40-70
           - Deeply personal, hyper-specific attacks = 80-100
        
        2. CREATIVITY (30% weight): Is this a unique burn or a cliché?
           - Common insults/overused jokes = 0-30
           - Clever wordplay or unexpected angles = 40-70
           - Brilliant, never-heard-before burns = 80-100
        
        3. ACCURACY (40% weight): Does it reference REAL content from the target's profile?
           - No connection to known facts = 0-30
           - Loosely related to their profile = 40-70
           - Directly attacks known facts/weaknesses = 80-100
        
        Calculate FINAL DAMAGE as: (Specificity × 0.3) + (Creativity × 0.3) + (Accuracy × 0.4)
        
        Return JSON ONLY:
        {{
            "specificity": <score>,
            "creativity": <score>,
            "accuracy": <score>,
            "damage": <weighted_total>,
            "reasoning": "<brief 1-line explanation>"
        }}
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.JUDGE_MODEL,
                messages=[
                    {"role": "system", "content": "You are a fair, impartial roast battle judge. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" }
            )
            content = response.choices[0].message.content
            print(f"[Judge AI] Raw Response: {content}")
            data = json.loads(content)
            
            # Ensure damage is calculated correctly
            if "damage" not in data:
                specificity = data.get("specificity", 50)
                creativity = data.get("creativity", 50)
                accuracy = data.get("accuracy", 50)
                data["damage"] = int(specificity * 0.3 + creativity * 0.3 + accuracy * 0.4)
            
            return data
            
        except Exception as e:
            print(f"[Judge AI] Error: {e}")
            # Fallback: return a middle-ground score
            return {
                "specificity": 50,
                "creativity": 50,
                "accuracy": 50,
                "damage": 50,
                "reasoning": f"Judge error, using default score. ({str(e)})"
            }

# --- Voice Service (ElevenLabs) ---
class VoiceService:
    def __init__(self):
        self.client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

    def generate_audio(self, text: str, voice_id: str) -> str:
        """
        Generates audio from text and returns a URL (or base64).
        """
        if not os.getenv("ELEVENLABS_API_KEY"):
            return None

        try:
            print(f"Generating audio for: {text} with voice {voice_id}")
            # Mock for now as we need storage to return a URL
            return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
            
        except Exception as e:
            print(f"Voice Error: {e}")
            return None
