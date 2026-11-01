import type { GraphCommit, GraphRef, GraphScenario, GraphState } from '../types';

/* Small helpers to keep scenario definitions readable */
const c = (id: string, lane: number, col: number, parents: string[] = [], msg?: string, extra: Partial<GraphCommit> = {}): GraphCommit => ({
  id,
  lane,
  col,
  parents,
  msg,
  ...extra,
});
const br = (name: string, target: string): GraphRef => ({ name, target, kind: 'branch' });
const rm = (name: string, target: string): GraphRef => ({ name, target, kind: 'remote' });
const st = (commits: GraphCommit[], refs: GraphRef[], head: string, laneNames?: string[]): GraphState => ({
  commits,
  refs,
  head,
  laneNames,
});

const A = c('A', 0, 0, [], 'Initial commit');
const B = c('B', 0, 1, ['A'], 'Add layout');

/* ------------------------------ Module 4 ------------------------------ */
export const branchingScenarios: GraphScenario[] = [
  {
    id: 'ff',
    title: 'Fast-forward merge',
    frames: [
      { caption: 'main has two commits. HEAD points at main.', state: st([A, B], [br('main', 'B')], 'main') },
      {
        command: 'git switch -c feature',
        caption: 'A new branch is just a new pointer at the same commit. HEAD now follows feature.',
        state: st([A, B], [br('main', 'B'), br('feature', 'B')], 'feature'),
      },
      {
        command: 'git commit -m "Add form"',
        caption: 'Committing moves only the branch HEAD is on. main stays at B.',
        state: st([A, B, c('C', 1, 2, ['B'], 'Add form')], [br('main', 'B'), br('feature', 'C')], 'feature', ['main', 'feature']),
      },
      {
        command: 'git commit -m "Validate form"',
        caption: 'feature is now two commits ahead of main.',
        state: st(
          [A, B, c('C', 1, 2, ['B'], 'Add form'), c('D', 1, 3, ['C'], 'Validate form')],
          [br('main', 'B'), br('feature', 'D')],
          'feature',
          ['main', 'feature'],
        ),
      },
      {
        command: 'git switch main && git merge feature',
        caption: 'main had no new commits, so Git fast-forwards: the main pointer simply jumps to D. No merge commit.',
        state: st(
          [A, B, c('C', 1, 2, ['B'], 'Add form'), c('D', 1, 3, ['C'], 'Validate form')],
          [br('main', 'D'), br('feature', 'D')],
          'main',
          ['main', 'feature'],
        ),
      },
    ],
  },
  {
    id: 'merge',
    title: 'Three-way merge',
    frames: [
      {
        caption: 'Both branches moved on after B. Neither contains the other, so a fast-forward is impossible.',
        state: st(
          [A, B, c('C', 1, 2, ['B'], 'Add form'), c('D', 1, 3, ['C'], 'Validate form'), c('E', 0, 2, ['B'], 'Fix footer')],
          [br('main', 'E'), br('feature', 'D')],
          'main',
          ['main', 'feature'],
        ),
      },
      {
        command: 'git merge feature',
        caption: 'Git compares B (common ancestor), E and D, then creates merge commit M with two parents.',
        state: st(
          [
            A,
            B,
            c('C', 1, 2, ['B'], 'Add form'),
            c('D', 1, 3, ['C'], 'Validate form'),
            c('E', 0, 2, ['B'], 'Fix footer'),
            c('M', 0, 4, ['E', 'D'], "Merge branch 'feature'", { highlight: true }),
          ],
          [br('main', 'M'), br('feature', 'D')],
          'main',
          ['main', 'feature'],
        ),
      },
    ],
  },
  {
    id: 'rebase',
    title: 'Rebase',
    frames: [
      {
        caption: 'Same starting point: main has E, feature has C and D. You are on feature.',
        state: st(
          [A, B, c('C', 1, 2, ['B'], 'Add form'), c('D', 1, 3, ['C'], 'Validate form'), c('E', 0, 2, ['B'], 'Fix footer')],
          [br('main', 'E'), br('feature', 'D')],
          'feature',
          ['main', 'feature'],
        ),
      },
      {
        command: 'git rebase main',
        caption: 'Git replays C and D on top of E as brand-new commits C′ and D′. The originals are left behind (faded).',
        state: st(
          [
            A,
            B,
            c('C', 1, 2, ['B'], 'Add form', { ghost: true }),
            c('D', 1, 3, ['C'], 'Validate form', { ghost: true }),
            c('E', 0, 2, ['B'], 'Fix footer'),
            c("C'", 1, 3, ['E'], 'Add form', { highlight: true }),
            c("D'", 1, 4, ["C'"], 'Validate form', { highlight: true }),
          ],
          [br('main', 'E'), br('feature', "D'")],
          'feature',
          ['main', 'feature'],
        ),
      },
      {
        command: 'git switch main && git merge feature',
        caption: 'feature now sits on top of main, so merging is a fast-forward. History is one straight line.',
        state: st(
          [
            A,
            B,
            c('E', 0, 2, ['B'], 'Fix footer'),
            c("C'", 1, 3, ['E'], 'Add form'),
            c("D'", 1, 4, ["C'"], 'Validate form'),
          ],
          [br('main', "D'"), br('feature', "D'")],
          'main',
          ['main', 'feature'],
        ),
      },
    ],
  },
  {
    id: 'squash',
    title: 'Squash merge',
    frames: [
      {
        caption: 'feature has three small “work in progress” commits.',
        state: st(
          [A, B, c('C', 1, 2, ['B'], 'wip'), c('D', 1, 3, ['C'], 'wip 2'), c('E', 1, 4, ['D'], 'fix typo')],
          [br('main', 'B'), br('feature', 'E')],
          'main',
          ['main', 'feature'],
        ),
      },
      {
        command: 'git merge --squash feature && git commit -m "Add form"',
        caption: 'All changes from C, D and E land on main as one new commit S. S has a single parent, so main’s history doesn’t include the wip commits.',
        state: st(
          [
            A,
            B,
            c('C', 1, 2, ['B'], 'wip'),
            c('D', 1, 3, ['C'], 'wip 2'),
            c('E', 1, 4, ['D'], 'fix typo'),
            c('S', 0, 5, ['B'], 'Add form', { highlight: true }),
          ],
          [br('main', 'S'), br('feature', 'E')],
          'main',
          ['main', 'feature'],
        ),
      },
    ],
  },
  {
    id: 'conflict',
    title: 'Merge conflict',
    frames: [
      {
        caption: 'Both branches changed the same line of header.html in different ways.',
        state: st(
          [A, B, c('C', 1, 2, ['B'], 'Header: blue'), c('D', 0, 2, ['B'], 'Header: red')],
          [br('main', 'D'), br('feature', 'C')],
          'main',
          ['main', 'feature'],
        ),
      },
      {
        command: 'git merge feature',
        caption: 'CONFLICT (content): Merge conflict in header.html. Git pauses and waits for you. The merge commit doesn’t exist yet.',
        state: st(
          [
            A,
            B,
            c('C', 1, 2, ['B'], 'Header: blue'),
            c('D', 0, 2, ['B'], 'Header: red'),
            c('M', 0, 3, ['D', 'C'], 'merge in progress', { ghost: true, conflict: true }),
          ],
          [br('main', 'D'), br('feature', 'C')],
          'main',
          ['main', 'feature'],
        ),
      },
      {
        command: 'edit header.html → git add header.html → git commit',
        caption: 'You pick the final version, remove the <<<<<<< ======= >>>>>>> markers, stage the file, and commit. The merge is done.',
        state: st(
          [
            A,
            B,
            c('C', 1, 2, ['B'], 'Header: blue'),
            c('D', 0, 2, ['B'], 'Header: red'),
            c('M', 0, 3, ['D', 'C'], "Merge branch 'feature'", { highlight: true }),
          ],
          [br('main', 'M'), br('feature', 'C')],
          'main',
          ['main', 'feature'],
        ),
      },
    ],
  },
];

