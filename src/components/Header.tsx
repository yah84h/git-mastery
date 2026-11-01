import { GitBranch, Moon, Sun } from 'lucide-react';
import type { Progress } from '../types';
import ProgressTracker from './ProgressTracker';

export function Logo() {
  return (
    <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg">
      <GitBranch size={18} strokeWidth={2.5} />
    </span>
  );
}

/* ------------------------------------------------------------ Header */
interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  progress: Progress;
  go: (r: string) => void;
}
export function Header({ theme, onToggleTheme, progress, go }: HeaderProps) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="gutter flex h-14 items-center gap-3">
        <button onClick={() => go('home')} className="flex min-w-0 items-center gap-2.5" aria-label="Git Mastery home">
          <Logo />
          <span className="min-w-0 text-left leading-tight">
            <span className="block font-display text-[17px] font-extrabold tracking-tight">Git Mastery</span>
            <span className="hidden text-[11.5px] text-faint sm:block">Learn Git. Master Your Workflow.</span>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-3">
          <ProgressTracker progress={progress} compact />
          <button
            onClick={onToggleTheme}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:text-fg"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
