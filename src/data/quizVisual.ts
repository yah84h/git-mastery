import type { GraphCommit, GraphState, QuizQuestion } from '../types';

/* compact graph builders */
const c = (id: string, lane: number, col: number, parents: string[] = [], extra: Partial<GraphCommit> = {}): GraphCommit => ({ id, lane, col, parents, ...extra });
type R = [string, string, ('branch' | 'remote' | 'tag')?];
const g = (commits: GraphCommit[], refs: R[], head?: string, laneNames?: string[]): GraphState => ({
  commits,
  refs: refs.map(([name, target, kind]) => ({ name, target, kind: kind ?? 'branch' })),
  head,
  laneNames,
});

const A = c('A', 0, 0);
const B = c('B', 0, 1, ['A']);
const LN = ['main', 'feature'];

/* Diverged history used by several questions: main has E, feature has C, D */
const divergedCommits = [A, B, c('C', 1, 2, ['B']), c('D', 1, 3, ['C']), c('E', 0, 2, ['B'])];
const diverged = (head: string) => g(divergedCommits, [['main', 'E'], ['feature', 'D']], head, LN);

const resMerge = g([...divergedCommits, c('M', 0, 4, ['E', 'D'], { highlight: true })], [['main', 'M'], ['feature', 'D']], 'main', LN);
const resRebaseFeature = g(
  [A, B, c('E', 0, 2, ['B']), c("C'", 1, 3, ['E'], { highlight: true }), c("D'", 1, 4, ["C'"], { highlight: true })],
  [['main', 'E'], ['feature', "D'"]],
  'feature',
  LN,
);
const resSquash = g([...divergedCommits, c('S', 0, 4, ['E'], { highlight: true })], [['main', 'S'], ['feature', 'D']], 'main', LN);
const resLostE = g([A, B, c('C', 1, 2, ['B']), c('D', 1, 3, ['C']), c('E', 0, 2, ['B'], { ghost: true })], [['main', 'D'], ['feature', 'D']], 'main', LN);
const resRebaseMain = g(
  [A, B, c('C', 1, 2, ['B']), c('D', 1, 3, ['C']), c("E'", 1, 4, ['D'], { highlight: true })],
  [['main', "E'"], ['feature', 'D']],
  'main',
  LN,
);

