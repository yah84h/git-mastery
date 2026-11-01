import { useState } from 'react';
import { ArrowRight, FileCode2, GitCommitHorizontal, HardDrive, Layers, Cloud, RotateCcw, Users } from 'lucide-react';

interface Commit {
  id: string;
  msg: string;
  files: number;
  by: 'you' | 'teammate';
}

const FILES = ['index.html', 'app.js', 'style.css', 'README.md'];
const hash = () => Math.random().toString(16).slice(2, 9);

const zones = [
  { key: 'wd', title: 'Working Directory', sub: 'files you edit', icon: FileCode2 },
  { key: 'stage', title: 'Staging Area', sub: 'next commit draft', icon: Layers },
  { key: 'local', title: 'Local Repository', sub: '.git on your machine', icon: HardDrive },
  { key: 'remote', title: 'Remote Repository', sub: 'GitHub (origin)', icon: Cloud },
] as const;

/** Interactive Working Directory → Staging → Local → Remote model. */
export default function WorkflowDiagram() {
  const [wd, setWd] = useState<string[]>(['index.html']);
  const [stage, setStage] = useState<string[]>([]);
  const [local, setLocal] = useState<Commit[]>([{ id: 'a1f3c09', msg: 'Initial commit', files: 1, by: 'you' }]);
  const [remote, setRemote] = useState<Commit[]>([{ id: 'a1f3c09', msg: 'Initial commit', files: 1, by: 'you' }]);
  const [log, setLog] = useState<{ cmd: string; text: string }>({
    cmd: 'edit index.html',
    text: 'You changed index.html. Git sees the change but has not saved it anywhere yet.',
  });

  const notPushed = local.filter((c) => !remote.some((r) => r.id === c.id));
  const notPulled = remote.filter((c) => !local.some((r) => r.id === c.id));

  const actions = [
    {
      cmd: 'edit a file',
      enabled: wd.length + stage.length < FILES.length,
      run: () => {
        const f = FILES.find((x) => !wd.includes(x) && !stage.includes(x))!;
        setWd([...wd, f]);
        setLog({ cmd: `edit ${f}`, text: `${f} is now modified in the working directory. Nothing is recorded yet.` });
      },
    },
    {
      cmd: 'git add .',
      enabled: wd.length > 0,
      run: () => {
        setStage([...stage, ...wd]);
        setWd([]);
        setLog({ cmd: 'git add .', text: 'The changes are copied into the staging area. They will go into the next commit.' });
      },
    },
    {
      cmd: 'git restore --staged .',
      enabled: stage.length > 0,
      run: () => {
        setWd([...wd, ...stage]);
        setStage([]);
        setLog({ cmd: 'git restore --staged .', text: 'Unstaged. The edits are still in your files, just not in the next commit.' });
      },
    },
    {
      cmd: 'git commit -m "…"',
      enabled: stage.length > 0,
      run: () => {
        const c: Commit = { id: hash(), msg: `Update ${stage.join(', ')}`, files: stage.length, by: 'you' };
        setLocal([...local, c]);
        setStage([]);
        setLog({ cmd: `git commit -m "${c.msg}"`, text: `Snapshot ${c.id} saved in your local repository. GitHub doesn’t have it yet.` });
      },
    },
    {
      cmd: 'git push',
      enabled: notPushed.length > 0 && notPulled.length === 0,
      run: () => {
        setRemote([...remote, ...notPushed]);
        setLog({ cmd: 'git push', text: `${notPushed.length} commit${notPushed.length > 1 ? 's' : ''} uploaded. The remote now matches your local branch.` });
      },
    },
    {
      cmd: 'teammate pushes',
      icon: Users,
      enabled: notPulled.length === 0,
      run: () => {
        const c: Commit = { id: hash(), msg: 'Teammate: add API', files: 2, by: 'teammate' };
        setRemote([...remote, c]);
        setLog({
          cmd: 'teammate pushes',
          text: notPushed.length
            ? 'A teammate pushed while you have unpushed commits. git push would now be rejected: pull first.'
            : 'A teammate pushed a commit to GitHub. Your local repository doesn’t know about it until you fetch or pull.',
        });
      },
    },
    {
      cmd: 'git pull',
      enabled: notPulled.length > 0,
      run: () => {
        setLocal([...local, ...notPulled]);
        setLog({
          cmd: 'git pull',
          text: 'git fetch downloaded the commit, then git merge added it to your branch and updated your files.' + (notPushed.length ? ' Your commits are still waiting to be pushed.' : ''),
        });
      },
    },
  ];

  const reset = () => {
    setWd(['index.html']);
    setStage([]);
    const init = [{ id: 'a1f3c09', msg: 'Initial commit', files: 1, by: 'you' as const }];
    setLocal(init);
    setRemote(init);
    setLog({ cmd: 'edit index.html', text: 'Reset. index.html is modified in the working directory.' });
  };

  const content = (key: (typeof zones)[number]['key']) => {
    if (key === 'wd' || key === 'stage') {
      const list = key === 'wd' ? wd : stage;
      return list.length ? (
        list.map((f) => (
          <span
            key={key + f}
            className={`animate-pop inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[12px] ${
              key === 'wd' ? 'border-bad/40 bg-bad/10 text-bad' : 'border-ok/40 bg-ok/10 text-ok'
            }`}
          >
            {key === 'wd' ? 'M' : '+'} {f}
          </span>
        ))
      ) : (
        <span className="text-[12px] text-faint">{key === 'wd' ? 'clean' : 'empty'}</span>
      );
    }
    const list = key === 'local' ? local : remote;
    return [...list].reverse().map((c) => {
      const pending = key === 'local' ? notPushed.includes(c) : notPulled.includes(c);
      return (
        <span
          key={key + c.id}
          title={c.msg}
          className={`animate-pop flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[12px] ${
            pending ? 'border-warn/50 bg-warn/10 text-warn' : 'border-line bg-raised text-muted'
          }`}
        >
          <GitCommitHorizontal size={13} className="shrink-0" />
          <span>{c.id.slice(0, 7)}</span>
          {c.by === 'teammate' && <Users size={11} className="shrink-0" />}
        </span>
      );
    });
  };

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="font-display text-base font-bold">The four places your code lives</h3>
        <button onClick={reset} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-fg">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4 md:gap-0">
        {zones.map((z, i) => {
          const Icon = z.icon;
          const label = ['git add', 'git commit', 'git push'][i];
          return (
            <div key={z.key} className="relative flex min-w-0 md:pr-6">
              <div className="flex min-h-[9.5rem] w-full min-w-0 flex-col rounded-lg border border-line bg-bg/60 p-3">
                <div className="flex items-center gap-1.5">
                  <Icon size={15} className={i === 3 ? 'text-info' : 'text-accent'} />
                  <span className="text-[13px] font-semibold leading-tight">{z.title}</span>
                </div>
                <span className="mb-2 text-[11.5px] text-faint">{z.sub}</span>
                <div className="flex flex-wrap content-start gap-1">{content(z.key)}</div>
              </div>
              {i < 3 && (
                <div className="absolute right-0 top-1/2 hidden w-6 -translate-y-1/2 flex-col items-center md:flex" aria-hidden>
                  <ArrowRight size={16} className="text-muted" />
                  <span className="mt-0.5 rotate-90 whitespace-nowrap font-mono text-[9px] text-faint" style={{ transformOrigin: 'center' }}>
                    {label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-line px-4 py-3">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {actions.map((a) => (
            <button
              key={a.cmd}
              disabled={!a.enabled}
              onClick={a.run}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[12.5px] transition disabled:cursor-not-allowed disabled:opacity-35 ${
                a.cmd.startsWith('git')
                  ? 'border-accent/40 bg-accent/10 text-fg hover:bg-accent/20'
                  : 'border-line bg-raised text-muted hover:text-fg'
              }`}
            >
              {a.cmd}
            </button>
          ))}
        </div>
        <div key={log.cmd + log.text} className="animate-rise flex min-w-0 flex-col gap-1 rounded-lg bg-term px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3">
          <code className="shrink-0 font-mono text-[12.5px] text-accent">$ {log.cmd}</code>
          <span className="text-[13.5px] text-fg/85">{log.text}</span>
        </div>
        <p className="mt-2 text-[12px] text-faint">
          <span className="text-warn">Amber</span> commits exist on only one side: not pushed yet, or not pulled yet.
        </p>
      </div>
    </section>
  );
}
