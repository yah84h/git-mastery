import type { QuizQuestion } from '../types';
import { visualQuestions } from './quizVisual';

/**
 * Question bank. Each run picks one question per topic (15 topics = 15 questions),
 * then shuffles question order and answer order.
 * `answer` is the index of the correct option before shuffling.
 */
export const questionBank: QuizQuestion[] = [
  // Git fundamentals
  {
    id: 'fund-1',
    topic: 'Git fundamentals',
    prompt: 'What is the relationship between Git and GitHub?',
    options: [
      'Git is a version control tool; GitHub is a service that hosts Git repositories',
      'GitHub is the command-line version of Git',
      'They are two names for the same product',
      'Git only works if you have a GitHub account',
    ],
    answer: 0,
    explanation: 'Git runs locally and tracks history. GitHub hosts Git repositories online and adds pull requests, issues and reviews. Git works fine without GitHub.',
  },
  {
    id: 'fund-2',
    topic: 'Git fundamentals',
    prompt: 'What does HEAD usually point to?',
    options: ['The branch you currently have checked out', 'The first commit in the repository', 'The newest commit on GitHub', 'The staging area'],
    answer: 0,
    explanation: 'HEAD normally points to a branch (for example main), which points to a commit. If HEAD points directly at a commit, you are in detached HEAD state.',
  },
  // init vs clone
  {
    id: 'init-1',
    topic: 'Git init vs clone',
    prompt: 'You want a local copy of an existing GitHub project with its full history. Which command do you use?',
    options: ['git clone <url>', 'git init <url>', 'git pull <url> into an empty folder', 'git remote add origin <url>'],
    answer: 0,
    explanation: 'git clone downloads the repository with all history and configures origin. git init creates a new, empty repository.',
  },
  // add vs commit
  {
    id: 'add-1',
    topic: 'Add vs commit',
    prompt: 'You edited app.js and ran git add app.js. What has happened?',
    options: [
      'The change is staged for the next commit but not saved in history yet',
      'The change is saved as a new commit',
      'The change is uploaded to GitHub',
      'The file is now ignored by Git',
    ],
    answer: 0,
    explanation: 'git add copies the change to the staging area. Only git commit records it in the local history, and only git push sends it to the remote.',
  },
  {
    id: 'add-2',
    topic: 'Add vs commit',
    prompt: 'You staged a file, then edited it again before committing. What does git commit save?',
    options: ['The version that was staged', 'The latest version on disk', 'Both versions as two commits', 'Nothing, Git reports an error'],
    answer: 0,
    explanation: 'The commit contains what is in the staging area. Run git add again to include the newer edits.',
  },
  // fetch vs pull
  {
    id: 'fetch-1',
    topic: 'Fetch vs pull',
    prompt: 'What is the difference between git fetch and git pull?',
    options: [
      'fetch downloads remote commits only; pull fetches and then integrates them into your branch',
      'fetch uploads commits; pull downloads them',
      'pull downloads commits only; fetch also merges',
      'There is no difference',
    ],
    answer: 0,
    explanation: 'git fetch updates remote-tracking branches like origin/main without touching your branch. git pull is git fetch followed by a merge (or rebase).',
  },
  // merge vs rebase
  {
    id: 'rebase-1',
    topic: 'Merge vs rebase',
    prompt: 'Which statement about git rebase is true?',
    options: [
      'It rewrites commits, so you should not rebase commits others already pulled',
      'It always creates a merge commit',
      'It deletes the other branch',
      'It is only available on GitHub',
    ],
    answer: 0,
    explanation: 'Rebase replays commits as new commits with new hashes. Doing that to shared commits causes duplicated, conflicting history for teammates.',
  },
  {
    id: 'merge-ff',
    topic: 'Merge vs rebase',
    prompt: 'main has no new commits since feature branched off. What does git merge feature do on main?',
    options: ['A fast-forward: main moves to feature’s latest commit', 'Creates a merge commit with two parents', 'Rebases feature onto main', 'Fails with a conflict'],
    answer: 0,
    explanation: 'When the current branch is an ancestor of the other branch, Git just moves the pointer forward. No merge commit is needed.',
  },
  // squash
  {
    id: 'squash-1',
    topic: 'Squash merge',
    prompt: 'What does git merge --squash feature do?',
    options: [
      'Stages all changes from feature as one set, which you then commit as a single commit',
      'Deletes all commits on feature',
      'Creates a merge commit and pushes it',
      'Combines feature’s commits and force-pushes the branch',
    ],
    answer: 0,
    explanation: 'It applies the branch’s total change to the staging area without committing. You finish with git commit, producing one commit on your branch.',
  },
  // reset vs revert
  {
    id: 'revert-1',
    topic: 'Reset vs revert',
    prompt: 'A bad commit is already pushed to main and teammates have pulled it. What is the safest way to undo it?',
    options: ['git revert <commit>', 'git reset --hard HEAD~1 then git push --force', 'git commit --amend', 'git restore <file>'],
    answer: 0,
    explanation: 'git revert adds a new commit that undoes the changes, so history only moves forward. Resetting and force-pushing rewrites shared history.',
  },
  {
    id: 'reset-1',
    topic: 'Reset vs revert',
    prompt: 'Which command undoes your last local commit but keeps its changes staged?',
    options: ['git reset --soft HEAD~1', 'git reset --hard HEAD~1', 'git revert HEAD', 'git restore --staged .'],
    answer: 0,
    explanation: '--soft moves the branch back but leaves the staging area and working directory untouched, so the changes remain staged.',
  },
  // stash
  {
    id: 'stash-1',
    topic: 'Stash',
    prompt: 'You are mid-feature and must switch branches for an urgent fix without committing. What should you run first?',
    options: ['git stash', 'git reset --hard', 'git clean -f', 'git branch -D'],
    answer: 0,
    explanation: 'git stash saves your uncommitted changes and gives you a clean working directory. Later, git stash pop brings them back.',
  },
  // cherry-pick
  {
    id: 'cherry-1',
    topic: 'Cherry-pick',
    prompt: 'You need one specific bug-fix commit from develop on your release branch, without the rest of develop. Which command fits?',
    options: ['git cherry-pick <commit>', 'git merge develop', 'git rebase develop', 'git pull develop'],
    answer: 0,
    explanation: 'cherry-pick copies the changes of a single commit onto your current branch as a new commit.',
  },
  // reflog
  {
    id: 'reflog-1',
    topic: 'Reflog',
    prompt: 'After git reset --hard you realize you need the commit you just removed. Where do you find its hash?',
    options: ['git reflog', 'git log --oneline', 'git status', 'git stash list'],
    answer: 0,
    explanation: 'git reflog lists every position HEAD has been at, including commits no longer on any branch. git log only shows reachable commits.',
  },
  // branching
  {
    id: 'branch-1',
    topic: 'Branching',
    prompt: 'Which single command creates a new branch and switches to it?',
    options: ['git switch -c feature/login', 'git branch feature/login', 'git switch feature/login', 'git merge feature/login'],
    answer: 0,
    explanation: 'git switch -c creates and switches in one step (same as git checkout -b). git branch <name> only creates it.',
  },
  {
    id: 'branch-2',
    topic: 'Branching',
    prompt: 'In Git, a branch is best described as…',
    options: ['A movable pointer to a commit', 'A full copy of all project files', 'A folder on GitHub', 'A backup of the staging area'],
    answer: 0,
    explanation: 'A branch is a lightweight reference to a commit. That is why creating and switching branches is instant.',
  },
  // merge conflicts
  {
    id: 'conflict-1',
    topic: 'Merge conflicts',
    prompt: 'You fixed the conflict markers in header.html during a merge. What are the next two steps?',
    options: ['git add header.html, then git commit', 'git push, then git pull', 'git stash, then git merge again', 'git reset --hard, then git commit'],
    answer: 0,
    explanation: 'Staging the file marks the conflict as resolved. Committing completes the merge. git merge --abort would cancel instead.',
  },
  // push
  {
    id: 'push-1',
    topic: 'Push',
    prompt: 'git push is rejected with “Updates were rejected because the remote contains work that you do not have locally.” What should you do?',
    options: ['git pull (or fetch and merge/rebase), then push again', 'git push --force immediately', 'Delete the remote branch', 'git reset --hard origin/main and lose your commits'],
    answer: 0,
    explanation: 'Someone else pushed first. Integrate their commits locally, resolve any conflicts, then push. Force pushing would delete their work.',
  },
  {
    id: 'push-2',
    topic: 'Push',
    prompt: 'What does the -u in git push -u origin feature/login do?',
    options: [
      'Sets origin/feature/login as the upstream so plain git push and git pull work later',
      'Updates all branches at once',
      'Pushes uncommitted changes',
      'Undoes the last push',
    ],
    answer: 0,
    explanation: '-u (--set-upstream) links the local branch to the remote branch, so Git knows where future pushes and pulls go.',
  },
  // remote repositories
  {
    id: 'remote-1',
    topic: 'Remote repositories',
    prompt: 'What is origin?',
    options: ['The default name for the remote you cloned from', 'The first commit in history', 'The main branch on GitHub', 'A special branch that cannot be deleted'],
    answer: 0,
    explanation: 'origin is just a nickname for a remote URL that git clone sets up automatically. You can rename or remove it.',
  },
  // GitHub pull requests
  {
    id: 'pr-1',
    topic: 'GitHub Pull Requests',
    prompt: 'A reviewer requests changes on your open pull request. How do you update the PR?',
    options: ['Commit the fixes on the same branch and push; the PR updates automatically', 'Close the PR and open a new one', 'Push the fixes directly to main', 'Email the reviewer a patch'],
    answer: 0,
    explanation: 'A PR tracks a branch. Any new commits pushed to that branch appear in the PR right away.',
  },
  {
    id: 'pr-2',
    topic: 'GitHub Pull Requests',
    prompt: 'Which GitHub merge option puts all of a PR’s changes into exactly one commit on main?',
    options: ['Squash and merge', 'Create a merge commit', 'Rebase and merge', 'Close pull request'],
    answer: 0,
    explanation: 'Squash and merge combines every commit in the PR into a single commit on the base branch.',
  },
];