/* ------------------------------ Module 5 ------------------------------ */
export const remoteScenarios: GraphScenario[] = [
  {
    id: 'fetch-pull-push',
    title: 'Fetch, pull, push',
    frames: [
      {
        caption: 'Your main and origin/main (your bookmark of GitHub’s main) both point at B.',
        state: st([A, B], [br('main', 'B'), rm('origin/main', 'B')], 'main'),
      },
      {
        caption: 'A teammate pushes C to GitHub. Your repository doesn’t know about it yet (shown faded).',
        state: st([A, B, c('C', 0, 2, ['B'], 'Teammate: add API', { ghost: true })], [br('main', 'B'), rm('origin/main', 'B')], 'main'),
      },
      {
        command: 'git fetch',
        caption: 'fetch downloads C and moves origin/main. Your main and your files are unchanged: you are 1 commit behind.',
        state: st([A, B, c('C', 0, 2, ['B'], 'Teammate: add API', { highlight: true })], [br('main', 'B'), rm('origin/main', 'C')], 'main'),
      },
      {
        command: 'git merge origin/main   (git pull = fetch + this)',
        caption: 'Integrating moves main to C. git pull would have done the fetch and this merge in one step.',
        state: st([A, B, c('C', 0, 2, ['B'], 'Teammate: add API')], [br('main', 'C'), rm('origin/main', 'C')], 'main'),
      },
      {
        command: 'git commit -m "Add tests"',
        caption: 'You commit D locally. main is now 1 commit ahead of origin/main.',
        state: st(
          [A, B, c('C', 0, 2, ['B'], 'Teammate: add API'), c('D', 0, 3, ['C'], 'Add tests', { highlight: true })],
          [br('main', 'D'), rm('origin/main', 'C')],
          'main',
        ),
      },
      {
        command: 'git push',
        caption: 'push uploads D. GitHub’s main and your origin/main bookmark both move to D.',
        state: st(
          [A, B, c('C', 0, 2, ['B'], 'Teammate: add API'), c('D', 0, 3, ['C'], 'Add tests')],
          [br('main', 'D'), rm('origin/main', 'D')],
          'main',
        ),
      },
    ],
  },
];

