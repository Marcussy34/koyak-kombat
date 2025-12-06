import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Sword, Plus, X, ChevronDown, AlertTriangle, Map } from 'lucide-react';
import { api } from '../lib/api';

export default function CharacterSelect() {
  const router = useRouter();
  
  // Multi-URL state: array of URLs per fighter
  const [fighter1Urls, setFighter1Urls] = useState(['']);
  const [fighter2Urls, setFighter2Urls] = useState(['']);
  
  const [fighter1Voice, setFighter1Voice] = useState('adam');
  const [fighter1Model, setFighter1Model] = useState('google/gemini-2.0-flash-001');
  const [fighter2Voice, setFighter2Voice] = useState('charlie');
  const [fighter2Model, setFighter2Model] = useState('google/gemini-2.0-flash-001');
  const [isLoading, setIsLoading] = useState(false);

  // Background Selection State
  const [selectedBackground, setSelectedBackground] = useState('/backgrounds/dojobackground.png');
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);

  const backgrounds = [
    { id: 'dojo', name: 'Dojo', src: '/backgrounds/dojobackground.png' },
    { id: 'harbor', name: 'Harbor', src: '/backgrounds/harborbackground.png' },
    { id: 'jungle', name: 'Jungle', src: '/backgrounds/junglebackground.png' },
    { id: 'sakura', name: 'Sakura', src: '/backgrounds/sakurabackground.png' },
    { id: 'scifi', name: 'Sci-Fi', src: '/backgrounds/scifibackground.png' },
    { id: 'winter', name: 'Winter', src: '/backgrounds/winterbackground.png' },
  ];

  // Loading progress state
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingSteps, setLoadingSteps] = useState([]);

  const [modalMessage, setModalMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  // Auto-scroll logs
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loadingSteps]);

  // Show modal helper
  const showModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState(null);

  // Helper: Add loading step
  const addLoadingStep = (step, progress) => {
    setLoadingStep(step);
    setLoadingProgress(progress);
    setLoadingSteps(prev => [...prev, { step, time: new Date().toLocaleTimeString() }]);
  };

  // Helper: Update URL at index
  const updateUrl = (setter, urls, index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setter(newUrls);
  };

  // Helper: Add new URL input
  const addUrl = (setter, urls) => {
    if (urls.length < 3) { // Max 3 URLs per fighter
      setter([...urls, '']);
    }
  };

  // Helper: Remove URL input
  const removeUrl = (setter, urls, index) => {
    if (urls.length > 1) {
      setter(urls.filter((_, i) => i !== index));
    }
  };

  // Filter out empty URLs before submitting
  const cleanUrls = (urls) => urls.filter(url => url.trim() !== '');

  const handleSpawnClick = () => {
    const f1Urls = cleanUrls(fighter1Urls);
    const f2Urls = cleanUrls(fighter2Urls);

    if (f1Urls.length >= 3 || f2Urls.length >= 3) {
      setIsWarningModalOpen(true);
    } else {
      handleSpawn();
    }
  };

  const handleSpawn = async () => {
    const f1Urls = cleanUrls(fighter1Urls);
    const f2Urls = cleanUrls(fighter2Urls);
    
    if (f1Urls.length === 0 || f2Urls.length === 0) {
      showModal("Please enter at least one URL for each fighter!");
      return;
    }
    
    setIsLoading(true);
    setLoadingSteps([]);
    setLoadingProgress(0);
    
    // Extract usernames from URLs for display
    const extractUsername = (url) => {
      const match = url.match(/(?:instagram\.com|facebook\.com|twitter\.com|x\.com|linkedin\.com(?:\/in)?)\/([^/?]+)/);
      return match ? match[1] : url;
    };
    
    // Detect platforms and usernames
    const allUrls = [...f1Urls, ...f2Urls];
    const igUrls = allUrls.filter(url => url.includes('instagram.com'));
    const fbUrls = allUrls.filter(url => url.includes('facebook.com'));
    const twUrls = allUrls.filter(url => url.includes('twitter.com') || url.includes('x.com'));
    const liUrls = allUrls.filter(url => url.includes('linkedin.com'));
    
    const igUsernames = igUrls.map(extractUsername);
    const fbUsernames = fbUrls.map(extractUsername);
    const twUsernames = twUrls.map(extractUsername);
    const liUsernames = liUrls.map(extractUsername);
    
    // Count actors
    let actorCount = 0;
    if (igUsernames.length > 0) actorCount += 1;
    if (fbUsernames.length > 0) actorCount += 2;
    if (twUsernames.length > 0) actorCount += 1;
    if (liUsernames.length > 0) actorCount += 1; // LinkedIn uses 1 actor (parallel calls)
    
    try {
      // Step 1: Routing
      addLoadingStep('[Batch] Routing URLs to platforms...', 5);
      await new Promise(r => setTimeout(r, 400));

      // Helper to format lists
      const formatList = (list) => {
        if (list.length <= 2) return list.join(', ');
        return `${list.slice(0, 2).join(', ')} +${list.length - 2} more`;
      };

      // Step 2: Show detected usernames
      if (igUsernames.length > 0) {
        addLoadingStep(`[Batch] Instagram usernames: ${formatList(igUsernames)}`, 10);
        await new Promise(r => setTimeout(r, 300));
      }
      if (fbUsernames.length > 0) {
        addLoadingStep(`[Batch] Facebook usernames: ${formatList(fbUsernames)}`, 15);
        await new Promise(r => setTimeout(r, 300));
      }
      if (twUsernames.length > 0) {
        addLoadingStep(`[Batch] Twitter usernames: ${formatList(twUsernames)}`, 15);
        await new Promise(r => setTimeout(r, 300));
      }
      if (liUsernames.length > 0) {
        addLoadingStep(`[Batch] LinkedIn profiles: ${formatList(liUsernames)}`, 15);
        await new Promise(r => setTimeout(r, 300));
      }

      // Step 3: Start batch API call
      addLoadingStep(`[Batch] Starting ${actorCount} cloud actor${actorCount > 1 ? 's' : ''}...`, 20);
      const batchPromise = api.createFightersBatch(f1Urls, f2Urls, fighter1Voice, fighter2Voice);
      await new Promise(r => setTimeout(r, 500));
      
      // Step 4: Platform-specific scraping
      let progress = 25;
      
      if (igUsernames.length > 0) {
        addLoadingStep(`[Instagram] Scraping ${igUsernames.length} profile${igUsernames.length > 1 ? 's' : ''}...`, progress);
        await new Promise(r => setTimeout(r, 3000));
        addLoadingStep(`[Instagram] Completed ✓`, progress + 10);
        progress += 12;
      }
      
      if (fbUsernames.length > 0) {
        addLoadingStep(`[Facebook] Fetching page info for ${fbUsernames.length} profile${fbUsernames.length > 1 ? 's' : ''}...`, progress);
        await new Promise(r => setTimeout(r, 2000));
        addLoadingStep(`[Facebook] Fetching posts...`, progress + 8);
        await new Promise(r => setTimeout(r, 3000));
        addLoadingStep(`[Facebook] Completed ✓`, progress + 15);
        progress += 18;
      }
      
      if (twUsernames.length > 0) {
        addLoadingStep(`[Twitter] Scraping ${twUsernames.length} profile${twUsernames.length > 1 ? 's' : ''}...`, progress);
        await new Promise(r => setTimeout(r, 2500));
        addLoadingStep(`[Twitter] Completed ✓`, progress + 10);
        progress += 12;
      }

      if (liUsernames.length > 0) {
        addLoadingStep(`[LinkedIn] Scraping ${liUsernames.length} profile${liUsernames.length > 1 ? 's' : ''}...`, progress);
        await new Promise(r => setTimeout(r, 2000));
        addLoadingStep(`[LinkedIn] Fetching recent posts...`, progress + 5);
        await new Promise(r => setTimeout(r, 2000));
        addLoadingStep(`[LinkedIn] Completed ✓`, progress + 10);
        progress += 12;
      }
      
      // Step 5: AI Profiler
      addLoadingStep('[AI Profiler] Analyzing both fighter personas...', 75);
      
      // Wait for batch result
      const { fighter1: f1, fighter2: f2 } = await batchPromise;

      // Step 6: Complete
      addLoadingStep('[Batch] Both fighters created successfully!', 95);
      localStorage.clear();
      localStorage.setItem('fighter1', JSON.stringify({ ...f1, voiceId: fighter1Voice, model: fighter1Model }));
      localStorage.setItem('fighter2', JSON.stringify({ ...f2, voiceId: fighter2Voice, model: fighter2Model }));
      localStorage.setItem('battleBackground', selectedBackground);
      await new Promise(r => setTimeout(r, 400));

      addLoadingStep('Entering arena...', 100);
      await new Promise(r => setTimeout(r, 500));

      router.push('/battle');
    } catch (error) {
      console.error("Failed to spawn fighters:", error);
      setIsLoading(false);
      showModal("Failed to spawn fighters. Please check the console for details.");
    }
  };

  const voices = [
    { id: 'adam', name: 'Brian (Energetic)' },
    { id: 'charlie', name: 'Josh (Deep)' },
    { id: 'bella', name: 'Sarah (Expressive)' },
    { id: 'clyde', name: 'Clyde (Aggressive)' },
    { id: 'rachel', name: 'Rachel (Confident)' },
    { id: 'mal_male', name: 'Chris (Fast Paced)' },
    { id: 'mal_female', name: 'Grace (Malaysian Female)' },
  ];

  const models = [
    // Groq Models (Free, Fast)
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq Free)' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq Free)' },
    // OpenRouter Free Models
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (OpenRouter Free)' },
    { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Hermes 3 405B (Free)' },
    // Cheap Paid Models
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini ($)' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash ($)' },
    // Premium Paid Models
    { id: 'openai/gpt-4o', name: 'GPT-4o ($$$)' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet ($$$)' },
  ];

  // Custom dropdown component matching retro style
  const RetroDropdown = ({ id, value, onChange, options, color }) => {
    const isOpen = openDropdown === id;
    const selectedOption = options.find(o => o.id === value);
    
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className={`w-full px-3 py-2 bg-black/70 border-2 ${
            color === 'red' ? 'border-red-800/50 text-red-200' : 'border-blue-800/50 text-blue-200'
          } text-left text-[10px] flex items-center justify-between hover:border-opacity-100 transition-colors`}
        >
          <span className="truncate">{selectedOption?.name || 'Select...'}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className={`absolute z-[100] w-full top-full mt-1 bg-black border-2 ${
            color === 'red' ? 'border-red-800/50' : 'border-blue-800/50'
          } max-h-48 overflow-y-auto shadow-xl`}>
            {options.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setOpenDropdown(null);
                }}
                className={`w-full px-3 py-2 text-left text-[10px] ${
                  color === 'red' 
                    ? 'text-red-200 hover:bg-red-900/40' 
                    : 'text-blue-200 hover:bg-blue-900/40'
                } ${value === option.id ? 'bg-white/10' : ''} transition-colors`}
              >
                {option.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen font-['Press_Start_2P'] text-white flex flex-col relative overflow-hidden">
      <Head>
        <title>Koyak Kombat - Select Your Fighters</title>
      </Head>

      {/* Error Modal */}
      {isModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div 
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="relative mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Shadow */}
            <div className="absolute inset-0 bg-red-900 translate-y-2 translate-x-2 border-4 border-black"></div>
            {/* Modal Content */}
            <div className="relative bg-black/95 border-4 border-red-600 p-6 max-w-md">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-red-800/50">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-sm text-yellow-500 uppercase tracking-wider">Warning!</h3>
              </div>
              {/* Message */}
              <p className="text-[10px] text-gray-300 leading-relaxed mb-6">
                {modalMessage}
              </p>
              {/* Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3 bg-gradient-to-b from-red-500 to-red-700 border-2 border-white text-white text-xs uppercase hover:from-red-400 hover:to-red-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Warning Modal for Multiple Profiles */}
      {isWarningModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setIsWarningModalOpen(false)}
        >
          <motion.div 
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="relative mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Shadow */}
            <div className="absolute inset-0 bg-yellow-900 translate-y-2 translate-x-2 border-4 border-black"></div>
            {/* Modal Content */}
            <div className="relative bg-black/95 border-4 border-yellow-600 p-6 max-w-md">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-yellow-800/50">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-sm text-yellow-500 uppercase tracking-wider">High Load Warning</h3>
              </div>
              {/* Message */}
              <p className="text-[10px] text-gray-300 leading-relaxed mb-6">
                You have selected 3 or more profiles for a fighter. This will require extensive data scraping and processing, which may take significantly longer to generate.
                <br /><br />
                Are you sure you want to proceed?
              </p>
              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => setIsWarningModalOpen(false)}
                  className="flex-1 py-3 bg-gray-800 border-2 border-gray-600 text-gray-300 text-xs uppercase hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsWarningModalOpen(false);
                    handleSpawn();
                  }}
                  className="flex-1 py-3 bg-gradient-to-b from-yellow-600 to-yellow-800 border-2 border-white text-white text-xs uppercase hover:from-yellow-500 hover:to-yellow-700 transition-colors"
                >
                  Proceed
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Background Selection Modal */}
      {isBackgroundModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={() => setIsBackgroundModalOpen(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative mx-4 w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Shadow */}
            <div className="absolute inset-0 bg-yellow-900 translate-y-2 translate-x-2 border-4 border-black"></div>
            {/* Modal Content */}
            <div className="relative bg-black/95 border-4 border-yellow-600 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-yellow-800/50">
                <div className="flex items-center gap-3">
                  <Map className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-lg text-yellow-500 uppercase tracking-wider">Select Arena</h3>
                </div>
                <button 
                  onClick={() => setIsBackgroundModalOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {backgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => {
                      setSelectedBackground(bg.src);
                      setIsBackgroundModalOpen(false);
                    }}
                    className={`group relative aspect-video border-4 transition-all duration-200 ${
                      selectedBackground === bg.src 
                        ? 'border-yellow-500 scale-105 z-10 shadow-[0_0_20px_rgba(234,179,8,0.5)]' 
                        : 'border-gray-800 hover:border-gray-500 hover:scale-105 hover:z-10'
                    }`}
                  >
                    <img 
                      src={bg.src} 
                      alt={bg.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                      <span className={`text-xs uppercase tracking-wider font-bold ${
                        selectedBackground === bg.src ? 'text-yellow-400' : 'text-gray-300 group-hover:text-white'
                      }`}>
                        {bg.name}
                      </span>
                    </div>
                    {selectedBackground === bg.src && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,1)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}



      {/* Background with Overlay (same as index.js) */}
      <div className="fixed inset-0 z-0">
        {/* Background image as div for better full-screen coverage */}
        <div 
          className={`absolute inset-0 min-h-screen ${isLoading ? 'blur-sm' : 'blur-[2px]'} brightness-[0.5]`}
          style={{
            backgroundImage: `url(${selectedBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>
      </div>

      {isLoading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex items-center justify-center relative z-10"
        >
          <div className="w-full max-w-2xl mx-4">
            {/* Title */}
            <motion.h2 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-xl md:text-2xl text-yellow-500 text-center mb-8 uppercase tracking-widest"
            >
              Spawning Fighters
            </motion.h2>

            {/* Progress Bar Container */}
            <div className="relative mb-6">
              <div className="h-6 bg-gray-900 border-2 border-gray-700 overflow-hidden">
                {/* Progress Fill */}
                <motion.div 
                  className="h-full bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }}></div>
              </div>
              {/* Percentage */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white font-bold drop-shadow-[0_0_4px_rgba(0,0,0,1)]">
                {loadingProgress}%
              </div>
            </div>

            {/* Current Step */}
            <motion.div 
              key={loadingStep}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center mb-8"
            >
              <p className="text-sm text-white animate-pulse">{loadingStep}</p>
            </motion.div>

            {/* Step Log */}
            <div className="bg-black/50 border border-gray-800 p-4 max-h-48 overflow-y-auto font-mono">
              <div className="text-[8px] text-gray-500 uppercase mb-2">Activity Log</div>
              {loadingSteps.map((s, i) => (
                <div key={i} className="flex gap-2 text-[9px] text-gray-400 mb-1">
                  <span className="text-gray-600 shrink-0">[{s.time}]</span>
                  <span className={i === loadingSteps.length - 1 ? 'text-yellow-400' : ''}>{s.step}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {/* Decorative Elements */}
            <div className="mt-6 flex justify-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <nav className="relative z-10 flex justify-between items-center p-6 md:p-8">
            <Link href="/" className="flex items-center gap-2 text-yellow-400 text-xs md:text-sm tracking-widest uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)] hover:text-yellow-300 transition-colors">
              <img src="/icon.png" alt="Koyak Kombat" className="w-6 h-6 md:w-8 md:h-8" />
              Koyak Kombat
            </Link>
            <div className="flex space-x-6 text-[10px] md:text-xs text-gray-300">
              <Link href="/character" className="text-yellow-400">Fighters</Link>
              <Link href="/about" className="hover:text-white hover:underline">About</Link>
            </div>
          </nav>

          {/* Main Content */}
          <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-8">
            
            {/* Title Section - Animated */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-center mb-8"
            >
              <motion.h1 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-2xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[4px_4px_0_rgba(180,83,9,1)] mb-2 leading-tight uppercase"
              >
                Select Your Fighters
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="text-[10px] md:text-xs text-gray-400 tracking-widest uppercase"
              >
                Enter their social profiles to spawn digital warriors
              </motion.p>
            </motion.div>

            {/* Background Selection Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="mb-8 z-20"
            >
              <button
                onClick={() => setIsBackgroundModalOpen(true)}
                className="group relative flex items-center gap-4 px-6 py-3 bg-black/60 border-2 border-yellow-800/50 hover:border-yellow-500 hover:bg-black/80 transition-all duration-300"
              >
                <div className="w-16 h-10 border-2 border-gray-600 group-hover:border-yellow-500 overflow-hidden relative">
                  <img 
                    src={selectedBackground} 
                    alt="Selected Arena" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[8px] text-gray-500 uppercase tracking-widest">Current Arena</span>
                  <span className="text-xs text-yellow-500 uppercase tracking-wider group-hover:text-yellow-400">
                    {backgrounds.find(b => b.src === selectedBackground)?.name || 'Unknown'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-yellow-500 transition-colors" />
              </button>
            </motion.div>

            {/* Fighter Cards Grid - Animated */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="w-full max-w-6xl grid md:grid-cols-2 gap-8 mb-8 z-20 items-start"
            >
              
              {/* Fighter 1 Card */}
              <div className="relative">
                {/* Card Shadow */}
                <div className="absolute inset-0 bg-red-900 translate-y-2 translate-x-2 border-4 border-black"></div>
                {/* Card */}
                <div className="relative bg-black/80 border-4 border-red-600 p-6 backdrop-blur-sm">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-red-800/50">
                    <Sword className="w-5 h-5 text-red-500" />
                    <h2 className="text-sm text-red-500 uppercase tracking-wider">Fighter 1</h2>
                  </div>
                  
                  {/* URL Inputs */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-400 uppercase">Social Profile URLs</label>
                      <span className="text-[8px] text-gray-600">Twitter • Insta • Facebook • LinkedIn</span>
                    </div>
                    
                    {fighter1Urls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input 
                          type="text"
                          placeholder={index === 0 ? "Social profile URL..." : "Add another profile..."}
                          className="flex-1 px-3 py-2 bg-black/70 border-2 border-red-800/50 text-red-200 text-[10px] placeholder-red-900/50 focus:border-red-500 focus:outline-none transition-colors"
                          value={url}
                          onChange={(e) => updateUrl(setFighter1Urls, fighter1Urls, index, e.target.value)}
                        />
                        {fighter1Urls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUrl(setFighter1Urls, fighter1Urls, index)}
                            className="px-2 text-red-400 hover:text-red-200 hover:bg-red-900/30 border-2 border-red-800/50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {fighter1Urls.length < 3 && (
                      <button
                        type="button"
                        onClick={() => addUrl(setFighter1Urls, fighter1Urls)}
                        className="w-full py-2 text-[10px] text-red-400 border-2 border-dashed border-red-800/50 hover:border-red-500 hover:text-red-200 hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Add Platform
                      </button>
                    )}
                  </div>
                  
                  {/* Voice & Model Selects */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-500 uppercase">Voice</label>
                      <RetroDropdown 
                        id="f1-voice"
                        value={fighter1Voice}
                        onChange={setFighter1Voice}
                        options={voices}
                        color="red"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-500 uppercase">Model</label>
                      <RetroDropdown 
                        id="f1-model"
                        value={fighter1Model}
                        onChange={setFighter1Model}
                        options={models}
                        color="red"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fighter 2 Card */}
              <div className="relative">
                {/* Card Shadow */}
                <div className="absolute inset-0 bg-blue-900 translate-y-2 translate-x-2 border-4 border-black"></div>
                {/* Card */}
                <div className="relative bg-black/80 border-4 border-blue-600 p-6 backdrop-blur-sm">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-blue-800/50">
                    <Sword className="w-5 h-5 text-blue-500" />
                    <h2 className="text-sm text-blue-500 uppercase tracking-wider">Fighter 2</h2>
                  </div>
                  
                  {/* URL Inputs */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-400 uppercase">Social Profile URLs</label>
                      <span className="text-[8px] text-gray-600">Twitter • Insta • Facebook • LinkedIn</span>
                    </div>
                    
                    {fighter2Urls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input 
                          type="text"
                          placeholder={index === 0 ? "Social profile URL..." : "Add another profile..."}
                          className="flex-1 px-3 py-2 bg-black/70 border-2 border-blue-800/50 text-blue-200 text-[10px] placeholder-blue-900/50 focus:border-blue-500 focus:outline-none transition-colors"
                          value={url}
                          onChange={(e) => updateUrl(setFighter2Urls, fighter2Urls, index, e.target.value)}
                        />
                        {fighter2Urls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUrl(setFighter2Urls, fighter2Urls, index)}
                            className="px-2 text-blue-400 hover:text-blue-200 hover:bg-blue-900/30 border-2 border-blue-800/50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {fighter2Urls.length < 3 && (
                      <button
                        type="button"
                        onClick={() => addUrl(setFighter2Urls, fighter2Urls)}
                        className="w-full py-2 text-[10px] text-blue-400 border-2 border-dashed border-blue-800/50 hover:border-blue-500 hover:text-blue-200 hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Add Platform
                      </button>
                    )}
                  </div>
                  
                  {/* Voice & Model Selects */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-500 uppercase">Voice</label>
                      <RetroDropdown 
                        id="f2-voice"
                        value={fighter2Voice}
                        onChange={setFighter2Voice}
                        options={voices}
                        color="blue"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-500 uppercase">Model</label>
                      <RetroDropdown 
                        id="f2-model"
                        value={fighter2Model}
                        onChange={setFighter2Model}
                        options={models}
                        color="blue"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Enter Arena Button - Animated */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="relative z-10 inline-block w-full max-w-md"
            >
              <div className="absolute inset-0 bg-red-800 translate-y-2 translate-x-2 border-4 border-black"></div>
              <motion.button
                onClick={handleSpawnClick}
                disabled={isLoading}
                className="relative w-full px-8 py-6 bg-gradient-to-b from-red-500 to-red-700 border-4 border-white text-white text-lg md:text-xl hover:-translate-y-1 hover:-translate-x-1 transition-transform active:translate-y-1 active:translate-x-1 uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:translate-x-0"
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(239, 68, 68, 0)",
                    "0 0 20px 10px rgba(239, 68, 68, 0.4)",
                    "0 0 0 0 rgba(239, 68, 68, 0)"
                  ]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {isLoading ? (
                  <span className="animate-pulse">Spawning Fighters...</span>
                ) : (
                  'Enter The Arena'
                )}
              </motion.button>
            </motion.div>

            {/* Powered By */}
            <p className="mt-8 text-[8px] text-gray-600 uppercase tracking-wider">
              Powered by Gemini, ElevenLabs & Vertex AI
            </p>
          </main>

          {/* Footer */}
          <footer className="relative z-10 p-6 text-center">
            <p className="text-[8px] md:text-[10px] text-gray-600 uppercase">
              © 2025 Koyak Kombat. No feelings were spared in the making of this game.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
