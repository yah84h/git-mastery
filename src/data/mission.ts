import type { GraphCommit, GraphRef, GraphState } from '../types';

export interface MissionOption {
  cmd: string;
  correct?: boolean;
  /** Why this is right, or what would go wrong */
  why: string;
}

export interface RepoStatus {
  working: string;
  stash: string;
  merge: string;
  sync: string;
}

export interface MissionStep {
  goal: string;
  situation: string;
  options: MissionOption[];
  /** Graph + status shown after this step is solved */
  after: { graph: GraphState; status: RepoStatus; terminal: string };
}

const FB = 'feature/login';
const c = (id: string, lane: number, col: number, parents: string[], msg: string, extra: Partial<GraphCommit> = {}): GraphCommit => ({
  id,
  lane,
  col,
  parents,
  msg,
  ...extra,
});
const b = (name: string, target: string): GraphRef => ({ name, target, kind: 'branch' });
const r = (name: string, target: string): GraphRef => ({ name, target, kind: 'remote' });

const base = [
  c('a1f', 0, 0, [], 'Initial commit'),
  c('b2e', 0, 1, ['a1f'], 'Project setup'),
  c('c3d', 1, 2, ['b2e'], 'Add login form'),
  c('x9z', 1, 3, ['c3d'], 'Delete validation tests'),
];
const upstreamGhost = [c('m4a', 0, 2, ['b2e'], 'Refactor auth service', { ghost: true }), c('m5b', 0, 3, ['m4a'], 'Add rate limiting', { ghost: true })];
const upstream = [c('m4a', 0, 2, ['b2e'], 'Refactor auth service'), c('m5b', 0, 3, ['m4a'], 'Add rate limiting')];
const revertC = c('r6c', 1, 4, ['x9z'], 'Revert "Delete validation tests"');
const lanes = ['main', FB];

export const missionIntro = {
  title: 'Git Mission: Save the Repository',
  story:
    'You are on feature/login. Yesterday you pushed a commit that deleted the validation tests by mistake. Today you have three files of unfinished work, and your teammates have pushed two important commits to main that your branch needs. Bring the branch back to health and publish it, without losing anyone’s work.',
  problems: [
    'Uncommitted changes in 3 files',
    'Pushed mistake commit x9z “Delete validation tests”',
    'feature/login is behind main',
    'A merge conflict is waiting in src/auth.ts',
    'origin/feature/login needs updating',
  ],
};

export const missionStart: { graph: GraphState; status: RepoStatus } = {
  graph: {
    commits: [...base, ...upstreamGhost],
    refs: [b(FB, 'x9z'), r('origin/' + FB, 'x9z'), r('origin/main', 'b2e')],
    head: FB,
    laneNames: lanes,
  },
  status: {
    working: '3 modified files (unfinished work)',
    stash: 'empty',
    merge: 'none',
    sync: 'origin/main is out of date (2 new commits on GitHub)',
  },
};