/* ------------------------------ Module 6 ------------------------------ */
const bad = (extra: Partial<GraphCommit> = {}) => c('C', 0, 2, ['B'], 'Bad change', extra);
export const undoScenarios: GraphScenario[] = [
  {
    id: 'reset',
    title: 'git reset (local)',
    frames: [
      { caption: 'Commit C was a mistake and hasn’t been pushed.', state: st([A, B, bad()], [br('main', 'C')], 'main') },
      {
        command: 'git reset --hard HEAD~1',
        caption: 'main moves back to B. C is no longer on any branch (faded) but is still listed in git reflog for a while.',
        state: st([A, B, bad({ ghost: true })], [br('main', 'B')], 'main'),
      },
    ],
  },
  {
    id: 'revert',
    title: 'git revert (shared)',
    frames: [
      {
        caption: 'Commit C was a mistake and is already on GitHub.',
        state: st([A, B, bad()], [br('main', 'C'), rm('origin/main', 'C')], 'main'),
      },
      {
        command: 'git revert C',
        caption: 'A new commit R undoes C’s changes. History only moves forward, so teammates can pull it normally.',
        state: st([A, B, bad(), c('R', 0, 3, ['C'], 'Revert "Bad change"', { highlight: true })], [br('main', 'R'), rm('origin/main', 'C')], 'main'),
      },
      {
        command: 'git push',
        caption: 'Regular push, no force needed.',
        state: st([A, B, bad(), c('R', 0, 3, ['C'], 'Revert "Bad change"')], [br('main', 'R'), rm('origin/main', 'R')], 'main'),
      },
    ],
  },
];

