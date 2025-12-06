import os
import json
import requests
from openai import OpenAI
from groq import Groq
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
    Scrapes Twitter, Instagram, LinkedIn, and Facebook using different services:
    - Twitter: SocialData.tools API (more reliable)
    - Instagram: Apify actor (apify/instagram-profile-scraper)
    - LinkedIn: Apify actor (curious_coder/linkedin-profile-scraper)
    - Facebook: Apify actors (apify/facebook-pages-scraper + apify/facebook-posts-scraper)
    Configured with low maxItems limits to minimize costs.
    """
    
    # Actor IDs for each platform
    # NOTE: Twitter now uses SocialData.tools API instead of Apify
    # Instagram and LinkedIn still use Apify actors
    ACTORS = {
        "instagram": "apify/instagram-profile-scraper",   # No browser, fast
        "linkedin": "apimaestro/linkedin-profile-detail",  # $5/1000 profiles, no cookies required
        "linkedin_posts": "apimaestro/linkedin-profile-posts",  # $5/1000 results, no cookies required
        "facebook_pages": "apify/facebook-pages-scraper",  # Page info, likes, followers
        "facebook_posts": "apify/facebook-posts-scraper",  # Recent posts with engagement
    }
    
    # Low maxItems limits to control costs
    # Facebook: ~$6.60/1,000 pages, so we limit posts to 10
    MAX_ITEMS = {
        "twitter": 15,    # Latest 15 tweets
        "instagram": 10,  # Latest 10 posts + profile
        "linkedin": 1,    # Single profile (includes experience)
        "facebook_pages": 1,   # Single page profile
        "facebook_posts": 10,  # Latest 10 posts for persona context
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
                print(f"[Twitter] Raw response: {json.dumps(profile, indent=2, default=str)}")
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
            result = items[0] if items else {}
            print(f"[Instagram] Raw response: {json.dumps(result, indent=2, default=str)[:2000]}...")  # Truncate for readability
            return result
            
        except Exception as e:
            print(f"[Instagram] Error: {e}")
            return {"biography": f"Error scraping @{username}.", "posts": []}
    
    def scrape_linkedin(self, username_or_url: str) -> dict:
        """
        Scrape LinkedIn profile using apimaestro/linkedin-profile-detail.
        Returns profile object with work experience, education, certifications.
        
        Args:
            username_or_url: LinkedIn username or full profile URL
        
        Actor: apimaestro/linkedin-profile-detail
        Cost: $5.00 / 1,000 profiles
        
        IMPORTANT: Actor expects "username" parameter (just the username part),
        NOT a full URL. Default is "sarptecimer" if not provided.
        """
        print(f"[LinkedIn] Scraping {username_or_url}...")
        
        # Extract username from URL if needed
        username = username_or_url
        if "linkedin.com" in username_or_url:
            # Extract username from URL: linkedin.com/in/username -> username
            username = username_or_url.rstrip("/").split("/")[-1]
        
        print(f"[LinkedIn] Extracted username: {username}")
        
        if not self.has_token:
            print("[LinkedIn] No APIFY_API_TOKEN, returning mock data")
            return {
                "firstName": username.split("-")[0].title() if "-" in username else username.title(),
                "lastName": username.split("-")[1].title() if len(username.split("-")) > 1 else "",
                "headline": "Professional at Company",
                "summary": f"Mock LinkedIn profile for {username}.",
                "positions": [{"title": "Job Title", "companyName": "Company Name"}]
            }
        
        try:
            # Prepare inputs for both actors
            profile_input = {
                "username": username,
                "includeEmail": False,
            }
            
            posts_input = {
                "username": username,
                "limit": 3,  # Get recent 3 posts
            }
            
            print(f"[LinkedIn] Scraping profile & posts for {username}...")
            
            # Run both actors in parallel using a ThreadPoolExecutor
            # We use a local executor here to avoid blocking the main thread too long
            from concurrent.futures import ThreadPoolExecutor
            
            profile_data = {}
            posts_data = []
            
            def fetch_profile():
                print(f"[LinkedIn] Fetching profile for {username}...")
                run = self.client.actor(self.ACTORS["linkedin"]).call(run_input=profile_input)
                items = self.client.dataset(run["defaultDatasetId"]).list_items().items
                return items[0] if items else {}
                
            def fetch_posts():
                print(f"[LinkedIn] Fetching posts for {username}...")
                run = self.client.actor(self.ACTORS["linkedin_posts"]).call(run_input=posts_input)
                items = self.client.dataset(run["defaultDatasetId"]).list_items().items
                return items
            
            with ThreadPoolExecutor(max_workers=2) as executor:
                future_profile = executor.submit(fetch_profile)
                future_posts = executor.submit(fetch_posts)
                
                profile_data = future_profile.result()
                posts_data = future_posts.result()
            
            # Merge posts into profile data
            if profile_data:
                profile_data["posts"] = posts_data
                print(f"[LinkedIn] Merged {len(posts_data)} posts into profile data")
            
            # print(f"[LinkedIn] Raw response: {json.dumps(profile_data, indent=2, default=str)[:2000]}...")
            return profile_data
            
        except Exception as e:
            print(f"[LinkedIn] Error: {e}")
            return {"summary": f"Error scraping {username_or_url}.", "positions": []}
    
    def scrape_facebook(self, username: str) -> dict:
        """
        Scrape Facebook page info + recent posts IN PARALLEL.
        Both Apify actors run simultaneously for faster scraping.
        
        Args:
            username: Facebook page name or profile ID
            
        Returns:
            Dict with page info + posts array
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        print(f"[Facebook] Scraping {username}...")
        
        if not self.has_token:
            print("[Facebook] No APIFY_API_TOKEN, returning mock data")
            return {
                "name": username.replace(".", " ").title(),
                "about": f"Mock Facebook profile for {username}.",
                "likes": 10000,
                "followers": 5000,
                "posts": [{"text": "Mock post content. Living my best life! 🔥", "likes": 100}]
            }
        
        fb_url = f"https://www.facebook.com/{username}"
        
        def fetch_page_info():
            """Fetch page info (name, about, likes, followers)."""
            try:
                print(f"[Facebook] Fetching page info for {username}...")
                page_input = {
                    "startUrls": [{"url": fb_url}],
                }
                
                run = self.client.actor(self.ACTORS["facebook_pages"]).call(run_input=page_input)
                items = self.client.dataset(run["defaultDatasetId"]).list_items().items
                
                if items:
                    print(f"[Facebook] Got page info: {items[0].get('name', 'Unknown')}")
                    print(f"[Facebook] Page info raw: {json.dumps(items[0], indent=2, default=str)[:1500]}...")
                    return items[0]
                return {}
            except Exception as e:
                print(f"[Facebook] Error fetching page info: {e}")
                return {}
        
        def fetch_posts():
            """Fetch recent posts (text, engagement)."""
            try:
                print(f"[Facebook] Fetching recent posts for {username}...")
                posts_input = {
                    "startUrls": [{"url": fb_url}],
                    "resultsLimit": self.MAX_ITEMS["facebook_posts"],
                }
                
                run = self.client.actor(self.ACTORS["facebook_posts"]).call(run_input=posts_input)
                items = self.client.dataset(run["defaultDatasetId"]).list_items().items
                
                if items:
                    print(f"[Facebook] Got {len(items)} posts")
                    if len(items) > 0:
                        print(f"[Facebook] Sample post: {json.dumps(items[0], indent=2, default=str)[:1000]}...")
                    return items
                return []
            except Exception as e:
                print(f"[Facebook] Error fetching posts: {e}")
                return []
        
        # Run BOTH scrapers in parallel
        page_info = {}
        posts = []
        
        with ThreadPoolExecutor(max_workers=2) as executor:
            page_future = executor.submit(fetch_page_info)
            posts_future = executor.submit(fetch_posts)
            
            page_info = page_future.result()
            posts = posts_future.result()
        
        # Combine into single profile object for aggregator
        combined = {
            **page_info,
            "posts": posts
        }
        
        return combined if (page_info or posts) else {}
    
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
        elif platform == "facebook":
            return self.scrape_facebook(username)
        else:
            print(f"[Scraper] Unknown platform: {platform}")
            return None
    
    # =========================================================================
    # BATCH SCRAPING METHODS
    # These scrape multiple profiles in a SINGLE actor call for efficiency
    # =========================================================================
    
    def batch_scrape_twitter(self, usernames: list[str]) -> dict[str, list[dict]]:
        """
        Scrape multiple Twitter profiles in parallel.
        Since SocialData is an API, we simulate batching with concurrent requests.
        
        Args:
            usernames: List of Twitter usernames
            
        Returns:
            Dict mapping username -> list of tweets/profile data
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        if not usernames:
            return {}
            
        print(f"[Twitter Batch] Scraping {len(usernames)} profiles: {usernames}")
        results = {}
        
        # Helper to scrape single user safely
        def scrape_single(username):
            try:
                return username, self.scrape_twitter(username)
            except Exception as e:
                print(f"[Twitter Batch] Error scraping {username}: {e}")
                return username, []

        # Run in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_user = {executor.submit(scrape_single, u): u for u in usernames}
            for future in as_completed(future_to_user):
                username, data = future.result()
                if data:
                    results[username] = data
                    
        return results

    def batch_scrape_instagram(self, usernames: list[str]) -> dict[str, dict]:
        """
        Scrape multiple Instagram profiles in a SINGLE actor call.
        
        Args:
            usernames: List of Instagram usernames to scrape
            
        Returns:
            Dict mapping username -> profile data
        """
        if not usernames:
            return {}
        
        print(f"[Instagram Batch] Scraping {len(usernames)} profiles: {usernames}")
        
        # Handle fallback data first
        results = {}
        remaining_usernames = []
        
        for username in usernames:
            if username.lower() in self.FALLBACK_DATA:
                fallback = self.FALLBACK_DATA[username.lower()]
                if fallback["platform"] == "instagram":
                    print(f"[Instagram Batch] Using fallback for @{username}")
                    results[username] = fallback["data"]
                    continue
            remaining_usernames.append(username)
        
        if not remaining_usernames:
            return results
        
        if not self.has_token:
            print("[Instagram Batch] No APIFY_API_TOKEN, returning mock data")
            for username in remaining_usernames:
                results[username] = {
                    "fullName": username.title(),
                    "biography": f"Mock bio for {username}.",
                    "followersCount": 10000,
                    "posts": [{"caption": "Living my best life ✨"}]
                }
            return results
        
        try:
            run_input = {
                "usernames": remaining_usernames,
                "resultsLimit": self.MAX_ITEMS["instagram"],
            }
            
            run = self.client.actor(self.ACTORS["instagram"]).call(run_input=run_input)
            items = self.client.dataset(run["defaultDatasetId"]).list_items().items
            
            # Match results back to usernames
            for item in items:
                username = item.get("username", "").lower()
                # Find matching username (case-insensitive)
                for orig_username in remaining_usernames:
                    if orig_username.lower() == username:
                        results[orig_username] = item
                        print(f"[Instagram Batch] Got profile for @{orig_username}")
                        break
            
            return results
            
        except Exception as e:
            print(f"[Instagram Batch] Error: {e}")
            return results
    
    def batch_scrape_facebook(self, usernames: list[str]) -> dict[str, dict]:
        """
        Scrape multiple Facebook profiles in a SINGLE actor call.
        Runs both pages and posts scrapers with all URLs at once.
        
        Args:
            usernames: List of Facebook usernames/page names
            
        Returns:
            Dict mapping username -> combined profile data
        """
        from concurrent.futures import ThreadPoolExecutor
        
        if not usernames:
            return {}
        
        print(f"[Facebook Batch] Scraping {len(usernames)} profiles: {usernames}")
        
        if not self.has_token:
            print("[Facebook Batch] No APIFY_API_TOKEN, returning mock data")
            results = {}
            for username in usernames:
                results[username] = {
                    "name": username.replace(".", " ").title(),
                    "about": f"Mock Facebook profile for {username}.",
                    "likes": 10000,
                    "followers": 5000,
                    "posts": [{"text": "Mock post content.", "likes": 100}]
                }
            return results
        
        # Build URLs for all usernames
        urls = [{"url": f"https://www.facebook.com/{username}"} for username in usernames]
        
        def fetch_all_pages():
            """Fetch page info for ALL profiles in one actor call."""
            try:
                print(f"[Facebook Batch] Fetching page info for {len(usernames)} profiles...")
                run = self.client.actor(self.ACTORS["facebook_pages"]).call(
                    run_input={"startUrls": urls}
                )
                items = self.client.dataset(run["defaultDatasetId"]).list_items().items
                print(f"[Facebook Batch] Got {len(items)} page info results")
                return items
            except Exception as e:
                print(f"[Facebook Batch] Error fetching pages: {e}")
                return []
        
        def fetch_all_posts():
            """Fetch posts for ALL profiles in one actor call."""
            try:
                print(f"[Facebook Batch] Fetching posts for {len(usernames)} profiles...")
                run = self.client.actor(self.ACTORS["facebook_posts"]).call(
                    run_input={
                        "startUrls": urls,
                        "resultsLimit": self.MAX_ITEMS["facebook_posts"] * len(usernames),
                    }
                )
                items = self.client.dataset(run["defaultDatasetId"]).list_items().items
                print(f"[Facebook Batch] Got {len(items)} posts total")
                return items
            except Exception as e:
                print(f"[Facebook Batch] Error fetching posts: {e}")
                return []
        
        # Run both scrapers in parallel
        with ThreadPoolExecutor(max_workers=2) as executor:
            pages_future = executor.submit(fetch_all_pages)
            posts_future = executor.submit(fetch_all_posts)
            
            page_items = pages_future.result()
            post_items = posts_future.result()
        
        # Match results back to usernames
        results = {username: {"posts": []} for username in usernames}
        
        # Match page info
        for item in page_items:
            page_name = item.get("pageName", "")
            for username in usernames:
                if username.lower() == page_name.lower() or username.lower() in item.get("facebookUrl", "").lower():
                    results[username].update(item)
                    break
        
        # Match posts to usernames
        for post in post_items:
            page_name = post.get("pageName", "")
            for username in usernames:
                if username.lower() == page_name.lower() or username.lower() in post.get("facebookUrl", "").lower():
                    results[username]["posts"].append(post)
                    break
        
        return results


# Legacy alias for backward compatibility
ApifyService = MultiPlatformScraperService

# --- LLM Service (OpenRouter + Groq) ---
class LLMService:
    # Groq model prefixes - these will be routed to Groq API
    GROQ_MODELS = [
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
        "llama3-8b-8192",
        "llama3-70b-8192",
        "mixtral-8x7b-32768",
    ]
    
    def __init__(self):
        # OpenRouter client (default)
        self.openrouter_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY", "missing_key"),
        )
        
        # Groq client (for Groq models)
        groq_key = os.getenv("GROQ_API_KEY")
        self.groq_client = Groq(api_key=groq_key) if groq_key else None
        
        # Default model
        self.model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
    
    def _is_groq_model(self, model_name: str) -> bool:
        """Check if model should be routed to Groq API."""
        if not model_name:
            return False
        return any(groq_model in model_name for groq_model in self.GROQ_MODELS)
    
    def _get_client_and_model(self, model_name: str):
        """Get the appropriate client and clean model name."""
        is_groq = self._is_groq_model(model_name)
        has_client = self.groq_client is not None
        
        print(f"[LLMService] Routing model: {model_name} | Is Groq: {is_groq} | Has Groq Client: {has_client}")
        
        if is_groq:
            if self.groq_client:
                # Strip any prefix for Groq
                clean_model = model_name.replace("groq/", "")
                print(f"[LLMService] Using Direct Groq API with model: {clean_model}")
                return self.groq_client, clean_model
            else:
                print(f"[LLMService] WARNING: Groq model requested but no GROQ_API_KEY found. Falling back to OpenRouter.")
                # If falling back to OpenRouter, ensure it has the groq/ prefix if needed
                # But for now, let's just return what we have and let it fail (or succeed if OpenRouter handles it)
                return self.openrouter_client, model_name
        else:
            return self.openrouter_client, model_name 

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
            response = self.openrouter_client.chat.completions.create(
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
        
        ANTI-REPETITION SYSTEM (v3 - Simplified for Small Models):
        - Extracts attack TOPICS (not full roasts) from history
        - Uses keyword matching to categorize previous attacks
        - Passes only a short list of exhausted topics (~30 tokens)
        - Works well with small context window models
        """
        # === ANTI-REPETITION v3: Topic Extraction ===
        # Define attack categories with keyword triggers (expanded for better coverage)
        ATTACK_CATEGORIES = {
            "appearance": ["ugly", "face", "look", "outfit", "clothes", "fashion", "style", "fit", "wearing", "hair", "body", "photo", "selfie", "mirror"],
            "dating": ["single", "lonely", "relationship", "girlfriend", "boyfriend", "date", "love", "virgin", "crush", "tinder", "bumble", "dm"],
            "career": ["job", "work", "career", "unemployed", "salary", "boss", "office", "intern", "promotion", "hustle", "ceo", "founder", "startup", "linkedin", "resume", "hired", "fired"],
            "personality": ["boring", "annoying", "cringe", "toxic", "fake", "hypocrite", "ego", "personality", "thinking", "pretend", "act"],
            "social_media": ["followers", "likes", "posts", "content", "influencer", "clout", "engagement", "views", "tiktok", "instagram", "insta", "twitter", "reels", "viral", "feed"],
            "intelligence": ["dumb", "stupid", "brain", "iq", "degree", "education", "school", "college", "dropout", "graduated", "spelling", "count", "math"],
            "hobbies": ["hobby", "game", "gaming", "sport", "music", "anime", "netflix", "book", "travel", "gym", "workout"],
            "family": ["mom", "mum", "dad", "parents", "family", "sibling", "brother", "sister", "grandma", "kid", "child"],
        }
        
        # Extract exhausted topics from history
        exhausted_topics = set()
        for msg in chat_history:
            text = msg.get('text', '').lower()
            for category, keywords in ATTACK_CATEGORIES.items():
                if any(kw in text for kw in keywords):
                    exhausted_topics.add(category)
        
        # Format as concise string
        exhausted_topics_text = ", ".join(exhausted_topics) if exhausted_topics else "none"
        
        # Calculate turn number
        turn_number = len([m for m in chat_history if m.get('speaker') == opponent_name]) + 1
        
        prompt = f"""
        {system_prompt}
        
        Turn #{turn_number} against {opponent_name}.
        
        EXHAUSTED TOPICS (DO NOT USE): {exhausted_topics_text}
        
        RULES:
        1. Pick an attack vector from AMMUNITION that hasn't been used.
        2. Avoid topics listed above.
        3. MAX 20 WORDS. Be savage.
        4. NO EMOJIS.
        5. DO NOT roast follower counts - too generic.
        
        Return JSON: {{"text": "Your roast"}}
        """
        
        # Get the appropriate client based on model
        target_model = model_name if model_name else self.model
        client, clean_model = self._get_client_and_model(target_model)
        
        try:
            # Higher temperature (0.9) for more creative variety
            response = client.chat.completions.create(
                model=clean_model,
                messages=[
                    {"role": "system", "content": "You are a savage roast battle expert. Output JSON only. NEVER repeat previous attacks."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.9  # Higher temp for more variety
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
    
    def judge_roast(self, roast_text: str, opponent_name: str, opponent_attack_vectors: list, match_history: list = None) -> dict:
        """
        Independently score a roast on Specificity, Creativity, and Accuracy.
        
        Args:
            roast_text: The roast to judge
            opponent_name: Name of the person being roasted
            opponent_attack_vectors: List of real facts/weaknesses about opponent
            match_history: List of previous turns to check for repetition
            
        Returns:
            { "damage": 0-100, "specificity": 0-100, "creativity": 0-100, "accuracy": 0-100 }
        """
        
        # Format attack vectors for context
        vectors_text = "\n".join([f"- {av}" for av in opponent_attack_vectors]) if opponent_attack_vectors else "- No known facts"
        
        # Format history for repetition check
        history_text = "No previous history."
        if match_history:
            history_text = "\n".join([f"- {msg.get('speaker', 'Unknown')}: {msg.get('text', '')}" for msg in match_history])
        
        prompt = f"""
        You are an impartial JUDGE in a roast battle. Score the following roast independently.
        
        ROAST: "{roast_text}"
        
        TARGET: {opponent_name}
        KNOWN FACTS ABOUT TARGET:
        {vectors_text}
        
        PREVIOUS MATCH HISTORY (CHECK FOR REPEATS):
        {history_text}
        
        === REPETITION CHECK (DO THIS FIRST) ===
        Before scoring, check if this roast uses the SAME TOPIC, SAME ANGLE, or SAME KEYWORDS as any previous roast.
        Examples of repetition:
        - Mentioning "bike" again if it was already attacked
        - Attacking "candid photos" if already mentioned
        - Using the same punchline pattern as before
        
        If repetition is detected: Set "is_repetition" to true.
        
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
            "is_repetition": <boolean>,
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
            
            # STRICT PENALTY: If repetition is detected, force damage to 0
            if data.get("is_repetition", False):
                print(f"[Judge AI] Repetition detected! Forcing damage to 0.")
                data["damage"] = 0
                data["reasoning"] = f"REPETITION DETECTED. {data.get('reasoning', '')}"
            
            # Ensure damage is calculated correctly if not already present
            elif "damage" not in data:
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
    """
    Text-to-Speech service using ElevenLabs API.
    Converts roast text to audio for playback during battles.
    
    Voice mapping (7 expressive voices for roast battles):
    - adam: Brian - Energetic American male
    - charlie: Josh - Deep, young male (fast)
    - bella: Sarah - Expressive American female
    - clyde: Clyde - War veteran, aggressive male
    - rachel: Rachel - Confident, assertive female
    - mal_male: Chris - Fast, casual American male
    - mal_female: Grace - Malaysian/Commonwealth Female
    """
    
    # Map friendly voice names to ElevenLabs voice IDs
    # Using aggressive, fast voices perfect for roast battles
    VOICE_IDS = {
        "adam": "nPczCjzI2devNBz1zQrb",      # Brian - Energetic male
        "charlie": "TxGEqnHWrfWFTfGW9XjX",   # Josh - Deep, young male (FAST)
        "bella": "EXAVITQu4vr4xnSDxMaL",     # Sarah - Expressive female
        "clyde": "2EiwWnXFnvU5JabPnv8n",    # Clyde - War veteran, aggressive
        "rachel": "21m00Tcm4TlvDq8ikWAM",   # Rachel - Confident female
        "mal_male": "iP95p4xoKVk53GoZ742B",  # Chris - Fast, casual American
        "mal_female": "oWAxZDx7w5VEj9dCyTzz", # Grace - Malaysian/Commonwealth Female
    }
    
    def __init__(self):
        api_key = os.getenv("ELEVENLABS_API_KEY")
        self.client = ElevenLabs(api_key=api_key) if api_key else None
        self.has_key = bool(api_key)
        
        if not self.has_key:
            print("[VoiceService] Warning: ELEVENLABS_API_KEY not found")

    def generate_audio(self, text: str, voice_id: str) -> str:
        """
        Generates audio from text and returns base64-encoded MP3 string.
        
        Args:
            text: The roast text to convert to speech
            voice_id: Voice name (adam, charlie, bella) or actual ElevenLabs voice ID
            
        Returns:
            Base64-encoded MP3 audio string (data URL format), or None if failed
        """
        if not self.has_key:
            print("[VoiceService] No API key, skipping TTS generation")
            return None

        try:
            # Resolve friendly name to ElevenLabs voice ID
            actual_voice_id = self.VOICE_IDS.get(voice_id.lower(), voice_id)
            print(f"[VoiceService] Generating TTS for: '{text[:50]}...' with voice {voice_id} -> {actual_voice_id}")
            
            # Generate audio using ElevenLabs SDK
            # Returns a generator of audio bytes
            audio_generator = self.client.text_to_speech.convert(
                voice_id=actual_voice_id,
                text=text,
                model_id="eleven_turbo_v2_5",  # Fast, high-quality model
                output_format="mp3_44100_128",  # MP3 format for web playback
            )
            
            # Collect all audio bytes from generator
            import base64
            audio_bytes = b"".join(audio_generator)
            
            # Convert to base64 data URL for direct playback in browser
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
            data_url = f"data:audio/mpeg;base64,{audio_base64}"
            
            print(f"[VoiceService] Generated {len(audio_bytes)} bytes of audio")
            return data_url
            
        except Exception as e:
            print(f"[VoiceService] Error: {e}")
            return None

