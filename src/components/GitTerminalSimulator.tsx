import { useEffect, useMemo, useState } from 'react';
import { Archive, FileCode2, GitBranch, Globe, RotateCcw, ShieldAlert } from 'lucide-react';
import { initialSimState, presets, run, runScript, summary, toGraph, type Line, type SimState } from '../lib/gitSim';
import CommitGraph from './CommitGraph';
import { HighlightedCommand } from './CodeBlock';
import TerminalPane from './TerminalPane';

export default function GitTerminalSimulator() {
  const [presetId, setPresetId] = useState('empty');
  const preset = presets.find((p) => p.id === presetId)!;
  const [sim, setSim] = useState<SimState>(() => initialSimState());
  const [lines, setLines] = useState<Line[]>([]);

  const load = (id: string) => {
    const p = presets.find((x) => x.id === id)!;
    setPresetId(id);
    setSim(p.script.length ? runScript(p.script) : initialSimState());
    setLines([
      { text: `Practice: ${p.label}. ${p.description}`, kind: 'info' },
      { text: 'Type help to list supported commands. Nothing here touches your real computer.', kind: 'hint' },
    ]);
  };
  useEffect(() => load('empty'), []);


  const exec = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    const res = run(sim, cmd);
    setSim(res.state);
    setLines((l) => (res.clear ? [] : [...l, { text: `${res.state.dir} (${res.state.initialized ? res.state.head : '-'}) $ ${cmd}`, kind: 'cmd' }, ...res.lines]));
  };

  const info = summary(sim);
  const graph = useMemo(() => toGraph(sim), [sim]);
  const promptLabel = `${sim.dir}${sim.initialized ? ` (${sim.head})` : ''} $`;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Terminal */}
      <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-term">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
          </div>
          <label htmlFor="sim-preset" className="sr-only">
            Practice scenario
          </label>
          <select
            id="sim-preset"
            value={presetId}
            onChange={(e) => load(e.target.value)}
            className="ml-1 min-w-0 rounded-md border border-line bg-panel px-2 py-1 text-[13px]"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button onClick={() => load(presetId)} className="ml-auto inline-flex items-center gap-1 text-[12px] text-muted hover:text-fg">
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        <TerminalPane lines={lines} prompt={promptLabel} onRun={exec} inputId="sim-input" />

        <div className="border-t border-line px-3 py-2.5">
          <div className="eyebrow mb-1.5 text-faint">Try next (tap to run)</div>
          <div className="flex flex-wrap gap-1.5">
            {preset.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => exec(s)}
                className="rounded border border-line bg-panel px-2 py-1 font-mono text-[12px] transition hover:border-accent/60"
              >
                <HighlightedCommand text={s} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Repository state */}
      <section className="flex min-w-0 flex-col gap-3">
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display font-bold">Repository graph</h3>
            <span className="text-[12px] text-faint">dashed = not on any local branch</span>
          </div>
          {graph.commits.length ? (
            <CommitGraph state={graph} dense ariaLabel="Simulated repository commit graph" />
          ) : (
            <p className="py-8 text-center text-[14px] text-faint">{info.initialized ? 'No commits yet. Stage a file and commit it.' : 'No repository yet. Run git init or pick “Team project”.'}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StateCard icon={GitBranch} title="Branch">
            <p className="font-mono text-[13px]">{info.initialized ? info.branch : '—'}</p>
            {info.upstream && <p className="text-[12px] text-faint">tracks {info.upstream}</p>}
            {info.merging && <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-bad"><ShieldAlert size={12} /> merge in progress</p>}
          </StateCard>
          <StateCard icon={Globe} title="Remote">
            <p className="break-all font-mono text-[12px] text-muted">{info.remote ?? 'none'}</p>
          </StateCard>
          <StateCard icon={FileCode2} title="Files">
            <FileList label="staged" files={info.staged} cls="text-ok" />
            <FileList label="modified" files={info.modified} cls="text-bad" />
            <FileList label="conflict" files={info.conflicts} cls="text-bad font-semibold" />
            <FileList label="untracked" files={info.untracked} cls="text-faint" />
            {!info.staged.length && !info.modified.length && !info.untracked.length && !info.conflicts.length && (
              <p className="text-[12.5px] text-faint">{info.initialized ? 'working tree clean' : 'empty folder'}</p>
            )}
          </StateCard>
          <StateCard icon={Archive} title="Stash">
            <p className="text-[13px]">{info.stash ? `${info.stash} entr${info.stash > 1 ? 'ies' : 'y'}` : 'empty'}</p>
          </StateCard>
        </div>
      </section>
    </div>
  );
}

function StateCard({ icon: Icon, title, children }: { icon: typeof GitBranch; title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-panel p-3">
      <div className="eyebrow mb-1 flex items-center gap-1.5 text-faint">
        <Icon size={13} /> {title}
      </div>
      {children}
    </div>
  );
}

function FileList({ label, files, cls }: { label: string; files: string[]; cls: string }) {
  if (!files.length) return null;
  return (
    <p className="text-[12.5px]">
      <span className="text-faint">{label}: </span>
      <span className={`font-mono ${cls}`}>{files.join(', ')}</span>
    </p>
  );
}
