import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { GraphCommit, GraphFrame, GraphRef } from '../../types';
import CommitGraph from '../CommitGraph';
import { HighlightedCommand } from '../CodeBlock';

const c = (id: string, lane: number, col: number, parents: string[], msg: string, extra: Partial<GraphCommit> = {}): GraphCommit => ({ id, lane, col, parents, msg, ...extra });
const b = (name: string, target: string, kind: GraphRef['kind'] = 'branch'): GraphRef => ({ name, target, kind });
const L = ['main', 'feature/login'];
const A = c('A', 0, 0, [], 'Initial commit');
const B = c('B', 0, 1, ['A'], 'Project setup');
const C = c('C', 1, 2, ['B'], 'Add login form');
const D = c('D', 1, 3, ['C'], 'Validate login');
const E = c('E', 0, 3, ['B'], 'Fix footer');
const M = c('M', 0, 4, ['E', 'D'], "Merge branch 'feature/login'");

const frames: GraphFrame[] = [
  { command: 'git commit -m "Project setup"', caption: '', state: { commits: [A, B], refs: [b('main', 'B')], head: 'main', laneNames: L } },
  { command: 'git switch -c feature/login', caption: '', state: { commits: [A, B], refs: [b('main', 'B'), b('feature/login', 'B')], head: 'feature/login', laneNames: L } },
  { command: 'git commit -m "Add login form"', caption: '', state: { commits: [A, B, C], refs: [b('main', 'B'), b('feature/login', 'C')], head: 'feature/login', laneNames: L } },
  { command: 'git commit -m "Validate login"', caption: '', state: { commits: [A, B, C, D], refs: [b('main', 'B'), b('feature/login', 'D')], head: 'feature/login', laneNames: L } },
  { command: 'git switch main && git commit -m "Fix footer"', caption: '', state: { commits: [A, B, C, D, E], refs: [b('main', 'E'), b('feature/login', 'D')], head: 'main', laneNames: L } },
  { command: 'git merge feature/login', caption: '', state: { commits: [A, B, C, D, E, { ...M, highlight: true }], refs: [b('main', 'M'), b('feature/login', 'D')], head: 'main', laneNames: L } },
  { command: 'git tag -a v1.0 -m "First release"', caption: '', state: { commits: [A, B, C, D, E, M], refs: [b('main', 'M'), b('feature/login', 'D'), b('v1.0', 'M', 'tag')], head: 'main', laneNames: L } },
];

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** The hero: a repository being built, one command at a time. */
export default function HeroGraph() {
  const [i, setI] = useState(() => (prefersReducedMotion() ? frames.length - 1 : 0));
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % frames.length), i === frames.length - 1 ? 4200 : 1900);
    return () => window.clearTimeout(t);
  }, [i, playing]);

  const f = frames[i];
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <code key={i} className="animate-rise min-w-0 flex-1 truncate font-mono text-[13px]">
          <span className="text-faint">$ </span>
          <HighlightedCommand text={f.command!} />
        </code>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg"
          aria-label={playing ? 'Pause animation' : 'Play animation'}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
      <div className="px-4 pb-2 pt-3">
        <CommitGraph state={f.state} ariaLabel="A repository being built: branch, commits, merge and tag" />
      </div>
      <div className="flex gap-1 px-4 pb-3" role="tablist" aria-label="Animation steps">
        {frames.map((fr, k) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === i}
            aria-label={fr.command}
            onClick={() => {
              setI(k);
              setPlaying(false);
            }}
            className={`h-1.5 flex-1 rounded-full transition-colors ${k === i ? 'bg-accent' : k < i ? 'bg-muted/60' : 'bg-line'}`}
          />
        ))}
      </div>
    </div>
  );
}
