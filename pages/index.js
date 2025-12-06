import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen font-['Press_Start_2P'] text-white flex flex-col relative overflow-hidden">
      <Head>
        <title>Koyak Kombat - Insert Coin</title>
      </Head>

      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <img src="/background.png" alt="Dojo Background" className="w-full h-full object-cover opacity-40 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />
        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center p-6 md:p-8">
        <div className="text-yellow-400 text-xs md:text-sm tracking-widest uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
          Koyak Kombat
        </div>
        <div className="flex space-x-6 text-[10px] md:text-xs text-gray-300">
          <a href="#" className="hover:text-white hover:underline">Fighters</a>
          <a href="#" className="hover:text-white hover:underline">Leaderboard</a>
          <Link href="/about" className="hover:text-white hover:underline">About</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4">
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-8"
        >
          <motion.h1 
            className="text-5xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[4px_4px_0_rgba(180,83,9,1)] mb-4 leading-tight"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            KOYAK<br/>KOMBAT
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="text-xs md:text-sm text-gray-400 tracking-widest uppercase mt-4"
          >
            The Ultimate AI Roast Battle Arena
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Link href="/character" className="group relative inline-block">
            <div className="absolute inset-0 bg-red-600 translate-y-2 translate-x-2 border-4 border-black"></div>
            <motion.button 
              className="relative px-8 py-6 bg-red-500 border-4 border-white text-white text-xl md:text-2xl hover:-translate-y-1 hover:-translate-x-1 transition-transform active:translate-y-1 active:translate-x-1 uppercase"
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
              Insert Coin
            </motion.button>
          </Link>
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
