import { ArrowRight, Flag, SquareTerminal, Trophy } from "lucide-react";
import type { Progress } from "../types";
import { modules } from "../data/modules";
import FirstMinute from "./home/FirstMinute";
import CourseMap from "./home/CourseMap";
import DailyChallenge from "./home/DailyChallenge";
import StartingPoint from "./home/StartingPoint";
import { Achievements, LevelCard } from "./home/LevelCard";
import { useHomeState } from "../lib/gamification";
import { exercises } from "../data/exercises";
import { useProgressStats } from "./ProgressTracker";

export default function HomeView({
  progress,
  go,
}: {
  progress: Progress;
  go: (r: string) => void;
}) {
  const { done, total } = useProgressStats(progress);
  const { home, finishFirstMinute, answerDaily } = useHomeState();
  const nextModule =
    modules.find((m) => !progress.completed.includes(m.id)) ?? modules[0];
  const commandCount = modules.reduce((n, m) => n + m.commands.length, 0);
  const started =
    done > 0 || progress.visited.length > 0 || home.firstMinuteDone;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 pb-12">
      {/* Hero: learn by doing from the first second */}
      <section className="grid items-start gap-8 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col gap-5 lg:pt-4">
          <div>
            <p className="text-[14px] font-medium text-accent">
              {started
                ? "Welcome back"
                : "A hands-on Git course, from first commit to pull request"}
            </p>
            <h1 className="mt-2 font-display text-[clamp(2.6rem,7vw,4.6rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
              Learn Git.
              <br />
              Master Your Workflow.
            </h1>
            <p className="mt-4 max-w-[50ch] text-[17px] text-fg/80">
              {started
                ? done
                  ? `You’re ${done} of ${total} modules in. Pick up where you left off, or keep your streak alive with today’s question.`
                  : `You’ve already run real Git commands. Next, Module 1 explains what they did, so the rest of the course makes sense.`
                : `Don’t read about Git first. Try it on the right: five commands, and you’ll have your first commit and branch. Then ${total} modules, ${commandCount} commands and ${exercises.length} exercises take you to pull requests.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => go(`module-${nextModule.id}`)}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 font-semibold text-accent-fg transition hover:brightness-110"
            >
              {started ? `Continue with ${nextModule.title}` : "Start Module 1"}{" "}
              <ArrowRight size={17} />
            </button>
            <button
              onClick={() => go("challenge")}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 font-semibold transition hover:border-accent/60"
            >
              <Trophy size={17} /> Test yourself
            </button>
          </div>
          <LevelCard progress={progress} home={home} />
        </div>
        <FirstMinute
          done={home.firstMinuteDone}
          onFinish={finishFirstMinute}
          onContinue={() => go("module-fundamentals")}
        />
      </section>

      {/* Daily habit + placement */}
      <section className="grid gap-4 lg:grid-cols-2">
        <DailyChallenge home={home} onAnswer={answerDaily} />
        <StartingPoint go={go} />
      </section>

      <CourseMap progress={progress} go={go} />

      <Achievements progress={progress} home={home} />

      {/* Practice */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-extrabold tracking-tight">
          Practice and prove it
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <PracticeCard
            icon={SquareTerminal}
            title="Terminal simulator"
            body="Type real Git commands against a simulated repository and watch the graph change. Includes a merge-conflict and an undo lab."
            cta="Open terminal"
            onClick={() => go("terminal")}
          />
          <PracticeCard
            icon={Trophy}
            title="Git Challenge"
            body="15 timed questions, most with commit graphs. 20 seconds each, a speed bonus, and a leaderboard."
            meta={
              progress.bestScore
                ? `Your best: ${progress.bestScore} pts`
                : undefined
            }
            cta="Start Git Challenge"
            onClick={() => go("challenge")}
            primary
          />
          <PracticeCard
            icon={Flag}
            title="Git Mission: Save the Repository"
            body="Uncommitted work, a pushed mistake, a stale branch and a conflict. Choose the right commands in the right order."
            meta={
              progress.missionDone
                ? `Your best: ${progress.missionBest} mistake${progress.missionBest === 1 ? "" : "s"}`
                : undefined
            }
            cta="Start mission"
            onClick={() => go("mission")}
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
    <div
      className={`flex flex-col rounded-xl border p-5 ${primary ? "border-accent/50 bg-accent/5" : "border-line bg-panel"}`}
    >
      <Icon size={20} className="text-accent" />
      <h3 className="mt-3 font-display text-lg font-bold leading-tight">
        {title}
      </h3>
      <p className="mt-1 flex-1 text-[14px] text-muted">{body}</p>
      {meta && (
        <p className="mt-2 font-mono text-[12.5px] text-fg tnum">{meta}</p>
      )}
      <button
        onClick={onClick}
        className={`mt-4 w-fit rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
          primary
            ? "bg-accent text-accent-fg hover:brightness-110"
            : "border border-line hover:border-accent/60"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
