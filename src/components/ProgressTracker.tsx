import { useState } from 'react';
import { Flag, Trophy } from 'lucide-react';
import type { Progress } from '../types';
import { modules } from '../data/modules';
import { exercises } from '../data/exercises';

export function useProgressStats(p: Progress) {
  const done = modules.filter((m) => p.completed.includes(m.id)).length;
  return { done, total: modules.length, pct: Math.round((done / modules.length) * 100) };
}

export function ProgressRing({ pct, size = 34 }: { pct: number; size?: number }) {
  const r = size / 2 - 3.5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="3.5" style={{ stroke: 'rgb(var(--line))' }} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        style={{ stroke: pct === 100 ? 'rgb(var(--ok))' : 'rgb(var(--accent))', transition: 'stroke-dashoffset .6s ease' }}
      />
    </svg>
  );
}

export default function ProgressTracker({ progress, compact = false, onReset }: { progress: Progress; compact?: boolean; onReset?: () => void }) {
  const { done, total, pct } = useProgressStats(progress);
  const [confirming, setConfirming] = useState(false);
  if (compact) {
    return (
      <div className="flex items-center gap-2" title={`${done} of ${total} modules completed`}>
        <div className="relative">
          <ProgressRing pct={pct} />
          <span className="absolute inset-0 grid place-items-center font-mono text-[9.5px] font-bold tnum">{pct}</span>
        </div>
        <span className="hidden text-[12.5px] text-muted md:inline tnum">
          {done}/{total} modules
        </span>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-bg/50 p-3">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-faint">Your progress</span>
        <span className="font-mono text-[13px] font-bold tnum">{pct}%</span>
      </div>
      <div className="mt-2 flex gap-0.5" aria-label={`${done} of ${total} modules completed`}>
        {modules.map((m) => (
          <span
            key={m.id}
            title={m.title}
            className={`h-1.5 flex-1 rounded-full transition-colors ${progress.completed.includes(m.id) ? 'bg-ok' : progress.visited.includes(m.id) ? 'bg-accent/40' : 'bg-line'}`}
          />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
        <div>
          <dt className="text-faint">Exercises</dt>
          <dd className="font-mono font-semibold tnum">
            {progress.exercises.length}/{exercises.length}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-faint">
            <Trophy size={12} /> Quiz
          </dt>
          <dd className="font-mono font-semibold tnum">{progress.bestScore || '—'}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-faint">
            <Flag size={12} /> Mission
          </dt>
          <dd className="font-semibold">{progress.missionDone ? (progress.missionBest === 0 ? 'Flawless' : 'Done') : '—'}</dd>
        </div>
      </dl>
      {onReset && (done > 0 || progress.bestScore > 0 || progress.exercises.length > 0) && (
        <button
          onClick={() => {
            if (confirming) {
              onReset();
              setConfirming(false);
            } else {
              setConfirming(true);
              window.setTimeout(() => setConfirming(false), 3500);
            }
          }}
          className={`mt-2 text-[11.5px] underline-offset-2 hover:underline ${confirming ? 'font-semibold text-bad' : 'text-faint hover:text-bad'}`}
        >
          {confirming ? 'Click again to erase progress' : 'Reset progress'}
        </button>
      )}
    </div>
  );
}
