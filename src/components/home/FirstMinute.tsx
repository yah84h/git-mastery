import { useMemo, useState } from 'react';
import { ArrowRight, Check, PartyPopper, RotateCcw, Sparkles } from 'lucide-react';
import { initialSimState, inspect, run, toGraph, type Line, type SimState } from '../../lib/gitSim';
import CommitGraph from '../CommitGraph';
import { HighlightedCommand } from '../CodeBlock';
import TerminalPane from '../TerminalPane';
import { XP } from '../../lib/gamification';

interface Step {
  goal: string;
  cmd: string;
  learn: string;
  done: (s: SimState) => boolean;
}

const steps: Step[] = [
  {
    goal: 'Turn this folder into a repository',
    cmd: 'git init',
    learn: 'Git created a hidden .git folder. From now on it can record the history of this project.',
    done: (s) => s.initialized,
  },
  {
    goal: 'Create a file',
    cmd: 'touch index.html',
    learn: 'index.html exists, but Git calls it untracked: it sees the file but isn’t saving it yet.',
    done: (s) => !!s.files['index.html'],
  },
  {
    goal: 'Stage it for your first snapshot',
    cmd: 'git add index.html',
    learn: 'The file is in the staging area, the draft of your next commit.',
    done: (s) => inspect.status(s).staged.includes('index.html') || !!inspect.headId(s),
  },
  {
    goal: 'Save the snapshot',
    cmd: 'git commit -m "First commit"',
    learn: 'Your first commit is in the graph. main is a pointer to it, and HEAD tells you which branch you are on.',
    done: (s) => !!inspect.headId(s),
  },
  {
    goal: 'Start a branch for a new idea',
    cmd: 'git switch -c feature',
    learn: 'A branch is just a new pointer. You’re on feature now, so the next commit lands there and main stays safe.',
    done: (s) => s.head !== 'main' && !!s.branches[s.head],
  },
];

interface Props {
  done: boolean;
  onFinish: () => void;
  onContinue: () => void;
}

/** “Your first minute with Git”: a guided, live terminal in the hero. */
export default function FirstMinute({ done, onFinish, onContinue }: Props) {
  const [sim, setSim] = useState<SimState>(initialSimState);
  const [lines, setLines] = useState<Line[]>([]);
  const [learned, setLearned] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);

  const step = steps.findIndex((s) => !s.done(sim));
  const finished = step === -1;
  const current = finished ? null : steps[step];
  const graph = useMemo(() => toGraph(sim), [sim]);

  const exec = (cmd: string) => {
    const before = step;
    const res = run(sim, cmd);
    const next = res.state;
    setSim(next);
    setLines((l) => (res.clear ? [] : [...l, { text: `${next.dir} (${next.initialized ? next.head : '-'}) $ ${cmd}`, kind: 'cmd' }, ...res.lines]));
    const after = steps.findIndex((s) => !s.done(next));
    if (after !== before) {
      setLearned(steps[before].learn);
      setNudge(null);
      if (after === -1) onFinish();
    } else if (current && !res.lines.some((l) => l.kind === 'err')) {
      setNudge(`That ran, but the goal is still: ${current.goal.toLowerCase()}. Tap the suggested command if you’re stuck.`);
    } else setNudge(null);
  };

  const reset = () => {
    setSim(initialSimState());
    setLines([]);
    setLearned(null);
    setNudge(null);
  };

  return (
    <section className="relative min-w-0 overflow-hidden rounded-2xl border border-line bg-panel" aria-labelledby="first-minute-title">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg">
          <Sparkles size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="first-minute-title" className="font-display text-[16px] font-bold leading-tight">
            Your first minute with Git
          </h2>
          <p className="text-[12.5px] text-muted">Five commands. Real output. No install needed.</p>
        </div>
        {done && !finished && <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[11.5px] font-semibold text-ok">Done before</span>}
        <button onClick={reset} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg" aria-label="Start over">
          <RotateCcw size={14} />
        </button>
      </header>

      {/* step track */}
      <ol className="flex gap-1 px-4 pt-3" aria-label="Steps">
        {steps.map((s, i) => (
          <li
            key={s.cmd}
            aria-current={i === step ? 'step' : undefined}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${finished || i < step ? 'bg-ok' : i === step ? 'bg-accent' : 'bg-line'}`}
          >
            <span className="sr-only">
              Step {i + 1}: {s.goal}
            </span>
          </li>
        ))}
      </ol>

      <div className="px-4 pt-3">
        {current ? (
          <div key={step} className="animate-rise">
            <p className="text-[12.5px] font-semibold text-accent tnum">
              Step {step + 1} of {steps.length}
            </p>
            <p className="font-semibold">{current.goal}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => exec(current.cmd)}
                className="group inline-flex items-center gap-2 rounded-lg border border-accent/60 bg-accent/10 px-3 py-1.5 font-mono text-[13px] transition hover:bg-accent/20"
              >
                <HighlightedCommand text={current.cmd} />
                <span className="text-[11.5px] font-sans font-semibold text-accent group-hover:underline">Run</span>
              </button>
              <span className="text-[12.5px] text-faint">or type it below</span>
            </div>
          </div>
        ) : (
          <div className="animate-rise rounded-xl bg-ok/10 p-3">
            <p className="inline-flex items-center gap-2 font-semibold text-ok">
              <PartyPopper size={17} /> You just did what developers do every day.
            </p>
            <p className="mt-0.5 text-[13.5px] text-fg/85">
              Repository, file, stage, commit, branch. <span className="font-semibold text-ok">+{XP.firstMinute} XP</span>
            </p>
            <button onClick={onContinue} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[13.5px] font-semibold text-accent-fg hover:brightness-110">
              Learn why it works <ArrowRight size={15} />
            </button>
          </div>
        )}
        {learned && !finished && (
          <p key={learned} className="animate-rise mt-2 flex gap-1.5 text-[13px] text-fg/80">
            <Check size={15} className="mt-0.5 shrink-0 text-ok" /> {learned}
          </p>
        )}
        {nudge && <p className="mt-2 text-[12.5px] text-warn">{nudge}</p>}
      </div>

      <div className="mx-4 my-3 min-h-[96px] rounded-lg border border-line bg-bg/50 px-2 pt-1">
        {graph.commits.length ? (
          <CommitGraph state={graph} fit interactive={false} ariaLabel="Your repository" />
        ) : (
          <p className="grid h-[92px] place-items-center text-[12.5px] text-faint">{sim.initialized ? 'Empty repository. Your first commit will appear here.' : 'Your commit graph will grow here.'}</p>
        )}
      </div>

      <div className="border-t border-line">
        <TerminalPane lines={lines} prompt={`${sim.dir}${sim.initialized ? ` (${sim.head})` : ''} $`} onRun={exec} heightClass="h-[120px]" inputId="first-minute-input" placeholder={current?.cmd ?? 'git log --oneline'} />
      </div>
    </section>
  );
}
