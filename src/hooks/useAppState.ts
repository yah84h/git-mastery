import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry, Progress } from '../types';

/* ---------------- safe localStorage ---------------- */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
export function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode, blocked) – app still works in memory */
  }
}

/* ---------------- progress ---------------- */
const PROGRESS_KEY = 'git-mastery:progress:v1';
const emptyProgress: Progress = { completed: [], visited: [], bestScore: 0, leaderboard: [], missionBest: null, missionDone: false, exercises: [] };

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => readStore(PROGRESS_KEY, emptyProgress));
  useEffect(() => writeStore(PROGRESS_KEY, progress), [progress]);

  const toggleComplete = useCallback(
    (id: string) =>
      setProgress((p) => ({
        ...p,
        completed: p.completed.includes(id) ? p.completed.filter((x) => x !== id) : [...p.completed, id],
      })),
    [],
  );
  const markVisited = useCallback(
    (id: string) => setProgress((p) => (p.visited.includes(id) ? p : { ...p, visited: [...p.visited, id] })),
    [],
  );
  const recordQuiz = useCallback((entry: LeaderboardEntry) => {
    setProgress((p) => ({
      ...p,
      bestScore: Math.max(p.bestScore, entry.score),
      leaderboard: [...p.leaderboard, entry].sort((a, b) => b.score - a.score || a.avgMs - b.avgMs).slice(0, 8),
    }));
  }, []);
  const recordMission = useCallback((mistakes: number) => {
    setProgress((p) => ({ ...p, missionDone: true, missionBest: p.missionBest === null ? mistakes : Math.min(p.missionBest, mistakes) }));
  }, []);
  const completeExercise = useCallback(
    (id: string) => setProgress((p) => (p.exercises.includes(id) ? p : { ...p, exercises: [...p.exercises, id] })),
    [],
  );
  const reset = useCallback(() => setProgress(emptyProgress), []);

  return { progress, toggleComplete, markVisited, recordQuiz, recordMission, completeExercise, reset };
}

/* ---------------- theme ---------------- */
type Theme = 'dark' | 'light';
const THEME_KEY = 'git-mastery:theme';

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* ignore */
    }
    return systemTheme();
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  return { theme, toggle };
}

/* ---------------- hash routing ---------------- */
// Views: #home, #module-<id>, #terminal, #challenge, #mission
export function useRoute() {
  const read = () => {
    const h = window.location.hash.replace(/^#/, '');
    return /^[a-z0-9-]+$/.test(h) ? h : 'home';
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r: string) => {
    if (window.location.hash !== '#' + r) window.location.hash = r;
    else setRoute(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  return { route, go };
}

/* ---------------- clipboard ---------------- */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
