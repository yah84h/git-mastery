import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Circle, Lightbulb, SquareTerminal, Trophy } from 'lucide-react';
import type { Module } from '../types';
import { allCommands, modules } from '../data/modules';
import { advancedScenarios, branchingScenarios, githubScenarios, remoteScenarios, undoScenarios } from '../data/scenarios';
import CommandCard from './CommandCard';
import CodeBlock from './CodeBlock';
import ScenarioPlayer from './ScenarioPlayer';
import WorkflowDiagram from './WorkflowDiagram';
import Exercise from './Exercise';
import { exercises } from '../data/exercises';
import CommitAnatomy from './widgets/CommitAnatomy';
import FileLifecycle from './widgets/FileLifecycle';
import BranchPlayground from './widgets/BranchPlayground';
import ConflictResolver from './widgets/ConflictResolver';
import ResetVisualizer from './widgets/ResetVisualizer';
import BisectGame from './widgets/BisectGame';

const widgets: Record<string, (() => JSX.Element)[]> = {
  fundamentals: [CommitAnatomy],
  'daily-workflow': [FileLifecycle],
  branching: [BranchPlayground, ConflictResolver],
  undoing: [ResetVisualizer],
  advanced: [BisectGame],
};

/** Renders `inline code` inside plain strings. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') ? (
          <code key={i}>{p.slice(1, -1)}</code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const norm = (s: string) => s.replace(/<[^>]+>|"[^"]*"/g, '').replace(/\s+/g, ' ').trim();
function findCommand(name: string) {
  const n = norm(name);
  return allCommands.find((c) => norm(c.name) === n) ?? allCommands.find((c) => norm(c.name).startsWith(n + ' '));
}

interface Props {
  module: Module;
  completed: boolean;
  onToggleComplete: () => void;
  go: (route: string) => void;
  allDone: boolean;
  exercisesDone: string[];
  onExercise: (id: string) => void;
}

export default function LearningModule({ module: m, completed, onToggleComplete, go, allDone, exercisesDone, onExercise }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  useEffect(() => setOpen(new Set()), [m.id]);

  const idx = modules.findIndex((x) => x.id === m.id);
  const prev = modules[idx - 1];
  const next = modules[idx + 1];

  const scenarios = useMemo(
    () =>
      ({
        branching: branchingScenarios,
        remotes: remoteScenarios,
        undoing: undoScenarios,
        advanced: advancedScenarios,
        github: githubScenarios,
      })[m.id],
    [m.id],
  );

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const jumpTo = useCallback(
    (name: string) => {
      const c = findCommand(name);
      if (!c) return;
      const reveal = () => {
        setOpen((s) => new Set(s).add(c.id));
        window.setTimeout(() => document.getElementById(`cmd-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      };
      if (c.moduleId !== m.id) {
        go(`module-${c.moduleId}`);
        window.setTimeout(reveal, 250);
      } else reveal();
    },
    [m.id, go],
  );

  const Icon = m.icon;
  const allOpen = m.commands.length > 0 && m.commands.every((c) => open.has(c.id));

  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-8 pb-10">
      {/* Header */}
      <header className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-2 text-faint">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
            <Icon size={17} />
          </span>
          <span className="eyebrow">
            Module {m.number} of {modules.length}
          </span>
          {completed && (
            <span className="eyebrow inline-flex items-center gap-1 text-ok">
              <CheckCircle2 size={13} /> Completed
            </span>
          )}
        </div>
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.75rem)] font-extrabold leading-[1.05] tracking-tight">{m.title}</h1>
        <p className="text-[17px] text-muted">{m.tagline}</p>
        <p className="prose-git max-w-[68ch] text-[15.5px] text-fg/90">
          <Rich text={m.intro} />
        </p>
      </header>

      {m.diagram === 'workflow' && <WorkflowDiagram />}
      {scenarios && <ScenarioPlayer scenarios={scenarios} />}

      {/* Concepts */}
      {m.concepts.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">Key concepts</h2>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {m.concepts.map((c) => (
              <div key={c.term} className="min-w-0 border-l-2 border-line pl-3">
                <dt className="font-semibold">{c.term}</dt>
                <dd className="prose-git mt-0.5 text-[14.5px] text-fg/80">
                  <Rich text={c.body} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Explore: clickable widgets */}
      {widgets[m.id]?.map((W, i) => <W key={i} />)}

      {/* Callouts */}
      {m.callouts?.map((c) => (
        <aside
          key={c.title}
          className={`flex gap-3 rounded-xl border p-4 ${c.kind === 'warning' ? 'border-bad/35 bg-bad/5' : 'border-info/30 bg-info/5'}`}
        >
          {c.kind === 'warning' ? <AlertTriangle className="mt-0.5 shrink-0 text-bad" size={19} /> : <Lightbulb className="mt-0.5 shrink-0 text-info" size={19} />}
          <div>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="prose-git mt-0.5 max-w-[68ch] text-[14.5px] text-fg/85">
              <Rich text={c.body} />
            </p>
          </div>
        </aside>
      ))}

      {/* Workflow steps (GitHub module) */}
      {m.steps && (
        <section>
          <h2 className="mb-1 font-display text-xl font-bold">The full workflow</h2>
          <p className="mb-4 text-[14.5px] text-muted">
            Example branch: <code className="font-mono text-fg">feature/student-dashboard</code>
          </p>
          <ol className="relative flex flex-col gap-5 border-l-2 border-line pl-6">
            {m.steps.map((s, i) => (
              <li key={s.title} className="relative min-w-0">
                <span className="absolute -left-[37px] top-0 grid h-6 w-6 place-items-center rounded-full border-2 border-accent bg-bg font-mono text-[11px] font-bold text-accent tnum">
                  {i + 1}
                </span>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mb-2 max-w-[65ch] text-[14.5px] text-fg/80">{s.body}</p>
                <CodeBlock code={s.code} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Comparisons */}
      {m.comparisons?.map((t) => (
        <section key={t.title} className="min-w-0">
          <h2 className="mb-3 font-display text-xl font-bold">{t.title}</h2>
          <div className="scroll-thin overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[540px] border-collapse text-left text-[14px]">
              <thead className="bg-raised">
                <tr>
                  {t.columns.map((c, i) => (
                    <th key={i} className={`px-3 py-2 font-semibold ${i === 0 ? '' : 'font-mono text-[13px]'}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-line align-top">
                    {r.map((cell, ci) => (
                      <td key={ci} className={`px-3 py-2 ${ci === 0 ? 'font-medium' : 'text-fg/80'} ${/^git /.test(cell) ? 'font-mono text-[13px] text-accent' : ''}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Commands */}
      {m.commands.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold">Commands</h2>
              <p className="text-[14px] text-muted">{m.commands.length} commands. Open a card for an example, the result, and the classic mistake.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => go('terminal')}
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[13px] text-muted hover:text-fg"
              >
                <SquareTerminal size={14} /> Practice in terminal
              </button>
              <button
                onClick={() => setOpen(allOpen ? new Set() : new Set(m.commands.map((c) => c.id)))}
                className="rounded-md border border-line px-2.5 py-1.5 text-[13px] text-muted hover:text-fg"
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          </div>
          {m.commands.map((c) => (
            <CommandCard key={c.id} cmd={c} open={open.has(c.id)} onToggle={() => toggle(c.id)} onRelated={jumpTo} isKnown={(n) => !!findCommand(n)} />
          ))}
        </section>
      )}

      {/* Hands-on exercises */}
      {exercises.some((e) => e.moduleId === m.id) && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Try it yourself</h2>
            <p className="text-[14px] text-muted">Type real commands into a sandboxed repository. Goals tick off as you reach them.</p>
          </div>
          {exercises
            .filter((e) => e.moduleId === m.id)
            .map((e) => (
              <Exercise key={e.id} ex={e} done={exercisesDone.includes(e.id)} onComplete={onExercise} />
            ))}
        </section>
      )}

      {/* Completion */}
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onToggleComplete}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition ${
            completed ? 'bg-ok/15 text-ok hover:bg-ok/25' : 'bg-accent text-accent-fg hover:brightness-110'
          }`}
        >
          {completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          {completed ? 'Module completed' : 'Mark module as complete'}
        </button>
        <div className="flex gap-2">
          {prev && (
            <button onClick={() => go(`module-${prev.id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[14px] text-muted hover:text-fg">
              <ArrowLeft size={15} /> {prev.title}
            </button>
          )}
          {next && (
            <button onClick={() => go(`module-${next.id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[14px] font-medium hover:border-accent/60">
              {next.title} <ArrowRight size={15} />
            </button>
          )}
        </div>
      </section>

      {!next && (
        <section className={`relative overflow-hidden rounded-2xl border p-6 ${allDone ? 'border-accent/50 bg-accent/10' : 'border-line bg-panel'}`}>
          <Trophy className="mb-2 text-accent" size={26} />
          <h2 className="font-display text-2xl font-extrabold">{allDone ? 'All 8 modules done. Prove it.' : 'Ready for the challenge?'}</h2>
          <p className="mt-1 max-w-[60ch] text-fg/80">
            15 questions, 20 seconds each. Answer in under 5 seconds for a 50-point bonus.
            {!allDone && ' Mark every module complete to unlock your full progress badge, or jump in now.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => go('challenge')} className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-fg hover:brightness-110">
              Start Git Challenge
            </button>
            <button onClick={() => go('mission')} className="rounded-lg border border-line px-5 py-2.5 font-semibold hover:border-accent/60">
              Git Mission: Save the Repository
            </button>
          </div>
        </section>
      )}
    </article>
  );
}
