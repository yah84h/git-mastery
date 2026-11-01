import { useCallback, useEffect, useState } from 'react';
import { Award, Flame, Footprints, GitBranch, GraduationCap, Rocket, ShieldCheck, Target, Trophy, Wrench, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Progress } from '../types';
import { modules } from '../data/modules';
import { exercises } from '../data/exercises';
import { readStore, writeStore } from '../hooks/useAppState';

/* ------------------------------------------------------------ home state */
export interface HomeState {
  firstMinuteDone: boolean;
  streak: number;
  bestStreak: number;
  lastDaily: string | null; // YYYY-MM-DD of last answered daily
  dailyCorrect: number;
  dailyAnswer: { date: string; choice: number; correct: boolean } | null;
}
const KEY = 'git-mastery:home:v1';
const empty: HomeState = { firstMinuteDone: false, streak: 0, bestStreak: 0, lastDaily: null, dailyCorrect: 0, dailyAnswer: null };

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return today(d);
};

export function useHomeState() {
  const [state, setState] = useState<HomeState>(() => readStore(KEY, empty));
  useEffect(() => writeStore(KEY, state), [state]);
  useEffect(() => {
    const on = () => setState(empty);
    window.addEventListener('git-mastery:reset', on);
    return () => window.removeEventListener('git-mastery:reset', on);
  }, []);

  // A streak survives until a full day is missed.
  const liveStreak = state.lastDaily === today() || state.lastDaily === yesterday() ? state.streak : 0;

  const finishFirstMinute = useCallback(() => setState((s) => (s.firstMinuteDone ? s : { ...s, firstMinuteDone: true })), []);
  const answerDaily = useCallback((choice: number, correct: boolean) => {
    setState((s) => {
      const t = today();
      if (s.dailyAnswer?.date === t) return s;
      const streak = s.lastDaily === yesterday() || s.lastDaily === t ? s.streak + 1 : 1;
      return {
        ...s,
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
        lastDaily: t,
        dailyCorrect: s.dailyCorrect + (correct ? 1 : 0),
        dailyAnswer: { date: t, choice, correct },
      };
    });
  }, []);
  const resetHome = useCallback(() => setState(empty), []);
  return { home: { ...state, streak: liveStreak }, finishFirstMinute, answerDaily, resetHome };
}

/* ------------------------------------------------------------ XP & levels */
export const XP = { module: 100, exercise: 60, firstMinute: 40, daily: 20, mission: 150 } as const;

export function computeXp(p: Progress, h: HomeState) {
  return (
    p.completed.length * XP.module +
    p.exercises.length * XP.exercise +
    (h.firstMinuteDone ? XP.firstMinute : 0) +
    h.dailyCorrect * XP.daily +
    (p.missionDone ? XP.mission : 0) +
    Math.round(p.bestScore / 10)
  );
}

export const levels = [
  { name: 'Newcomer', at: 0 },
  { name: 'First Committer', at: 100 },
  { name: 'Branch Builder', at: 350 },
  { name: 'Merge Maker', at: 700 },
  { name: 'History Keeper', at: 1100 },
  { name: 'Git Master', at: 1600 },
];

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < levels.length && xp >= levels[i + 1].at) i++;
  const cur = levels[i];
  const next = levels[i + 1];
  return {
    index: i,
    name: cur.name,
    next: next?.name ?? null,
    pct: next ? Math.round(((xp - cur.at) / (next.at - cur.at)) * 100) : 100,
    toNext: next ? next.at - xp : 0,
  };
}

/* ------------------------------------------------------------ achievements */
export interface Achievement {
  id: string;
  title: string;
  how: string;
  icon: LucideIcon;
  /** 0..1 */
  progress: (p: Progress, h: HomeState) => number;
}

const ratio = (a: number, b: number) => Math.min(1, a / b);

export const achievements: Achievement[] = [
  { id: 'first-minute', title: 'Hello, Git', how: 'Finish “Your first minute with Git” on this page', icon: Footprints, progress: (_p, h) => (h.firstMinuteDone ? 1 : 0) },
  { id: 'first-module', title: 'Initial commit', how: 'Complete any module', icon: Rocket, progress: (p) => ratio(p.completed.length, 1) },
  { id: 'hands-on', title: 'Hands on the keyboard', how: 'Solve 3 hands-on exercises', icon: Wrench, progress: (p) => ratio(p.exercises.length, 3) },
  {
    id: 'branching',
    title: 'Branch out',
    how: 'Complete Branching and Merging',
    icon: GitBranch,
    progress: (p) => (p.completed.includes('branching') ? 1 : 0),
  },
  { id: 'streak-3', title: 'On a roll', how: 'Answer the daily question 3 days in a row', icon: Flame, progress: (_p, h) => ratio(h.bestStreak, 3) },
  { id: 'quiz-1500', title: 'Fast fingers', how: 'Score 1,500+ in the Git Challenge', icon: Zap, progress: (p) => ratio(p.bestScore, 1500) },
  { id: 'mission', title: 'Repo rescuer', how: 'Complete Git Mission: Save the Repository', icon: ShieldCheck, progress: (p) => (p.missionDone ? 1 : 0) },
  { id: 'flawless', title: 'Zero mistakes', how: 'Finish the mission without a wrong choice', icon: Target, progress: (p) => (p.missionBest === 0 ? 1 : 0) },
  { id: 'all-exercises', title: 'Practice makes perfect', how: `Solve all ${exercises.length} exercises`, icon: Award, progress: (p) => ratio(p.exercises.length, exercises.length) },
  { id: 'quiz-master', title: 'Git Master', how: 'Score 2,000+ in the Git Challenge', icon: Trophy, progress: (p) => ratio(p.bestScore, 2000) },
  {
    id: 'graduate',
    title: 'Graduate',
    how: `Complete all ${modules.length} modules`,
    icon: GraduationCap,
    progress: (p) => ratio(p.completed.length, modules.length),
  },
];
