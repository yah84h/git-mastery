import { BookOpen, Crosshair, Medal, RotateCcw, Target, Timer, XCircle } from 'lucide-react';
import type { AnswerRecord, LeaderboardEntry, PreparedQuestion } from '../types';
import { performanceLevel, POINTS_BONUS, POINTS_CORRECT } from '../data/quiz';
import CommitGraph from './CommitGraph';

interface Props {
  entry: LeaderboardEntry;
  answers: AnswerRecord[];
  questions: PreparedQuestion[];
  leaderboard: LeaderboardEntry[];
  onRetry: () => void;
  go: (r: string) => void;
}

const toneText = { ok: 'text-ok', info: 'text-info', warn: 'text-warn', bad: 'text-bad' } as const;
const toneSoft = { ok: 'bg-ok/15', info: 'bg-info/15', warn: 'bg-warn/15', bad: 'bg-bad/15' } as const;

export default function QuizResults({ entry, answers, questions, leaderboard, onRetry, go }: Props) {
  const correct = answers.filter((a) => a.correct).length;
  const wrong = answers.length - correct;
  const level = performanceLevel(entry.accuracy);
  const maxScore = questions.length * (POINTS_CORRECT + POINTS_BONUS);
  const missed = answers.map((a, i) => ({ a, q: questions[i] })).filter((x) => !x.a.correct);
  const levels = [
    { label: 'Git Beginner', range: '0–40%' },
    { label: 'Git Explorer', range: '41–70%' },
    { label: 'Git Developer', range: '71–90%' },
    { label: 'Git Master', range: '91–100%' },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-10 pt-2">
      {/* Hero result */}
      <section className="animate-rise overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <span className="eyebrow text-faint">{entry.name}’s result</span>
            <h1 className={`mt-1 font-display text-[clamp(2.2rem,6vw,3.5rem)] font-extrabold leading-none tracking-tight ${toneText[level.tone]}`}>{level.label}</h1>
            <p className="mt-2 max-w-[50ch] text-fg/85">{level.note}</p>
          </div>
          <div className="text-left md:text-right">
            <div className="font-mono text-[clamp(2.6rem,7vw,4rem)] font-bold leading-none tnum">{entry.score}</div>
            <div className="text-[13px] text-faint tnum">of {maxScore} possible points</div>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-line" aria-label="Performance levels">
          {levels.map((l) => {
            const active = l.label === level.label;
            return (
              <div key={l.label} className={`border-r border-line px-2 py-2 text-center last:border-r-0 ${active ? toneSoft[level.tone] : ''}`}>
                <div className={`text-[12px] font-semibold ${active ? toneText[level.tone] : 'text-faint'}`}>{l.label.replace('Git ', '')}</div>
                <div className="font-mono text-[11px] text-faint">{l.range}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Target, label: 'Correct', value: correct, cls: 'text-ok' },
          { icon: XCircle, label: 'Incorrect', value: wrong, cls: 'text-bad' },
          { icon: Crosshair, label: 'Accuracy', value: `${entry.accuracy}%`, cls: '' },
          { icon: Timer, label: 'Avg. response', value: `${(entry.avgMs / 1000).toFixed(1)}s`, cls: '' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-panel p-4">
            <div className="eyebrow flex items-center gap-1.5 text-faint">
              <s.icon size={13} /> {s.label}
            </div>
            <div className={`mt-1 font-mono text-[28px] font-bold tnum ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Leaderboard */}
        <section className="min-w-0">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <Medal size={18} className="text-accent" /> Leaderboard
          </h2>
          <p className="mb-2 text-[12.5px] text-faint">Top runs saved in this browser.</p>
          <ol className="overflow-hidden rounded-xl border border-line">
            {leaderboard.map((e, i) => {
              const me = e.date === entry.date;
              return (
                <li
                  key={e.date + i}
                  className={`flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0 ${me ? 'animate-rise bg-accent/10' : 'bg-panel'}`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[12px] font-bold ${
                      i === 0 ? 'bg-warn text-bg' : i === 1 ? 'bg-muted text-bg' : i === 2 ? 'bg-accent/70 text-bg' : 'bg-raised text-muted'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {e.name}
                    {me && <span className="ml-2 text-[11px] font-semibold text-accent">this run</span>}
                  </span>
                  <span className="hidden font-mono text-[12px] text-faint tnum sm:inline">{e.accuracy}%</span>
                  <span className="font-mono font-bold tnum">{e.score}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Review */}
        <section className="min-w-0">
          <h2 className="mb-2 font-display text-lg font-bold">Review</h2>
          {missed.length === 0 ? (
            <p className="rounded-xl border border-ok/30 bg-ok/5 p-4 text-ok">Perfect run. Nothing to review.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {missed.map(({ q, a }) => (
                <li key={q.id} className="rounded-xl border border-line bg-panel p-3">
                  <div className="eyebrow mb-1 text-faint">
                    {q.topic} {a.timedOut && '· timed out'}
                  </div>
                  <p className="font-medium">{q.prompt}</p>
                  {(q.optionGraphs?.[q.answer] ?? q.graph) && (
                    <div className="mt-2 rounded-lg bg-bg/60 px-2 pt-1">
                      <CommitGraph state={(q.optionGraphs?.[q.answer] ?? q.graph)!} dense fit interactive={false} ariaLabel="Correct answer graph" />
                    </div>
                  )}
                  <p className="mt-1 text-[14px]">
                    <span className="text-ok">Answer: </span>
                    {q.options[q.answer]}
                  </p>
                  <p className="mt-1 text-[13.5px] text-muted">{q.explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-fg hover:brightness-110">
          <RotateCcw size={16} /> Play again
        </button>
        <button onClick={() => go('mission')} className="rounded-lg border border-line px-5 py-2.5 font-semibold hover:border-accent/60">
          Try Git Mission
        </button>
        <button onClick={() => go('home')} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-muted hover:text-fg">
          <BookOpen size={16} /> Back to course
        </button>
      </div>
    </div>
  );
}
