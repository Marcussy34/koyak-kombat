import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { api } from '../lib/api';
import { Sword, Skull, Zap, Scale, Gavel, Flame, X, ScrollText } from 'lucide-react';

export default function Battle() {
  const [matchId, setMatchId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isFighting, setIsFighting] = useState(false);
  const [turn, setTurn] = useState('fighter1'); // fighter1 or fighter2
  const [fighter1Health, setFighter1Health] = useState(100);
  const [fighter2Health, setFighter2Health] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [damageOverlay, setDamageOverlay] = useState(null); // { amount, target: 'fighter1' | 'fighter2' }
  const [lastTurnStats, setLastTurnStats] = useState(null);
  const [fighter1, setFighter1] = useState(null);
  const [fighter2, setFighter2] = useState(null);
  
  // Prevents auto-start: only allow fight after page is fully ready
  const [isReady, setIsReady] = useState(false);

  const [round, setRound] = useState(1);
  const [roundOverlay, setRoundOverlay] = useState(null); // "ROUND 1", "ROUND 2", etc.
  const [koTarget, setKoTarget] = useState(null); // 'fighter1' or 'fighter2'
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJudging, setIsJudging] = useState(false); // New state for Judge AI thinking
  const [judgeDecision, setJudgeDecision] = useState(null); // New state for Judge Decision overlay
  const [showLogs, setShowLogs] = useState(false); // New state for Chat Logs overlay
  const [displayedText, setDisplayedText] = useState(''); // For streaming roast text
  const [isStreaming, setIsStreaming] = useState(false); // True while streaming text
  const startingFighterRef = useRef(null);

  const audioRef = useRef(null);
  const bgmRef = useRef(null);
  const victoryAudioRef = useRef(null);
  const chatEndRef = useRef(null);
  
  // Refs for state that needs to be accessed in the async loop
  const fighter1HealthRef = useRef(100);
  const fighter2HealthRef = useRef(100);
  const isFightingRef = useRef(false);

  useEffect(() => {
    // Reset all state on mount to prevent stale state from causing auto-start
    setIsFighting(false);
    isFightingRef.current = false;
    setGameOver(false);
    setMatchId(null);
    setChatHistory([]);
    setFighter1Health(100);
    setFighter2Health(100);
    fighter1HealthRef.current = 100;
    fighter2HealthRef.current = 100;
    
    // Load fighters from localStorage
    const f1 = JSON.parse(localStorage.getItem('fighter1'));
    const f2 = JSON.parse(localStorage.getItem('fighter2'));
    
    if (f1 && f2) {
      setFighter1(f1);
      setFighter2(f2);
    } else {
      // Fallback for testing
      setFighter1({ name: "Elon", image: "https://api.dicebear.com/9.x/pixel-art/svg?seed=Elon" });
      setFighter2({ name: "Zuck", image: "https://api.dicebear.com/9.x/pixel-art/svg?seed=Zuck" });
    }
    
    // Mark as ready AFTER loading - fight can only start after this
    setIsReady(true);

    // Start BGM on page load
    if (!bgmRef.current) {
      bgmRef.current = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
      bgmRef.current.loop = true;
      bgmRef.current.volume = 0.4;
      bgmRef.current.play().catch(e => console.log("BGM autoplay blocked, will play on user interaction"));
    }

    // Cleanup BGM on unmount
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
      if (victoryAudioRef.current) {
        victoryAudioRef.current.pause();
        victoryAudioRef.current = null;
      }
    };
  }, []);

  const handleStartFight = async () => {
    // Guard: prevent starting if not ready or already fighting
    if (!isReady || isFightingRef.current) return;
    
    setIsFighting(true);
    isFightingRef.current = true;
    
    // Stop Victory Music if playing
    if (victoryAudioRef.current) {
        victoryAudioRef.current.pause();
        victoryAudioRef.current.currentTime = 0;
    }

    const match = await api.startMatch('fighter1_id', 'fighter2_id');
    if (match) {
      setMatchId(match.match_id);
      
      // 50/50 Coin Toss
      const starter = Math.random() < 0.5 ? 'fighter1' : 'fighter2';
      startingFighterRef.current = starter;
      setTurn(starter);

      // ROULETTE ANIMATION
      const names = [fighter1.name, fighter2.name];
      for (let i = 0; i < 10; i++) {
          setRoundOverlay(names[i % 2].toUpperCase());
          await new Promise(r => setTimeout(r, 100 + (i * 20))); // Slow down
      }
      
      // Show Winner of Coin Toss
      const starterName = starter === 'fighter1' ? fighter1.name : fighter2.name;
      setRoundOverlay(`${starterName.toUpperCase()} STARTS!`);
      await new Promise(r => setTimeout(r, 1500));

      // Show Round 1 Overlay
      setRoundOverlay("ROUND 1");
      await new Promise(r => setTimeout(r, 2000));
      setRoundOverlay(null);

      // Start the loop
      playTurn(match.match_id, starter);
    }
  };

  const playTurn = async (currentMatchId, currentTurn) => {
    // Check for Game Over using Refs for truth
    if (fighter1HealthRef.current <= 0 || fighter2HealthRef.current <= 0) {
      setGameOver(true);
      setWinner(fighter1HealthRef.current > 0 ? fighter1 : fighter2);
      setIsFighting(false);
      isFightingRef.current = false;
      
      // Stop BGM
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
      }
      return;
    }

    setIsGenerating(true); // Hide bubbles while thinking

    // Construct payload including attack_vectors for personalized roasts
    const payload = {
      match_id: currentMatchId,
      history: chatHistory.map(msg => ({ speaker: msg.sender, text: msg.text })),
      fighter_1_name: fighter1.name,
      fighter_2_name: fighter2.name,
      fighter_1_model: fighter1.model || 'google/gemini-2.0-flash-001',
      fighter_2_model: fighter2.model || 'google/gemini-2.0-flash-001',
      fighter_1_persona: fighter1.system_prompt || "You are a generic roast fighter.",
      fighter_2_persona: fighter2.system_prompt || "You are a generic roast fighter.",
      // Attack vectors are specific embarrassing facts to exploit in roasts
      fighter_1_attack_vectors: fighter1.attack_vectors || [],
      fighter_2_attack_vectors: fighter2.attack_vectors || [],
      current_turn: currentTurn
    };

    try {
      // STEP 1: Generate Roast (Text Only)
      const startTime = performance.now();
      const genResponse = await api.generateTurn(payload);
      const endTime = performance.now();
      
      setIsGenerating(false); // Show bubbles again

      if (genResponse) {
        const roundTripTime = Math.round(endTime - startTime);
        const modelTime = Math.round(genResponse.duration_ms || 0);
        
        setLastTurnStats({
          model: currentTurn === 'fighter1' ? fighter1.model : fighter2.model,
          roundTripTime,
          modelTime
        });

        // VISUAL UPDATE: Show the roast text immediately
        setTurn(currentTurn);

        const tempMsg = {
          sender: currentTurn === 'fighter1' ? fighter1.name : fighter2.name,
          text: genResponse.text,
          damage: null, // Pending judge
          speedBonus: null,
          isCritical: false,
          audioUrl: genResponse.audio_url
        };

        setChatHistory(prev => [...prev, tempMsg]);

        // STREAM THE ROAST TEXT (2 seconds total)
        const fullText = genResponse.text;
        const streamDuration = 2000; // Always 2 seconds
        const charDelay = streamDuration / fullText.length;
        
        setDisplayedText('');
        setIsStreaming(true);
        
        for (let i = 0; i <= fullText.length; i++) {
          setDisplayedText(fullText.slice(0, i));
          await new Promise(r => setTimeout(r, charDelay));
        }
        
        setIsStreaming(false);
        
        // Brief pause after streaming completes before judging
        await new Promise(r => setTimeout(r, 500));

        // STEP 2: Judge AI Thinking Phase
        setIsJudging(true);

        // Call Judge AI
        const judgePayload = {
            match_id: currentMatchId,
            roast_text: genResponse.text,
            opponent_name: currentTurn === 'fighter1' ? fighter2.name : fighter1.name,
            opponent_attack_vectors: currentTurn === 'fighter1' ? fighter2.attack_vectors : fighter1.attack_vectors
        };
        
        const judgeResponse = await api.judgeTurn(judgePayload);
        setIsJudging(false);

        if (judgeResponse) {
            // Calculate final damage with speed bonus
            let speedMultiplier = 1.0;
            let speedBonus = null;
            if (roundTripTime < 2000) {
              speedMultiplier = 1.15; // +15% for lightning fast (<2s)
              speedBonus = '+15%';
            } else if (roundTripTime < 3000) {
              speedMultiplier = 1.10; // +10% for fast (<3s)
              speedBonus = '+10%';
            } else if (roundTripTime > 5000) {
              speedMultiplier = 0.90; // -10% for slow (>5s)
              speedBonus = '-10%';
            }

            // Final damage = AI score × 0.6 × speed multiplier
            const baseDamage = Math.floor(judgeResponse.damage * 0.6);
            const dealtDamage = Math.floor(baseDamage * speedMultiplier);

            // SHOW DECISION OVERLAY
            setJudgeDecision({ damage: dealtDamage, isCritical: judgeResponse.is_critical });
            await new Promise(r => setTimeout(r, 1200)); // Show verdict for 1.2s
            setJudgeDecision(null);

            // Update the last message with damage stats
            setChatHistory(prev => {
                const newHistory = [...prev];
                const lastMsg = newHistory[newHistory.length - 1];
                lastMsg.damage = dealtDamage;
                lastMsg.speedBonus = speedBonus;
                lastMsg.isCritical = judgeResponse.is_critical;
                return newHistory;
            });

            // Show damage overlay
            const target = currentTurn === 'fighter1' ? 'fighter2' : 'fighter1';
            setDamageOverlay({ amount: dealtDamage, target, isCritical: judgeResponse.is_critical });
            setTimeout(() => setDamageOverlay(null), 1000); // Hide after 1s

            // Apply damage
            if (currentTurn === 'fighter1') {
              const newHealth = Math.max(0, fighter2HealthRef.current - dealtDamage);
              fighter2HealthRef.current = newHealth;
              setFighter2Health(newHealth);
              if (newHealth <= 0) setKoTarget('fighter2'); // Immediate KO visual
            } else {
              const newHealth = Math.max(0, fighter1HealthRef.current - dealtDamage);
              fighter1HealthRef.current = newHealth;
              setFighter1Health(newHealth);
              if (newHealth <= 0) setKoTarget('fighter1'); // Immediate KO visual
            }

            // Brief pause before next turn (text was already streamed for 2s)
            await new Promise(r => setTimeout(r, 2000));

            // Check Game Over AFTER the delay so user can read the final roast
            if (fighter1HealthRef.current <= 0 || fighter2HealthRef.current <= 0) {
              setGameOver(true);
              setWinner(fighter1HealthRef.current > 0 ? fighter1 : fighter2);
              setIsFighting(false);
              isFightingRef.current = false;
              
              // Stop BGM
              if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current.currentTime = 0;
              }

              // Play Victory Music
              if (!victoryAudioRef.current) {
                victoryAudioRef.current = new Audio("/victorysong.mp3");
                victoryAudioRef.current.volume = 0.3; // 50% softer
              }
              victoryAudioRef.current.play().catch(e => console.error("Victory music play failed", e));

              return; 
            }

            // Switch Turn
            const nextTurn = currentTurn === 'fighter1' ? 'fighter2' : 'fighter1';
            
            // Check for New Round
            if (nextTurn === startingFighterRef.current) {
                const nextRound = round + 1;
                setRound(nextRound);
                setRoundOverlay(`ROUND ${nextRound}`);
                await new Promise(r => setTimeout(r, 2000));
                
                // ROULETTE ANIMATION
                const names = [fighter1.name, fighter2.name];
                for (let i = 0; i < 10; i++) {
                    setRoundOverlay(names[i % 2].toUpperCase());
                    await new Promise(r => setTimeout(r, 100 + (i * 20))); // Slow down
                }
                
                // Show who starts the next round
                const starterName = nextTurn === 'fighter1' ? fighter1.name : fighter2.name;
                setRoundOverlay(`${starterName.toUpperCase()} STARTS!`);
                await new Promise(r => setTimeout(r, 1500));
                
                setRoundOverlay(null);
            }

            // Trigger next turn
            playTurn(currentMatchId, nextTurn);
        }
      }
    } catch (error) {
      console.error("Turn error:", error);
      setIsFighting(false);
      isFightingRef.current = false;
      // Stop BGM on error
      if (bgmRef.current) {
        bgmRef.current.pause();
      }
    }
  };

  // Poll for background updates (e.g. video generation)
  useEffect(() => {
    if (!matchId) return;
    const interval = setInterval(async () => {
      // In a real app, fetch match state from Supabase or API
    }, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;

  return (
    <div className="min-h-screen font-['Press_Start_2P'] text-white flex flex-col overflow-hidden relative bg-neutral-950">
      <Head>
        <title>Koyak Kombat - Battle</title>
      </Head>

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-neutral-950 to-black" />
        <div className="absolute inset-0 bg-black/20" /> 
      </div>

      {/* Round Overlay */}
      {roundOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-300">
            <div className="text-6xl md:text-8xl font-black text-yellow-500 italic tracking-tighter drop-shadow-[0_0_30px_rgba(234,179,8,0.8)] animate-bounce text-center px-4">
                {roundOverlay}
            </div>
        </div>
      )}

      {/* Header / Health Bars */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start gap-8">
        {/* Fighter 1 Health */}
        <div className="flex-1 max-w-md">
          <div className="flex justify-between text-xs mb-1 text-blue-400">
            <span>{fighter1?.name || 'FIGHTER 1'}</span>
            <span className="text-[10px] text-zinc-500 ml-2">({fighter1?.model?.split('/').pop()})</span>
            <span>{Math.round(fighter1Health)}%</span>
          </div>
          <div className="h-6 bg-neutral-900 border-2 border-white/50 relative skew-x-[-10deg]">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
              style={{ width: `${fighter1Health}%` }}
            />
          </div>
        </div>

        {/* VS Logo & Chat Log Button - Centered Container */}
        <div className="absolute top-16 left-0 right-0 flex flex-col items-center z-30">
          {/* Chat Log Toggle */}
          <button 
            onClick={() => setShowLogs(true)}
            className="mb-2 px-5 py-1 bg-gray-900/90 hover:bg-gray-800 backdrop-blur-md rounded border border-gray-600 hover:border-yellow-500 transition-all hover:scale-105 shadow-lg"
            title="View Battle Logs"
          >
            <span className="text-[10px] font-bold text-gray-400 hover:text-yellow-400 tracking-widest uppercase">
              VIEW LOGS
            </span>
          </button>

          {/* VS Text */}
          <div className="text-6xl md:text-8xl font-black text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] animate-pulse italic transform -skew-x-12 select-none">
            VS
          </div>
        </div>

      {/* Chat Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl h-[80vh] bg-gray-900/50 rounded-2xl border border-gray-800 flex flex-col shadow-2xl overflow-hidden relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            {/* Header */}
            <div className="p-4 bg-gray-900/80 border-b border-gray-800 flex justify-between items-center backdrop-blur-sm z-10">
              <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Battle Logs</h2>
              <button 
                onClick={() => setShowLogs(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </div>
            
            {/* Logs Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 italic mt-10">No roasts yet...</div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border-l-4 ${msg.sender === fighter1?.name ? 'bg-blue-900/20 border-blue-500' : 'bg-red-900/20 border-red-500'}`}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className={`font-bold ${msg.sender === fighter1?.name ? 'text-blue-400' : 'text-red-400'}`}>
                        {msg.sender}
                      </span>
                      {msg.damage !== null && (
                        <span className="text-yellow-500 font-bold">
                          {msg.damage} DMG {msg.isCritical && '🔥'}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-300 leading-relaxed">"{msg.text}"</div>
                    {msg.speedBonus && (
                      <div className="text-xs text-green-400 mt-1">Speed Bonus: {msg.speedBonus}</div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      )}
        {/* Fighter 2 Health */}
        <div className="flex-1 max-w-md">
          <div className="flex justify-between text-xs mb-1 text-red-400">
            <span>{Math.round(fighter2Health)}%</span>
            <span className="text-[10px] text-zinc-500 mr-2">({fighter2?.model?.split('/').pop()})</span>
            <span>{fighter2?.name || 'FIGHTER 2'}</span>
          </div>
          <div className="h-6 bg-neutral-900 border-2 border-white/50 relative skew-x-[10deg]">
            <div 
              className="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-500 float-right"
              style={{ width: `${fighter2Health}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Battle Area */}
      <div className="flex-1 flex relative z-10 mt-16">
        
        {/* Fighter 1 Section */}
        <div className={`flex-1 flex flex-col justify-end items-center relative transition-all duration-500 
          ${(gameOver && winner !== fighter1) || koTarget === 'fighter1' ? 'grayscale opacity-50 scale-90' : ''}
          ${turn === 'fighter1' && !gameOver && !koTarget ? 'grayscale-0 scale-105 z-10' : 'grayscale-[50%] scale-95 z-0'}
        `}>
          {/* KO Overlay */}
          {((gameOver && winner !== fighter1) || koTarget === 'fighter1') && (
             <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 animate-bounce">
               <Skull className="w-32 h-32 text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]" />
               <div className="text-4xl font-black text-red-600 text-center mt-2">KO</div>
             </div>
          )}

          {/* Damage Overlay */}
          {damageOverlay?.target === 'fighter1' && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-6xl font-black text-red-500 animate-bounce drop-shadow-[4px_4px_0_black] z-50">
              -{damageOverlay.amount}
              {damageOverlay.isCritical && <div className="text-xl text-yellow-400 mt-2">CRITICAL!</div>}
            </div>
          )}
          
          {/* Speech Bubble - Hidden during Round Overlay OR Generating */}
          {lastMessage && lastMessage.sender === fighter1?.name && !gameOver && !roundOverlay && !isGenerating && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 md:w-80 bg-white text-black p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,0.5)] z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-[10px] leading-relaxed font-sans font-bold uppercase">
                "{isStreaming ? displayedText : lastMessage.text}"
                {isStreaming && <span className="animate-pulse">|</span>}
              </div>
              {/* Tail */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-black"></div>
              <div className="absolute -bottom-[10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-white"></div>
            </div>
          )}

          {/* Avatar */}
          <div className={`relative w-full h-full max-h-[60vh] flex items-end justify-center ${damageOverlay?.target === 'fighter1' ? 'animate-shake' : ''}`}>
             {fighter1 && (
               <img 
                 src={fighter1.avatar_url || fighter1.image} 
                 alt={fighter1.name} 
                 className="h-full object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                 style={{ imageRendering: 'pixelated' }} 
               />
             )}
          </div>
        </div>

        {/* Fighter 2 Section */}
        <div className={`flex-1 flex flex-col justify-end items-center relative transition-all duration-500 
          ${(gameOver && winner !== fighter2) || koTarget === 'fighter2' ? 'grayscale opacity-50 scale-90' : ''}
          ${turn === 'fighter2' && !gameOver && !koTarget ? 'grayscale-0 scale-105 z-10' : 'grayscale-[50%] scale-95 z-0'}
        `}>
          {/* KO Overlay */}
          {((gameOver && winner !== fighter2) || koTarget === 'fighter2') && (
             <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 animate-bounce">
               <Skull className="w-32 h-32 text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]" />
               <div className="text-4xl font-black text-red-600 text-center mt-2">KO</div>
             </div>
          )}

          {/* Damage Overlay */}
          {damageOverlay?.target === 'fighter2' && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-6xl font-black text-red-500 animate-bounce drop-shadow-[4px_4px_0_black] z-50">
              -{damageOverlay.amount}
              {damageOverlay.isCritical && <div className="text-xl text-yellow-400 mt-2">CRITICAL!</div>}
            </div>
          )}

          {/* Speech Bubble - Hidden during Round Overlay OR Generating */}
          {lastMessage && lastMessage.sender === fighter2?.name && !gameOver && !roundOverlay && !isGenerating && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 md:w-80 bg-white text-black p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,0.5)] z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-[10px] leading-relaxed font-sans font-bold uppercase">
                "{isStreaming ? displayedText : lastMessage.text}"
                {isStreaming && <span className="animate-pulse">|</span>}
              </div>
              {/* Tail */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-black"></div>
              <div className="absolute -bottom-[10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-white"></div>
            </div>
          )}

          {/* Avatar */}
          <div className={`relative w-full h-full max-h-[60vh] flex items-end justify-center ${damageOverlay?.target === 'fighter2' ? 'animate-shake' : ''}`}>
             {fighter2 && (
               <img 
                 src={fighter2.avatar_url || fighter2.image} 
                 alt={fighter2.name} 
                 className="h-full object-contain drop-shadow-[0_0_20px_rgba(239,68,68,0.5)] transform scale-x-[-1]" // Flip image to face left
                 style={{ imageRendering: 'pixelated' }} 
               />
             )}
          </div>
        </div>
      </div>

      {/* Judge AI Thinking Overlay */}
      {isJudging && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md p-6 rounded-xl border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-pulse flex flex-col items-center transform scale-75 md:scale-100">
            <Scale className="w-12 h-12 text-yellow-500 mb-2" />
            <div className="text-xl md:text-2xl text-yellow-400 font-bold uppercase tracking-widest text-center">
              JUDGE AI<br/>IS DECIDING...
            </div>
            <div className="mt-3 flex gap-2">
               <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
               <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
               <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Judge Decision Overlay */}
      {judgeDecision && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in duration-300">
          <div className="bg-black/90 backdrop-blur-xl p-8 rounded-2xl border-4 border-white shadow-[0_0_50px_rgba(255,255,255,0.3)] flex flex-col items-center">
            <Gavel className="w-16 h-16 text-yellow-500 mb-4" />
            <div className="text-2xl text-white font-bold uppercase tracking-widest mb-2">VERDICT</div>
            <div className="text-6xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">
              {judgeDecision.damage}
            </div>
            <div className="text-sm text-gray-400 mt-2 uppercase tracking-wider">EMOTIONAL DAMAGE</div>
          </div>
        </div>
      )}

      {/* Start / Game Over Overlay */}
      {(!isFighting || gameOver) && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          {!isFighting && !gameOver ? (
            <button 
              onClick={handleStartFight}
              className="px-12 py-6 bg-red-600 hover:bg-red-700 text-white text-2xl md:text-4xl border-4 border-white shadow-[0_0_20px_rgba(220,38,38,0.6)] hover:scale-110 transition-transform uppercase tracking-widest animate-pulse"
            >
              FIGHT!
            </button>
          ) : (
            <div className="text-center space-y-8 animate-in zoom-in duration-500">
              <div className="text-6xl md:text-8xl text-yellow-500 font-black drop-shadow-[4px_4px_0_red]">
                GAME OVER
              </div>
              <div className="text-2xl md:text-4xl text-white">
                WINNER: <span className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]">{winner?.name}</span>
              </div>
              <button 
                onClick={() => window.location.href = '/character'}
                className="mt-8 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white border-4 border-white uppercase"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS for Shake Animation */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          75% { transform: translateX(5px) rotate(5deg); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
      {/* Performance Stats */}
      {lastTurnStats && !gameOver && !roundOverlay && !isGenerating && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-800 p-3 rounded-lg text-xs font-mono text-zinc-400 flex gap-6 backdrop-blur-sm z-50">
          <div className="flex flex-col items-center">
            <span className="text-zinc-600 uppercase tracking-wider text-[10px]">Model</span>
            <span className="text-white font-bold">{lastTurnStats.model?.split('/').pop()}</span>
          </div>
          <div className="w-px bg-zinc-800" />
          <div className="flex flex-col items-center">
            <span className="text-zinc-600 uppercase tracking-wider text-[10px]">Latency (Total)</span>
            <span className="text-yellow-400">{lastTurnStats.roundTripTime}ms</span>
          </div>
          <div className="w-px bg-zinc-800" />
          <div className="flex flex-col items-center">
            <span className="text-zinc-600 uppercase tracking-wider text-[10px]">Generation (AI)</span>
            <span className="text-green-400">{lastTurnStats.modelTime}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}
