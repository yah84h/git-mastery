import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { GraphScenario } from '../types';
import CommitGraph from './CommitGraph';
import { HighlightedCommand } from './CodeBlock';

/** Step-through, animated commit-history diagrams. */
export default function ScenarioPlayer({ scenarios, title = 'Commit history, step by step' }: { scenarios: GraphScenario[]; title?: string }) {
  const [si, setSi] = useState(0);
  const [fi, setFi] = useState(0);
  const [playing, setPlaying] = useState(false);
  const sc = scenarios[si];
  const frame = sc.frames[fi];
  const last = fi === sc.frames.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (last) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setFi((f) => f + 1), 2200);
    return () => window.clearTimeout(t);
  }, [playing, fi, last]);

  const pick = (i: number) => {
    setSi(i);
    setFi(0);
    setPlaying(false);
  };

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="font-display text-base font-bold">{title}</h3>
        {scenarios.length > 1 && (
          <div role="tablist" className="scroll-thin -mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
            {scenarios.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === si}
                onClick={() => pick(i)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-medium transition ${
                  i === si ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-raised hover:text-fg'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        <div className="mb-3 flex min-h-[2.25rem] flex-wrap items-center gap-2">
          <span className="eyebrow rounded bg-raised px-1.5 py-0.5 text-faint tnum">
            Step {fi + 1}/{sc.frames.length}
          </span>
          {frame.command ? (
            <code key={sc.id + fi} className="animate-rise rounded-md border border-line bg-term px-2 py-1 font-mono text-[13px]">
              <span className="text-faint">$ </span>
              <HighlightedCommand text={frame.command} />
            </code>
          ) : (
            <span className="text-[13px] text-faint">Starting point</span>
          )}
        </div>
        <CommitGraph state={frame.state} ariaLabel={`${sc.title}, step ${fi + 1}`} />
        <p key={'cap' + sc.id + fi} className="animate-rise mb-3 mt-1 max-w-[65ch] text-[14.5px] text-fg/90">
          {frame.caption}
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
        <button
          onClick={() => {
            setPlaying(false);
            setFi((f) => Math.max(0, f - 1));
          }}
          disabled={fi === 0}
          className="grid h-8 w-8 place-items-center rounded-md border border-line text-muted transition hover:text-fg disabled:opacity-40"
          aria-label="Previous step"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => {
            if (last) {
              setFi(0);
              setPlaying(true);
            } else setPlaying((p) => !p);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-raised px-3 text-[13px] font-semibold transition hover:bg-line"
        >
          {playing ? <Pause size={14} /> : last ? <RotateCcw size={14} /> : <Play size={14} />}
          {playing ? 'Pause' : last ? 'Replay' : 'Play'}
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            setFi((f) => Math.min(sc.frames.length - 1, f + 1));
          }}
          disabled={last}
          className="grid h-8 w-8 place-items-center rounded-md border border-line text-muted transition hover:text-fg disabled:opacity-40"
          aria-label="Next step"
        >
          <ChevronRight size={16} />
        </button>
        <div className="ml-auto flex gap-1.5" aria-hidden>
          {sc.frames.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === fi ? 'w-5 bg-accent' : i < fi ? 'w-1.5 bg-muted' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
