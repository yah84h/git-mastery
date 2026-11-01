import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';

type Choice = 'ours' | 'theirs' | 'both' | null;
type Stage = 'conflict' | 'edited' | 'staged' | 'committed';

const ours = ['  <h1 class="title">Welcome back</h1>', '  <nav class="red">'];
const theirs = ['  <h1 class="title">Welcome to Git Mastery</h1>', '  <nav class="blue">'];

/** Interactive conflict-marker editor: choose a resolution, stage it, commit it. */
export default function ConflictResolver() {
  const [choice, setChoice] = useState<Choice>(null);
  const [stage, setStage] = useState<Stage>('conflict');

  const resolved = choice === 'ours' ? ours : choice === 'theirs' ? theirs : choice === 'both' ? [theirs[0], ours[1]] : null;
  const reset = () => {
    setChoice(null);
    setStage('conflict');
  };

  const steps: { key: Stage; label: string }[] = [
    { key: 'conflict', label: 'Pick a version' },
    { key: 'edited', label: 'git add header.html' },
    { key: 'staged', label: 'git commit' },
  ];
  const order: Stage[] = ['conflict', 'edited', 'staged', 'committed'];
  const at = order.indexOf(stage);

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-display text-base font-bold">Resolve a conflict yourself</h3>
          <p className="text-[13px] text-muted">You are on main and ran git merge feature. Both changed header.html.</p>
        </div>
        <button onClick={reset} className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div className="grid min-w-0 gap-4 p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-term font-mono text-[12.5px]">
          <div className="border-b border-line/70 px-3 py-1.5 text-faint">header.html {stage === 'conflict' && !resolved ? <span className="text-bad">· conflicted</span> : ''}</div>
          <div className="scroll-thin overflow-x-auto py-2">
            <div className="whitespace-pre px-3 text-fg/60">{'<header>'}</div>
            {resolved ? (
              resolved.map((l) => (
                <div key={l} className="animate-rise whitespace-pre bg-ok/10 px-3 text-ok">
                  {l}
                </div>
              ))
            ) : (
              <>
                <div className="whitespace-pre px-3 font-bold text-bad">{'<<<<<<< HEAD'}</div>
                {ours.map((l) => (
                  <div key={l} className="whitespace-pre bg-accent/10 px-3 text-fg">
                    {l}
                  </div>
                ))}
                <div className="whitespace-pre px-3 font-bold text-bad">=======</div>
                {theirs.map((l) => (
                  <div key={l} className="whitespace-pre bg-info/10 px-3 text-fg">
                    {l}
                  </div>
                ))}
                <div className="whitespace-pre px-3 font-bold text-bad">{'>>>>>>> feature'}</div>
              </>
            )}
            <div className="whitespace-pre px-3 text-fg/60">{'</header>'}</div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <ol className="flex flex-col gap-1 text-[13.5px]">
            {steps.map((s, i) => (
              <li key={s.key} className={`flex items-center gap-2 ${i < at ? 'text-ok' : i === at ? 'font-semibold' : 'text-faint'}`}>
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${i < at ? 'bg-ok text-bg' : i === at ? 'bg-accent text-accent-fg' : 'border border-line'}`}>
                  {i < at ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                <span className={i > 0 ? 'font-mono text-[12.5px]' : ''}>{s.label}</span>
              </li>
            ))}
          </ol>

          {stage === 'conflict' && (
            <div className="flex flex-col gap-1.5">
              {(
                [
                  ['ours', 'Keep current (main)', 'border-accent/50 hover:bg-accent/10'],
                  ['theirs', 'Keep incoming (feature)', 'border-info/50 hover:bg-info/10'],
                  ['both', 'Combine: feature’s title + main’s nav', 'border-line hover:bg-raised'],
                ] as const
              ).map(([k, label, cls]) => (
                <button
                  key={k}
                  onClick={() => {
                    setChoice(k);
                    setStage('edited');
                  }}
                  className={`rounded-lg border px-3 py-2 text-left text-[13.5px] transition ${cls}`}
                >
                  {label}
                </button>
              ))}
              <p className="text-[12.5px] text-faint">Editors like VS Code show these same buttons above each conflict.</p>
            </div>
          )}
          {stage === 'edited' && (
            <button onClick={() => setStage('staged')} className="w-fit rounded-lg bg-accent px-4 py-2 font-mono text-[13px] font-semibold text-accent-fg">
              git add header.html
            </button>
          )}
          {stage === 'staged' && (
            <button onClick={() => setStage('committed')} className="w-fit rounded-lg bg-accent px-4 py-2 font-mono text-[13px] font-semibold text-accent-fg">
              git commit
            </button>
          )}
          {stage === 'committed' && (
            <p className="animate-rise rounded-lg bg-ok/10 px-3 py-2 text-[14px] text-ok">
              Merge commit created with two parents. The markers are gone and both branches’ history is preserved.
            </p>
          )}
          {stage !== 'conflict' && stage !== 'committed' && (
            <p className="text-[13px] text-muted">
              {stage === 'edited' ? 'The markers are gone, but Git still lists the file as unmerged until you stage it.' : 'All conflicts are fixed. Commit to finish the merge.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
