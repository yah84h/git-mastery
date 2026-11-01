import { useEffect } from 'react';
import { Check, Clock, X } from 'lucide-react';
import type { PreparedQuestion } from '../types';
import { BONUS_UNDER_SECONDS, SECONDS_PER_QUESTION } from '../data/quiz';
import CommitGraph from './CommitGraph';

interface Props {
  q: PreparedQuestion;
  index: number;
  total: number;
  remaining: number; // seconds, fractional
  picked: number | null; // index into shuffled, -1 = timed out
  points: number | null;
  onPick: (i: number) => void;
  onNext: () => void;
}

const KEYS = ['A', 'B', 'C', 'D'];

export default function QuizQuestion({ q, index, total, remaining, picked, points, onPick, onNext }: Props) {
  const answered = picked !== null;
  const correctIdx = q.shuffled.findIndex((o) => o.correct);
  const wasRight = answered && picked === correctIdx;
  const frac = Math.max(0, remaining / SECONDS_PER_QUESTION);
  const bonusWindow = SECONDS_PER_QUESTION - remaining < BONUS_UNDER_SECONDS;

  // keyboard: 1-4 / A-D to answer, Enter for next
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toUpperCase();
      if (!answered) {
        const i = ['1', '2', '3', '4'].indexOf(k) >= 0 ? ['1', '2', '3', '4'].indexOf(k) : KEYS.indexOf(k);
        if (i >= 0 && i < q.shuffled.length) onPick(i);
      } else if (e.key === 'Enter') onNext();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [answered, q, onPick, onNext]);

  const R = 22;
  const C = 2 * Math.PI * R;
  const urgent = remaining <= 5;

  return (
    <div key={q.id} className="animate-rise flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="relative grid h-14 w-14 shrink-0 place-items-center" aria-label={`${Math.ceil(remaining)} seconds left`}>
          <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
            <circle cx="28" cy="28" r={R} fill="none" strokeWidth="5" style={{ stroke: 'rgb(var(--line))' }} />
            <circle
              cx="28"
              cy="28"
              r={R}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - frac)}
              style={{ stroke: urgent ? 'rgb(var(--bad))' : bonusWindow ? 'rgb(var(--ok))' : 'rgb(var(--accent))', transition: 'stroke-dashoffset .1s linear' }}
            />
          </svg>
          <span className={`absolute font-mono text-[17px] font-bold tnum ${urgent && !answered ? 'text-bad' : ''}`}>{Math.ceil(remaining)}</span>
        </div>
        <div className="min-w-0">
          <div className="eyebrow mb-1 flex flex-wrap items-center gap-2 text-faint">
            <span className="tnum">
              Question {index + 1} / {total}
            </span>
            <span className="rounded bg-raised px-1.5 py-0.5">{q.topic}</span>
            {!answered && bonusWindow && <span className="text-ok">+50 bonus window</span>}
          </div>
          <h2 className="font-display text-[clamp(1.2rem,2.6vw,1.6rem)] font-bold leading-snug">{q.prompt}</h2>
        </div>
      </div>

      {q.graph && (
        <figure className="rounded-xl border border-line bg-panel px-4 pb-2 pt-3">
          <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-[12.5px] text-faint">
            <span className="font-semibold text-muted">{q.optionGraphs ? 'Before' : 'Repository'}</span>
            {q.graphCaption && <span>{q.graphCaption}</span>}
          </figcaption>
          <CommitGraph state={q.graph} dense fit interactive={!!q.graphCaption?.includes('Tap')} ariaLabel="Question commit graph" />
        </figure>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Answer options">
        {q.shuffled.map((o, i) => {
          const isPicked = picked === i;
          const showRight = answered && o.correct;
          const showWrong = answered && isPicked && !o.correct;
          return (
            <button
              key={o.text}
              role="radio"
              aria-checked={isPicked}
              disabled={answered}
              onClick={() => onPick(i)}
              className={`group flex min-h-[64px] items-start gap-3 rounded-xl border p-3 text-left text-[14.5px] transition ${
                showRight
                  ? 'animate-glow border-ok bg-ok/15'
                  : showWrong
                    ? 'animate-shake border-bad bg-bad/15'
                    : answered
                      ? 'border-line opacity-55'
                      : 'border-line bg-panel hover:-translate-y-0.5 hover:border-accent/70'
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[12px] font-bold ${
                  showRight ? 'bg-ok text-bg' : showWrong ? 'bg-bad text-bg' : 'bg-raised text-muted group-hover:text-fg'
                }`}
              >
                {showRight ? <Check size={14} /> : showWrong ? <X size={14} /> : KEYS[i]}
              </span>
              {o.graph ? (
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{o.text}</span>
                  <CommitGraph state={o.graph} dense fit interactive={false} ariaLabel={`Option ${KEYS[i]}`} />
                  {answered && (o.correct || isPicked) && <span className="mt-1 block text-[12.5px] text-fg/80">{o.text}</span>}
                </span>
              ) : (
                <span className="min-w-0 pt-0.5">{o.text}</span>
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={`animate-rise flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${wasRight ? 'border-ok/40 bg-ok/5' : 'border-bad/40 bg-bad/5'}`}
          role="status"
        >
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${wasRight ? 'text-ok' : 'text-bad'}`}>
              {picked === -1 ? (
                <span className="inline-flex items-center gap-1">
                  <Clock size={15} /> Time’s up
                </span>
              ) : wasRight ? (
                `Correct! +${points}${points && points > 100 ? ' (speed bonus)' : ''}`
              ) : (
                'Not quite'
              )}
            </p>
            <p className="mt-0.5 text-[14.5px] text-fg/85">{q.explanation}</p>
          </div>
          <button onClick={onNext} className="shrink-0 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg hover:brightness-110" autoFocus>
            {index + 1 === total ? 'See results' : 'Next question'}
          </button>
        </div>
      )}
    </div>
  );
}
