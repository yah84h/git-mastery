import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, LifeBuoy, RotateCcw, ShieldCheck, Siren, XCircle } from 'lucide-react';
import { missionIntro, missionStart, missionSteps, type RepoStatus } from '../data/mission';
import { shuffle } from '../data/quiz';
import CommitGraph from './CommitGraph';
import { HighlightedCommand } from './CodeBlock';

/** step index after which each intro problem counts as solved */
const SOLVED_AT = [0, 1, 5, 4, 6];

interface Props {
  best: number | null;
  onComplete: (mistakes: number) => void;
}

export default function MissionChallenge({ best, onComplete }: Props) {
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(false);
  const [seed, setSeed] = useState(0);

  const orders = useMemo(() => missionSteps.map((s) => shuffle(s.options)), [seed]);
  const current = missionSteps[step];
  const shown = solved ? current.after : step === 0 ? { graph: missionStart.graph, status: missionStart.status, terminal: '' } : missionSteps[step - 1].after;

  const start = () => {
    setSeed((x) => x + 1);
    setStep(0);
    setWrong([]);
    setMistakes(0);
    setSolved(false);
    setPhase('play');
  };

  const choose = (cmd: string, correct?: boolean) => {
    if (solved || wrong.includes(cmd)) return;
    if (correct) setSolved(true);
    else {
      setWrong((w) => [...w, cmd]);
      setMistakes((m) => m + 1);
    }
  };

  const advance = () => {
    if (step + 1 >= missionSteps.length) {
      onComplete(mistakes);
      setPhase('done');
      return;
    }
    setStep(step + 1);
    setWrong([]);
    setSolved(false);
  };

  const solvedThrough = solved ? step : step - 1;

  if (phase === 'intro') {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-10 pt-2">
        <div>
          <span className="eyebrow inline-flex items-center gap-1.5 text-bad">
            <Siren size={13} /> Final challenge
          </span>
          <h1 className="mt-1 font-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.02] tracking-tight">{missionIntro.title}</h1>
          <p className="mt-3 max-w-[68ch] text-[16px] text-fg/85">{missionIntro.story}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <section className="rounded-xl border border-bad/30 bg-bad/5 p-4">
            <h2 className="mb-2 font-semibold">What’s wrong right now</h2>
            <ul className="flex flex-col gap-1.5 text-[14.5px]">
              {missionIntro.problems.map((p) => (
                <li key={p} className="flex gap-2">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-bad" /> {p}
                </li>
              ))}
            </ul>
          </section>
          <section className="min-w-0 rounded-xl border border-line bg-panel p-4">
            <h2 className="mb-2 font-semibold">Repository today</h2>
            <CommitGraph state={missionStart.graph} ariaLabel="Mission starting repository" />
            <p className="text-[12.5px] text-faint">Faded commits exist on GitHub but your repo hasn’t fetched them.</p>
          </section>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={start} className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-accent-fg hover:brightness-110">
            Start mission
          </button>
          <span className="text-[13.5px] text-muted">
            {missionSteps.length} decisions. Pick the right command at each step.
            {best !== null && <> Your best: {best === 0 ? 'flawless' : `${best} mistake${best > 1 ? 's' : ''}`}.</>}
          </span>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    const final = missionSteps[missionSteps.length - 1].after;
    const rating = mistakes === 0 ? 'Flawless rescue' : mistakes <= 2 ? 'Repository saved' : 'Saved, with some scares';
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-10 pt-2">
        <section className="animate-rise rounded-2xl border border-ok/40 bg-ok/5 p-6">
          <ShieldCheck size={30} className="text-ok" />
          <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-none tracking-tight">{rating}</h1>
          <p className="mt-2 max-w-[60ch] text-fg/85">
            The mistake is reverted, main’s changes are merged, the conflict is resolved, the branch is published, and your unfinished work is back. Nobody’s history was
            rewritten.
          </p>
          <p className="mt-3 font-mono text-[14px] tnum">
            Mistakes: <span className={mistakes ? 'text-warn' : 'text-ok'}>{mistakes}</span>
            {best !== null && <span className="text-faint"> · best {best}</span>}
          </p>
        </section>
        <section className="min-w-0 rounded-xl border border-line bg-panel p-4">
          <h2 className="mb-2 font-display text-lg font-bold">Final repository graph</h2>
          <CommitGraph state={final.graph} ariaLabel="Final repository graph" />
          <StatusGrid status={final.status} />
        </section>
        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="mb-2 font-display text-lg font-bold">The full rescue</h2>
          <ol className="flex flex-col gap-1.5 font-mono text-[13px]">
            {missionSteps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-5 shrink-0 text-right text-faint tnum">{i + 1}</span>
                <span className="min-w-0">
                  <HighlightedCommand text={s.options.find((o) => o.correct)!.cmd} />
                  <span className="ml-2 font-sans text-faint">{s.goal}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <button onClick={start} className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-fg hover:brightness-110">
          <RotateCcw size={16} /> Replay mission
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 pb-10 pt-2">
      {/* progress */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-extrabold">Save the Repository</h1>
        <div className="flex flex-1 gap-1" aria-label={`Step ${step + 1} of ${missionSteps.length}`}>
          {missionSteps.map((_, i) => (
            <span key={i} className={`h-1.5 min-w-[12px] flex-1 rounded-full transition-colors ${i <= solvedThrough ? 'bg-ok' : i === step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
        <span className="font-mono text-[13px] text-faint tnum">mistakes {mistakes}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* decision */}
        <section key={step} className="animate-rise flex min-w-0 flex-col gap-4">
          <div>
            <span className="eyebrow text-accent tnum">
              Step {step + 1} of {missionSteps.length}
            </span>
            <h2 className="mt-0.5 font-display text-2xl font-bold">{current.goal}</h2>
            <p className="mt-1 text-[15px] text-fg/85">{current.situation}</p>
          </div>
          <div className="flex flex-col gap-2">
            {orders[step].map((o) => {
              const isWrong = wrong.includes(o.cmd);
              const isRight = solved && o.correct;
              return (
                <div key={o.cmd}>
                  <button
                    onClick={() => choose(o.cmd, o.correct)}
                    disabled={solved || isWrong}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left font-mono text-[14px] transition ${
                      isRight
                        ? 'animate-glow border-ok bg-ok/10'
                        : isWrong
                          ? 'animate-shake border-bad/60 bg-bad/5 opacity-80'
                          : solved
                            ? 'border-line opacity-40'
                            : 'border-line bg-panel hover:border-accent/70'
                    }`}
                  >
                    <span className="text-faint">$</span>
                    <span className="min-w-0 flex-1">
                      <HighlightedCommand text={o.cmd} />
                    </span>
                    {isRight && <CheckCircle2 size={18} className="shrink-0 text-ok" />}
                    {isWrong && <XCircle size={18} className="shrink-0 text-bad" />}
                  </button>
                  {(isWrong || isRight) && (
                    <p className={`animate-rise mt-1 px-1 text-[13.5px] ${isRight ? 'text-ok' : 'text-bad'}`}>{o.why}</p>
                  )}
                </div>
              );
            })}
          </div>
          {solved && (
            <div className="animate-rise flex flex-col gap-3">
              <pre className="scroll-thin overflow-x-auto rounded-lg border border-line bg-term px-3 py-2 font-mono text-[12.5px] text-fg/80">{current.after.terminal}</pre>
              <button onClick={advance} className="w-fit rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-fg hover:brightness-110" autoFocus>
                {step + 1 === missionSteps.length ? 'Finish mission' : 'Next step'}
              </button>
            </div>
          )}
          {!solved && wrong.length >= 2 && (
            <p className="inline-flex items-center gap-1.5 text-[13px] text-muted">
              <LifeBuoy size={14} /> Hint: think about whether the action rewrites shared history or throws work away.
            </p>
          )}
        </section>

        {/* repo state */}
        <section className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0 rounded-xl border border-line bg-panel p-4">
            <h3 className="mb-1 font-semibold">Repository</h3>
            <CommitGraph state={shown.graph} ariaLabel="Mission repository graph" />
            <StatusGrid status={shown.status} />
          </div>
          <div className="rounded-xl border border-line bg-panel p-4">
            <h3 className="mb-2 font-semibold">Checklist</h3>
            <ul className="flex flex-col gap-1.5 text-[14px]">
              {missionIntro.problems.map((p, i) => {
                const done = SOLVED_AT[i] <= solvedThrough;
                return (
                  <li key={p} className={`flex gap-2 ${done ? 'text-ok' : 'text-fg/80'}`}>
                    {done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <Circle size={16} className="mt-0.5 shrink-0 text-faint" />}
                    <span className={done ? 'line-through decoration-ok/50' : ''}>{p}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusGrid({ status }: { status: RepoStatus }) {
  const rows: [string, string][] = [
    ['Working directory', status.working],
    ['Stash', status.stash],
    ['Merge', status.merge],
    ['Sync', status.sync],
  ];
  return (
    <dl className="mt-2 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[auto_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-faint">{k}</dt>
          <dd className={`min-w-0 ${/conflict|MERGING/.test(v) ? 'text-bad' : 'text-fg/85'}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
