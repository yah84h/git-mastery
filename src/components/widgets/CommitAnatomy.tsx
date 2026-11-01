import { useState } from 'react';
import { MousePointerClick } from 'lucide-react';

const fields = [
  {
    key: 'hash',
    label: 'commit 4f2a9c1e8b…',
    title: 'Commit hash',
    body: 'A SHA-1 fingerprint of everything below. Change one character of the message, the date or a parent and you get a completely different hash. That is why rewriting history (rebase, amend) creates new commits instead of editing old ones.',
  },
  {
    key: 'tree',
    label: 'tree 9bd31a0c…',
    title: 'Tree: the snapshot',
    body: 'Points to the full folder structure at this moment. Files that did not change are shared with earlier commits, so a snapshot is cheap to store.',
  },
  {
    key: 'parent',
    label: 'parent 91be0d27…',
    title: 'Parent: the link to history',
    body: 'The commit that came right before. Following parents back is what git log does. A first commit has no parent; a merge commit has two.',
  },
  {
    key: 'author',
    label: 'author Sara Ahmed <sara@example.com> 1793520000 +0300',
    title: 'Author',
    body: 'Who wrote the change and when. It comes from your user.name and user.email config, which is why you set them in Module 2.',
  },
  {
    key: 'committer',
    label: 'committer Sara Ahmed <sara@example.com> 1793520000 +0300',
    title: 'Committer',
    body: 'Who created this commit object. It differs from the author when someone else applies your work, for example with rebase or cherry-pick.',
  },
  {
    key: 'message',
    label: 'Add login form validation',
    title: 'Message',
    body: 'Your explanation of the change. A short imperative summary line, then optional detail after a blank line.',
  },
] as const;

/** Clickable `git cat-file -p` view of a real commit object. */
export default function CommitAnatomy() {
  const [active, setActive] = useState<(typeof fields)[number]['key']>('parent');
  const f = fields.find((x) => x.key === active)!;
  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="font-display text-base font-bold">What is inside a commit?</h3>
        <span className="inline-flex items-center gap-1 text-[12.5px] text-faint">
          <MousePointerClick size={14} /> Click a line
        </span>
      </div>
      <div className="grid min-w-0 gap-4 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-lg border border-line bg-term p-2 font-mono text-[12.5px]">
          <div className="px-2 pb-1 text-faint">$ git cat-file -p HEAD</div>
          {fields.map((x) => (
            <button
              key={x.key}
              onClick={() => setActive(x.key)}
              aria-pressed={active === x.key}
              className={`block w-full truncate rounded-md px-2 py-1 text-left transition ${
                x.key === 'message' ? 'mt-3' : ''
              } ${active === x.key ? 'bg-accent/15 text-fg ring-1 ring-accent/60' : 'text-fg/75 hover:bg-raised'}`}
            >
              {x.key === 'hash' ? <span className="text-warn">{x.label}</span> : x.label}
            </button>
          ))}
        </div>
        <div key={f.key} className="animate-rise min-w-0">
          <h4 className="font-semibold">{f.title}</h4>
          <p className="mt-1 text-[14.5px] text-fg/85">{f.body}</p>
          {f.key === 'parent' && (
            <div className="mt-3 flex items-center gap-1 font-mono text-[12px]" aria-hidden>
              {['3c7a1f0', '91be0d2', '4f2a9c1'].map((h, i) => (
                <span key={h} className="flex items-center gap-1">
                  {i > 0 && <span className="text-faint">←</span>}
                  <span className={`rounded border px-1.5 py-0.5 ${i === 2 ? 'border-accent text-accent' : 'border-line text-muted'}`}>{h}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