export const visualQuestions: QuizQuestion[] = [
  {
    id: 'v-head',
    topic: 'Git fundamentals',
    prompt: 'You run git commit now. Which commit becomes the parent of the new commit?',
    graph: g([A, B, c('C', 1, 2, ['B'])], [['main', 'B'], ['feature', 'C']], 'feature', LN),
    graphCaption: 'HEAD points to feature.',
    options: ['C, the commit feature points to', 'B, the commit main points to', 'A, the first commit', 'None: it becomes a new root commit'],
    answer: 0,
    explanation: 'A new commit’s parent is whatever HEAD resolves to. HEAD → feature → C, so the new commit is added after C and feature moves to it.',
  },
  {
    id: 'v-merge',
    topic: 'Merge vs rebase',
    prompt: 'You are on main and run git merge feature. Which history is the result?',
    graph: diverged('main'),
    options: ['A merge commit M with parents E and D', 'feature commits copied on top of main', 'main jumps to D and E is left behind', 'One squashed commit S on main'],
    optionGraphs: [resMerge, resRebaseMain, resLostE, resSquash],
    answer: 0,
    explanation: 'Both branches have new commits, so Git can’t fast-forward. It creates merge commit M with two parents (E and D). Nothing is rewritten or lost.',
  },
  {
    id: 'v-rebase',
    topic: 'Merge vs rebase',
    prompt: 'You are on feature and run git rebase main. Which history is the result?',
    graph: diverged('feature'),
    options: ['C and D replayed on top of E as C′ and D′', 'A merge commit on feature', 'One squashed commit on main', 'main jumps to D'],
    optionGraphs: [resRebaseFeature, { ...resMerge, refs: [{ name: 'main', target: 'E', kind: 'branch' }, { name: 'feature', target: 'M', kind: 'branch' }], head: 'feature' }, resSquash, resLostE],
    answer: 0,
    explanation: 'Rebase moves the branch you are on. Your commits are re-created after main’s tip, getting new hashes (C′, D′), so history becomes a straight line.',
  },
  {
    id: 'v-ff',
    topic: 'Merge vs rebase',
    prompt: 'main has no new commits since feature was created. What does git merge feature do on main?',
    graph: g([A, B, c('C', 1, 2, ['B']), c('D', 1, 3, ['C'])], [['main', 'B'], ['feature', 'D']], 'main', LN),
    options: ['main moves forward to D (fast-forward)', 'Creates merge commit M', 'Replays C and D as new commits', 'Fails with a conflict'],
    optionGraphs: [
      g([A, B, c('C', 1, 2, ['B']), c('D', 1, 3, ['C'])], [['main', 'D'], ['feature', 'D']], 'main', LN),
      g([A, B, c('C', 1, 2, ['B']), c('D', 1, 3, ['C']), c('M', 0, 4, ['B', 'D'], { highlight: true })], [['main', 'M'], ['feature', 'D']], 'main', LN),
      g([A, B, c('C', 1, 2, ['B'], { ghost: true }), c('D', 1, 3, ['C'], { ghost: true }), c("C'", 0, 2, ['B']), c("D'", 0, 3, ["C'"])], [['main', "D'"], ['feature', 'D']], 'main', LN),
      g([A, B, c('C', 1, 2, ['B']), c('D', 1, 3, ['C']), c('M', 0, 4, ['B', 'D'], { ghost: true, conflict: true })], [['main', 'B'], ['feature', 'D']], 'main', LN),
    ],
    answer: 0,
    explanation: 'main is an ancestor of feature, so Git simply moves the main pointer to D. No new commit is needed.',
  },
  {
    id: 'v-squash',
    topic: 'Squash merge',
    prompt: 'On main you run git merge --squash feature and then git commit. Which history do you get?',
    graph: diverged('main'),
    options: ['One new commit S on main with a single parent', 'Merge commit M with two parents', 'feature’s commits replayed onto main', 'main moves to D'],
    optionGraphs: [resSquash, resMerge, resRebaseMain, resLostE],
    answer: 0,
    explanation: 'A squash merge stages all of feature’s changes and you commit them as one ordinary commit. It has only one parent, so C and D are not part of main’s history.',
  },
  {
    id: 'v-revert',
    topic: 'Reset vs revert',
    prompt: 'Commit C is a mistake and is already on GitHub. Which result is safe for your team?',
    graph: g([A, B, c('C', 0, 2, ['B'], { conflict: true })], [['main', 'C'], ['origin/main', 'C', 'remote']], 'main'),
    graphCaption: 'C (red ring) is the bad commit.',
    options: ['A new commit R that undoes C', 'main moved back to B, C dropped', 'C replaced by an amended commit C′', 'The main branch deleted'],
    optionGraphs: [
      g([A, B, c('C', 0, 2, ['B']), c('R', 0, 3, ['C'], { highlight: true })], [['main', 'R'], ['origin/main', 'C', 'remote']], 'main'),
      g([A, B, c('C', 0, 2, ['B'], { ghost: true })], [['main', 'B'], ['origin/main', 'C', 'remote']], 'main'),
      g([A, B, c('C', 0, 2, ['B'], { ghost: true }), c("C'", 0, 3, ['B'])], [['main', "C'"], ['origin/main', 'C', 'remote']], 'main'),
      g([A, B, c('C', 0, 2, ['B'])], [['origin/main', 'C', 'remote']]),
    ],
    answer: 0,
    explanation: 'git revert adds a new commit that undoes C. History only moves forward, so teammates can pull normally. The other results rewrite shared history and need a force push.',
  },
  {
    id: 'v-cherry',
    topic: 'Cherry-pick',
    prompt: 'release needs only the crash fix from develop. Which commit do you cherry-pick?',
    graph: g(
      [A, B, c('C', 1, 2, ['B'], { msg: 'New feature' }), c('F', 1, 3, ['C'], { msg: 'Fix crash' }), c('R', 0, 2, ['B'], { msg: 'Release notes' })],
      [['release', 'R'], ['develop', 'F']],
      'release',
      ['release', 'develop'],
    ),
    graphCaption: 'C = “New feature”, F = “Fix crash”. Tap a commit to check.',
    options: ['git cherry-pick F', 'git cherry-pick C', 'git cherry-pick develop~1', 'git merge develop'],
    answer: 0,
    explanation: 'Cherry-pick copies exactly one commit’s changes. F is the fix. C (also develop~1) is the unfinished feature, and merging develop would bring both.',
  },
  {
    id: 'v-reflog',
    topic: 'Reflog',
    prompt: 'After git reset --hard, commit D (dashed) is on no branch. How do you get it back?',
    graph: g([A, B, c('C', 0, 2, ['B']), c('D', 0, 3, ['C'], { ghost: true })], [['main', 'C']], 'main'),
    options: ['Find its hash with git reflog, then git branch rescue <hash>', 'git pull', 'git revert D', 'git stash pop'],
    answer: 0,
    explanation: 'The commit still exists until garbage collection. git reflog lists where HEAD has been, so you can recover the hash and point a branch at it.',
  },
  {
    id: 'v-branch',
    topic: 'Branching',
    prompt: 'You are on main and run git branch feature, then git commit. Which history is the result?',
    graph: g([A, B], [['main', 'B']], 'main'),
    options: ['The new commit is on main; feature stays at B', 'The new commit is on feature; main stays at B', 'Both branches move to the new commit', 'Nothing happens: you must switch first'],
    optionGraphs: [
      g([A, B, c('C', 0, 2, ['B'], { highlight: true })], [['main', 'C'], ['feature', 'B']], 'main'),
      g([A, B, c('C', 1, 2, ['B'], { highlight: true })], [['main', 'B'], ['feature', 'C']], 'feature', LN),
      g([A, B, c('C', 0, 2, ['B'], { highlight: true })], [['main', 'C'], ['feature', 'C']], 'main'),
      g([A, B], [['main', 'B'], ['feature', 'B']], 'main'),
    ],
    answer: 0,
    explanation: 'git branch only creates a pointer; it does not switch. HEAD still points to main, so the commit moves main forward while feature stays at B.',
  },
  {
    id: 'v-conflict',
    topic: 'Merge conflicts',
    prompt: 'git merge feature stopped with a conflict. What does the red, dashed commit mean?',
    graph: g([A, B, c('C', 1, 2, ['B']), c('D', 0, 2, ['B']), c('M', 0, 3, ['D', 'C'], { ghost: true, conflict: true })], [['main', 'D'], ['feature', 'C']], 'main', LN),
    options: [
      'The merge commit does not exist yet: fix the files, git add, then git commit',
      'The merge finished but deleted feature',
      'Git chose main’s version automatically',
      'The commit was pushed with conflict markers',
    ],
    answer: 0,
    explanation: 'Git pauses before creating the merge commit. main still points to D until you resolve the files, stage them, and commit (or run git merge --abort).',
  },
  {
    id: 'v-push',
    topic: 'Push',
    prompt: 'You fetched and see this. Why will git push be rejected?',
    graph: g(
      [A, B, c('C', 0, 2, ['B']), c('E', 1, 3, ['C'], { msg: 'Teammate commit' }), c('D', 0, 3, ['C'], { msg: 'Your commit' })],
      [['main', 'D'], ['origin/main', 'E', 'remote']],
      'main',
      ['main', 'origin'],
    ),
    options: [
      'origin/main has commit E that your main doesn’t contain',
      'Your main is behind origin/main only',
      'You have uncommitted changes',
      'Remote branches can’t be pushed to',
    ],
    answer: 0,
    explanation: 'Push only fast-forwards the remote. The histories diverged, so integrate E first (git pull or git pull --rebase), then push.',
  },
  {
    id: 'v-remote',
    topic: 'Remote repositories',
    prompt: 'What will git status report for this branch?',
    graph: g([A, B, c('C', 0, 2, ['B']), c('D', 0, 3, ['C'])], [['main', 'D'], ['origin/main', 'B', 'remote']], 'main'),
    options: ["Your branch is ahead of 'origin/main' by 2 commits", "Your branch is behind 'origin/main' by 2 commits", 'Your branch and origin/main have diverged', 'Your branch is up to date'],
    answer: 0,
    explanation: 'C and D are on main but not on origin/main, so you are 2 commits ahead. git push will publish them.',
  },
  {
    id: 'v-fetch',
    topic: 'Fetch vs pull',
    prompt: 'You just ran git fetch. Which command brings C into your main branch?',
    graph: g([A, B, c('C', 0, 2, ['B'], { highlight: true })], [['main', 'B'], ['origin/main', 'C', 'remote']], 'main'),
    options: ['git merge origin/main', 'git push', 'git fetch again', 'git branch -d origin/main'],
    answer: 0,
    explanation: 'fetch only moved origin/main. Merging origin/main (or running git pull, which does fetch + merge) moves your main to C.',
  },
  {
    id: 'v-pr',
    topic: 'GitHub Pull Requests',
    prompt: 'Which result comes from GitHub’s “Squash and merge” button for this PR?',
    graph: diverged('main'),
    graphCaption: 'PR: feature → main',
    options: ['One new commit S on main', 'Merge commit M with two parents', 'C and D re-created on main', 'main jumps to D'],
    optionGraphs: [
      resSquash,
      resMerge,
      g(
        [A, B, c('C', 1, 2, ['B'], { ghost: true }), c('D', 1, 3, ['C'], { ghost: true }), c('E', 0, 2, ['B']), c("C'", 0, 3, ['E']), c("D'", 0, 4, ["C'"])],
        [['main', "D'"], ['feature', 'D']],
        'main',
        LN,
      ),
      resLostE,
    ],
    answer: 0,
    explanation: 'Squash and merge combines all PR commits into a single commit S on main. Merge commit keeps C and D; rebase and merge re-creates them.',
  },
];
