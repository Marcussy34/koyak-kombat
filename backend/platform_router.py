"""
Platform Router: Regex-based URL routing to identify social media platforms.
No LLM needed - deterministic pattern matching for Twitter, Instagram, LinkedIn.
"""
import re
from typing import Optional
from dataclasses import dataclass


@dataclass
class PlatformInfo:
    """Result of platform detection."""
    platform: str           # 'twitter', 'instagram', 'linkedin', or 'unknown'
    username: str           # Extracted username/handle
    original_url: str       # Original URL for reference


# Regex patterns for each supported platform
# Groups capture the username portion of the URL
PLATFORM_PATTERNS = {
    # Twitter/X: matches twitter.com/username or x.com/username
    "twitter": re.compile(
        r"(?:https?://)?(?:www\.)?(?:twitter\.com|x\.com)/([a-zA-Z0-9_]+)(?:/.*)?$",
        re.IGNORECASE
    ),
    
    # Instagram: matches instagram.com/username
    "instagram": re.compile(
        r"(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9_.]+)(?:/.*)?$",
        re.IGNORECASE
    ),
    
    # LinkedIn: matches linkedin.com/in/username
    "linkedin": re.compile(
        r"(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9_-]+)(?:/.*)?$",
        re.IGNORECASE
    ),
    
    # Facebook: matches facebook.com/username or facebook.com/profile.php?id=123
    # Captures username from path or ID from query string
    "facebook": re.compile(
        r"(?:https?://)?(?:www\.)?facebook\.com/(?:profile\.php\?id=(\d+)|([a-zA-Z0-9.]+))(?:/.*)?$",
        re.IGNORECASE
    ),
}


def detect_platform(url: str) -> PlatformInfo:
    """
    Detect which social media platform a URL belongs to.
    
    Args:
        url: Social media profile URL
    
    Returns:
        PlatformInfo with platform name and extracted username
    
    Examples:
        >>> detect_platform("https://twitter.com/elonmusk")
        PlatformInfo(platform='twitter', username='elonmusk', ...)
        
        >>> detect_platform("https://x.com/elonmusk")
        PlatformInfo(platform='twitter', username='elonmusk', ...)
        
        >>> detect_platform("https://instagram.com/zuck")
        PlatformInfo(platform='instagram', username='zuck', ...)
        
        >>> detect_platform("https://linkedin.com/in/johndoe")
        PlatformInfo(platform='linkedin', username='johndoe', ...)
    """
    url = url.strip()
    
    for platform, pattern in PLATFORM_PATTERNS.items():
        match = pattern.match(url)
        if match:
            # Facebook has two capture groups: (profile_id, username)
            # One will be None, the other will have the value
            if platform == "facebook":
                profile_id = match.group(1)  # From profile.php?id=123
                username = match.group(2)    # From /username path
                extracted = profile_id or username
            else:
                extracted = match.group(1)
            
            return PlatformInfo(
                platform=platform,
                username=extracted,
                original_url=url
            )
    
    # Unknown platform
    return PlatformInfo(
        platform="unknown",
        username="",
        original_url=url
    )


def route_urls(urls: list[str]) -> dict[str, list[PlatformInfo]]:
    """
    Route multiple URLs to their respective platforms.
    
    Args:
        urls: List of social media profile URLs
    
    Returns:
        Dict mapping platform names to list of PlatformInfo objects
        
    Example:
        >>> route_urls(["https://twitter.com/elonmusk", "https://instagram.com/zuck"])
        {
            "twitter": [PlatformInfo(platform='twitter', username='elonmusk', ...)],
            "instagram": [PlatformInfo(platform='instagram', username='zuck', ...)]
        }
    """
    result: dict[str, list[PlatformInfo]] = {}
    
    for url in urls:
        info = detect_platform(url)
        if info.platform not in result:
            result[info.platform] = []
        result[info.platform].append(info)
    
    return result


def get_supported_platforms() -> list[str]:
    """Return list of supported platform names."""
    return list(PLATFORM_PATTERNS.keys())
