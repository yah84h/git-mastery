import { useState } from 'react';
import { FileText } from 'lucide-react';
import { HighlightedCommand } from '../CodeBlock';

type State = 'untracked' | 'unmodified' | 'modified' | 'staged';

const states: { key: State; title: string; note: string }[] = [
  { key: 'untracked', title: 'Untracked', note: 'Git sees the file but does not track it' },
  { key: 'unmodified', title: 'Unmodified', note: 'Same as the last commit' },
  { key: 'modified', title: 'Modified', note: 'Changed since the last commit' },
  { key: 'staged', title: 'Staged', note: 'In the next commit' },
];

interface T {
  cmd: string;
  from: State;
  to: State | ((isNew: boolean) => State);
  why: string;
}
const transitions: T[] = [
  { cmd: 'git add login.js', from: 'untracked', to: 'staged', why: 'The new file is staged. Git will track it from the next commit on.' },
  { cmd: 'git commit -m "Add login"', from: 'staged', to: 'unmodified', why: 'The staged snapshot is saved. The file now matches the last commit.' },
  { cmd: 'edit login.js', from: 'unmodified', to: 'modified', why: 'Your edit makes the file differ from the last commit.' },
  { cmd: 'git add login.js', from: 'modified', to: 'staged', why: 'The current version of the file is copied into the staging area.' },
  { cmd: 'git restore login.js', from: 'modified', to: 'unmodified', why: 'The edit is thrown away and the file goes back to the committed version.' },
  {
    cmd: 'git restore --staged login.js',
    from: 'staged',
    to: (isNew) => (isNew ? 'untracked' : 'modified'),
    why: 'Unstaged. Your edits stay in the file but won’t be in the next commit.',
  },
  { cmd: 'git rm --cached login.js', from: 'unmodified', to: 'untracked', why: 'Git stops tracking the file but leaves it on disk. Useful for files that belong in .gitignore.' },
];

const statusFor = (s: State, isNew: boolean) =>
  ({
    untracked: 'Untracked files:\n\tlogin.js',
    unmodified: 'nothing to commit, working tree clean',
    modified: 'Changes not staged for commit:\n\tmodified:   login.js',
    staged: `Changes to be committed:\n\t${isNew ? 'new file' : 'modified'}:   login.js`,
  })[s];

/** Clickable state diagram of a file's lifecycle. */
export default function FileLifecycle() {
  const [state, setState] = useState<State>('untracked');
  const [isNew, setIsNew] = useState(true);
  const [last, setLast] = useState<{ cmd: string; why: string } | null>(null);

  const apply = (t: T) => {
    const to = typeof t.to === 'function' ? t.to(isNew) : t.to;
    if (t.from === 'staged' && to === 'unmodified') setIsNew(false);
    if (to === 'untracked') setIsNew(true);
    setState(to);
    setLast({ cmd: t.cmd, why: t.why });
  };
  const available = transitions.filter((t) => t.from === state);

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="border-b border-line px-4 py-3">
        <h3 className="font-display text-base font-bold">The life of a file</h3>
        <p className="text-[13px] text-muted">Every file is in one of four states. Run commands to move login.js between them.</p>
      </div>
      <div className="p-4">
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="File states">
          {states.map((s) => {
            const here = s.key === state;
            return (
              <li
                key={s.key}
                aria-current={here ? 'step' : undefined}
                className={`relative min-h-[96px] rounded-lg border p-3 transition-colors ${here ? 'border-accent bg-accent/10' : 'border-line bg-bg/50'}`}
              >
                <p className={`font-semibold ${here ? 'text-accent' : ''}`}>{s.title}</p>
                <p className="text-[12.5px] text-faint">{s.note}</p>
                {here && (
                  <span key={state} className="animate-pop mt-2 inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 font-mono text-[12px] text-accent-fg">
                    <FileText size={12} /> login.js
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {available.map((t) => (
            <button
              key={t.cmd}
              onClick={() => apply(t)}
              className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 font-mono text-[12.5px] transition hover:bg-accent/20"
            >
              <HighlightedCommand text={t.cmd} />
            </button>
          ))}
        </div>

        <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
          <pre className="scroll-thin min-w-0 overflow-x-auto rounded-lg bg-term px-3 py-2 font-mono text-[12.5px] text-fg/80">
            <span className="text-faint">$ git status{'\n'}</span>
            {statusFor(state, isNew)}
          </pre>
          <p key={last?.cmd ?? 'start'} className="animate-rise text-[14px] text-fg/85">
            {last ? (
              <>
                <span className="font-mono text-[13px] text-accent">{last.cmd}</span>
                <br />
                {last.why}
              </>
            ) : (
              'You just created login.js. It is untracked: Git sees it, but it is not part of any commit yet.'
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
