import { useMemo, useState } from 'react';
import { Bug, FlaskConical, RotateCcw } from 'lucide-react';

const N = 16;
const hashes = Array.from({ length: N }, (_, i) => ((i + 7) * 2654435761 >>> 0).toString(16).slice(0, 7));
const messages = [
  'Release v1.0',
  'Add grade export',
  'Refactor date utils',
  'Update README',
  'Add attendance chart',
  'Cache student list',
  'Fix footer link',
  'Change grade rounding',
  'Add dark mode',
  'Bump dependencies',
  'Lazy-load reports',
  'Rename API fields',
  'Add parent portal',
  'Tidy CSS',
  'Add search box',
  'Add PDF reports',
];

/** Play git bisect: binary-search 16 commits for the one that broke grade averages. */
export default function BisectGame() {
  const [seed, setSeed] = useState(0);
  const badAt = useMemo(() => 2 + Math.floor(Math.random() * (N - 2)), [seed]);
  const [started, setStarted] = useState(false);
  const [lo, setLo] = useState(0); // known good
  const [hi, setHi] = useState(N - 1); // known bad
  const [tested, setTested] = useState(false);
  const [steps, setSteps] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [warn, setWarn] = useState('');

  const mid = Math.floor((lo + hi) / 2);
  const found = started && hi - lo === 1;
  const passes = mid < badAt;

  const reset = () => {
    setSeed((s) => s + 1);
    setStarted(false);
    setLo(0);
    setHi(N - 1);
    setTested(false);
    setSteps(0);
    setLog([]);
    setWarn('');
  };

  const mark = (good: boolean) => {
    if (!tested) return setWarn('Run the tests on this commit first, so you know what to tell Git.');
    if (good !== passes) return setWarn(passes ? 'The tests passed here, so this commit is good.' : 'The tests failed here, so this commit is bad.');
    setWarn('');
    setSteps((s) => s + 1);
    setLog((l) => [...l, `git bisect ${good ? 'good' : 'bad'}`]);
    if (good) setLo(mid);
    else setHi(mid);
    setTested(false);
  };

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-display text-base font-bold">Hunt the bug with git bisect</h3>
          <p className="text-[13px] text-muted">Grade averages worked in v1.0 and are wrong now. One of these 16 commits broke them.</p>
        </div>
        <button onClick={reset} className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg">
          <RotateCcw size={13} /> New bug
        </button>
      </div>
      <div className="p-4">
        <div className="scroll-thin overflow-x-auto pb-1">
          <ol className="flex min-w-[560px] gap-1" aria-label="Commits, oldest to newest">
            {hashes.map((h, i) => {
              const out = started && (i < lo || i > hi);
              const isMid = started && !found && i === mid;
              const isFound = found && i === hi;
              return (
                <li
                  key={h}
                  title={`${h} ${messages[i]}`}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-md py-1.5 transition-all duration-300 ${out ? 'opacity-25' : ''} ${
                    isMid ? 'bg-accent/15 ring-1 ring-accent' : isFound ? 'bg-bad/15 ring-2 ring-bad' : ''
                  }`}
                >
                  <span
                    className={`h-3.5 w-3.5 rounded-full ${
                      isFound ? 'bg-bad' : started && i <= lo ? 'bg-ok' : started && i >= hi ? 'bg-bad/70' : 'bg-muted/60'
                    }`}
                  />
                  <span className="font-mono text-[9.5px] text-faint">{h.slice(0, 4)}</span>
                </li>
              );
            })}
          </ol>
          <div className="mt-1 flex min-w-[560px] justify-between text-[11.5px] text-faint">
            <span>v1.0 (good)</span>
            <span>HEAD (bad)</span>
          </div>
        </div>

        <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-2">
            {!started ? (
              <button
                onClick={() => {
                  setStarted(true);
                  setLog(['git bisect start', 'git bisect bad', 'git bisect good v1.0']);
                }}
                className="w-fit rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg hover:brightness-110"
              >
                Start bisect
              </button>
            ) : found ? (
              <div className="animate-rise rounded-lg bg-bad/10 p-3">
                <p className="inline-flex items-center gap-1.5 font-semibold text-bad">
                  <Bug size={16} /> {hashes[hi]} is the first bad commit
                </p>
                <p className="mt-1 text-[14px] text-fg/85">
                  “{messages[hi]}”. Found in {steps} step{steps === 1 ? '' : 's'}; checking every commit could take up to 15. Run git bisect reset to go back to where you started.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[14px]">
                  Git checked out <span className="font-mono text-accent">{hashes[mid]}</span> “{messages[mid]}”, halfway between good and bad.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      setTested(true);
                      setWarn('');
                    }}
                    disabled={tested}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[13px] hover:bg-raised disabled:opacity-50"
                  >
                    <FlaskConical size={14} /> Run tests
                  </button>
                  <button onClick={() => mark(true)} className="rounded-md border border-ok/50 px-2.5 py-1.5 font-mono text-[13px] text-ok hover:bg-ok/10">
                    git bisect good
                  </button>
                  <button onClick={() => mark(false)} className="rounded-md border border-bad/50 px-2.5 py-1.5 font-mono text-[13px] text-bad hover:bg-bad/10">
                    git bisect bad
                  </button>
                </div>
                {tested && (
                  <p key={mid} className={`animate-rise font-mono text-[13px] ${passes ? 'text-ok' : 'text-bad'}`}>
                    {passes ? '✓ 42 tests passed' : '✗ averageGrade() expected 87.5, got 88'}
                  </p>
                )}
                {warn && <p className="animate-shake text-[13px] text-warn">{warn}</p>}
              </>
            )}
          </div>
          <pre className="scroll-thin min-h-[96px] min-w-0 overflow-x-auto rounded-lg bg-term px-3 py-2 font-mono text-[12.5px] text-fg/80">
            {log.length ? log.map((l) => `$ ${l}`).join('\n') : '$ '}
            {started && !found && `\nBisecting: ${hi - lo - 1} revisions left to test`}
          </pre>
        </div>
      </div>
    </section>
  );
}
