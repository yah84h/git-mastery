import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Timer, Trophy, Zap } from 'lucide-react';
import type { AnswerRecord, LeaderboardEntry, PreparedQuestion } from '../types';
import { BONUS_UNDER_SECONDS, buildRun, POINTS_BONUS, POINTS_CORRECT, QUESTIONS_PER_RUN, SECONDS_PER_QUESTION } from '../data/quiz';
import { readStore, writeStore } from '../hooks/useAppState';
import QuizQuestion from './QuizQuestion';
import QuizResults from './QuizResults';

interface Props {
  bestScore: number;
  leaderboard: LeaderboardEntry[];
  onFinish: (entry: LeaderboardEntry) => void;
  go: (route: string) => void;
  modulesDone: number;
  modulesTotal: number;
}

type Phase = 'intro' | 'play' | 'results';

export default function QuizEngine({ bestScore, leaderboard, onFinish, go, modulesDone, modulesTotal }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [name, setName] = useState(() => readStore<{ name: string }>('git-mastery:player', { name: '' }).name);
  const [questions, setQuestions] = useState<PreparedQuestion[]>([]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(SECONDS_PER_QUESTION);
  const [lastEntry, setLastEntry] = useState<LeaderboardEntry | null>(null);
  const startRef = useRef(0);
  const score = answers.reduce((s, a) => s + a.points, 0);
  const streak = (() => {
    let n = 0;
    for (let k = answers.length - 1; k >= 0 && answers[k].correct; k--) n++;
    return n;
  })();

  const start = () => {
    writeStore('git-mastery:player', { name });
    setQuestions(buildRun());
    setI(0);
    setAnswers([]);
    setPicked(null);
    setRemaining(SECONDS_PER_QUESTION);
    startRef.current = performance.now();
    setPhase('play');
  };

  const answer = useCallback(
    (choice: number) => {
      if (picked !== null) return;
      const q = questions[i];
      const elapsed = Math.min(SECONDS_PER_QUESTION * 1000, performance.now() - startRef.current);
      const correct = choice >= 0 && q.shuffled[choice].correct;
      const points = correct ? POINTS_CORRECT + (elapsed < BONUS_UNDER_SECONDS * 1000 ? POINTS_BONUS : 0) : 0;
      setPicked(choice);
      setAnswers((a) => [...a, { questionId: q.id, correct, timeMs: elapsed, points, timedOut: choice === -1 }]);
    },
    [picked, questions, i],
  );

  // countdown
  useEffect(() => {
    if (phase !== 'play' || picked !== null) return;
    const id = window.setInterval(() => {
      const left = SECONDS_PER_QUESTION - (performance.now() - startRef.current) / 1000;
      if (left <= 0) {
        setRemaining(0);
        answer(-1);
      } else setRemaining(left);
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, picked, answer]);

  const next = useCallback(() => {
    if (i + 1 >= questions.length) {
      const correct = answers.filter((a) => a.correct).length;
      const entry: LeaderboardEntry = {
        name: name.trim() || 'You',
        score: answers.reduce((s, a) => s + a.points, 0),
        accuracy: Math.round((correct / questions.length) * 100),
        avgMs: answers.reduce((s, a) => s + a.timeMs, 0) / answers.length,
        date: new Date().toISOString(),
      };
      setLastEntry(entry);
      onFinish(entry);
      setPhase('results');
      return;
    }
    setI(i + 1);
    setPicked(null);
    setRemaining(SECONDS_PER_QUESTION);
    startRef.current = performance.now();
  }, [i, questions.length, answers, name, onFinish]);

  if (phase === 'results' && lastEntry) {
    return <QuizResults entry={lastEntry} answers={answers} questions={questions} leaderboard={leaderboard} onRetry={start} go={go} />;
  }

  if (phase === 'play') {
    const q = questions[i];
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-10">
        {/* HUD */}
        <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-10 -mx-1 rounded-xl border border-line bg-panel/95 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-4 text-[13px]">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Trophy size={15} className="text-accent" />
              <span key={score} className="animate-pop font-mono text-[16px] tnum">
                {score}
              </span>
              <span className="text-faint">pts</span>
            </span>
            {streak >= 2 && (
              <span className="animate-pop inline-flex items-center gap-1 font-semibold text-warn">
                <Flame size={14} /> {streak} streak
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-faint tnum">
              <Timer size={14} /> {i + 1}/{questions.length}
            </span>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {questions.map((_, k) => {
              const a = answers[k];
              return (
                <span
                  key={k}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${a ? (a.correct ? 'bg-ok' : 'bg-bad') : k === i ? 'bg-accent' : 'bg-line'}`}
                />
              );
            })}
          </div>
        </div>
        <QuizQuestion q={q} index={i} total={questions.length} remaining={remaining} picked={picked} points={answers[i]?.points ?? null} onPick={answer} onNext={next} />
      </div>
    );
  }

  // intro
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-10 pt-2">
      <div>
        <span className="eyebrow text-accent">Quick competition</span>
        <h1 className="mt-1 font-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.02] tracking-tight">Git Challenge</h1>
        <p className="mt-2 max-w-[60ch] text-[16px] text-fg/85">
          {QUESTIONS_PER_RUN} questions across every module. Questions and answers are shuffled each run, so no two games are the same.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Timer, t: `${SECONDS_PER_QUESTION}s per question`, d: 'Run out of time and it counts as wrong.' },
          { icon: Trophy, t: `${POINTS_CORRECT} pts per correct answer`, d: 'Wrong answers score 0.' },
          { icon: Zap, t: `+${POINTS_BONUS} speed bonus`, d: `Answer correctly in under ${BONUS_UNDER_SECONDS} seconds.` },
        ].map((x) => (
          <div key={x.t} className="rounded-xl border border-line bg-panel p-4">
            <x.icon size={18} className="text-accent" />
            <p className="mt-2 font-semibold">{x.t}</p>
            <p className="text-[13.5px] text-muted">{x.d}</p>
          </div>
        ))}
      </div>

      {modulesDone < modulesTotal && (
        <p className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[14px] text-fg/85">
          You’ve completed {modulesDone} of {modulesTotal} modules. The challenge covers all of them, so finishing the course first gives you the best shot.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
        className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4 sm:flex-row sm:items-end"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="player-name" className="text-[13px] font-medium text-muted">
            Name for the leaderboard
          </label>
          <input
            id="player-name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="e.g. Sara"
            className="rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        <button type="submit" className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-accent-fg hover:brightness-110">
          Start Git Challenge
        </button>
      </form>
      <p className="-mt-3 text-[13px] text-faint">
        Best score on this device: <span className="font-mono text-fg tnum">{bestScore}</span> · Keyboard: 1–4 to answer, Enter for next.
      </p>
    </div>
  );
}
