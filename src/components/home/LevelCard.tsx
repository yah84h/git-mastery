import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { Progress } from '../../types';
import { achievements, computeXp, levelFor, levels, XP, type HomeState } from '../../lib/gamification';

/** XP, level progress and the next thing that earns XP. */
export function LevelCard({ progress, home }: { progress: Progress; home: HomeState }) {
  const xp = computeXp(progress, home);
  const lvl = levelFor(xp);
  const earned = achievements.filter((a) => a.progress(progress, home) >= 1).length;
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-faint">
            Level {lvl.index + 1} of {levels.length}
          </p>
          <p className="font-display text-xl font-extrabold leading-tight">{lvl.name}</p>
        </div>
        <p className="text-right font-mono text-[22px] font-bold leading-none tnum">
          {xp}
          <span className="ml-1 text-[12px] font-semibold text-faint">XP</span>
        </p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={lvl.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${lvl.pct}%` }} />
      </div>
      <p className="mt-2 text-[12.5px] text-muted">
        {lvl.next ? (
          <>
            <span className="font-semibold text-fg tnum">{lvl.toNext} XP</span> to {lvl.next}. A module is worth {XP.module}, an exercise {XP.exercise}.
          </>
        ) : (
          'Top level reached. Keep your streak going.'
        )}
      </p>
      <p className="mt-1 text-[12.5px] text-faint tnum">
        {earned}/{achievements.length} badges earned
      </p>
    </div>
  );
}

/** Badge wall: earned badges in color, locked ones with progress and how to earn them. */
export function Achievements({ progress, home }: { progress: Progress; home: HomeState }) {
  const [open, setOpen] = useState<string | null>(null);
  const list = achievements.map((a) => ({ ...a, p: a.progress(progress, home) }));
  const sel = list.find((a) => a.id === open);
  return (
    <section aria-labelledby="badges-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="badges-title" className="font-display text-2xl font-extrabold tracking-tight">
            Badges
          </h2>
          <p className="text-[14.5px] text-muted">Earned by doing, not reading. Tap one to see how to unlock it.</p>
        </div>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {list.map((a) => {
          const got = a.p >= 1;
          const Icon = a.icon;
          return (
            <li key={a.id}>
              <button
                onClick={() => setOpen(open === a.id ? null : a.id)}
                aria-pressed={open === a.id}
                className={`flex h-full w-full flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition hover:-translate-y-0.5 ${
                  got ? 'border-accent/40 bg-accent/10' : 'border-line bg-panel'
                } ${open === a.id ? 'ring-2 ring-accent/50' : ''}`}
              >
                <span className={`relative grid h-11 w-11 place-items-center rounded-full ${got ? 'bg-accent text-accent-fg' : 'bg-raised text-faint'}`}>
                  <Icon size={20} />
                  {!got && <Lock size={11} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-panel p-px text-faint" />}
                </span>
                <span className={`text-[12px] font-semibold leading-tight ${got ? '' : 'text-muted'}`}>{a.title}</span>
                {!got && a.p > 0 && (
                  <span className="h-1 w-full overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="block h-full bg-accent/70" style={{ width: `${a.p * 100}%` }} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {sel && (
        <p key={sel.id} className="animate-rise mt-3 rounded-lg border border-line bg-panel px-3 py-2 text-[13.5px]" role="status">
          <span className="font-semibold">{sel.title}: </span>
          {sel.p >= 1 ? 'Earned. ' : ''}
          <span className="text-fg/80">{sel.how}.</span>
          {sel.p > 0 && sel.p < 1 && <span className="ml-1 text-faint tnum">({Math.round(sel.p * 100)}% there)</span>}
        </p>
      )}
    </section>
  );
}
