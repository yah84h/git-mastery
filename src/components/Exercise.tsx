import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Eye, Lightbulb, PartyPopper, RotateCcw, Wrench } from 'lucide-react';
import type { Exercise as ExerciseData } from '../data/exercises';
import { initialSimState, run, runScript, toGraph, type Line, type SimState } from '../lib/gitSim';
import CommitGraph from './CommitGraph';
import CodeBlock from './CodeBlock';
import TerminalPane from './TerminalPane';

interface Props {
  ex: ExerciseData;
  done: boolean;
  onComplete: (id: string) => void;
}

const intro = (ex: ExerciseData): Line[] => [{ text: `Goal: ${ex.brief}`, kind: 'info' }, { text: 'Type help for supported commands.', kind: 'hint' }];

export default function Exercise({ ex, done, onComplete }: Props) {
  const fresh = () => (ex.script.length ? runScript(ex.script) : initialSimState());
  const [sim, setSim] = useState<SimState>(fresh);
  const [lines, setLines] = useState<Line[]>(() => intro(ex));
  const [history, setHistory] = useState<string[]>([]);
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const results = useMemo(() => ex.goals.map((g) => g.check(sim, history)), [sim, history, ex.goals]);
  // goals are sequential: a later goal only counts once earlier ones are met
  const met = results.map((_, i) => results.slice(0, i + 1).every(Boolean));
  const allMet = met.every(Boolean);

  useEffect(() => {
    if (allMet && history.length) {
      setCelebrate(true);
      if (!done) onComplete(ex.id);
    }
  }, [allMet, history.length, done, ex.id, onComplete]);

  const exec = (cmd: string) => {
    const res = run(sim, cmd);
    setSim(res.state);
    setHistory((h) => [...h, cmd]);
    setLines((l) => (res.clear ? [] : [...l, { text: `${res.state.dir} (${res.state.initialized ? res.state.head : '-'}) $ ${cmd}`, kind: 'cmd' }, ...res.lines]));
  };

  const reset = () => {
    setSim(fresh());
    setLines(intro(ex));
    setHistory([]);
    setHints(0);
    setShowSolution(false);
    setCelebrate(false);
  };

  const graph = useMemo(() => toGraph(sim), [sim]);
  const prompt = `${sim.dir}${sim.initialized ? ` (${sim.head})` : ''} $`;

  return (
    <section className={`overflow-hidden rounded-xl border bg-panel transition-colors ${celebrate ? 'border-ok/60' : 'border-line'}`} aria-labelledby={`${ex.id}-title`}>
      <header className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-info/15 text-info">
          <Wrench size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-info">Hands-on exercise</p>
          <h3 id={`${ex.id}-title`} className="font-display text-[17px] font-bold leading-tight">
            {ex.title}
          </h3>
          <p className="mt-0.5 max-w-[68ch] text-[14px] text-fg/80">{ex.brief}</p>
        </div>
        {(done || celebrate) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-[12px] font-semibold text-ok">
            <CheckCircle2 size={13} /> Solved
          </span>
        )}
      </header>

      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 border-b border-line lg:border-b-0 lg:border-r">
          <TerminalPane lines={lines} prompt={prompt} onRun={exec} heightClass="h-[280px]" inputId={`${ex.id}-input`} placeholder="type a command" />
        </div>

        <div className="flex min-w-0 flex-col gap-3 p-4">
          <ol className="flex flex-col gap-1.5" aria-label="Goals">
            {ex.goals.map((g, i) => (
              <li key={g.label} className={`flex items-start gap-2 text-[14px] transition-colors ${met[i] ? 'text-ok' : 'text-fg/85'}`}>
                {met[i] ? <CheckCircle2 key="y" size={17} className="animate-pop mt-0.5 shrink-0" /> : <Circle size={17} className="mt-0.5 shrink-0 text-faint" />}
                <span>{g.label}</span>
              </li>
            ))}
          </ol>

          {celebrate ? (
            <div className="animate-rise flex items-center gap-2 rounded-lg bg-ok/10 px-3 py-2 text-[14px] font-medium text-ok">
              <PartyPopper size={17} /> Every goal met. Nice work.
            </div>
          ) : null}

          <div className="min-w-0 rounded-lg border border-line bg-bg/50 px-2 pt-1">
            {graph.commits.length ? (
              <CommitGraph state={graph} dense fit interactive={false} ariaLabel="Exercise repository graph" />
            ) : (
              <p className="py-6 text-center text-[13px] text-faint">No commits yet</p>
            )}
          </div>

          {hints > 0 && (
            <ul className="flex flex-col gap-1 text-[13.5px]">
              {ex.hints.slice(0, hints).map((h) => (
                <li key={h} className="animate-rise flex gap-2 text-fg/85">
                  <Lightbulb size={15} className="mt-0.5 shrink-0 text-warn" /> {h}
                </li>
              ))}
            </ul>
          )}
          {showSolution && <CodeBlock code={ex.solution.join('\n')} title="One possible solution" />}

          <div className="mt-auto flex flex-wrap gap-2">
            {hints < ex.hints.length && (
              <button onClick={() => setHints(hints + 1)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[13px] text-muted hover:text-fg">
                <Lightbulb size={14} /> {hints ? 'Next hint' : 'Hint'}
              </button>
            )}
            {hints >= ex.hints.length && !showSolution && (
              <button onClick={() => setShowSolution(true)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[13px] text-muted hover:text-fg">
                <Eye size={14} /> Show solution
              </button>
            )}
            <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted hover:text-fg">
              <RotateCcw size={14} /> Start over
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
