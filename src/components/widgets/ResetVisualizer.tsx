import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { GraphState } from '../../types';
import CommitGraph from '../CommitGraph';

type Mode = 'soft' | 'mixed' | 'hard';

const before = { head: 'C', index: 'v3', wd: 'v4' };
const after: Record<Mode, typeof before> = {
  soft: { head: 'B', index: 'v3', wd: 'v4' },
  mixed: { head: 'B', index: 'v2', wd: 'v4' },
  hard: { head: 'B', index: 'v2', wd: 'v2' },
};
const status: Record<Mode, string> = {
  soft: 'Changes to be committed:\n\tmodified:   app.js   (v3, from the undone commit)\nChanges not staged for commit:\n\tmodified:   app.js   (v4, your edit)',
  mixed: 'Changes not staged for commit:\n\tmodified:   app.js   (v4)',
  hard: 'nothing to commit, working tree clean',
};
const explain: Record<Mode, string> = {
  soft: 'Only the branch pointer moves. Commit C’s changes are still staged, so git commit would recreate it. Use it to redo a commit message or combine commits.',
  mixed: 'The pointer moves and the staging area is reset to B. Every change (C’s and your edit) is still in your files, just unstaged. This is the default.',
  hard: 'Everything is reset to B. Commit C leaves the branch and your uncommitted edit v4 is destroyed. Only C can be recovered, from git reflog.',
};

const graph = (moved: boolean): GraphState => ({
  commits: [
    { id: 'A', lane: 0, col: 0, parents: [] },
    { id: 'B', lane: 0, col: 1, parents: ['A'] },
    { id: 'C', lane: 0, col: 2, parents: ['B'], ghost: moved },
  ],
  refs: [{ name: 'main', target: moved ? 'B' : 'C', kind: 'branch' }],
  head: 'main',
});

/** Compare what each reset mode does to HEAD, the index and the working directory. */
export default function ResetVisualizer() {
  const [mode, setMode] = useState<Mode | null>(null);
  const cur = mode ? after[mode] : before;
  const cells = [
    { key: 'head', title: 'HEAD → main', sub: 'branch pointer', value: `commit ${cur.head}` },
    { key: 'index', title: 'Staging area', sub: 'index', value: `app.js ${cur.index}` },
    { key: 'wd', title: 'Working directory', sub: 'your files', value: `app.js ${cur.wd}` },
  ] as const;

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="border-b border-line px-4 py-3">
        <h3 className="font-display text-base font-bold">git reset HEAD~1, three ways</h3>
        <p className="text-[13px] text-muted">Before: main is at C (app.js v3). You also edited app.js to v4 without staging it.</p>
      </div>
      <div className="p-4">
        <div role="radiogroup" aria-label="Reset mode" className="mb-4 flex flex-wrap gap-1.5">
          <button
            role="radio"
            aria-checked={mode === null}
            onClick={() => setMode(null)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${mode === null ? 'bg-raised text-fg ring-1 ring-line' : 'text-muted hover:text-fg'}`}
          >
            Before
          </button>
          {(['soft', 'mixed', 'hard'] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 font-mono text-[13px] font-semibold transition ${
                mode === m ? (m === 'hard' ? 'bg-bad text-bg' : 'bg-accent text-accent-fg') : 'border border-line text-muted hover:text-fg'
              }`}
            >
              --{m}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {cells.map((c) => {
            const changed = mode !== null && after[mode][c.key] !== before[c.key];
            const lost = mode === 'hard' && c.key === 'wd';
            return (
              <div key={c.key} className={`rounded-lg border p-3 transition-colors ${changed ? (lost ? 'border-bad bg-bad/10' : 'border-accent bg-accent/10') : 'border-line bg-bg/50'}`}>
                <p className="font-semibold">{c.title}</p>
                <p className="text-[12px] text-faint">{c.sub}</p>
                <p key={c.value + mode} className={`mt-2 font-mono text-[15px] font-bold ${changed ? 'animate-pop' : ''}`}>
                  {c.value}
                </p>
                <p className="text-[12px] text-faint">{changed ? `was ${before[c.key]}` : 'unchanged'}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
          <div className="min-w-0">
            <CommitGraph state={graph(mode !== null)} dense interactive={false} ariaLabel="Branch pointer before and after reset" />
            <p key={mode ?? 'b'} className="animate-rise text-[14px] text-fg/85">
              {mode ? explain[mode] : 'Pick a mode to see which of the three areas it resets.'}
            </p>
            {mode === 'hard' && (
              <p className="mt-2 inline-flex items-start gap-1.5 text-[13px] font-medium text-bad">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" /> v4 was never committed, so nothing can bring it back.
              </p>
            )}
          </div>
          <pre className="scroll-thin min-w-0 overflow-x-auto rounded-lg bg-term px-3 py-2 font-mono text-[12.5px] text-fg/80">
            <span className="text-faint">$ git status{'\n'}</span>
            {mode ? status[mode] : 'Changes not staged for commit:\n\tmodified:   app.js   (v4)'}
          </pre>
        </div>
      </div>
    </section>
  );
}
