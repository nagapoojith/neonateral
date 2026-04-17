import React, { useEffect, useState } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'neon';

const THEME_KEY = 'neoguard-theme';

const themes: { value: Theme; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" />, desc: 'Neumorphism' },
  { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" />, desc: 'Professional' },
  { value: 'neon', label: 'Neon RGB', icon: <Sparkles className="w-4 h-4" />, desc: 'Cyberpunk' },
];

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(THEME_KEY) as Theme) || 'neon';
    }
    return 'neon';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'neon');
    if (theme === 'dark') root.classList.add('dark');
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
            'rounded-xl hover:bg-muted relative',
            theme === 'neon' && 'hover:shadow-glow-primary'
          )}
        >
          {current.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              'flex items-center gap-3 rounded-lg cursor-pointer',
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
