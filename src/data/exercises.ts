import { inspect, type SimState } from '../lib/gitSim';

export interface Goal {
  label: string;
  check: (s: SimState, history: string[]) => boolean;
}

export interface Exercise {
  id: string;
  moduleId: string;
  title: string;
  brief: string;
  script: string[];
  goals: Goal[];
  hints: string[];
  solution: string[];
}

const ran = (h: string[], re: RegExp) => h.some((c) => re.test(c.trim()));
const head = inspect.headCommit;

export const exercises: Exercise[] = [
  {
    id: 'ex-first-repo',
    moduleId: 'getting-started',
    title: 'Create your first repository',
    brief: 'Introduce yourself to Git, turn this empty folder into a repository, and save a first snapshot.',
    script: [],
    goals: [
      { label: 'Set your user.name', check: (s) => !!s.config['user.name'] && s.config['user.name'] !== 'Learner' },
      { label: 'Initialize a repository', check: (s) => s.initialized },
      { label: 'Make your first commit', check: (s) => !!head(s) },
    ],
    hints: ['Start with git config --global user.name "Your Name"', 'git init creates the repository', 'Create a file with touch README.md, then git add and git commit -m "…"'],
    solution: ['git config --global user.name "Sara Ahmed"', 'git init', 'touch README.md', 'git add .', 'git commit -m "Initial commit"'],
  },
  {
    id: 'ex-partial-commit',
    moduleId: 'daily-workflow',
    title: 'Commit only what belongs together',
    brief: 'You changed app.js and index.html and created notes.txt. Commit only the app.js change. Leave index.html modified and notes.txt untracked.',
    script: ['git init', 'touch app.js index.html', 'git add .', 'git commit -m "Initial commit"', 'edit app.js index.html', 'touch notes.txt'],
    goals: [
      { label: 'A new commit contains app.js', check: (s) => head(s)?.msg !== 'Initial commit' && inspect.snapshot(s, head(s)?.id ?? null)['app.js'] === s.files['app.js']?.wd },
      { label: 'index.html is still modified, not committed', check: (s) => inspect.status(s).modified.includes('index.html') },
      { label: 'notes.txt is still untracked', check: (s) => inspect.status(s).untracked.includes('notes.txt') },
    ],
    hints: ['Run git status to see the three files', 'git add takes a single file name', 'Then commit with git commit -m "…"'],
    solution: ['git status', 'git add app.js', 'git commit -m "Validate login form"', 'git status'],
  },
  {
    id: 'ex-feature-branch',
    moduleId: 'branching',
    title: 'Ship a feature branch',
    brief: 'Build the login page on its own branch, bring it into main, and clean up.',
    script: ['git init', 'touch index.html', 'git add .', 'git commit -m "Initial commit"'],
    goals: [
      { label: 'Commit on a branch named feature/login', check: (_s, h) => ran(h, /^git (switch -c|checkout -b) feature\/login/) && ran(h, /^git commit/) },
      { label: 'Merge feature/login into main', check: (s, h) => s.head === 'main' && ran(h, /^git merge feature\/login/) && inspect.commitCount(s) > 1 },
      { label: 'Delete the merged branch', check: (s, h) => !('feature/login' in s.branches) && ran(h, /^git branch -d feature\/login/) },
    ],
    hints: ['git switch -c feature/login creates and switches', 'Make a change with touch login.html, then add and commit', 'Switch back to main before merging, then git branch -d'],
    solution: ['git switch -c feature/login', 'touch login.html', 'git add .', 'git commit -m "Add login page"', 'git switch main', 'git merge feature/login', 'git branch -d feature/login'],
  },
  {
    id: 'ex-conflict',
    moduleId: 'branching',
    title: 'Resolve a merge conflict',
    brief: 'main made the header red and feature made it blue. Merge feature into main and finish the merge.',
    script: [
      'git init',
      'touch header.html app.js',
      'git add .',
      'git commit -m "Initial commit"',
      'git switch -c feature',
      'edit header.html',
      'git commit -am "Make header blue"',
      'git switch main',
      'edit header.html',
      'git commit -am "Make header red"',
    ],
    goals: [
      { label: 'Start the merge and hit the conflict', check: (_s, h) => ran(h, /^git merge feature/) },
      { label: 'Resolve header.html and stage it', check: (_s, h) => ran(h, /^edit header\.html/) && ran(h, /^git add (header\.html|\.)/) },
      { label: 'Finish with a merge commit', check: (s) => !s.merging && (head(s)?.parents.length ?? 0) === 2 },
    ],
    hints: ['git merge feature', 'In this simulator, edit header.html stands for fixing the file in your editor', 'git add header.html, then git commit'],
    solution: ['git merge feature', 'git status', 'edit header.html', 'git add header.html', 'git commit'],
  },
  {
    id: 'ex-rejected-push',
    moduleId: 'remotes',
    title: 'Fix a rejected push',
    brief: 'You committed on main, but a teammate pushed first. Get your commit onto GitHub without losing theirs.',
    script: ['git clone https://github.com/acme/school-app.git', 'edit app.js', 'git commit -am "Add dashboard"', 'teammate push'],
    goals: [
      { label: 'Try git push and see it rejected', check: (_s, h) => ran(h, /^git push/) },
      { label: 'Bring the teammate’s commit into your main', check: (s) => inspect.isAncestor(s, s.remote?.branches.main, s.branches.main) },
      { label: 'GitHub’s main matches yours', check: (s) => !!s.remote && s.remote.branches.main === s.branches.main },
    ],
    hints: ['A rejected push means the remote has commits you don’t', 'git pull (or git pull --rebase) integrates them', 'Then git push again'],
    solution: ['git push', 'git pull --rebase', 'git log --oneline', 'git push'],
  },
  {
    id: 'ex-undo-secrets',
    moduleId: 'undoing',
    title: 'Take a secret out of the last commit',
    brief: 'Your last commit (not pushed) accidentally includes secrets.txt. Remove it from the commit but keep the app.js change committed.',
    script: ['git init', 'touch app.js', 'git add .', 'git commit -m "Add app"', 'touch secrets.txt', 'edit app.js', 'git add .', 'git commit -m "Oops: commit secrets"'],
    goals: [
      { label: 'The “Oops” commit is gone from main', check: (s) => !!head(s) && head(s)!.msg !== 'Oops: commit secrets' && head(s)!.msg !== 'Add app' },
      {
        label: 'app.js change is still committed',
        check: (s) => {
          const oops = inspect.findByMsg(s, 'Oops: commit secrets');
          return !!oops && inspect.snapshot(s, head(s)?.id ?? null)['app.js'] === oops.snapshot['app.js'];
        },
      },
      { label: 'secrets.txt is not in the commit', check: (s) => !!head(s) && inspect.snapshot(s, head(s)!.id)['secrets.txt'] === undefined },
    ],
    hints: ['git reset --soft HEAD~1 undoes the commit but keeps everything staged', 'git restore --staged secrets.txt unstages just that file', 'Commit again with a new message'],
    solution: ['git reset --soft HEAD~1', 'git restore --staged secrets.txt', 'git commit -m "Update app"', 'git status'],
  },
  {
    id: 'ex-reflog',
    moduleId: 'advanced',
    title: 'Rescue a deleted branch',
    brief: 'You force-deleted the experiment branch with two unmerged commits. Get them back on a branch called rescue.',
    script: [
      'git init',
      'touch app.js',
      'git add .',
      'git commit -m "Initial commit"',
      'git switch -c experiment',
      'touch theme.css',
      'git add .',
      'git commit -m "Experiment: theme"',
      'edit theme.css',
      'git commit -am "Experiment: dark mode"',
      'git switch main',
      'git branch -D experiment',
    ],
    goals: [
      { label: 'Find the lost commit with git reflog', check: (_s, h) => ran(h, /^git reflog/) },
      {
        label: 'Create branch rescue at “Experiment: dark mode”',
        check: (s) => {
          const lost = inspect.findByMsg(s, 'Experiment: dark mode');
          return !!lost && s.branches['rescue'] === lost.id;
        },
      },
    ],
    hints: ['git reflog shows every place HEAD has been', 'Look for the line “commit: Experiment: dark mode” and copy its hash', 'git branch rescue <hash>'],
    solution: ['git reflog', 'git branch rescue <hash from reflog>'],
  },
  {
    id: 'ex-stash',
    moduleId: 'advanced',
    title: 'Pause work for a hotfix',
    brief: 'You are halfway through editing app.js on feature. Fix a bug on main with a commit, then come back and continue your unfinished work.',
    script: ['git init', 'touch app.js bug.js', 'git add .', 'git commit -m "Initial commit"', 'git switch -c feature', 'edit app.js', 'edit bug.js'],
    goals: [
      { label: 'Save your work with git stash', check: (_s, h) => ran(h, /^git stash( push.*)?$/) },
      { label: 'Commit a fix on main', check: (s) => !!s.branches.main && s.commits[s.branches.main!]?.msg !== 'Initial commit' },
      { label: 'Back on feature with your changes restored', check: (s, h) => s.head === 'feature' && ran(h, /^git stash (pop|apply)/) && inspect.status(s).modified.length > 0 },
    ],
    hints: ['git stash, then git switch main', 'edit bug.js and commit it with -am', 'git switch feature, then git stash pop'],
    solution: ['git stash', 'git switch main', 'edit bug.js', 'git commit -am "Fix crash"', 'git switch feature', 'git stash pop'],
  },
  {
    id: 'ex-pr-branch',
    moduleId: 'github',
    title: 'Prepare a pull request',
    brief: 'Do everything up to “Open a Pull Request” for feature/student-dashboard.',
    script: ['git clone https://github.com/acme/school-app.git'],
    goals: [
      { label: 'Create feature/student-dashboard', check: (s) => 'feature/student-dashboard' in s.branches },
      {
        label: 'Commit work on it',
        check: (s) => {
          const t = s.branches['feature/student-dashboard'];
          return !!t && t !== s.branches.main;
        },
      },
      {
        label: 'Push it with an upstream',
        check: (s) =>
          s.upstream['feature/student-dashboard'] === 'origin/feature/student-dashboard' &&
          s.remote?.branches['feature/student-dashboard'] === s.branches['feature/student-dashboard'],
      },
    ],
    hints: ['git switch -c feature/student-dashboard', 'touch dashboard.tsx, git add, git commit', 'git push -u origin feature/student-dashboard'],
    solution: ['git switch -c feature/student-dashboard', 'touch dashboard.tsx', 'git add .', 'git commit -m "Add student dashboard"', 'git push -u origin feature/student-dashboard'],
  },
];
