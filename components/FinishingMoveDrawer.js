import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues (tldraw requires browser APIs)
const Tldraw = dynamic(
  async () => {
    const mod = await import('tldraw');
    return mod.Tldraw;
  },
  { ssr: false }
);

/**
 * FinishingMoveDrawer Component
 * 
 * Displays after game over for winner to draw their "finishing move"
 * Features:
 * - "FINISH HIM/HER!" intro animation
 * - 30 second countdown timer
 * - tldraw canvas for drawing
 * - AI analyzes drawing intent
 * - Generates video with Veo 3
 * - Matches retro arcade theme
 */
export default function FinishingMoveDrawer({ winner, loser, battleScreenshot, onComplete }) {
  // Phases: intro → drawing → analyzing → generating → playing → complete
  const [phase, setPhase] = useState('intro');
  const [timeLeft, setTimeLeft] = useState(30);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [generationProgress, setGenerationProgress] = useState('');
  const editorRef = useRef(null);
  const videoRef = useRef(null);
  const drawingAudioRef = useRef(null);

  // Start Drawing Music on mount (only once)
  useEffect(() => {
    // Create and start audio only once
    drawingAudioRef.current = new Audio('/music/drawingmusic.mp3');
    drawingAudioRef.current.loop = true;
    drawingAudioRef.current.volume = 0.5;
    drawingAudioRef.current.play().catch(e => console.error('[FinishingMoveDrawer] Music play failed:', e));

    // Cleanup on unmount
    return () => {
      if (drawingAudioRef.current) {
        drawingAudioRef.current.pause();
        drawingAudioRef.current = null;
      }
    };
  }, []); // Empty dependency - only runs once on mount

  // Stop music when video starts playing
  useEffect(() => {
    if (phase === 'playing' && drawingAudioRef.current) {
      drawingAudioRef.current.pause();
      drawingAudioRef.current = null;
    }
  }, [phase]);

  // Intro animation - show "FINISH HIM/HER!" for 2 seconds
  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => {
        setPhase('drawing');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Countdown timer during drawing phase
  useEffect(() => {
    if (phase !== 'drawing') return;
    
    if (timeLeft <= 0) {
      handleComplete();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, timeLeft]);

  // Handle completion (time up or user clicks done)
  // Exports canvas as base64, sends to AI for analysis
  const handleComplete = async () => {
    const editor = editorRef.current;
    if (!editor) {
      console.warn('[FinishingMoveDrawer] No editor reference');
      if (onComplete) onComplete(null);
      return;
    }

    // Show analyzing phase
    setPhase('analyzing');

    try {
      // Export canvas as PNG (base64 data URL)
      const shapeIds = editor.getCurrentPageShapeIds();
      
      // If no shapes drawn, return early
      if (shapeIds.size === 0) {
        console.log('[FinishingMoveDrawer] No shapes drawn, skipping analysis');
        if (onComplete) onComplete({ 
          intent: 'NO MOVE',
          description: `${winner?.name} contemplates in silence... the ultimate psychological attack!`,
          style: 'psychic',
          damage_modifier: 1.0
        });
        return;
      }

      // Get shapes from shape IDs and export as SVG, then convert to PNG
      const shapes = Array.from(shapeIds).map(id => editor.getShape(id)).filter(Boolean);
      
      // Use getSvgString to get SVG, then convert to PNG via canvas
      const svgResult = await editor.getSvgString(shapes, {
        background: true,
        padding: 20,
      });
      
      if (!svgResult || !svgResult.svg) {
        throw new Error('Failed to export SVG');
      }

      // Convert SVG to PNG using canvas
      const svgString = svgResult.svg;
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create a blob URL for the SVG
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const base64Image = await new Promise((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width || 800;
          canvas.height = img.height || 600;
          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png', 0.8));
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(e);
        };
        img.src = url;
      });

      console.log('[FinishingMoveDrawer] Canvas exported, sending to AI...');

      // Call the analysis API
      const response = await fetch('/api/analyze-finishing-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          winner: winner?.name || 'Unknown',
          loser: loser?.name || 'Unknown',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze finishing move');
      }

      const analysis = await response.json();
      console.log('[FinishingMoveDrawer] AI Analysis:', analysis);
      
      setAnalysisResult(analysis);

      // ------- VIDEO GENERATION PHASE -------
      if (battleScreenshot) {
        setPhase('generating');
        setGenerationProgress('Initializing Veo 3...');
        
        try {
          console.log('[FinishingMoveDrawer] Generating video with Veo 3...');
          
          const videoResponse = await fetch('/api/generate-finishing-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              screenshot: battleScreenshot,
              intent: analysis.intent,
              description: analysis.description,
              style: analysis.style,
              winner: winner?.name || 'Unknown',
              loser: loser?.name || 'Unknown',
            }),
          });

          if (videoResponse.ok) {
            const videoData = await videoResponse.json();
            console.log('[FinishingMoveDrawer] Video generated:', videoData);
            
            if (videoData.videoUrl) {
              setVideoUrl(videoData.videoUrl);
              setPhase('playing');
              return; // Wait for video to finish playing
            }
          } else {
            // Video generation failed - show a brief message then continue
            console.error('[FinishingMoveDrawer] Video generation failed, continuing to game over');
            setGenerationProgress('Video unavailable - continuing...');
            await new Promise(r => setTimeout(r, 2000)); // Brief pause
          }
        } catch (videoError) {
          console.error('[FinishingMoveDrawer] Video error:', videoError);
          setGenerationProgress('Video unavailable - continuing...');
          await new Promise(r => setTimeout(r, 2000)); // Brief pause
        }
      }
      
      // If no video or video failed, just complete
      if (onComplete) {
        onComplete(analysis);
      }
    } catch (error) {
      console.error('[FinishingMoveDrawer] Error:', error);
      // Fallback response
      const fallback = {
        intent: 'MYSTERY STRIKE',
        description: `${winner?.name} unleashes an incomprehensible but devastating attack!`,
        style: 'unknown',
        damage_modifier: 1.2,
      };
      if (onComplete) {
        onComplete(fallback);
      }
    }
  };

  // Set drawing tool when editor mounts
  const handleMount = (editor) => {
    editorRef.current = editor;
    // Set to draw tool by default
    editor.setCurrentTool('draw');
  };

  // Determine pronoun based on winner's gender
  const pronoun = winner?.gender?.toLowerCase() === 'female' ? 'HER' : 'HIM';

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center font-['Press_Start_2P']">
      
      {/* INTRO PHASE: "FINISH HIM/HER!" */}
      {phase === 'intro' && (
        <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500">
          <div className="text-5xl md:text-7xl text-yellow-500 font-black uppercase tracking-widest text-center drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-bounce">
            FINISH {pronoun}!
          </div>
          <div className="mt-6 text-lg text-gray-400 uppercase tracking-widest">
            {winner?.name} gets the final blow
          </div>
        </div>
      )}

      {/* DRAWING PHASE */}
      {phase === 'drawing' && (
        <div className="w-full h-full flex flex-col animate-in fade-in duration-300">
          
          {/* Header with Timer */}
          <div className="flex justify-between items-center p-4 bg-black/80 border-b-4 border-white/20 z-10">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                Draw Your Finishing Move
              </span>
              <span className="text-yellow-500 text-lg drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">
                {winner?.name}
              </span>
            </div>

            {/* Countdown Timer */}
            <div className={`text-4xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {timeLeft}s
            </div>

            {/* Done Button */}
            <button
              onClick={handleComplete}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 border-4 border-white text-white text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
            >
              Done
            </button>
          </div>

          {/* tldraw Canvas */}
          <div className="flex-1 relative border-4 border-white/20 m-4 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            {/* Label showing target */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/70 px-4 py-2 rounded-full border border-white/30 backdrop-blur-sm">
              <span className="text-xs text-gray-400">Target: </span>
              <span className="text-red-400 font-bold">{loser?.name}</span>
            </div>
            
            {/* The actual tldraw canvas */}
            <Tldraw
              hideUi
              onMount={handleMount}
            />
          </div>

          {/* Hint at bottom */}
          <div className="text-center pb-4 text-[10px] text-gray-600 uppercase tracking-widest">
            Draw your ultimate finishing move on {loser?.name}!
          </div>
        </div>
      )}

      {/* ANALYZING PHASE */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
          <div className="text-3xl md:text-5xl text-yellow-500 font-black uppercase tracking-widest text-center drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-pulse">
            ANALYZING...
          </div>
          <div className="mt-6 text-sm text-gray-400 uppercase tracking-widest">
            AI Deciphering Your Finishing Move
          </div>
          <div className="mt-8 flex gap-3">
            <div className="w-4 h-4 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-4 h-4 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-4 h-4 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>
      )}

      {/* GENERATING PHASE */}
      {phase === 'generating' && (
        <div className="flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="text-3xl md:text-5xl text-red-500 font-black uppercase tracking-widest text-center drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse">
            GENERATING...
          </div>
          <div className="mt-4 text-2xl text-yellow-500 font-bold">
            {analysisResult?.intent || 'FINISHING MOVE'}
          </div>
          <div className="mt-4 text-sm text-gray-400 uppercase tracking-widest text-center max-w-md">
            {analysisResult?.description || 'Rendering your ultimate attack...'}
          </div>
          <div className="mt-8 text-xs text-gray-500 uppercase tracking-widest">
            {generationProgress || 'Veo 3 is generating your video...'}
          </div>
          {/* Loading animation */}
          <div className="mt-6 w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 animate-pulse" 
                 style={{width: '100%', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear'}}></div>
          </div>
        </div>
      )}

      {/* PLAYING PHASE - Video Playback */}
      {phase === 'playing' && videoUrl && (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-500">
          <div className="text-2xl text-yellow-500 font-black uppercase tracking-widest mb-4 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]">
            {analysisResult?.intent || 'FINISHING MOVE'}
          </div>
          
          {/* Video Player */}
          <div className="relative w-full max-w-4xl aspect-video border-4 border-white/40 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.5)]">
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              muted={false}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('[FinishingMoveDrawer] Video playback error:', e);
                if (onComplete) {
                  onComplete(analysisResult);
                }
              }}
            />
          </div>

          {/* Skip button */}
          <button
            onClick={() => {
              if (onComplete) onComplete(analysisResult);
            }}
            className="mt-6 px-6 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white/30 text-white text-xs uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            Skip Video
          </button>
        </div>
      )}
    </div>
  );
}
