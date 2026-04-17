import React, { useEffect, useState } from 'react';
import { Sun, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'neon';

const THEME_KEY = 'neoguard-theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'neon') return saved;
    }
    return 'neon';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'neon');
    if (theme === 'neon') root.classList.add('neon');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return { theme, setTheme: setThemeState };
}

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const isNeon = theme === 'neon';

  return (
    <button
      role="switch"
      aria-checked={isNeon}
      aria-label="Toggle theme"
      onClick={() => setTheme(isNeon ? 'light' : 'neon')}
      className={cn(
        'theme-toggle relative inline-flex items-center h-9 w-[72px] rounded-full p-1 transition-all duration-500 overflow-hidden border',
        isNeon
          ? 'bg-[linear-gradient(135deg,#0B0F19,#1a1040)] border-[#00F5FF]/40 shadow-[0_0_20px_rgba(0,245,255,0.4),inset_0_0_15px_rgba(138,43,226,0.3)]'
          : 'bg-gradient-to-br from-[#E0E5EC] to-[#cdd5e0] border-[#A3B1C6]/40 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]'
      )}
    >
      {/* Animated aurora layer (only in neon) */}
      {isNeon && (
        <span
          aria-hidden
          className="absolute inset-0 opacity-70 animate-aurora pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, #00F5FF 0%, #8A2BE2 50%, #FF00FF 100%)',
            filter: 'blur(8px)',
          }}
        />
      )}

      {/* Stars / particles for neon */}
      {isNeon && (
        <>
          <span className="absolute top-1.5 left-3 w-0.5 h-0.5 rounded-full bg-white animate-pulse" />
          <span className="absolute top-4 left-7 w-0.5 h-0.5 rounded-full bg-[#FFD700] animate-pulse" style={{ animationDelay: '0.4s' }} />
          <span className="absolute bottom-2 left-10 w-0.5 h-0.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.8s' }} />
        </>
      )}

      {/* Knob */}
      <span
        className={cn(
          'relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          isNeon
            ? 'translate-x-[36px] bg-gradient-to-br from-[#00F5FF] via-[#8A2BE2] to-[#FF00FF] shadow-[0_0_15px_#00F5FF,0_0_25px_#8A2BE2]'
            : 'translate-x-0 bg-white shadow-[3px_3px_6px_#A3B1C6,-2px_-2px_5px_#FFFFFF]'
        )}
      >
        {isNeon ? (
          <Sparkles className="w-3.5 h-3.5 text-white drop-shadow-[0_0_3px_#fff]" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-[#FF7A18]" />
        )}
      </span>
    </button>
  );
};