/* ------------------------------ Module 7 ------------------------------ */
export const advancedScenarios: GraphScenario[] = [
  {
    id: 'cherry',
    title: 'Cherry-pick a hotfix',
    frames: [
      {
        caption: 'Commit F on develop fixes a crash. release needs that fix but none of develop’s other work.',
        state: st(
          [A, B, c('C', 1, 2, ['B'], 'New feature'), c('F', 1, 3, ['C'], 'Fix crash'), c('R1', 0, 2, ['B'], 'Release notes')],
          [br('release', 'R1'), br('develop', 'F')],
          'release',
          ['release', 'develop'],
        ),
      },
      {
        command: 'git cherry-pick F',
        caption: 'Git copies F’s changes onto release as F′, a new commit with a different hash. C is not included.',
        state: st(
          [
            A,
            B,
            c('C', 1, 2, ['B'], 'New feature'),
            c('F', 1, 3, ['C'], 'Fix crash'),
            c('R1', 0, 2, ['B'], 'Release notes'),
            c("F'", 0, 4, ['R1'], 'Fix crash', { highlight: true }),
          ],
          [br('release', "F'"), br('develop', 'F')],
          'release',
          ['release', 'develop'],
        ),
      },
      {
        command: 'git tag -a v1.0.1 -m "Hotfix"',
        caption: 'Tag the release commit so everyone can find exactly what shipped.',
        state: st(
          [
            A,
            B,
            c('C', 1, 2, ['B'], 'New feature'),
            c('F', 1, 3, ['C'], 'Fix crash'),
            c('R1', 0, 2, ['B'], 'Release notes'),
            c("F'", 0, 4, ['R1'], 'Fix crash'),
          ],
          [br('release', "F'"), br('develop', 'F'), { name: 'v1.0.1', target: "F'", kind: 'tag' }],
          'release',
          ['release', 'develop'],
        ),
      },
    ],
  },
];

/* ------------------------------ Module 8 ------------------------------ */
const fb = 'feature/student-dashboard';
const prBase = [A, B, c('C', 1, 2, ['B'], 'Dashboard layout'), c('D', 1, 3, ['C'], 'Load grades'), c('E', 0, 3, ['B'], 'Teammate fix')];
const prRefs = [br('main', 'E'), br(fb, 'D')];
export const githubScenarios: GraphScenario[] = [
  {
    id: 'gh-merge',
    title: 'Merge commit',
    frames: [
      { caption: 'Open PR: feature/student-dashboard → main.', state: st(prBase, prRefs, 'main', ['main', 'feature']) },
      {
        command: 'Merge pull request',
        caption: 'GitHub always creates a merge commit with this option, keeping C and D in main’s history.',
        state: st(
          [...prBase, c('M', 0, 4, ['E', 'D'], 'Merge pull request #42', { highlight: true })],
          [br('main', 'M'), br(fb, 'D')],
          'main',
          ['main', 'feature'],
        ),
      },
    ],
  },
  {
    id: 'gh-squash',
    title: 'Squash and merge',
    frames: [
      { caption: 'Open PR: feature/student-dashboard → main.', state: st(prBase, prRefs, 'main', ['main', 'feature']) },
      {
        command: 'Squash and merge',
        caption: 'C and D are combined into one commit S on main. The PR becomes a single, clean commit.',
        state: st(
          [...prBase, c('S', 0, 4, ['E'], 'Add student dashboard (#42)', { highlight: true })],
          [br('main', 'S'), br(fb, 'D')],
          'main',
          ['main', 'feature'],
        ),
      },
    ],
  },
  {
    id: 'gh-rebase',
    title: 'Rebase and merge',
    frames: [
      { caption: 'Open PR: feature/student-dashboard → main.', state: st(prBase, prRefs, 'main', ['main', 'feature']) },
      {
        command: 'Rebase and merge',
        caption: 'C and D are re-created on top of main as C′ and D′. No merge commit, straight history, new hashes.',
        state: st(
          [
            A,
            B,
            c('C', 1, 2, ['B'], 'Dashboard layout', { ghost: true }),
            c('D', 1, 3, ['C'], 'Load grades', { ghost: true }),
            c('E', 0, 3, ['B'], 'Teammate fix'),
            c("C'", 0, 4, ['E'], 'Dashboard layout', { highlight: true }),
            c("D'", 0, 5, ["C'"], 'Load grades', { highlight: true }),
          ],
          [br('main', "D'"), br(fb, 'D')],
          'main',
          ['main', 'feature'],
        ),
      },
    ],
  },
];
