import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { MobileDrawer, MobileNav, Sidebar } from './components/Sidebar';
import HomeView from './components/HomeView';
import LearningModule from './components/LearningModule';
import GitTerminalSimulator from './components/GitTerminalSimulator';
import QuizEngine from './components/QuizEngine';
import MissionChallenge from './components/MissionChallenge';
import { moduleById, modules } from './data/modules';
import { useProgress, useRoute, useTheme } from './hooks/useAppState';

export default function App() {
  const { theme, toggle } = useTheme();
  const { route, go } = useRoute();
  const { progress, toggleComplete, markVisited, recordQuiz, recordMission, completeExercise, reset } = useProgress();
  const [menuOpen, setMenuOpen] = useState(false);

  const module = route.startsWith('module-') ? moduleById(route.slice(7)) : undefined;
  useEffect(() => {
    if (module) markVisited(module.id);
  }, [module, markVisited]);

  const allDone = modules.every((m) => progress.completed.includes(m.id));
  const navProps = { route, go, progress, onReset: reset };

  let view: React.ReactNode;
  if (module) {
    view = (
      <LearningModule
        key={module.id}
        module={module}
        completed={progress.completed.includes(module.id)}
        onToggleComplete={() => toggleComplete(module.id)}
        go={go}
        allDone={allDone}
        exercisesDone={progress.exercises}
        onExercise={completeExercise}
      />
    );
  } else if (route === 'terminal') {
    view = (
      <div className="mx-auto flex max-w-6xl flex-col gap-5 pb-10 pt-2">
        <header>
          <span className="eyebrow text-accent">Practice</span>
          <h1 className="mt-1 font-display text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-tight tracking-tight">Git terminal simulator</h1>
          <p className="mt-1 max-w-[65ch] text-fg/80">
            A sandboxed repository that runs in your browser. Type commands or tap the suggestions, then watch the graph, files and branches update. Use{' '}
            <code className="font-mono text-[0.9em] text-accent">edit &lt;file&gt;</code> to change a file and{' '}
            <code className="font-mono text-[0.9em] text-accent">teammate push</code> to simulate a coworker.
          </p>
        </header>
        <GitTerminalSimulator />
      </div>
    );
  } else if (route === 'challenge') {
    view = (
      <QuizEngine
        bestScore={progress.bestScore}
        leaderboard={progress.leaderboard}
        onFinish={recordQuiz}
        go={go}
        modulesDone={progress.completed.length}
        modulesTotal={modules.length}
      />
    );
  } else if (route === 'mission') {
    view = <MissionChallenge best={progress.missionBest} onComplete={recordMission} />;
  } else {
    view = <HomeView progress={progress} go={go} />;
  }

  return (
    <div className="min-h-full">
      <Header theme={theme} onToggleTheme={toggle} progress={progress} go={go} />
      <div className="flex">
        <Sidebar {...navProps} />
        <main id="main" className="gutter min-w-0 flex-1 pb-28 pt-6 lg:pb-12 lg:pl-8 lg:pr-8">
          {view}
        </main>
      </div>
      <MobileNav route={route} go={go} onOpenMenu={() => setMenuOpen(true)} />
      <MobileDrawer {...navProps} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
