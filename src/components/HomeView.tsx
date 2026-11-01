import { ArrowRight, CheckCircle2, Flag, SquareTerminal, Trophy } from 'lucide-react';
import type { Progress } from '../types';
import { modules } from '../data/modules';
import HeroGraph from './widgets/HeroGraph';
import { exercises } from '../data/exercises';
import { useProgressStats } from './ProgressTracker';

export default function HomeView({ progress, go }: { progress: Progress; go: (r: string) => void }) {
  const { done, total } = useProgressStats(progress);
  const nextModule = modules.find((m) => !progress.completed.includes(m.id)) ?? modules[0];
  const commandCount = modules.reduce((n, m) => n + m.commands.length, 0);
  const started = done > 0 || progress.visited.length > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 pb-12">
      {/* Hero */}
      <section className="grid items-center gap-8 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div>
          <p className="text-[14px] font-medium text-accent">A hands-on Git course, from first commit to pull request</p>
          <h1 className="mt-2 font-display text-[clamp(2.6rem,7vw,4.6rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
            Learn Git.
            <br />
            Master Your Workflow.
          </h1>
          <p className="mt-4 max-w-[52ch] text-[17px] text-fg/80">
            Watch every command change the commit graph, then try it yourself: {total} modules, {commandCount} commands, {exercises.length} hands-on exercises, and a timed challenge at the end.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              onClick={() => go(`module-${nextModule.id}`)}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 font-semibold text-accent-fg transition hover:brightness-110"
            >
              {started ? `Continue with ${nextModule.title}` : 'Start learning'} <ArrowRight size={17} />
            </button>
            <button onClick={() => go('terminal')} className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 font-semibold transition hover:border-accent/60">
              <SquareTerminal size={17} /> Open terminal
            </button>
          </div>
        </div>
        <HeroGraph />
      </section>

      {/* Modules */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">The course</h2>
            <p className="text-[14.5px] text-muted">Work through them in order. Each one builds on the last.</p>
          </div>
          <span className="font-mono text-[13px] text-faint tnum">
            {done}/{total} complete
          </span>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => {
            const isDone = progress.completed.includes(m.id);
            const Icon = m.icon;
            return (
              <li key={m.id} className="min-w-0">
                <button
                  onClick={() => go(`module-${m.id}`)}
                  className={`group flex h-full w-full flex-col rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    isDone ? 'border-ok/40 bg-ok/5' : 'border-line bg-panel hover:border-accent/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] text-faint tnum">{String(m.number).padStart(2, '0')}</span>
                    {isDone ? <CheckCircle2 size={17} className="text-ok" /> : <Icon size={17} className="text-muted group-hover:text-accent" />}
                  </div>
                  <h3 className="mt-3 font-display text-[17px] font-bold leading-tight">{m.title}</h3>
                  <p className="mt-1 flex-1 text-[13.5px] text-muted">{m.tagline}</p>
                  <span className="mt-3 text-[12px] text-faint">
                    {m.commands.length ? `${m.commands.length} commands` : m.steps ? `${m.steps.length}-step workflow` : `${m.concepts.length} concepts`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Practice */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-extrabold tracking-tight">Practice and prove it</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <PracticeCard
            icon={SquareTerminal}
            title="Terminal simulator"
            body="Type real Git commands against a simulated repository and watch the graph change. Includes a merge-conflict and an undo lab."
            cta="Open terminal"
            onClick={() => go('terminal')}
          />
          <PracticeCard
            icon={Trophy}
            title="Git Challenge"
            body="15 timed questions, 20 seconds each, with a speed bonus and a leaderboard."
            meta={progress.bestScore ? `Best: ${progress.bestScore} pts` : undefined}
            cta="Start Git Challenge"
            onClick={() => go('challenge')}
            primary
          />
          <PracticeCard
            icon={Flag}
            title="Git Mission: Save the Repository"
            body="Uncommitted work, a pushed mistake, a stale branch and a conflict. Choose the right commands in the right order."
            meta={progress.missionDone ? `Best: ${progress.missionBest} mistake${progress.missionBest === 1 ? '' : 's'}` : undefined}
            cta="Start mission"
            onClick={() => go('mission')}
          />
        </div>
      </section>
    </div>
  );
}

function PracticeCard({
  icon: Icon,
  title,
  body,
  cta,
  onClick,
  meta,
  primary,
}: {
  icon: typeof Flag;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  meta?: string;
  primary?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-xl border p-5 ${primary ? 'border-accent/50 bg-accent/5' : 'border-line bg-panel'}`}>
      <Icon size={20} className="text-accent" />
      <h3 className="mt-3 font-display text-lg font-bold leading-tight">{title}</h3>
      <p className="mt-1 flex-1 text-[14px] text-muted">{body}</p>
      {meta && <p className="mt-2 font-mono text-[12.5px] text-fg tnum">{meta}</p>}
      <button
        onClick={onClick}
        className={`mt-4 w-fit rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
          primary ? 'bg-accent text-accent-fg hover:brightness-110' : 'border border-line hover:border-accent/60'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
