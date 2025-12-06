import { useState, useRef, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { useRouter } from 'next/router';

export default function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef(null);
  const hasAttemptedAutoplay = useRef(false);
  const router = useRouter();

  // Check if we are on the battle page
  const isBattlePage = router.pathname === '/battle';

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(e => console.log("Play failed:", e));
        setIsPlaying(true);
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Handle route changes - pause on battle page, resume otherwise (if was playing)
  useEffect(() => {
    if (isBattlePage) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // Optional: Resume if it was playing before? 
      // For now, let's just let the user manually play or rely on the initial autoplay logic if it's a fresh load
      // But if we want to persist state across navigations, we'd need more complex state management.
      // Simple behavior: Stop on battle page.
    }
  }, [isBattlePage]);

  // Attempt autoplay on first user interaction (browsers require this)
  useEffect(() => {
    if (isBattlePage) return; // Don't autoplay on battle page

    if (audioRef.current) {
      audioRef.current.volume = volume;
    }

    // Try to autoplay immediately (works if user has interacted before)
    const attemptAutoplay = () => {
      if (audioRef.current && !hasAttemptedAutoplay.current) {
        hasAttemptedAutoplay.current = true;
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay blocked - wait for user interaction
            console.log("Autoplay blocked, waiting for user interaction");
          });
      }
    };

    attemptAutoplay();

    // Also try on first click/keypress if autoplay was blocked
    const handleUserInteraction = () => {
      if (audioRef.current && !isPlaying && !isBattlePage) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.log("Play failed:", e));
      }
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [isBattlePage]); // Re-run if route changes back from battle page

  // Don't render anything on battle page
  if (isBattlePage) return null;

  return (
    <>
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src="/music/lobbymusic.mp3"
        loop
        preload="auto"
      />

      {/* Music Controls */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-3 py-2 bg-black/80 border-2 border-yellow-600 rounded-sm backdrop-blur-sm shadow-[4px_4px_0_rgba(0,0,0,1)] font-['Press_Start_2P']">
        {/* Play/Stop Button */}
        <button
          onClick={togglePlay}
          className="text-yellow-500 hover:text-yellow-300 transition-colors"
        >
          {isPlaying ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
        </button>

        {/* Volume Slider */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 accent-yellow-500 cursor-pointer"
        />
      </div>
    </>
  );
}
