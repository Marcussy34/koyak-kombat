"""
Profiler: Cross-platform aggregation and persona synthesis.
Combines data from multiple social platforms into a structured Fighter Persona.
"""
import json
from typing import Optional
from dataclasses import dataclass, asdict
from openai import OpenAI
import os


@dataclass
class SpeechPatterns:
    """How the person talks."""
    vocabulary: list[str]           # Common words/phrases they use
    sentence_structure: str         # e.g., "short, punchy" or "long, formal"
    tone: str                       # e.g., "sarcastic, dismissive"


@dataclass
class Worldview:
    """What the person believes."""
    core_beliefs: list[str]         # Main beliefs/values
    contradictions: list[str]       # Inconsistencies in their views (attack vectors)


@dataclass
class FighterPersona:
    """
    Structured output for fighter persona.
    This is the final output used as the fighter's system prompt.
    """
    name: str
    speech_patterns: SpeechPatterns
    psychological_insecurities: list[str]   # Weak points to exploit in roasts
    worldview: Worldview
    attack_vectors: list[str]               # Specific embarrassing facts/events
    gender: str                             # "male", "female", or "non-binary"
    system_prompt: str                      # Ready-to-use prompt for roast battles


class ProfileAggregator:
    """
    Middleware that normalizes raw scraper outputs into a unified context block.
    Handles different JSON structures from Twitter, Instagram, LinkedIn.
    """
    
    @staticmethod
    def normalize_twitter(raw_data: list[dict]) -> str:
        """
        Normalize Twitter scraper output.
        Handles raw profile object from SocialData.tools.
        """
        if not raw_data:
            return "No Twitter data available."
        
        # Check if it's a raw profile object (wrapped in list)
        first_item = raw_data[0]
        if "screen_name" in first_item or "description" in first_item:
            profile = first_item
            parts = []
            
            # Basic Info
            name = profile.get("name", "Unknown")
            handle = profile.get("screen_name", "unknown")
            bio = profile.get("description", "No bio.")
            location = profile.get("location", "")
            created_at = profile.get("created_at", "")
            
            parts.append(f"Name: {name} (@{handle})")
            parts.append(f"Bio: {bio}")
            if location:
                parts.append(f"Location: {location}")
            if created_at:
                parts.append(f"Account Created: {created_at}")
                
            # Stats
            followers = profile.get("followers_count", 0)
            following = profile.get("friends_count", 0)
            tweets = profile.get("statuses_count", 0)
            likes = profile.get("favourites_count", 0)
            
            parts.append(f"Stats: {followers:,} Followers, {following:,} Following, {tweets:,} Tweets, {likes:,} Likes")
            
            # Verification
            if profile.get("verified"):
                parts.append("Status: Verified Account")
                
            return "TWITTER PROFILE:\n" + "\n".join(parts)

        # Fallback for legacy tweet list format
        posts = []
        for tweet in raw_data[:15]:
            text = (
                tweet.get("text") or 
                tweet.get("full_text") or 
                tweet.get("fullText") or
                tweet.get("content") or
                ""
            )
            if text:
                posts.append(f"Tweet: {text}")
        
        return "TWITTER POSTS:\n" + "\n---\n".join(posts) if posts else "No Twitter data available."
    
    @staticmethod
    def normalize_instagram(raw_data: dict) -> str:
        """
        Normalize Instagram scraper output.
        Expected fields: biography, fullName, postsCount, followersCount, posts
        """
        if not raw_data:
            return "No Instagram data available."
        
        parts = []
        
        # Profile info
        bio = raw_data.get("biography", "")
        name = raw_data.get("fullName", raw_data.get("full_name", ""))
        followers = raw_data.get("followersCount", raw_data.get("edge_followed_by", {}).get("count", 0))
        
        if name:
            parts.append(f"Name: {name}")
        if bio:
            parts.append(f"Bio: {bio}")
        if followers:
            parts.append(f"Followers: {followers:,}")
        
        # Recent posts/captions
        posts = raw_data.get("posts", raw_data.get("latestPosts", []))
        if posts and isinstance(posts, list):
            captions = []
            for post in posts[:10]:
                caption = post.get("caption", post.get("edge_media_to_caption", {}).get("edges", [{}])[0].get("node", {}).get("text", ""))
                if caption:
                    captions.append(caption[:500])  # Increased truncation limit
            if captions:
                parts.append("RECENT CAPTIONS:\n" + "\n---\n".join(captions))
        
        return "INSTAGRAM PROFILE:\n" + "\n".join(parts) if parts else "No Instagram data available."
    
    @staticmethod
    def normalize_linkedin(raw_data: dict) -> str:
        """
        Normalize LinkedIn scraper output.
        Handles both old actor (curious_coder) and new actor (apimaestro/linkedin-profile-detail).
        
        Expected fields from apimaestro/linkedin-profile-detail:
        - firstName, lastName, headline, summary/about
        - positions/experience (work history)
        - educations/education (schools)
        - certifications (professional certs)
        - locationName/location (city/region)
        """
        if not raw_data:
            return "No LinkedIn data available."
        
        parts = []
        
        # Basic info
        first = raw_data.get("firstName", "")
        last = raw_data.get("lastName", "")
        if first or last:
            parts.append(f"Name: {first} {last}".strip())
        
        headline = raw_data.get("headline", "")
        if headline:
            parts.append(f"Headline: {headline}")
        
        # Location (new actor may use different field names)
        location = raw_data.get("locationName", raw_data.get("location", raw_data.get("geoLocationName", "")))
        if location:
            parts.append(f"Location: {location}")
        
        summary = raw_data.get("summary", raw_data.get("about", ""))
        if summary:
            parts.append(f"About: {summary[:1000]}")  # Increased truncation limit
        
        # Work experience (handle different field names)
        positions = raw_data.get("positions", raw_data.get("experience", raw_data.get("workExperience", [])))
        if positions and isinstance(positions, list):
            exp_parts = []
            for pos in positions[:5]:
                title = pos.get("title", "")
                company = pos.get("companyName", pos.get("company", pos.get("organizationName", "")))
                description = pos.get("description", "")
                if title or company:
                    exp_entry = f"- {title} at {company}"
                    if description:
                        exp_entry += f": {description[:200]}"  # Include role description
                    exp_parts.append(exp_entry)
            if exp_parts:
                parts.append("EXPERIENCE:\n" + "\n".join(exp_parts))
        
        # Education (new field from apimaestro actor)
        educations = raw_data.get("educations", raw_data.get("education", []))
        if educations and isinstance(educations, list):
            edu_parts = []
            for edu in educations[:3]:
                school = edu.get("schoolName", edu.get("school", ""))
                degree = edu.get("degreeName", edu.get("degree", ""))
                field = edu.get("fieldOfStudy", "")
                if school:
                    edu_entry = f"- {degree} in {field} from {school}" if degree else f"- Studied at {school}"
                    edu_parts.append(edu_entry)
            if edu_parts:
                parts.append("EDUCATION:\n" + "\n".join(edu_parts))
        
        # Certifications (new field from apimaestro actor)
        certs = raw_data.get("certifications", [])
        if certs and isinstance(certs, list):
            cert_names = [c.get("name", "") for c in certs[:5] if c.get("name")]
            if cert_names:
                parts.append(f"CERTIFICATIONS: {', '.join(cert_names)}")
        
        # Recent Posts (new field from apimaestro/linkedin-profile-posts)
        posts = raw_data.get("posts", [])
        if posts and isinstance(posts, list):
            post_parts = []
            for post in posts[:3]:
                text = post.get("text", post.get("commentary", post.get("textContent", "")))
                likes = post.get("numLikes", post.get("likesCount", 0))
                comments = post.get("numComments", post.get("commentsCount", 0))
                
                if text:
                    # Clean up text (remove excessive newlines)
                    text = " ".join(text.split())[:300] + "..." if len(text) > 300 else " ".join(text.split())
                    post_parts.append(f"- \"{text}\" ({likes} likes, {comments} comments)")
            
            if post_parts:
                parts.append("RECENT POSTS:\n" + "\n".join(post_parts))
        
        return "LINKEDIN PROFILE:\n" + "\n".join(parts) if parts else "No LinkedIn data available."
    
    @staticmethod
    def normalize_facebook(raw_data: dict) -> str:
        """
        Normalize Facebook scraper output.
        Expected fields from combined page info + posts:
        - name, about, likes, followers (from pages scraper)
        - posts[] with text/message, likes, shares, comments (from posts scraper)
        """
        if not raw_data:
            return "No Facebook data available."
        
        parts = []
        
        # Page info
        name = raw_data.get("name", raw_data.get("title", ""))
        about = raw_data.get("about", raw_data.get("description", ""))
        likes = raw_data.get("likes", raw_data.get("likesCount", 0))
        followers = raw_data.get("followers", raw_data.get("followersCount", 0))
        website = raw_data.get("website", "")
        category = raw_data.get("category", "")
        
        if name:
            parts.append(f"Name: {name}")
        if category:
            parts.append(f"Category: {category}")
        if about:
            parts.append(f"About: {about[:500]}")  # Truncate long descriptions
        if likes or followers:
            parts.append(f"Engagement: {likes:,} Likes, {followers:,} Followers")
        if website:
            parts.append(f"Website: {website}")
        
        # Recent posts
        posts = raw_data.get("posts", [])
        if posts and isinstance(posts, list):
            post_parts = []
            for post in posts[:10]:  # Max 10 posts
                # Posts scraper returns 'text' or 'message' field
                text = post.get("text", post.get("message", post.get("postText", "")))
                likes = post.get("likes", post.get("likesCount", 0))
                shares = post.get("shares", post.get("sharesCount", 0))
                comments = post.get("comments", post.get("commentsCount", 0))
                
                if text:
                    engagement = f"({likes} likes, {shares} shares, {comments} comments)"
                    post_parts.append(f"Post: {text[:500]} {engagement}")
            
            if post_parts:
                parts.append("RECENT POSTS:\n" + "\n---\n".join(post_parts))
        
        return "FACEBOOK PROFILE:\n" + "\n".join(parts) if parts else "No Facebook data available."
    
    @classmethod
    def aggregate(cls, platform_data: dict[str, any]) -> str:
        """
        Combine data from all platforms into a single context block.
        
        Args:
            platform_data: Dict mapping platform names to their raw scraper output
            
        Returns:
            Unified text block for the Profiler LLM
        """
        sections = []
        
        if "twitter" in platform_data and platform_data["twitter"]:
            sections.append(cls.normalize_twitter(platform_data["twitter"]))
        
        if "instagram" in platform_data and platform_data["instagram"]:
            sections.append(cls.normalize_instagram(platform_data["instagram"]))
        
        if "linkedin" in platform_data and platform_data["linkedin"]:
            sections.append(cls.normalize_linkedin(platform_data["linkedin"]))
        
        if "facebook" in platform_data and platform_data["facebook"]:
            sections.append(cls.normalize_facebook(platform_data["facebook"]))
        
        if not sections:
            return "No social media data available for this person."
        
        return "\n\n========================================\n\n".join(sections)