export const missionSteps: MissionStep[] = [
  {
    goal: 'Protect your unfinished work',
    situation: 'You need a clean working directory before undoing commits and merging, but your 3 modified files aren’t ready to commit.',
    options: [
      { cmd: 'git stash', correct: true, why: 'Stash saves the uncommitted changes and gives you a clean working directory. You will restore them at the end.' },
      { cmd: 'git reset --hard', why: 'This would permanently delete your 3 files of unfinished work.' },
      { cmd: 'git commit --amend', why: 'This would mix unfinished work into the last commit and rewrite a commit that is already pushed.' },
      { cmd: 'git clean -f', why: 'clean removes untracked files only, and permanently. It doesn’t save modified tracked files.' },
    ],
    after: {
      graph: missionStart.graph,
      status: { ...missionStart.status, working: 'clean', stash: 'stash@{0}: WIP on feature/login' },
      terminal: 'Saved working directory and index state WIP on feature/login: x9z Delete validation tests',
    },
  },
  {
    goal: 'Undo the mistaken commit',
    situation: 'Commit x9z deleted the validation tests. It is already on GitHub, and a teammate is reviewing this branch.',
    options: [
      { cmd: 'git revert x9z', correct: true, why: 'The commit is already shared, so you undo it with a new commit. History only moves forward and nobody’s clone breaks.' },
      { cmd: 'git reset --hard HEAD~1', why: 'Reset rewrites history. Since x9z is already pushed, you would need a force push that breaks your reviewer’s copy.' },
      { cmd: 'git restore tests/', why: 'restore works on uncommitted changes. The deletion is already committed, so this does nothing.' },
      { cmd: 'git branch -D feature/login', why: 'Deleting the branch throws away all your work instead of fixing one commit.' },
    ],
    after: {
      graph: {
        commits: [...base, ...upstreamGhost, { ...revertC, highlight: true }],
        refs: [b(FB, 'r6c'), r('origin/' + FB, 'x9z'), r('origin/main', 'b2e')],
        head: FB,
        laneNames: lanes,
      },
      status: { ...missionStart.status, working: 'clean', stash: 'stash@{0}: WIP on feature/login', sync: 'feature/login is 1 ahead of origin/feature/login' },
      terminal: '[feature/login r6c] Revert "Delete validation tests"\n 3 files changed, 120 insertions(+)',
    },
  },
  {
    goal: 'See what your teammates pushed',
    situation: 'Your origin/main bookmark is stale. Download the new commits without changing your branch yet.',
    options: [
      { cmd: 'git fetch origin', correct: true, why: 'fetch downloads the new commits and updates origin/main, without touching your branch or files.' },
      { cmd: 'git push', why: 'push sends your commits. It doesn’t download anything.' },
      { cmd: 'git clone <url>', why: 'clone creates a whole new copy of the repository. You already have one.' },
      { cmd: 'git reset --hard origin/main', why: 'This would move feature/login to main’s commit and delete your feature work from the branch.' },
    ],
    after: {
      graph: {
        commits: [...base, ...upstream.map((x) => ({ ...x, highlight: true })), revertC],
        refs: [b(FB, 'r6c'), r('origin/' + FB, 'x9z'), r('origin/main', 'm5b')],
        head: FB,
        laneNames: lanes,
      },
      status: { working: 'clean', stash: 'stash@{0}: WIP on feature/login', merge: 'none', sync: 'feature/login is missing 2 commits from origin/main' },
      terminal: 'From github.com:acme/school-app\n   b2e..m5b  main -> origin/main',
    },
  },
  {
    goal: 'Bring main’s changes into your branch',
    situation: 'feature/login is already pushed and under review, so you must not rewrite its commits.',
    options: [
      { cmd: 'git merge origin/main', correct: true, why: 'Merging integrates main’s commits without rewriting your pushed history.' },
      { cmd: 'git rebase origin/main', why: 'Rebase would give your pushed commits new hashes and require a force push on a branch someone is reviewing.' },
      { cmd: 'git cherry-pick origin/main', why: 'cherry-pick copies only one commit (m5b) and would miss m4a.' },
      { cmd: 'git merge --abort', why: 'There is no merge in progress to abort yet.' },
    ],
    after: {
      graph: {
        commits: [...base, ...upstream, revertC, c('mg7', 1, 5, ['r6c', 'm5b'], 'merge in progress', { ghost: true, conflict: true })],
        refs: [b(FB, 'r6c'), r('origin/' + FB, 'x9z'), r('origin/main', 'm5b')],
        head: FB,
        laneNames: lanes,
      },
      status: { working: 'src/auth.ts has conflict markers', stash: 'stash@{0}: WIP on feature/login', merge: 'MERGING: conflict in src/auth.ts', sync: 'merge not finished' },
      terminal: 'Auto-merging src/auth.ts\nCONFLICT (content): Merge conflict in src/auth.ts\nAutomatic merge failed; fix conflicts and then commit the result.',
    },
  },
  {
    goal: 'Mark the conflict as resolved',
    situation: 'You opened src/auth.ts, combined both versions of login(), and removed the <<<<<<< ======= >>>>>>> markers.',
    options: [
      { cmd: 'git add src/auth.ts', correct: true, why: 'Staging a conflicted file tells Git you resolved it.' },
      { cmd: 'git push --force', why: 'The merge isn’t finished, and force pushing could delete your teammates’ work.' },
      { cmd: 'git stash', why: 'You can’t stash in the middle of a conflicted merge, and you would lose track of the resolution.' },
      { cmd: 'git rebase --continue', why: 'You are in a merge, not a rebase.' },
    ],
    after: {
      graph: {
        commits: [...base, ...upstream, revertC, c('mg7', 1, 5, ['r6c', 'm5b'], 'ready to commit', { ghost: true })],
        refs: [b(FB, 'r6c'), r('origin/' + FB, 'x9z'), r('origin/main', 'm5b')],
        head: FB,
        laneNames: lanes,
      },
      status: { working: 'src/auth.ts resolved and staged', stash: 'stash@{0}: WIP on feature/login', merge: 'MERGING: all conflicts fixed', sync: 'merge not finished' },
      terminal: 'All conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)',
    },
  },
  {
    goal: 'Finish the merge',
    situation: 'All conflicts are resolved and staged.',
    options: [
      { cmd: 'git commit', correct: true, why: 'Committing creates the merge commit with two parents and completes the merge.' },
      { cmd: 'git commit --amend', why: 'Amend would rewrite the revert commit instead of creating the merge commit.' },
      { cmd: 'git revert HEAD', why: 'That undoes the revert you just made, bringing the mistake back.' },
      { cmd: 'git merge --abort', why: 'That throws away your conflict resolution and cancels the merge.' },
    ],
    after: {
      graph: {
        commits: [...base, ...upstream, revertC, c('mg7', 1, 5, ['r6c', 'm5b'], "Merge remote-tracking branch 'origin/main'", { highlight: true })],
        refs: [b(FB, 'mg7'), r('origin/' + FB, 'x9z'), r('origin/main', 'm5b')],
        head: FB,
        laneNames: lanes,
      },
      status: { working: 'clean', stash: 'stash@{0}: WIP on feature/login', merge: 'none', sync: 'feature/login is 2 ahead of origin/feature/login' },
      terminal: "[feature/login mg7] Merge remote-tracking branch 'origin/main'",
    },
  },
  {
    goal: 'Update the remote branch',
    situation: 'Your local branch has the revert and the merge. GitHub still shows the old branch with the mistake.',
    options: [
      { cmd: 'git push', correct: true, why: 'A normal push works because you only added commits. No history was rewritten, so no force is needed.' },
      { cmd: 'git push --force', why: 'Never force when a normal push works. It could overwrite commits your reviewer pushed.' },
      { cmd: 'git pull --rebase', why: 'The remote branch has nothing new, and rebasing would rewrite the merge you just made.' },
      { cmd: 'git fetch', why: 'fetch downloads. You need to upload.' },
    ],
    after: {
      graph: {
        commits: [...base, ...upstream, revertC, c('mg7', 1, 5, ['r6c', 'm5b'], "Merge remote-tracking branch 'origin/main'")],
        refs: [b(FB, 'mg7'), r('origin/' + FB, 'mg7'), r('origin/main', 'm5b')],
        head: FB,
        laneNames: lanes,
      },
      status: { working: 'clean', stash: 'stash@{0}: WIP on feature/login', merge: 'none', sync: 'up to date with origin/feature/login' },
      terminal: 'To github.com:acme/school-app.git\n   x9z..mg7  feature/login -> feature/login',
    },
  },
  {
    goal: 'Get your unfinished work back',
    situation: 'The branch is healthy and published. Time to continue where you left off.',
    options: [
      { cmd: 'git stash pop', correct: true, why: 'pop re-applies your saved changes and removes them from the stash list.' },
      { cmd: 'git stash list', why: 'list only shows your stashes. It doesn’t restore anything.' },
      { cmd: 'git stash drop', why: 'drop deletes the stash, and your unfinished work with it.' },
      { cmd: 'git restore .', why: 'restore discards working-directory changes. There’s nothing there, and your work is in the stash.' },
    ],
    after: {
      graph: {
        commits: [...base, ...upstream, revertC, c('mg7', 1, 5, ['r6c', 'm5b'], "Merge remote-tracking branch 'origin/main'")],
        refs: [b(FB, 'mg7'), r('origin/' + FB, 'mg7'), r('origin/main', 'm5b')],
        head: FB,
        laneNames: lanes,
      },
      status: { working: '3 modified files (your work is back)', stash: 'empty', merge: 'none', sync: 'up to date with origin/feature/login' },
      terminal: 'On branch feature/login\nChanges not staged for commit:\n  modified: src/LoginForm.tsx\n  modified: src/api.ts\n  modified: README.md\nDropped refs/stash@{0}',
    },
  },
];
