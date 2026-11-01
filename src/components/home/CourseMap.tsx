import { useState } from 'react';
import { ArrowRight, Check, Clock, Layers, SquareTerminal, Wrench } from 'lucide-react';
import type { Progress } from '../../types';
import { modules } from '../../data/modules';
import { exercises } from '../../data/exercises';

const minutes = (m: (typeof modules)[number]) => Math.max(5, Math.round((m.concepts.length * 1.2 + m.commands.length * 1.5 + (m.steps?.length ?? 0) * 1.5) / 5) * 5);

/** The course drawn as a commit history: each module is a commit, HEAD shows where you are. */
export default function CourseMap({ progress, go }: { progress: Progress; go: (r: string) => void }) {
  const nextIdx = Math.max(0, modules.findIndex((m) => !progress.completed.includes(m.id)));
  const allDone = progress.completed.length === modules.length;
  const [sel, setSel] = useState(allDone ? modules.length - 1 : nextIdx);
  const m = modules[sel];
  const exs = exercises.filter((e) => e.moduleId === m.id);
  const exDone = exs.filter((e) => progress.exercises.includes(e.id)).length;
  const isDone = progress.completed.includes(m.id);
  const Icon = m.icon;

  return (
    <section aria-labelledby="map-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="map-title" className="font-display text-2xl font-extrabold tracking-tight">
            Your path
          </h2>
          <p className="text-[14.5px] text-muted">Each module is a commit on your learning branch. Pick one to preview it.</p>
        </div>
        <span className="font-mono text-[13px] text-faint tnum">
          {progress.completed.length}/{modules.length} committed
        </span>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
        {/* the branch */}
        <ol className="relative grid grid-cols-4 gap-y-6 sm:grid-cols-8" aria-label="Modules">
          <span aria-hidden className="absolute left-[6%] right-[6%] top-[27px] hidden h-[3px] rounded-full bg-line sm:block" />
          <span
            aria-hidden
            className="absolute left-[6%] top-[27px] hidden h-[3px] rounded-full bg-accent transition-all duration-700 sm:block"
            style={{ width: `${(Math.min(progress.completed.length, modules.length - 1) / (modules.length - 1)) * 88}%` }}
          />
          {modules.map((mod, i) => {
            const done = progress.completed.includes(mod.id);
            const here = !allDone && i === nextIdx;
            const active = i === sel;
            return (
              <li key={mod.id} className="relative flex flex-col items-center">
                <span className={`mb-1 h-[18px] rounded-full px-1.5 font-mono text-[10px] font-bold leading-[18px] ${here ? 'bg-accent text-accent-fg' : 'invisible'}`}>HEAD → you</span>
                <button
                  onClick={() => setSel(i)}
                  aria-pressed={active}
                  aria-label={`Module ${mod.number}: ${mod.title}${done ? ', completed' : here ? ', up next' : ''}`}
                  className={`relative z-[1] grid h-9 w-9 place-items-center rounded-full border-2 font-mono text-[13px] font-bold transition-all duration-200 hover:scale-110 ${
                    done ? 'border-ok bg-ok text-bg' : here ? 'border-accent bg-bg text-accent' : 'border-line bg-bg text-faint'
                  } ${active ? 'ring-4 ring-accent/30' : ''}`}
                >
                  {done ? <Check size={16} strokeWidth={3} /> : mod.number}
                  {here && <span className="absolute inset-0 animate-ping rounded-full border-2 border-accent/50 motion-reduce:hidden" />}
                </button>
                <span className={`mt-1.5 line-clamp-2 px-1 text-center text-[12px] leading-tight ${active ? 'font-semibold text-fg' : 'text-muted'}`}>{mod.title}</span>
              </li>
            );
          })}
        </ol>

        {/* preview */}
        <div key={m.id} className="animate-rise mt-5 grid gap-4 rounded-xl border border-line bg-bg/50 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon size={18} className="text-accent" />
              <h3 className="font-display text-lg font-bold">{m.title}</h3>
              {isDone && <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[11.5px] font-semibold text-ok">Completed</span>}
            </div>
            <p className="mt-1 max-w-[62ch] text-[14px] text-fg/80">{m.intro.replace(/`/g, '').split('. ')[0]}.</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
              <li className="inline-flex items-center gap-1">
                <Clock size={13} /> about {minutes(m)} min
              </li>
              <li className="inline-flex items-center gap-1">
                <Layers size={13} /> {m.concepts.length} concepts
              </li>
              {m.commands.length > 0 && (
                <li className="inline-flex items-center gap-1">
                  <SquareTerminal size={13} /> {m.commands.length} commands
                </li>
              )}
              {exs.length > 0 && (
                <li className="inline-flex items-center gap-1">
                  <Wrench size={13} /> {exDone}/{exs.length} exercises solved
                </li>
              )}
            </ul>
            {m.commands.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.commands.slice(0, 5).map((c) => (
                  <code key={c.id} className="rounded border border-line bg-term px-1.5 py-0.5 font-mono text-[11.5px] text-fg/80">
                    {c.name}
                  </code>
                ))}
                {m.commands.length > 5 && <span className="px-1 text-[11.5px] text-faint">+{m.commands.length - 5} more</span>}
              </div>
            )}
          </div>
          <button
            onClick={() => go(`module-${m.id}`)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition ${
              isDone ? 'border border-line hover:border-accent/60' : 'bg-accent text-accent-fg hover:brightness-110'
            }`}
          >
            {isDone ? 'Review module' : sel === nextIdx ? 'Start this module' : 'Open module'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
