import { useState } from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { modules } from '../../data/modules';

const checks = [
  { id: 'basics', text: 'I can explain what a commit and a branch are', start: 'getting-started' },
  { id: 'daily', text: 'I use add, commit and status without thinking', start: 'branching' },
  { id: 'branch', text: 'I merge branches and can fix a merge conflict', start: 'remotes' },
  { id: 'remote', text: 'I push, pull and understand fetch vs pull', start: 'undoing' },
  { id: 'undo', text: 'I know when to use reset vs revert', start: 'advanced' },
];

/** Self-check that recommends where to begin. Nothing is locked; it only saves time. */
export default function StartingPoint({ go }: { go: (r: string) => void }) {
  const [yes, setYes] = useState<Record<string, boolean>>({});
  // recommendation = the module after the last consecutive "yes"
  let rec = 'fundamentals';
  for (const c of checks) {
    if (!yes[c.id]) break;
    rec = c.start;
  }
  const m = modules.find((x) => x.id === rec)!;
  const answered = Object.values(yes).some(Boolean);

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-panel" aria-labelledby="start-title">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Compass size={18} className="text-info" />
        <div>
          <h2 id="start-title" className="font-display text-[16px] font-bold leading-tight">
            Where should you start?
          </h2>
          <p className="text-[12.5px] text-muted">Tick what’s already true. We’ll skip what you know.</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {checks.map((c, i) => {
          const blocked = i > 0 && !yes[checks[i - 1].id];
          return (
            <label
              key={c.id}
              htmlFor={`sp-${c.id}`}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-[13.5px] transition ${
                yes[c.id] ? 'border-info/50 bg-info/10' : 'border-line hover:bg-raised/50'
              } ${blocked ? 'opacity-45' : ''}`}
            >
              <input
                id={`sp-${c.id}`}
                type="checkbox"
                checked={!!yes[c.id]}
                disabled={blocked}
                onChange={(e) => {
                  const next = { ...yes, [c.id]: e.target.checked };
                  // unticking a level unticks everything above it
                  if (!e.target.checked) checks.slice(i + 1).forEach((x) => (next[x.id] = false));
                  setYes(next);
                }}
                className="h-4 w-4 shrink-0 accent-[rgb(var(--info))]"
              />
              {c.text}
            </label>
          );
        })}
        <div key={rec} className="animate-rise mt-auto flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg/60 p-3">
          <p className="text-[13.5px]">
            {answered ? 'Start with ' : 'New to Git? Start with '}
            <span className="font-semibold">
              Module {m.number}: {m.title}
            </span>
          </p>
          <button onClick={() => go(`module-${m.id}`)} className="inline-flex items-center gap-1.5 rounded-lg bg-info px-3 py-1.5 text-[13px] font-semibold text-bg hover:brightness-110">
            Go <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
