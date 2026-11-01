import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Flame, X } from 'lucide-react';
import { questionPool } from '../../data/quiz';
import { today, XP, type HomeState } from '../../lib/gamification';
import CommitGraph from '../CommitGraph';

/* deterministic per-day pick and option order, same for everyone on that date */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seeded<T>(arr: T[], seed: number) {
  const a = [...arr];
  let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const mid = new Date(now);
  mid.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((mid.getTime() - now.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

interface Props {
  home: HomeState;
  onAnswer: (choice: number, correct: boolean) => void;
}

export default function DailyChallenge({ home, onAnswer }: Props) {
  const date = today();
  const q = useMemo(() => {
    const seed = hash(date);
    const base = questionPool[seed % questionPool.length];
    return {
      ...base,
      shuffled: seeded(
        base.options.map((text, i) => ({ text, correct: i === base.answer, graph: base.optionGraphs?.[i] })),
        seed,
      ),
    };
  }, [date]);
  const answered = home.dailyAnswer?.date === date ? home.dailyAnswer : null;
  const countdown = useCountdown();

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-panel" aria-labelledby="daily-title">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <CalendarDays size={18} className="text-accent" />
        <div className="min-w-0 flex-1">
          <h2 id="daily-title" className="font-display text-[16px] font-bold leading-tight">
            Daily question
          </h2>
          <p className="text-[12.5px] text-muted">One question a day keeps Git fresh. +{XP.daily} XP when you get it right.</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold tnum ${home.streak ? 'bg-warn/15 text-warn' : 'bg-raised text-faint'}`}
          title="Days in a row"
        >
          <Flame size={14} className={home.streak ? 'motion-safe:animate-pulse' : ''} /> {home.streak}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-[12px] font-medium text-faint">{q.topic}</p>
        <p className="-mt-2 font-semibold leading-snug">{q.prompt}</p>
        {q.graph && (
          <div className="rounded-lg border border-line bg-bg/50 px-2 pt-1">
            <CommitGraph state={q.graph} dense fit interactive={false} ariaLabel="Question graph" />
          </div>
        )}
        <div className={`grid gap-2 ${q.optionGraphs ? 'grid-cols-2' : ''}`} role="radiogroup" aria-label="Answers">
          {q.shuffled.map((o, i) => {
            const isPicked = answered?.choice === i;
            const right = answered && o.correct;
            const wrong = answered && isPicked && !o.correct;
            return (
              <button
                key={o.text}
                role="radio"
                aria-checked={isPicked}
                disabled={!!answered}
                onClick={() => onAnswer(i, o.correct)}
                className={`flex min-w-0 items-start gap-2 rounded-lg border p-2.5 text-left text-[13.5px] transition ${
                  right ? 'border-ok bg-ok/10' : wrong ? 'animate-shake border-bad bg-bad/10' : answered ? 'border-line opacity-50' : 'border-line hover:border-accent/70 hover:bg-raised/50'
                }`}
              >
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded ${right ? 'bg-ok text-bg' : wrong ? 'bg-bad text-bg' : 'bg-raised'}`}>
                  {right ? <Check size={12} strokeWidth={3} /> : wrong ? <X size={12} strokeWidth={3} /> : null}
                </span>
                {o.graph ? (
                  <span className="min-w-0 flex-1">
                    <span className="sr-only">{o.text}</span>
                    <CommitGraph state={o.graph} dense fit interactive={false} ariaLabel={o.text} />
                  </span>
                ) : (
                  <span className="min-w-0">{o.text}</span>
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={`animate-rise rounded-lg p-3 text-[13.5px] ${answered.correct ? 'bg-ok/10' : 'bg-bad/10'}`} role="status">
            <p className={`font-semibold ${answered.correct ? 'text-ok' : 'text-bad'}`}>
              {answered.correct ? `Correct. +${XP.daily} XP` : 'Not this time. Your streak still counts.'}
            </p>
            <p className="mt-0.5 text-fg/85">{q.explanation}</p>
            <p className="mt-2 text-[12.5px] text-faint">
              Next question in <span className="font-mono tnum">{countdown}</span>
              {home.streak > 0 && ` · ${home.streak}-day streak, best ${home.bestStreak}`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
