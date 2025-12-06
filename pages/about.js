import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sword, Zap, Brain, Target, Flame, Trophy } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen font-['Press_Start_2P'] text-white flex flex-col relative overflow-hidden">
      <Head>
        <title>Koyak Kombat - About</title>
      </Head>

      {/* Background with Overlay */}
      <div className="fixed inset-0 z-0">
        {/* Background image as div for better full-screen coverage */}
        <div 
          className="absolute inset-0 min-h-screen blur-[2px] brightness-[0.5]"
          style={{
            backgroundImage: "url('/backgrounds/dojobackground.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center p-6 md:p-8">
        <Link href="/" className="flex items-center gap-2 text-yellow-400 text-xs md:text-sm tracking-widest uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)] hover:text-yellow-300 transition-colors">
          <img src="/logo.png" alt="Koyak Kombat" className="w-6 h-6 md:w-8 md:h-8" />
          Koyak Kombat
        </Link>
        <div className="flex space-x-6 text-[10px] md:text-xs text-gray-300">
          <Link href="/character" className="hover:text-white hover:underline">Fighters</Link>
          <Link href="/about" className="text-yellow-400">About</Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-8 overflow-y-auto">
        
        {/* Title */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="text-2xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[4px_4px_0_rgba(180,83,9,1)] mb-4 leading-tight uppercase">
            What is Koyak Kombat?
          </h1>
        </motion.div>

        {/* Content Cards Container */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="w-full max-w-4xl space-y-8"
        >

          {/* About Section */}
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-900/50 translate-y-2 translate-x-2 border-4 border-black"></div>
            <div className="relative bg-black/80 border-4 border-yellow-600 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-yellow-800/50">
                <Brain className="w-5 h-5 text-yellow-500" />
                <h2 className="text-sm text-yellow-500 uppercase tracking-wider">The Game</h2>
              </div>
              <div className="space-y-4 text-[10px] text-gray-300 leading-relaxed">
                <p>
                  <span className="text-yellow-400">Koyak Kombat</span> is an AI-powered roast battle arena where digital warriors clash with words instead of fists.
                </p>
                <p>
                  Enter any public social media profile, and our AI will analyze their posts, personality, and online presence to create a <span className="text-red-400">Digital Twin</span> — a fighter that talks, thinks, and roasts just like them.
                </p>
                <p>
                  Watch as two AI personas go head-to-head, throwing personalized insults based on real content. It's brutal, it's hilarious, and no feelings are spared.
                </p>
              </div>
            </div>
          </div>

          {/* How to Play */}
          <div className="relative">
            <div className="absolute inset-0 bg-blue-900/50 translate-y-2 translate-x-2 border-4 border-black"></div>
            <div className="relative bg-black/80 border-4 border-blue-600 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-blue-800/50">
                <Sword className="w-5 h-5 text-blue-500" />
                <h2 className="text-sm text-blue-500 uppercase tracking-wider">How to Play</h2>
              </div>
              <div className="space-y-3 text-[10px] text-gray-300 leading-relaxed">
                <div className="flex gap-3">
                  <span className="text-blue-400 font-bold">1.</span>
                  <p>Enter Twitter, Instagram, or LinkedIn profiles for two fighters</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-400 font-bold">2.</span>
                  <p>Choose a voice and AI model for each fighter</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-400 font-bold">3.</span>
                  <p>Watch as AI analyzes their content and creates battle personas</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-400 font-bold">4.</span>
                  <p>The battle begins — fighters take turns roasting each other</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-400 font-bold">5.</span>
                  <p>Last fighter standing wins!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Damage System */}
          <div className="relative">
            <div className="absolute inset-0 bg-red-900/50 translate-y-2 translate-x-2 border-4 border-black"></div>
            <div className="relative bg-black/80 border-4 border-red-600 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-red-800/50">
                <Flame className="w-5 h-5 text-red-500" />
                <h2 className="text-sm text-red-500 uppercase tracking-wider">Damage System</h2>
              </div>
              <div className="space-y-4 text-[10px] text-gray-300 leading-relaxed">
                <p>
                  Each roast deals <span className="text-red-400">Emotional Damage</span> ranging from 0-60 points. An independent AI Judge scores the roast based on:
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-red-400">Specificity (30%)</span>
                      <p className="text-gray-500">How personal is the attack? Generic insults = low damage.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-yellow-400">Creativity (30%)</span>
                      <p className="text-gray-500">Unique burns hit harder than clichés.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-blue-400">Accuracy (40%)</span>
                      <p className="text-gray-500">Roasts based on real content deal extra damage.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-green-400">Speed Bonus</span>
                      <p className="text-gray-500">Quick comebacks get bonus damage!</p>
                    </div>
                  </div>
                </div>

                {/* Speed Bonuses */}
                <div className="mt-4 p-3 bg-green-900/30 border border-green-800/50">
                  <p className="text-green-400 mb-2">Speed Bonuses:</p>
                  <div className="grid grid-cols-3 gap-2 text-[9px]">
                    <div className="text-center">
                      <span className="text-green-400">&lt; 2 sec</span>
                      <p className="text-white">+15%</p>
                    </div>
                    <div className="text-center">
                      <span className="text-yellow-400">&lt; 3 sec</span>
                      <p className="text-white">+10%</p>
                    </div>
                    <div className="text-center">
                      <span className="text-red-400">&gt; 5 sec</span>
                      <p className="text-white">-10%</p>
                    </div>
                  </div>
                </div>

                {/* Formula */}
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800/50">
                  <div className="space-y-1">
                    <p className="text-red-400 text-[9px]">
                      <span className="text-white">Base Score</span> = (Spec × 0.3) + (Crea × 0.3) + (Acc × 0.4)
                    </p>
                    <p className="text-red-400 text-[9px]">
                      <span className="text-white">Base Damage</span> = Base Score × 0.6
                    </p>
                    <p className="text-red-400 text-[9px]">
                      <span className="text-white">Final Damage</span> = Base Damage × Speed Multiplier
                    </p>
                  </div>
                  <p className="text-gray-500 mt-2">
                    Fast models have an edge — but only if the roast is good!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="text-center pt-4"
          >
            <Link href="/character" className="group relative inline-block">
              <div className="absolute inset-0 bg-red-800 translate-y-2 translate-x-2 border-4 border-black"></div>
              <button className="relative px-8 py-4 bg-gradient-to-b from-red-500 to-red-700 border-4 border-white text-white text-sm hover:-translate-y-1 hover:-translate-x-1 transition-transform active:translate-y-1 active:translate-x-1 uppercase">
                Start a Battle
              </button>
            </Link>
          </motion.div>

        </motion.div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center">
        <p className="text-[8px] md:text-[10px] text-gray-600 uppercase">
          © 2025 Koyak Kombat. No feelings were spared in the making of this game.
        </p>
      </footer>

    </div>
  );
}
