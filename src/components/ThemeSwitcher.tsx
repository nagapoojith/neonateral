import React, { useEffect, useState } from 'react';
import { Sun, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'neon';

const THEME_KEY = 'neoguard-theme';

const themes: { value: Theme; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'light', label: 'Clinical', icon: <Sun className="w-4 h-4" />, desc: 'Hospital Neumorphism' },
  { value: 'neon', label: 'Neon RGB', icon: <Sparkles className="w-4 h-4" />, desc: 'Cyberpunk NICU' },
];

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark') return 'neon';
      return (saved as Theme) || 'neon';
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
  const current = themes.find((t) => t.value === theme)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'rounded-xl hover:bg-muted relative transition-all duration-300',
            theme === 'neon' && 'hover:shadow-glow-primary hover:scale-110'
          )}
        >
          {current.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              'flex items-center gap-3 rounded-lg cursor-pointer transition-all',
              theme === t.value && 'bg-primary/10 text-primary'
            )}
          >
            {t.icon}
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
