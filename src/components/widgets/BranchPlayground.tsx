import { useMemo, useState } from 'react';
import { GitCommitHorizontal, GitMerge, RotateCcw, Shuffle } from 'lucide-react';
import { run, runScript, toGraph, type Line, type SimState } from '../../lib/gitSim';
import CommitGraph from '../CommitGraph';
import { HighlightedCommand } from '../CodeBlock';

const START = ['git init', 'touch app.js', 'git add .', 'git commit -m "Initial commit"', 'git branch feature'];

/** Build history by clicking. Every button runs real commands in the simulator. */
export default function BranchPlayground() {
  const [sim, setSim] = useState<SimState>(() => runScript(START));
  const [log, setLog] = useState<{ cmds: string[]; out: Line[] }>({
    cmds: ['git branch feature'],
    out: [{ text: 'feature and main both point at the first commit. Add commits to either branch, then integrate them.', kind: 'hint' }],
  });
  const [n, setN] = useState({ main: 0, feature: 0 });

  const exec = (cmds: string[]) => {
    let s = sim;
    let out: Line[] = [];
    for (const c of cmds) {
      const r = run(s, c);
      s = r.state;
      out = r.lines;
    }
    setSim(s);
    setLog({ cmds: cmds.filter((c) => !c.startsWith('edit') && !c.startsWith('touch') && c !== 'git add .'), out });
  };

  const commitOn = (b: 'main' | 'feature') => {
    const k = n[b] + 1;
    setN({ ...n, [b]: k });
    const file = `${b}.js`;
    const exists = !!sim.files[file];
    exec([...(sim.head !== b ? [`git switch ${b}`] : []), exists ? `edit ${file}` : `touch ${file}`, 'git add .', `git commit -m "${b === 'main' ? 'Fix' : 'Feature'} ${k}"`]);
  };

  const graph = useMemo(() => toGraph(sim), [sim]);
  const lastOut = log.out.filter((l) => l.kind !== 'hint' || log.cmds.length <= 1).slice(0, 3);

  const btn = 'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition';
  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-display text-base font-bold">Branch playground</h3>
          <p className="text-[13px] text-muted">Click to build history. Try committing on both branches, then compare merge and rebase.</p>
        </div>
        <button
          onClick={() => {
            setSim(runScript(START));
            setN({ main: 0, feature: 0 });
            setLog({ cmds: ['git branch feature'], out: [{ text: 'Back to one commit with two branches.', kind: 'hint' }] });
          }}
          className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg"
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <div className="p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button onClick={() => commitOn('main')} className={`${btn} border-accent/50 hover:bg-accent/10`}>
            <GitCommitHorizontal size={15} className="text-accent" /> Commit on main
          </button>
          <button onClick={() => commitOn('feature')} className={`${btn} border-b1/50 hover:bg-b1/10`}>
            <GitCommitHorizontal size={15} className="text-b1" /> Commit on feature
          </button>
          <button onClick={() => exec([...(sim.head !== 'main' ? ['git switch main'] : []), 'git merge feature'])} className={`${btn} border-line hover:bg-raised`}>
            <GitMerge size={15} /> Merge feature into main
          </button>
          <button onClick={() => exec([...(sim.head !== 'feature' ? ['git switch feature'] : []), 'git rebase main'])} className={`${btn} border-line hover:bg-raised`}>
            <Shuffle size={15} /> Rebase feature onto main
          </button>
        </div>
        <CommitGraph state={graph} ariaLabel="Branch playground graph" />
        <div className="mt-1 flex min-w-0 flex-col gap-1 rounded-lg bg-term px-3 py-2 font-mono text-[12.5px]">
          {log.cmds.map((c, i) => (
            <div key={i} className="whitespace-pre-wrap">
              <span className="text-faint">$ </span>
              <HighlightedCommand text={c} />
            </div>
          ))}
          {lastOut.map((l, i) => (
            <div key={'o' + i} className={l.kind === 'err' ? 'text-bad' : l.kind === 'hint' ? 'italic text-faint' : 'text-fg/75'}>
              {l.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