class PersonaProfiler:
    """
    Uses LLM to synthesize cross-platform data into a structured Fighter Persona.
    """
    
    def __init__(self):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY", "missing_key"),
        )
        # Use GPT-5 Mini for persona synthesis (fast, smart, cheap)
        self.model = os.getenv("PROFILER_MODEL", "openai/gpt-5-mini")
    
    def generate_persona(self, aggregated_data: str, target_name: str = "Unknown") -> FighterPersona:
        """
        Analyze cross-platform data and generate a structured Fighter Persona.
        
        Args:
            aggregated_data: Combined data from ProfileAggregator
            target_name: Name of the person (for the persona)
            
        Returns:
            FighterPersona object ready for roast battles
        """
        prompt = f"""
You are an expert psychological profiler and comedy writer.
Analyze the following social media data for {target_name} and create a "Digital Twin" persona for a roast battle game.

SOCIAL MEDIA DATA:
{aggregated_data}

INSTRUCTIONS:
1. Identify their SPEECH PATTERNS: vocabulary, sentence structure, tone. Be very specific.
2. Find PSYCHOLOGICAL INSECURITIES: things they're defensive about, contradictions, failures.
3. Understand their WORLDVIEW: what they believe, and where those beliefs contradict their actions.
4. List specific ATTACK VECTORS: embarrassing moments, hypocrisies, meme-able quotes.
5. Deduce their GENDER: "male", "female", or "non-binary".
6. **CRITICAL**: Generate a "system_prompt" that is EXTREMELY DETAILED.
   - It must contain a "Knowledge Base" of specific facts, quotes, and events from the data.
   - **IMPORTANT**: Include at least 15 specific data points (tweets, posts, bio details) in the Knowledge Base.
   - It must explicitly define their writing style with examples.
   - It must be long enough to give the Fighter LLM deep context (at least 500 words).
   - **CONSTRAINT**: The system prompt must explicitly instruct the persona to NOT use emojis.

Return JSON format ONLY:
{{
    "name": "Their real name only (e.g. 'John Smith' or 'Elon Musk'). NO brackets, labels, or descriptions.",
    "speech_patterns": {{
        "vocabulary": ["word1", "word2", "phrase1"],
        "sentence_structure": "description of how they write",
        "tone": "description of their tone"
    }},
    "psychological_insecurities": [
        "insecurity 1 with specific example",
        "insecurity 2 with specific example"
    ],
    "worldview": {{
        "core_beliefs": ["belief 1", "belief 2"],
        "contradictions": ["contradiction 1", "contradiction 2"]
    }},
    "attack_vectors": [
        "specific embarrassing fact or event 1",
        "specific embarrassing fact or event 2"
    ],
    "gender": "male/female/non-binary",
    "system_prompt": "You are [name].\\n\\nBIO & PSYCHOLOGY:\\n[Deep dive into who they are, their insecurities, and what drives them]\\n\\nSPEECH STYLE:\\n[Detailed analysis of their writing style, slang, and capitalization habits]\\n\\nKNOWLEDGE BASE (Use these facts!):\\n- [Fact 1]\\n- [Fact 2]\\n- [Quote 1]\\n...\\n\\nINSTRUCTIONS:\\nYou are in a roast battle. Be ruthless. Use the Knowledge Base to make specific references."
}}
"""
        
        try:
            print(f"[Profiler] Prompt content:\n{prompt}")
            print(f"[Profiler] Sending request to LLM ({self.model})...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a psychological profiler. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            
            # Clean markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            print(f"[Profiler] Raw LLM response (first 500 chars): {content[:500]}", flush=True)
            print(f"[Profiler] Received response from LLM. Parsing JSON...", flush=True)
            data = json.loads(content)
            
            # Handle case where LLM returns a list instead of dict
            if isinstance(data, list):
                if len(data) > 0 and isinstance(data[0], dict):
                    data = data[0]
                else:
                    raise ValueError("LLM returned empty or invalid list")
            
            # Parse into structured dataclass
            return FighterPersona(
                name=data.get("name", target_name),
                speech_patterns=SpeechPatterns(
                    vocabulary=data.get("speech_patterns", {}).get("vocabulary", []),
                    sentence_structure=data.get("speech_patterns", {}).get("sentence_structure", ""),
                    tone=data.get("speech_patterns", {}).get("tone", "")
                ),
                psychological_insecurities=data.get("psychological_insecurities", []),
                worldview=Worldview(
                    core_beliefs=data.get("worldview", {}).get("core_beliefs", []),
                    contradictions=data.get("worldview", {}).get("contradictions", [])
                ),
                attack_vectors=data.get("attack_vectors", []),
                gender=data.get("gender", "unknown"),
                system_prompt=data.get("system_prompt", f"You are {target_name}.")
            )
            
        except Exception as e:
            print(f"Profiler Error: {e}")
            # Return fallback persona
            return FighterPersona(
                name=target_name,
                speech_patterns=SpeechPatterns(
                    vocabulary=["generic"],
                    sentence_structure="standard",
                    tone="neutral"
                ),
                psychological_insecurities=["Unknown weaknesses"],
                worldview=Worldview(
                    core_beliefs=["Unknown beliefs"],
                    contradictions=["Unknown contradictions"]
                ),
                attack_vectors=["No specific attack vectors found"],
                gender="unknown",
                system_prompt=f"You are {target_name}. You are a generic roast fighter."
            )
    
    def persona_to_dict(self, persona: FighterPersona) -> dict:
        """Convert FighterPersona to JSON-serializable dict."""
        return {
            "name": persona.name,
            "speech_patterns": {
                "vocabulary": persona.speech_patterns.vocabulary,
                "sentence_structure": persona.speech_patterns.sentence_structure,
                "tone": persona.speech_patterns.tone
            },
            "psychological_insecurities": persona.psychological_insecurities,
            "worldview": {
                "core_beliefs": persona.worldview.core_beliefs,
                "contradictions": persona.worldview.contradictions
            },
            "attack_vectors": persona.attack_vectors,
            "gender": persona.gender,
            "system_prompt": persona.system_prompt
        }