export const questionPool: QuizQuestion[] = [...questionBank, ...visualQuestions];

export const QUESTIONS_PER_RUN = 15;
export const SECONDS_PER_QUESTION = 20;
export const BONUS_UNDER_SECONDS = 5;
export const POINTS_CORRECT = 100;
export const POINTS_BONUS = 50;

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One random question per topic (visual ones preferred), shuffled order and shuffled options. */
export function buildRun() {
  const byTopic = new Map<string, QuizQuestion[]>();
  for (const q of questionPool) byTopic.set(q.topic, [...(byTopic.get(q.topic) ?? []), q]);
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  const picked = [...byTopic.values()].map((qs) => {
    const visual = qs.filter((q) => q.graph || q.optionGraphs);
    return visual.length && Math.random() < 0.7 ? pick(visual) : pick(qs);
  });
  return shuffle(picked)
    .slice(0, QUESTIONS_PER_RUN)
    .map((q) => ({
      ...q,
      shuffled: shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer, graph: q.optionGraphs?.[i] }))),
    }));
}

export function performanceLevel(accuracy: number) {
  if (accuracy <= 40) return { label: 'Git Beginner', tone: 'bad' as const, note: 'Revisit the modules, then try again. Every Git expert started here.' };
  if (accuracy <= 70) return { label: 'Git Explorer', tone: 'warn' as const, note: 'Solid foundation. Review the topics you missed below.' };
  if (accuracy <= 90) return { label: 'Git Developer', tone: 'info' as const, note: 'You know your way around a real team workflow.' };
  return { label: 'Git Master', tone: 'ok' as const, note: 'Excellent. You are ready to help others untangle their repos.' };
}
