# Git Mastery

**Learn Git. Master Your Workflow.** An interactive Git course built with React, TypeScript, Tailwind CSS and Lucide icons. No backend.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # static site in dist/
npm run build:single   # one self-contained HTML file in dist-single/
```

## What's inside

- 8 modules (Fundamentals → GitHub Workflow), 54 command cards: explanation, syntax, copy button, example, output, expected result, common mistake, related commands, warnings for destructive commands
- Animated, step-through commit graphs (fast-forward, three-way merge, rebase, squash, conflict, fetch/pull/push, reset vs revert, cherry-pick, GitHub merge strategies)
- Interactive Working Directory → Staging → Local → Remote model
- Clickable concept tools: commit anatomy (`git cat-file -p`), file lifecycle state diagram, branch playground (merge vs rebase by clicking), conflict resolver, reset --soft/--mixed/--hard visualizer, git bisect bug hunt, auto-playing hero graph
- 9 hands-on exercises (`src/data/exercises.ts`): a sandboxed terminal per task, goals checked live against the simulated repo, progressive hints and a solution
- Git terminal simulator (`src/lib/gitSim.ts`): in-browser model of staging, commits, branches, merges with real conflicts, rebase, remotes, push rejection, stash, reset, revert, cherry-pick, tags, reflog, clean. Nothing real is executed.
- Git Challenge: 15 questions (most show a commit graph; some ask you to pick the correct resulting graph) (one per topic, shuffled questions and answers), 20 s timer, 100 pts + 50 bonus under 5 s, streaks, results screen with levels and local leaderboard
- Git Mission: Save the Repository: 8-step rescue scenario with live graph, status and final repository graph
- Light/dark mode, hash routing (`#module-branching`, `#terminal`, `#challenge`, `#mission`), progress and best scores in localStorage

## Structure

```
src/
  components/widgets/  CommitAnatomy, FileLifecycle, BranchPlayground, ConflictResolver,
               ResetVisualizer, BisectGame, HeroGraph
  components/  Exercise, TerminalPane, Header, Sidebar, HomeView, LearningModule, CommandCard, CodeBlock,
               CommitGraph, ScenarioPlayer, WorkflowDiagram, GitTerminalSimulator,
               ProgressTracker, QuizEngine, QuizQuestion, QuizResults, MissionChallenge
  data/        modules.ts, scenarios.ts, quiz.ts, quizVisual.ts, exercises.ts, mission.ts
  hooks/       useAppState.ts (progress, theme, routing, clipboard)
  lib/         gitSim.ts
```
