import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white flex flex-col relative overflow-hidden">
      <Head>
        <title>Koyak Kombat - Insert Coin</title>
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
        <div className="flex items-center gap-2 text-yellow-400 text-xs md:text-sm tracking-widest uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
          <img src="/icon.png" alt="Koyak Kombat" className="w-6 h-6 md:w-8 md:h-8" />
          Koyak Kombat
        </div>
        <div className="flex space-x-6 text-[10px] md:text-xs text-gray-300">
          <Link href="/character" className="hover:text-white hover:underline">Fighters</Link>
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
            className="text-5xl md:text-8xl mb-4 leading-tight"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[4px_4px_0_rgba(180,83,9,1)]">
              KOYAK
            </span>
            <br/>
            <motion.span 
              className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 inline-block"
              style={{ filter: 'drop-shadow(4px 4px 0 rgba(180,83,9,1)) drop-shadow(0 0 15px rgba(234,179,8,0.8))' }}
              animate={{ x: [0, -3, 0, 3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              KOMBAT
            </motion.span>
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
