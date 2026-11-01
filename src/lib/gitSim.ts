/**
 * A small, self-contained Git simulator for teaching.
 * It never touches a real file system or network. File "content" is modelled
 * as a version number: every edit produces a new unique version, which is enough
 * to reproduce staging, commits, merges, conflicts, stashes and resets faithfully.
 */
import type { GraphState } from '../types';

export type LineKind = 'cmd' | 'out' | 'err' | 'ok' | 'hint' | 'info';
export interface Line {
  text: string;
  kind: LineKind;
}

interface SimCommit {
  id: string;
  msg: string;
  parents: string[];
  snapshot: Record<string, number>;
  lane: number;
  order: number;
}

interface FileState {
  wd: number;
  idx: number | null;
}

interface StashEntry {
  label: string;
  files: Record<string, FileState & { wasNew: boolean }>;
}

export interface SimState {
  dir: string;
  initialized: boolean;
  commits: Record<string, SimCommit>;
  order: number;
  ver: number;
  branches: Record<string, string | null>;
  head: string;
  files: Record<string, FileState>;
  laneOf: Record<string, number>;
  nextLane: number;
  remote: null | { name: string; url: string; branches: Record<string, string> };
  remoteRefs: Record<string, string>;
  upstream: Record<string, string>;
  stash: StashEntry[];
  tags: Record<string, string>;
  reflog: { id: string; msg: string }[];
  merging: null | { theirs: string; theirsName: string; conflicts: string[]; squash: boolean };
  config: Record<string, string>;
  teammateCount: number;
}

export const initialSimState = (): SimState => ({
  dir: 'project',
  initialized: false,
  commits: {},
  order: 0,
  ver: 0,
  branches: {},
  head: 'main',
  files: {},
  laneOf: {},
  nextLane: 0,
  remote: null,
  remoteRefs: {},
  upstream: {},
  stash: [],
  tags: {},
  reflog: [],
  merging: null,
  config: { 'user.name': 'Learner', 'user.email': 'learner@example.com', 'init.defaultbranch': 'main' },
  teammateCount: 0,
});

/* ------------------------------------------------------------------ helpers */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const hex = () =>
  Array.from({ length: 7 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

class Ctx {
  lines: Line[] = [];
  constructor(public s: SimState) {}
  out(text: string, kind: LineKind = 'out') {
    text.split('\n').forEach((t) => this.lines.push({ text: t, kind }));
  }
  err(text: string) {
    this.out(text, 'err');
  }
  hint(text: string) {
    this.out(text, 'hint');
  }
  ok(text: string) {
    this.out(text, 'ok');
  }
  info(text: string) {
    this.out(text, 'info');
  }
}

const headId = (s: SimState) => s.branches[s.head] ?? null;
const snap = (s: SimState, id: string | null) => (id ? s.commits[id].snapshot : {});
const headSnap = (s: SimState) => snap(s, headId(s));
const newVer = (s: SimState) => ++s.ver;
const short = (id: string) => id.slice(0, 7);

function laneFor(s: SimState, branch: string) {
  if (s.laneOf[branch] === undefined) s.laneOf[branch] = s.nextLane++;
  return s.laneOf[branch];
}

function ancestors(s: SimState, id: string | null): Set<string> {
  const seen = new Set<string>();
  const stack = id ? [id] : [];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c)) continue;
    seen.add(c);
    s.commits[c]?.parents.forEach((p) => stack.push(p));
  }
  return seen;
}
const isAncestor = (s: SimState, a: string, b: string) => ancestors(s, b).has(a);

function mergeBase(s: SimState, a: string, b: string): string | null {
  const aa = ancestors(s, a);
  const common = [...ancestors(s, b)].filter((x) => aa.has(x));
  if (!common.length) return null;
  return common.sort((x, y) => s.commits[y].order - s.commits[x].order)[0];
}

function resolve(s: SimState, ref: string): string | null {
  let base = ref;
  let back = 0;
  const tilde = ref.match(/^(.+?)~(\d*)$/);
  const caret = ref.match(/^(.+?)(\^+)$/);
  if (tilde) {
    base = tilde[1];
    back = tilde[2] === '' ? 1 : parseInt(tilde[2], 10);
  } else if (caret) {
    base = caret[1];
    back = caret[2].length;
  }
  let id: string | null = null;
  if (base === 'HEAD' || base === '@') id = headId(s);
  else if (base in s.branches) id = s.branches[base];
  else if (base in s.remoteRefs) id = s.remoteRefs[base];
  else if (base in s.tags) id = s.tags[base];
  else if (/^[0-9a-f]{4,40}$/.test(base)) {
    const hits = Object.keys(s.commits).filter((c) => c.startsWith(base));
    id = hits.length === 1 ? hits[0] : null;
  }
  while (id && back > 0) {
    id = s.commits[id].parents[0] ?? null;
    back--;
  }
  return id;
}

type Status = { untracked: string[]; staged: string[]; modified: string[]; conflicts: string[] };
function status(s: SimState): Status {
  const hs = headSnap(s);
  const st: Status = { untracked: [], staged: [], modified: [], conflicts: s.merging?.conflicts ?? [] };
  for (const [name, f] of Object.entries(s.files).sort()) {
    if (st.conflicts.includes(name)) continue;
    const hv = hs[name] ?? null;
    if (f.idx === null && hv === null) st.untracked.push(name);
    else {
      if (f.idx !== hv) st.staged.push(name);
      if (f.idx !== null && f.wd !== f.idx) st.modified.push(name);
    }
  }
  // tracked files deleted from working tree are not modelled
  return st;
}
const isDirty = (st: Status) => st.staged.length + st.modified.length + st.conflicts.length > 0;

function addReflog(s: SimState, id: string | null, msg: string) {
  if (id) s.reflog.unshift({ id, msg });
}

function makeCommit(s: SimState, msg: string, parents: string[], snapshot: Record<string, number>, branch: string) {
  let id = hex();
  while (s.commits[id]) id = hex();
  s.commits[id] = { id, msg, parents, snapshot, lane: laneFor(s, branch), order: s.order++ };
  return id;
}

/** Set working dir + index to a snapshot for every file that is clean. */
function checkoutSnapshot(s: SimState, target: Record<string, number>, from: Record<string, number>) {
  const names = new Set([...Object.keys(target), ...Object.keys(from)]);
  for (const n of names) {
    const f = s.files[n];
    const clean = f && f.idx === (from[n] ?? null) && f.wd === f.idx;
    if (f && !clean && from[n] !== undefined) continue; // dirty tracked file is carried over
    if (target[n] !== undefined) s.files[n] = { wd: target[n], idx: target[n] };
    else if (f && from[n] !== undefined) delete s.files[n];
  }
}

function changedPaths(a: Record<string, number>, b: Record<string, number>) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).sort();
}

function decorate(s: SimState, id: string) {
  const parts: string[] = [];
  for (const [b, t] of Object.entries(s.branches)) {
    if (t !== id) continue;
    parts.push(b === s.head ? `HEAD -> ${b}` : b);
  }
  for (const [r, t] of Object.entries(s.remoteRefs)) if (t === id) parts.push(r);
  for (const [t, c] of Object.entries(s.tags)) if (c === id) parts.push(`tag: ${t}`);
  parts.sort((x) => (x.startsWith('HEAD') ? -1 : 0));
  return parts.length ? ` (${parts.join(', ')})` : '';
}

/* -------------------------------------------------------------- commands */

const HELP = `Supported commands (simulated, nothing real is executed):
  ls | touch <file> | edit <file> | clear | help
  teammate push          a teammate pushes a commit to origin/main
  git init | git clone <url> | git config --list
  git status | git add <file>|. | git commit [-a] [--amend] -m "msg"
  git log [--oneline] [--all] | git diff [--staged] | git show [<ref>]
  git branch [-a] [<name>] [-d|-D <name>]
  git switch [-c] <name> | git checkout [-b] <name>
  git merge <branch> [--squash|--no-ff|--abort] | git rebase <branch>
  git remote add origin <url> | git remote -v | git remote remove origin
  git fetch | git pull [--rebase] | git push [-u origin <branch>] [--force-with-lease]
  git restore [--staged] <file> | git reset [--soft|--mixed|--hard] [<ref>]
  git revert <ref> | git cherry-pick <ref> | git reflog
  git stash [list|pop] | git tag [-a <name> -m "msg"] | git clean -n|-f`;

function needRepo(x: Ctx) {
  if (!x.s.initialized) {
    x.err('fatal: not a git repository (or any of the parent directories): .git');
    x.hint('hint: run git init to create one, or git clone <url> to copy one.');
    return false;
  }
  return true;
}

function cmdStatus(x: Ctx) {
  const s = x.s;
  x.out(`On branch ${s.head}`);
  const up = s.upstream[s.head];
  const local = headId(s);
  if (up && s.remoteRefs[up] && local) {
    const r = s.remoteRefs[up];
    const ahead = [...ancestors(s, local)].filter((c) => !ancestors(s, r).has(c)).length;
    const behind = [...ancestors(s, r)].filter((c) => !ancestors(s, local).has(c)).length;
    if (!ahead && !behind) x.out(`Your branch is up to date with '${up}'.`);
    else if (ahead && !behind) x.out(`Your branch is ahead of '${up}' by ${ahead} commit${ahead > 1 ? 's' : ''}.\n  (use "git push" to publish your local commits)`);
    else if (!ahead && behind) x.out(`Your branch is behind '${up}' by ${behind} commit${behind > 1 ? 's' : ''}, and can be fast-forwarded.\n  (use "git pull" to update your local branch)`);
    else x.out(`Your branch and '${up}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.`);
  }
  if (!local) x.out('\nNo commits yet');
  const st = status(s);
  if (s.merging && !s.merging.squash) {
    x.out(st.conflicts.length ? '\nYou have unmerged paths.\n  (fix conflicts and run "git commit")\n  (use "git merge --abort" to abort the merge)' : '\nAll conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)');
  }
  if (st.staged.length) {
    x.out('\nChanges to be committed:');
    st.staged.forEach((f) => x.ok(`\t${headSnap(s)[f] === undefined ? 'new file' : 'modified'}:   ${f}`));
  }
  if (st.conflicts.length) {
    x.out('\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)');
    st.conflicts.forEach((f) => x.err(`\tboth modified:   ${f}`));
  }
  if (st.modified.length) {
    x.out('\nChanges not staged for commit:');
    st.modified.forEach((f) => x.err(`\tmodified:   ${f}`));
  }
  if (st.untracked.length) {
    x.out('\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)');
    st.untracked.forEach((f) => x.err(`\t${f}`));
  }
  if (!isDirty(st) && !st.untracked.length) x.out(local ? '\nnothing to commit, working tree clean' : '\nnothing to commit (create/copy files and use "git add" to track)');
  else if (!st.staged.length && !st.conflicts.length && !s.merging) x.out('\nno changes added to commit (use "git add")');
}

function cmdAdd(x: Ctx, args: string[]) {
  const s = x.s;
  const paths = args.filter((a) => !a.startsWith('-') || a === '-A');
  if (!paths.length) {
    x.err('Nothing specified, nothing added.');
    x.hint("hint: Maybe you wanted to say 'git add .'?");
    return;
  }
  const all = paths.some((p) => p === '.' || p === '-A' || p === '--all');
  const targets = all ? Object.keys(s.files) : paths;
  for (const p of targets) {
    if (!s.files[p]) {
      x.err(`fatal: pathspec '${p}' did not match any files`);
      return;
    }
  }
  for (const p of targets) {
    s.files[p].idx = s.files[p].wd;
    if (s.merging) s.merging.conflicts = s.merging.conflicts.filter((c) => c !== p);
  }
}

function cmdCommit(x: Ctx, args: string[]) {
  const s = x.s;
  const mi = args.findIndex((a) => a === '-m' || a === '-am' || a === '-ma');
  let msg = mi >= 0 ? args[mi + 1] : undefined;
  const amend = args.includes('--amend');
  const noEdit = args.includes('--no-edit');
  if (args.includes('-a') || args.includes('-am') || args.includes('-ma')) {
    const hs = headSnap(s);
    for (const [n, f] of Object.entries(s.files)) if (hs[n] !== undefined || f.idx !== null) f.idx = f.wd;
  }
  if (s.merging?.conflicts.length) {
    x.err('error: Committing is not possible because you have unmerged files.');
    x.hint('hint: Fix them up in the work tree, and then use "git add <file>"\nhint: as appropriate to mark resolution and make a commit.');
    return;
  }
  const snapshot: Record<string, number> = {};
  for (const [n, f] of Object.entries(s.files)) if (f.idx !== null) snapshot[n] = f.idx;
  const parentId = headId(s);

  if (amend) {
    if (!parentId) {
      x.err('fatal: You have nothing to amend.');
      return;
    }
    const old = s.commits[parentId];
    const id = makeCommit(s, msg ?? old.msg, [...old.parents], snapshot, s.head);
    s.branches[s.head] = id;
    addReflog(s, id, `commit (amend): ${msg ?? old.msg}`);
    x.out(`[${s.head} ${short(id)}] ${msg ?? old.msg}`);
    if (!msg && !noEdit) x.hint('(simulator: kept the previous message; use -m "new message" to change it)');
    return;
  }

  const changes = changedPaths(snap(s, parentId), snapshot);
  if (!changes.length && !(s.merging && !s.merging.squash)) {
    const st = status(s);
    x.out(`On branch ${s.head}`);
    if (st.modified.length || st.untracked.length) x.err('no changes added to commit (use "git add" and/or "git commit -a")');
    else x.out('nothing to commit, working tree clean');
    return;
  }
  if (!msg) {
    if (s.merging && !s.merging.squash) msg = `Merge branch '${s.merging.theirsName}'`;
    else if (s.merging?.squash) msg = `Squashed commit of '${s.merging.theirsName}'`;
    else {
      x.err('error: the simulator has no text editor. Add a message with -m "your message".');
      return;
    }
  }
  const parents = parentId ? [parentId] : [];
  if (s.merging && !s.merging.squash) parents.push(s.merging.theirs);
  const id = makeCommit(s, msg, parents, snapshot, s.head);
  s.branches[s.head] = id;
  addReflog(s, id, `commit${parents.length > 1 ? ' (merge)' : parentId ? '' : ' (initial)'}: ${msg}`);
  s.merging = null;
  x.out(`[${s.head}${parentId ? '' : ' (root-commit)'} ${short(id)}] ${msg}`);
  x.out(` ${changes.length} file${changes.length > 1 ? 's' : ''} changed`);
}

function cmdLog(x: Ctx, args: string[]) {
  const s = x.s;
  const oneline = args.includes('--oneline');
  const all = args.includes('--all');
  const nIdx = args.findIndex((a) => a === '-n');
  const dashN = args.find((a) => /^-\d+$/.test(a));
  const limit = nIdx >= 0 ? parseInt(args[nIdx + 1], 10) || Infinity : dashN ? parseInt(dashN.slice(1), 10) : Infinity;
  const starts = all ? [...Object.values(s.branches), ...Object.values(s.remoteRefs), ...Object.values(s.tags)] : [headId(s)];
  const set = new Set<string>();
  starts.forEach((st) => ancestors(s, st ?? null).forEach((c) => set.add(c)));
  if (!set.size) {
    x.err(`fatal: your current branch '${s.head}' does not have any commits yet`);
    return;
  }
  const list = [...set].sort((a, b) => s.commits[b].order - s.commits[a].order).slice(0, limit);
  for (const id of list) {
    const c = s.commits[id];
    if (oneline) x.out(`${short(id)}${decorate(s, id)} ${c.msg}`, 'info');
    else {
      x.out(`commit ${id}${decorate(s, id)}`, 'info');
      if (c.parents.length > 1) x.out(`Merge: ${c.parents.map(short).join(' ')}`);
      x.out(`Author: ${s.config['user.name']} <${s.config['user.email']}>\n\n    ${c.msg}\n`);
    }
  }
}

function cmdDiff(x: Ctx, args: string[]) {
  const s = x.s;
  const staged = args.includes('--staged') || args.includes('--cached');
  const hs = headSnap(s);
  const files = args.filter((a) => !a.startsWith('-'));
  let any = false;
  for (const [n, f] of Object.entries(s.files).sort()) {
    if (files.length && !files.includes(n)) continue;
    const a = staged ? hs[n] ?? null : f.idx;
    const b = staged ? f.idx : f.wd;
    if (!staged && f.idx === null) continue; // untracked files don't show in git diff
    if (a === b) continue;
    any = true;
    x.out(`diff --git a/${n} b/${n}`, 'info');
    if (a === null) x.out('new file mode 100644', 'info');
    x.err(`- ${n} (version ${a ?? 'none'})`);
    x.ok(`+ ${n} (version ${b})`);
  }
  if (!any && !staged && status(s).staged.length) x.hint('(no unstaged changes; try git diff --staged to see what is staged)');
}

function cmdShow(x: Ctx, args: string[]) {
  const s = x.s;
  const id = resolve(x.s, args[0] ?? 'HEAD');
  if (!id) {
    x.err(`fatal: ambiguous argument '${args[0] ?? 'HEAD'}': unknown revision`);
    return;
  }
  const c = s.commits[id];
  x.out(`commit ${id}${decorate(s, id)}`, 'info');
  x.out(`Author: ${s.config['user.name']} <${s.config['user.email']}>\n\n    ${c.msg}\n`);
  changedPaths(snap(s, c.parents[0] ?? null), c.snapshot).forEach((p) => x.out(` ${p} | changed`));
}

function cmdBranch(x: Ctx, args: string[]) {
  const s = x.s;
  const flag = args.find((a) => a.startsWith('-'));
  const names = args.filter((a) => !a.startsWith('-'));
  if (flag === '-d' || flag === '-D' || flag === '--delete') {
    const name = names[0];
    if (!name || !(name in s.branches)) {
      x.err(`error: branch '${name ?? ''}' not found`);
      return;
    }
    if (name === s.head) {
      x.err(`error: cannot delete branch '${name}' used by worktree at '/home/learner/${s.dir}'`);
      x.hint('hint: switch to another branch first.');
      return;
    }
    const tip = s.branches[name]!;
    const merged = isAncestor(s, tip, headId(s) ?? '') || (s.upstream[name] && s.remoteRefs[s.upstream[name]] && isAncestor(s, tip, s.remoteRefs[s.upstream[name]]));
    if (flag === '-d' && !merged) {
      x.err(`error: the branch '${name}' is not fully merged.`);
      x.hint(`hint: If you are sure you want to delete it, run 'git branch -D ${name}'`);
      return;
    }
    delete s.branches[name];
    delete s.upstream[name];
    x.out(`Deleted branch ${name} (was ${short(tip)}).`);
    return;
  }
  if (!names.length) {
    for (const b of Object.keys(s.branches).sort()) {
      if (s.branches[b] === null && b !== s.head) continue;
      x.out(`${b === s.head ? '* ' : '  '}${b}`, b === s.head ? 'ok' : 'out');
    }
    if (flag === '-a' || flag === '--all') Object.keys(s.remoteRefs).sort().forEach((r) => x.err(`  remotes/${r}`));
    return;
  }
  const name = names[0];
  if (name in s.branches && s.branches[name] !== null) {
    x.err(`fatal: a branch named '${name}' already exists`);
    return;
  }
  const start = names[1] ? resolve(s, names[1]) : headId(s);
  if (!start) {
    x.err(`fatal: not a valid object name: '${names[1] ?? s.head}'`);
    x.hint('hint: make your first commit before creating branches.');
    return;
  }
  s.branches[name] = start;
}

function doSwitch(x: Ctx, name: string, create: boolean, start?: string) {
  const s = x.s;
  if (s.merging) {
    x.err('error: you need to resolve your current index first');
    return;
  }
  if (create) {
    if (name in s.branches && s.branches[name] !== null) {
      x.err(`fatal: a branch named '${name}' already exists`);
      return;
    }
    const from = start ? resolve(s, start) : headId(s);
    if (!from && headId(s)) {
      x.err(`fatal: invalid reference: ${start}`);
      return;
    }
    if (!from) {
      // unborn branch rename (like git switch -c on empty repo)
      delete s.branches[s.head];
      s.branches[name] = null;
      s.head = name;
      x.out(`Switched to a new branch '${name}'`);
      return;
    }
    s.branches[name] = from;
    const prev = headSnap(s);
    s.head = name;
    checkoutSnapshot(s, snap(s, from), prev);
    addReflog(s, from, `checkout: moving to ${name}`);
    x.out(`Switched to a new branch '${name}'`);
    return;
  }
  if (!(name in s.branches)) {
    const remoteRef = s.remote ? `${s.remote.name}/${name}` : '';
    if (remoteRef && s.remoteRefs[remoteRef]) {
      s.branches[name] = s.remoteRefs[remoteRef];
      s.upstream[name] = remoteRef;
      x.out(`branch '${name}' set up to track '${remoteRef}'.`);
    } else if (resolve(s, name)) {
      x.err(`fatal: a branch is expected, got commit '${name}'`);
      x.hint('hint: the simulator does not support detached HEAD. In real Git, git switch --detach <commit> does this.');
      return;
    } else {
      x.err(`fatal: invalid reference: ${name}`);
      x.hint(`hint: to create it, use git switch -c ${name}`);
      return;
    }
  }
  if (name === s.head) {
    x.out(`Already on '${name}'`);
    return;
  }
  const target = snap(s, s.branches[name]);
  const prev = headSnap(s);
  // refuse if a dirty tracked file would be overwritten
  const blocked = Object.entries(s.files).filter(([n, f]) => {
    const dirty = f.idx !== (prev[n] ?? null) || (f.idx !== null && f.wd !== f.idx);
    return dirty && prev[n] !== undefined && target[n] !== prev[n];
  });
  if (blocked.length) {
    x.err('error: Your local changes to the following files would be overwritten by checkout:');
    blocked.forEach(([n]) => x.err(`\t${n}`));
    x.err('Please commit your changes or stash them before you switch branches.\nAborting');
    return;
  }
  s.head = name;
  checkoutSnapshot(s, target, prev);
  addReflog(s, s.branches[name], `checkout: moving to ${name}`);
  x.out(`Switched to branch '${name}'`);
  const up = s.upstream[name];
  if (up && s.remoteRefs[up] === s.branches[name]) x.out(`Your branch is up to date with '${up}'.`);
}

/** 3-way combine. Returns merged snapshot and conflicted paths. */
function threeWay(base: Record<string, number>, ours: Record<string, number>, theirs: Record<string, number>) {
  const out: Record<string, number> = {};
  const conflicts: string[] = [];
  for (const n of new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])) {
    const b = base[n],
      o = ours[n],
      t = theirs[n];
    let v: number | undefined;
    if (o === t) v = o;
    else if (o === b) v = t;
    else if (t === b) v = o;
    else {
      conflicts.push(n);
      v = o;
    }
    if (v !== undefined) out[n] = v;
  }
  return { out, conflicts: conflicts.sort() };
}

function cmdMerge(x: Ctx, args: string[]) {
  const s = x.s;
  if (args.includes('--abort')) {
    if (!s.merging) {
      x.err('fatal: There is no merge to abort (MERGE_HEAD missing).');
      return;
    }
    const hs = headSnap(s);
    for (const n of new Set([...Object.keys(s.files), ...Object.keys(hs)])) {
      if (hs[n] !== undefined) s.files[n] = { wd: hs[n], idx: hs[n] };
      else if (s.files[n].idx !== null) delete s.files[n];
    }
    s.merging = null;
    x.out('Merge aborted. Your branch is back to how it was before the merge.');
    return;
  }
  const squash = args.includes('--squash');
  const noff = args.includes('--no-ff');
  const name = args.find((a) => !a.startsWith('-'));
  if (s.merging) {
    x.err('error: Merging is not possible because you have unmerged files.');
    x.hint('hint: Fix them up in the work tree, then git add and git commit.');
    return;
  }
  if (!name) {
    x.err('fatal: No remote for the current branch.');
    x.hint('hint: name the branch to merge, e.g. git merge feature');
    return;
  }
  const theirs = resolve(s, name);
  const ours = headId(s);
  if (!theirs) {
    x.err(`merge: ${name} - not something we can merge`);
    return;
  }
  if (!ours) {
    x.err('fatal: the simulator needs at least one commit on the current branch before merging');
    return;
  }
  if (isAncestor(s, theirs, ours)) {
    x.out('Already up to date.');
    return;
  }
  const base = mergeBase(s, ours, theirs);
  const { out, conflicts } = threeWay(snap(s, base), snap(s, ours), snap(s, theirs));
  const hs = headSnap(s);
  const touched = changedPaths(hs, out).concat(conflicts);
  const blocked = Object.entries(s.files).filter(([n, f]) => touched.includes(n) && (f.idx !== (hs[n] ?? null) || (f.idx !== null && f.wd !== f.idx)));
  if (blocked.length) {
    x.err('error: Your local changes to the following files would be overwritten by merge:');
    blocked.forEach(([n]) => x.err(`\t${n}`));
    x.err('Please commit your changes or stash them before you merge.\nAborting');
    return;
  }

  if (!squash && !noff && isAncestor(s, ours, theirs)) {
    s.branches[s.head] = theirs;
    checkoutSnapshot(s, snap(s, theirs), hs);
    addReflog(s, theirs, `merge ${name}: Fast-forward`);
    x.out(`Updating ${short(ours)}..${short(theirs)}\nFast-forward`);
    changedPaths(hs, snap(s, theirs)).forEach((p) => x.ok(` ${p} | changed`));
    return;
  }

  // apply non-conflicting results
  for (const n of changedPaths(hs, out)) {
    if (conflicts.includes(n)) continue;
    if (out[n] !== undefined) s.files[n] = { wd: out[n], idx: out[n] };
    else delete s.files[n];
  }
  if (conflicts.length) {
    for (const n of conflicts) {
      x.out(`Auto-merging ${n}`);
      x.err(`CONFLICT (content): Merge conflict in ${n}`);
      s.files[n] = { wd: newVer(s), idx: hs[n] ?? null }; // file now contains conflict markers
    }
    s.merging = { theirs, theirsName: name, conflicts, squash };
    x.err('Automatic merge failed; fix conflicts and then commit the result.');
    x.hint(`hint: run "edit ${conflicts[0]}" to resolve it, then git add ${conflicts[0]} and git commit.`);
    return;
  }
  if (squash) {
    s.merging = { theirs, theirsName: name, conflicts: [], squash: true };
    x.out('Squash commit -- not updating HEAD\nAutomatic merge went well; stopped before committing as requested');
    x.hint('hint: now run git commit -m "..." to create the single squashed commit.');
    return;
  }
  const id = makeCommit(s, `Merge branch '${name}'`, [ours, theirs], out, s.head);
  s.branches[s.head] = id;
  addReflog(s, id, `merge ${name}: Merge made by the 'ort' strategy.`);
  x.out("Merge made by the 'ort' strategy.");
  changedPaths(hs, out).forEach((p) => x.ok(` ${p} | changed`));
}

function replay(x: Ctx, onto: string, label: string): boolean {
  const s = x.s;
  const ours = headId(s)!;
  if (isAncestor(s, ours, onto)) {
    s.branches[s.head] = onto;
    checkoutSnapshot(s, snap(s, onto), snap(s, ours));
    addReflog(s, onto, `rebase (finish): refs/heads/${s.head} onto ${short(onto)}`);
    x.out(`Successfully rebased and updated refs/heads/${s.head}.`);
    return true;
  }
  if (isAncestor(s, onto, ours)) {
    x.out('Current branch is up to date.');
    return true;
  }
  const exclude = ancestors(s, onto);
  const todo = [...ancestors(s, ours)]
    .filter((c) => !exclude.has(c) && s.commits[c].parents.length < 2)
    .sort((a, b) => s.commits[a].order - s.commits[b].order);
  let tip = onto;
  let tipSnap = { ...snap(s, onto) };
  const created: string[] = [];
  for (const c of todo) {
    const commit = s.commits[c];
    const parentSnap = snap(s, commit.parents[0] ?? null);
    const { out, conflicts } = threeWay(parentSnap, tipSnap, commit.snapshot);
    if (conflicts.length) {
      created.forEach((id) => delete s.commits[id]);
      x.err(`CONFLICT (content): Merge conflict in ${conflicts[0]}`);
      x.err(`error: could not apply ${short(c)}... ${commit.msg}`);
      x.hint(`hint: the simulator stops here and leaves your branch unchanged (like git ${label} --abort).\nhint: In real Git you would fix the file, git add it, then git rebase --continue.`);
      return false;
    }
    tip = makeCommit(s, commit.msg, [tip], out, s.head);
    created.push(tip);
    tipSnap = out;
  }
  const prev = snap(s, ours);
  s.branches[s.head] = tip;
  checkoutSnapshot(s, tipSnap, prev);
  addReflog(s, tip, `rebase (finish): refs/heads/${s.head} onto ${short(onto)}`);
  x.out(`Successfully rebased and updated refs/heads/${s.head}.`);
  x.hint(`(${todo.length} commit${todo.length > 1 ? 's' : ''} replayed with new hashes)`);
  return true;
}

function cmdRebase(x: Ctx, args: string[]) {
  const s = x.s;
  if (args.includes('--abort') || args.includes('--continue')) {
    x.err('fatal: No rebase in progress?');
    return;
  }
  const name = args.find((a) => !a.startsWith('-'));
  const onto = name ? resolve(s, name) : s.upstream[s.head] ? s.remoteRefs[s.upstream[s.head]] : null;
  if (!onto) {
    x.err(`fatal: invalid upstream '${name ?? ''}'`);
    return;
  }
  if (!headId(s)) {
    x.err('fatal: no commits to rebase yet');
    return;
  }
  if (isDirty(status(s)) || s.merging) {
    x.err('error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.');
    return;
  }
  replay(x, onto, 'rebase');
}

function cmdRemote(x: Ctx, args: string[]) {
  const s = x.s;
  const [sub, name, url] = args;
  if (!sub || sub === '-v') {
    if (s.remote) {
      if (sub === '-v') x.out(`${s.remote.name}\t${s.remote.url} (fetch)\n${s.remote.name}\t${s.remote.url} (push)`);
      else x.out(s.remote.name);
    }
    return;
  }
  if (sub === 'add') {
    if (!name || !url) {
      x.err('usage: git remote add <name> <url>');
      return;
    }
    if (s.remote) {
      x.err(`error: remote ${s.remote.name} already exists.`);
      x.hint('hint: use git remote set-url to change the URL, or git remote remove first.');
      return;
    }
    s.remote = { name, url, branches: {} };
    return;
  }
  if (sub === 'remove' || sub === 'rm') {
    if (!s.remote || s.remote.name !== name) {
      x.err(`error: No such remote: '${name ?? ''}'`);
      return;
    }
    for (const r of Object.keys(s.remoteRefs)) if (r.startsWith(name + '/')) delete s.remoteRefs[r];
    for (const b of Object.keys(s.upstream)) if (s.upstream[b].startsWith(name + '/')) delete s.upstream[b];
    s.remote = null;
    return;
  }
  x.err(`error: Unknown subcommand: ${sub}`);
}

function needRemote(x: Ctx) {
  if (!x.s.remote) {
    x.err("fatal: 'origin' does not appear to be a git repository\nfatal: Could not read from remote repository.");
    x.hint('hint: add one with git remote add origin <url>');
    return false;
  }
  return true;
}

function doFetch(x: Ctx, quietIfNone = false) {
  const s = x.s;
  const r = s.remote!;
  const lines: string[] = [];
  for (const [b, id] of Object.entries(r.branches)) {
    const ref = `${r.name}/${b}`;
    const old = s.remoteRefs[ref];
    if (old === id) continue;
    lines.push(old ? `   ${short(old)}..${short(id)}  ${b.padEnd(10)} -> ${ref}` : ` * [new branch]      ${b.padEnd(10)} -> ${ref}`);
    s.remoteRefs[ref] = id;
  }
  if (lines.length) {
    x.out(`From ${r.url}`);
    lines.forEach((l) => x.ok(l));
  } else if (!quietIfNone) x.hint('(nothing new on the remote)');
}

function cmdPush(x: Ctx, args: string[]) {
  const s = x.s;
  if (!needRemote(x)) return;
  const r = s.remote!;
  const setUp = args.includes('-u') || args.includes('--set-upstream');
  const force = args.includes('--force') || args.includes('-f');
  const lease = args.includes('--force-with-lease');
  const pos = args.filter((a) => !a.startsWith('-'));
  if (args.includes('--tags')) {
    Object.keys(s.tags).forEach((t) => x.ok(` * [new tag]         ${t} -> ${t}`));
    return;
  }
  let branch = pos[1];
  if (pos[0] && pos[0] !== r.name) {
    x.err(`fatal: '${pos[0]}' does not appear to be a git repository`);
    return;
  }
  if (!branch) {
    if (!s.upstream[s.head] && !setUp) {
      x.err(`fatal: The current branch ${s.head} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream ${r.name} ${s.head}\n`);
      return;
    }
    branch = s.upstream[s.head] ? s.upstream[s.head].split('/').slice(1).join('/') : s.head;
  }
  if (branch in s.tags) {
    x.out(`To ${r.url}`);
    x.ok(` * [new tag]         ${branch} -> ${branch}`);
    return;
  }
  const local = s.branches[branch];
  if (!local) {
    x.err(`error: src refspec ${branch} does not match any\nerror: failed to push some refs to '${r.url}'`);
    return;
  }
  const remoteTip = r.branches[branch];
  const ref = `${r.name}/${branch}`;
  x.out(`To ${r.url}`);
  if (remoteTip === local) {
    x.out('Everything up-to-date');
  } else if (!remoteTip) {
    x.ok(` * [new branch]      ${branch} -> ${branch}`);
  } else if (isAncestor(s, remoteTip, local)) {
    x.ok(`   ${short(remoteTip)}..${short(local)}  ${branch} -> ${branch}`);
  } else if (lease && s.remoteRefs[ref] !== remoteTip) {
    x.err(` ! [rejected]        ${branch} -> ${branch} (stale info)\nerror: failed to push some refs to '${r.url}'`);
    x.hint('hint: someone pushed since your last fetch. --force-with-lease protected their work. Fetch and review first.');
    return;
  } else if (force || lease) {
    x.err(` + ${short(remoteTip)}...${short(local)} ${branch} -> ${branch} (forced update)`);
    x.hint('warning: the remote branch history was rewritten.');
  } else {
    const known = s.remoteRefs[ref] === remoteTip;
    x.err(` ! [rejected]        ${branch} -> ${branch} (${known ? 'non-fast-forward' : 'fetch first'})\nerror: failed to push some refs to '${r.url}'`);
    x.hint(
      known
        ? 'hint: Updates were rejected because the tip of your current branch is behind\nhint: its remote counterpart. If you rewrote history on purpose, use --force-with-lease.'
        : "hint: Updates were rejected because the remote contains work that you do not\nhint: have locally. Integrate the remote changes (e.g. 'git pull ...')\nhint: before pushing again.",
    );
    return;
  }
  r.branches[branch] = local;
  s.remoteRefs[ref] = local;
  if (setUp) {
    s.upstream[branch] = ref;
    x.out(`branch '${branch}' set up to track '${ref}'.`);
  }
}

function cmdPull(x: Ctx, args: string[]) {
  const s = x.s;
  if (!needRemote(x)) return;
  const up = s.upstream[s.head];
  if (!up) {
    x.err('There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.');
    x.hint(`hint: git branch --set-upstream-to=${s.remote!.name}/${s.head} ${s.head}\nhint: or push with -u first: git push -u ${s.remote!.name} ${s.head}`);
    return;
  }
  doFetch(x, true);
  const target = s.remoteRefs[up];
  if (!target) {
    x.err(`fatal: couldn't find remote ref ${up}`);
    return;
  }
  if (!headId(s)) {
    s.branches[s.head] = target;
    checkoutSnapshot(s, snap(s, target), {});
    return;
  }
  if (args.includes('--rebase') || args.includes('-r')) {
    if (isDirty(status(s))) {
      x.err('error: cannot pull with rebase: You have unstaged changes.\nerror: Please commit or stash them.');
      return;
    }
    replay(x, target, 'rebase');
    return;
  }
  cmdMerge(x, [up]);
}

function cmdStash(x: Ctx, args: string[]) {
  const s = x.s;
  const sub = args[0] && !args[0].startsWith('-') ? args[0] : 'push';
  if (sub === 'list') {
    s.stash.forEach((e, i) => x.out(`stash@{${i}}: ${e.label}`));
    return;
  }
  if (sub === 'pop' || sub === 'apply') {
    const e = s.stash[0];
    if (!e) {
      x.err('No stash entries found.');
      return;
    }
    const hs = headSnap(s);
    const blocked = Object.keys(e.files).filter((n) => {
      const f = s.files[n];
      return f && (f.idx !== (hs[n] ?? null) || f.wd !== f.idx);
    });
    if (blocked.length) {
      x.err('error: Your local changes to the following files would be overwritten by merge:');
      blocked.forEach((n) => x.err(`\t${n}`));
      x.err('Please commit your changes or stash them before you merge.\nThe stash entry is kept in case you need it again.');
      return;
    }
    for (const [n, f] of Object.entries(e.files)) s.files[n] = { wd: f.wd, idx: f.wasNew ? f.idx : hs[n] ?? null };
    if (sub === 'pop') s.stash.shift();
    cmdStatus(x);
    if (sub === 'pop') x.out(`Dropped refs/stash@{0}`);
    return;
  }
  if (sub === 'drop') {
    if (!s.stash.length) x.err('No stash entries found.');
    else {
      s.stash.shift();
      x.out('Dropped refs/stash@{0}');
    }
    return;
  }
  if (s.merging) {
    x.err('error: could not write index (merge in progress)');
    return;
  }
  const hs = headSnap(s);
  const files: StashEntry['files'] = {};
  for (const [n, f] of Object.entries(s.files)) {
    const tracked = f.idx !== null || hs[n] !== undefined;
    if (!tracked) continue;
    if (f.idx !== (hs[n] ?? null) || f.wd !== f.idx) files[n] = { ...f, wasNew: hs[n] === undefined };
  }
  if (!Object.keys(files).length) {
    x.out('No local changes to save');
    return;
  }
  const mi = args.indexOf('-m');
  const id = headId(s);
  const label = mi >= 0 ? `On ${s.head}: ${args[mi + 1]}` : `WIP on ${s.head}: ${id ? `${short(id)} ${s.commits[id].msg}` : '(no commit)'}`;
  s.stash.unshift({ label, files });
  for (const n of Object.keys(files)) {
    if (hs[n] !== undefined) s.files[n] = { wd: hs[n], idx: hs[n] };
    else delete s.files[n];
  }
  x.out(`Saved working directory and index state ${label}`);
}

function cmdReset(x: Ctx, args: string[]) {
  const s = x.s;
  const mode = args.includes('--hard') ? 'hard' : args.includes('--soft') ? 'soft' : 'mixed';
  const pos = args.filter((a) => !a.startsWith('-'));
  // path form: git reset <file>
  if (pos.length && s.files[pos[0]] && !resolve(s, pos[0])) {
    const hs = headSnap(s);
    pos.forEach((p) => s.files[p] && (s.files[p].idx = hs[p] ?? null));
    x.out('Unstaged changes after reset:');
    pos.forEach((p) => x.err(`M\t${p}`));
    return;
  }
  const cur = headId(s);
  const target = resolve(s, pos[0] ?? 'HEAD');
  if (!target || !cur) {
    x.err(`fatal: ambiguous argument '${pos[0] ?? 'HEAD'}': unknown revision or path not in the working tree.`);
    return;
  }
  const ts = snap(s, target);
  s.branches[s.head] = target;
  if (mode !== 'soft') {
    for (const n of Object.keys(s.files)) {
      const f = s.files[n];
      const tracked = f.idx !== null || snap(s, cur)[n] !== undefined;
      if (ts[n] !== undefined) {
        f.idx = ts[n];
        if (mode === 'hard') f.wd = ts[n];
      } else if (tracked) {
        if (mode === 'hard') delete s.files[n];
        else f.idx = null;
      }
    }
    for (const [n, v] of Object.entries(ts)) if (!s.files[n]) s.files[n] = { wd: v, idx: v };
    s.merging = null;
  }
  addReflog(s, target, `reset: moving to ${pos[0] ?? 'HEAD'}`);
  if (mode === 'hard') x.out(`HEAD is now at ${short(target)} ${s.commits[target].msg}`);
  else if (mode === 'mixed') {
    const st = status(s);
    if (st.modified.length) {
      x.out('Unstaged changes after reset:');
      st.modified.forEach((p) => x.err(`M\t${p}`));
    }
  }
  if (cur !== target && !isAncestor(s, cur, target)) x.hint(`(the old commit ${short(cur)} is still in git reflog if you need it)`);
}

function applyCommitDiff(x: Ctx, c: SimCommit, invert: boolean, label: string) {
  const s = x.s;
  if (c.parents.length > 1) {
    x.err(`error: commit ${short(c.id)} is a merge but no -m option was given.`);
    return null;
  }
  const parent = snap(s, c.parents[0] ?? null);
  const from = invert ? c.snapshot : parent;
  const to = invert ? parent : c.snapshot;
  const { out, conflicts } = threeWay(from, headSnap(s), to);
  if (conflicts.length) {
    x.err(`error: could not ${label} ${short(c.id)}... ${c.msg}`);
    x.err(`CONFLICT (content): Merge conflict in ${conflicts[0]}`);
    x.hint(`hint: the simulator leaves the repository unchanged here. In real Git you would resolve, git add, and git ${label} --continue.`);
    return null;
  }
  return out;
}

function cmdRevertOrPick(x: Ctx, args: string[], kind: 'revert' | 'cherry-pick') {
  const s = x.s;
  const ref = args.find((a) => !a.startsWith('-'));
  const id = ref ? resolve(s, ref) : null;
  if (!id) {
    x.err(`fatal: bad revision '${ref ?? ''}'`);
    return;
  }
  if (isDirty(status(s)) || s.merging) {
    x.err(`error: your local changes would be overwritten by ${kind}.\nhint: commit your changes or stash them to proceed.`);
    return;
  }
  const c = s.commits[id];
  if (kind === 'cherry-pick' && isAncestor(s, id, headId(s) ?? '')) {
    x.err(`The previous cherry-pick is now empty: ${short(id)} is already on this branch.`);
    return;
  }
  const out = applyCommitDiff(x, c, kind === 'revert', kind);
  if (!out) return;
  const prev = headSnap(s);
  if (!changedPaths(prev, out).length) {
    x.err(`The previous ${kind} is now empty, possibly due to conflict resolution.`);
    x.hint('hint: its changes are already in this branch, so there is nothing to commit.');
    return;
  }
  const msg = kind === 'revert' ? `Revert "${c.msg}"` : c.msg;
  const nid = makeCommit(s, msg, headId(s) ? [headId(s)!] : [], out, s.head);
  s.branches[s.head] = nid;
  checkoutSnapshot(s, out, prev);
  addReflog(s, nid, `${kind}: ${msg}`);
  x.out(`[${s.head} ${short(nid)}] ${msg}`);
  x.out(` ${changedPaths(prev, out).length} file(s) changed`);
}

function cmdTag(x: Ctx, args: string[]) {
  const s = x.s;
  const pos = args.filter((a, i) => !a.startsWith('-') && args[i - 1] !== '-m');
  if (args.includes('-d')) {
    delete s.tags[pos[0]];
    x.out(`Deleted tag '${pos[0]}'`);
    return;
  }
  if (!pos.length) {
    Object.keys(s.tags).sort().forEach((t) => x.out(t));
    return;
  }
  if (args.includes('-a') && !args.includes('-m')) {
    x.err('error: the simulator has no editor. Add -m "message" for annotated tags.');
    return;
  }
  if (s.tags[pos[0]]) {
    x.err(`fatal: tag '${pos[0]}' already exists`);
    return;
  }
  const target = resolve(s, pos[1] ?? 'HEAD');
  if (!target) {
    x.err('fatal: Failed to resolve \'HEAD\' as a valid ref.');
    return;
  }
  s.tags[pos[0]] = target;
}

function cmdRestore(x: Ctx, args: string[]) {
  const s = x.s;
  const staged = args.includes('--staged') || args.includes('-S');
  let paths = args.filter((a) => !a.startsWith('-'));
  if (!paths.length) {
    x.err('fatal: you must specify path(s) to restore');
    return;
  }
  if (paths.includes('.')) paths = Object.keys(s.files);
  const hs = headSnap(s);
  for (const p of paths) {
    const f = s.files[p];
    if (!f || (f.idx === null && hs[p] === undefined)) {
      if (paths.length === 1) x.err(`error: pathspec '${p}' did not match any file(s) known to git`);
      continue;
    }
    if (staged) f.idx = hs[p] ?? null;
    else if (f.idx !== null) f.wd = f.idx;
  }
}

function cmdClean(x: Ctx, args: string[]) {
  const s = x.s;
  const flags = args.join('');
  const untracked = status(s).untracked;
  if (!/[nf]/.test(flags)) {
    x.err('fatal: clean.requireForce defaults to true and neither -i, -n, nor -f given; refusing to clean');
    return;
  }
  if (flags.includes('n')) {
    untracked.forEach((f) => x.out(`Would remove ${f}`));
    return;
  }
  untracked.forEach((f) => {
    delete s.files[f];
    x.err(`Removing ${f}`);
  });
}

function cmdClone(x: Ctx, args: string[]) {
  const s = x.s;
  const url = args.find((a) => !a.startsWith('-'));
  if (!url) {
    x.err('fatal: You must specify a repository to clone.');
    return;
  }
  if (s.initialized) {
    x.err(`fatal: destination path '${s.dir}' already exists and is not an empty directory.`);
    x.hint('hint: press Reset to start from an empty folder.');
    return;
  }
  const name = url.split('/').pop()!.replace(/\.git$/, '') || 'repo';
  x.out(`Cloning into '${name}'...\nremote: Enumerating objects: 9, done.\nReceiving objects: 100% (9/9), done.`);
  s.initialized = true;
  s.dir = name;
  s.head = 'main';
  laneFor(s, 'main');
  const v1 = newVer(s),
    v2 = newVer(s),
    v3 = newVer(s);
  const c1 = makeCommit(s, 'Initial commit', [], { 'README.md': v1 }, 'main');
  const c2 = makeCommit(s, 'Add app skeleton', [c1], { 'README.md': v1, 'app.js': v2, 'index.html': v3 }, 'main');
  s.branches.main = c2;
  s.files = { 'README.md': { wd: v1, idx: v1 }, 'app.js': { wd: v2, idx: v2 }, 'index.html': { wd: v3, idx: v3 } };
  s.remote = { name: 'origin', url, branches: { main: c2 } };
  s.remoteRefs = { 'origin/main': c2 };
  s.upstream = { main: 'origin/main' };
  addReflog(s, c2, `clone: from ${url}`);
  x.hint(`(you are now inside ${name}/)`);
}

function teammatePush(x: Ctx) {
  const s = x.s;
  if (!s.initialized || !s.remote) {
    x.err('teammate: there is no shared remote yet. Clone a repo, or git remote add origin <url> and push first.');
    return;
  }
  const tip = s.remote.branches.main;
  if (!tip) {
    x.err('teammate: origin has no main branch yet. Push yours first: git push -u origin main');
    return;
  }
  s.teammateCount++;
  const file = s.teammateCount % 2 ? 'api.js' : 'README.md';
  const snapshot = { ...s.commits[tip].snapshot, [file]: newVer(s) };
  const msgs = ['Add grades API endpoint', 'Update README setup steps', 'Fix date formatting', 'Add attendance endpoint'];
  const id = makeCommit(s, msgs[(s.teammateCount - 1) % msgs.length], [tip], snapshot, 'main');
  s.remote.branches.main = id;
  x.info(`Teammate (Omar) pushed ${short(id)} "${s.commits[id].msg}" to origin/main.`);
  x.hint('Your repository does not know yet. Try git status, then git fetch or git pull.');
}


/* ------------------------------------------------------------------ entry */

export function run(state: SimState, input: string): { state: SimState; lines: Line[]; clear?: boolean } {
  const s = clone(state);
  const x = new Ctx(s);
  const t = tokenize(input.trim());
  if (!t.length) return { state, lines: [] };
  const [c0, c1, ...rest] = t;

  if (c0 === 'clear' || c0 === 'cls') return { state, lines: [], clear: true };
  if (c0 === 'help') {
    x.out(HELP, 'info');
    return { state: s, lines: x.lines };
  }
  if (c0 === 'ls') {
    const names = Object.keys(s.files).sort();
    x.out(names.length ? names.join('  ') : '(empty folder)');
    return { state: s, lines: x.lines };
  }
  if (c0 === 'touch' || c0 === 'edit' || c0 === 'echo') {
    const files = c0 === 'echo' ? [t[t.length - 1]] : t.slice(1);
    if (!files.length) x.err(`usage: ${c0} <file>`);
    for (const f of files) {
      if (c0 === 'edit' && !s.files[f]) {
        x.err(`edit: ${f}: No such file. Create it with touch ${f}`);
        continue;
      }
      if (s.files[f]) s.files[f].wd = newVer(s);
      else s.files[f] = { wd: newVer(s), idx: null };
      if (s.merging?.conflicts.includes(f)) x.hint(`(${f}: conflict markers removed. Now git add ${f} to mark it resolved.)`);
      else x.hint(`(${c0 === 'touch' && !state.files[f] ? 'created' : 'edited'} ${f})`);
    }
    return { state: s, lines: x.lines };
  }
  if (c0 === 'teammate') {
    teammatePush(x);
    return { state: s, lines: x.lines };
  }
  if (c0 === 'pwd') {
    x.out(`/home/learner/${s.dir}`);
    return { state: s, lines: x.lines };
  }
  if (c0 !== 'git') {
    x.err(`command not found: ${c0}`);
    x.hint('hint: type help to see what this simulator supports.');
    return { state, lines: x.lines };
  }
  if (!c1) {
    x.out('usage: git <command> [<args>]\nType help for the commands this simulator supports.');
    return { state, lines: x.lines };
  }
  const args = rest;
  switch (c1) {
    case '--version':
    case 'version':
      x.out('git version 2.47.0 (simulated)');
      break;
    case 'help':
      x.out(HELP, 'info');
      break;
    case 'config': {
      if (args.includes('--list') || args.includes('-l')) Object.entries(s.config).forEach(([k, v]) => x.out(`${k}=${v}`));
      else {
        const kv = args.filter((a) => !a.startsWith('--'));
        if (kv.length >= 2) s.config[kv[0]] = kv.slice(1).join(' ');
        else if (kv.length === 1) x.out(s.config[kv[0]] ?? '');
      }
      break;
    }
    case 'init':
      if (s.initialized) x.out(`Reinitialized existing Git repository in /home/learner/${s.dir}/.git/`);
      else {
        s.initialized = true;
        const bi = args.findIndex((a) => a === '-b' || a === '--initial-branch');
        s.head = bi >= 0 ? args[bi + 1] : 'main';
        s.branches[s.head] = null;
        laneFor(s, s.head);
        x.out(`Initialized empty Git repository in /home/learner/${s.dir}/.git/`);
      }
      break;
    case 'clone':
      cmdClone(x, args);
      break;
    default: {
      if (!needRepo(x)) break;
      switch (c1) {
        case 'status':
          cmdStatus(x);
          break;
        case 'add':
          cmdAdd(x, args);
          break;
        case 'commit':
          cmdCommit(x, args);
          break;
        case 'log':
          cmdLog(x, args);
          break;
        case 'diff':
          cmdDiff(x, args);
          break;
        case 'show':
          cmdShow(x, args);
          break;
        case 'branch':
          cmdBranch(x, args);
          break;
        case 'switch':
        case 'checkout': {
          const createFlag = c1 === 'switch' ? ['-c', '--create'] : ['-b'];
          const create = args.some((a) => createFlag.includes(a));
          const names = args.filter((a) => !a.startsWith('-'));
          if (c1 === 'checkout' && names[0] && s.files[names[0]] && !(names[0] in s.branches)) {
            cmdRestore(x, names);
            break;
          }
          if (!names[0]) x.err(`fatal: missing branch name; try -${create ? 'c' : ''} <branch>`);
          else doSwitch(x, names[0], create, names[1]);
          break;
        }
        case 'merge':
          cmdMerge(x, args);
          break;
        case 'rebase':
          cmdRebase(x, args);
          break;
        case 'remote':
          cmdRemote(x, args);
          break;
        case 'fetch':
          if (needRemote(x)) doFetch(x);
          break;
        case 'pull':
          cmdPull(x, args);
          break;
        case 'push':
          cmdPush(x, args);
          break;
        case 'stash':
          cmdStash(x, args);
          break;
        case 'reset':
          cmdReset(x, args);
          break;
        case 'revert':
          cmdRevertOrPick(x, args, 'revert');
          break;
        case 'cherry-pick':
          cmdRevertOrPick(x, args, 'cherry-pick');
          break;
        case 'restore':
          cmdRestore(x, args);
          break;
        case 'tag':
          cmdTag(x, args);
          break;
        case 'reflog':
          s.reflog.slice(0, 20).forEach((e, i) => x.out(`${short(e.id)} HEAD@{${i}}: ${e.msg}`));
          break;
        case 'clean':
          cmdClean(x, args);
          break;
        case 'blame':
        case 'bisect':
        case 'archive':
          x.hint(`git ${c1} is explained in Module 7. The simulator focuses on commands that change repository state.`);
          break;
        default:
          x.err(`git: '${c1}' is not a git command. See 'git --help'.`);
      }
    }
  }
  return { state: s, lines: x.lines };
}

/** Run several commands silently, used for practice presets. */
export function runScript(cmds: string[]): SimState {
  let s = initialSimState();
  for (const c of cmds) s = run(s, c).state;
  return s;
}

export const presets: { id: string; label: string; description: string; script: string[]; suggestions: string[] }[] = [
  {
    id: 'empty',
    label: 'Empty folder',
    description: 'Start from scratch: create a repository, files, and your first commits.',
    script: [],
    suggestions: ['git init', 'touch index.html', 'git status', 'git add .', 'git commit -m "First commit"', 'git log --oneline'],
  },
  {
    id: 'clone',
    label: 'Team project',
    description: 'A cloned repository with origin set up. A teammate can push while you work.',
    script: ['git clone https://github.com/acme/school-app.git'],
    suggestions: ['git switch -c feature/student-dashboard', 'edit app.js', 'git commit -am "Add dashboard"', 'git push -u origin feature/student-dashboard', 'teammate push', 'git fetch'],
  },
  {
    id: 'conflict',
    label: 'Merge conflict',
    description: 'main and feature both changed header.html. Merge them and resolve the conflict.',
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
    suggestions: ['git log --oneline --all', 'git merge feature', 'git status', 'edit header.html', 'git add header.html', 'git commit'],
  },
  {
    id: 'undo',
    label: 'Undo lab',
    description: 'Three commits, the last one is a mistake. Try reset, revert, and reflog.',
    script: [
      'git init',
      'touch app.js',
      'git add .',
      'git commit -m "Add app"',
      'edit app.js',
      'git commit -am "Add login"',
      'touch secrets.txt',
      'edit app.js',
      'git add .',
      'git commit -m "Oops: commit secrets"',
    ],
    suggestions: ['git log --oneline', 'git reset --soft HEAD~1', 'git status', 'git reset --hard HEAD~1', 'git reflog', 'git revert HEAD'],
  },
];

/* --------------------------------------------------------- graph adapter */

export function toGraph(s: SimState): GraphState {
  const localTips = [...Object.values(s.branches), ...Object.values(s.remoteRefs), ...Object.values(s.tags)].filter(Boolean) as string[];
  const reachable = new Set<string>();
  localTips.forEach((t) => ancestors(s, t).forEach((c) => reachable.add(c)));
  // only keep unreachable commits that are recent (reflog) or exist on the remote
  const remoteOnly = new Set<string>();
  if (s.remote) Object.values(s.remote.branches).forEach((t) => ancestors(s, t).forEach((c) => remoteOnly.add(c)));
  const recent = new Set(s.reflog.slice(0, 12).map((r) => r.id));
  const ids = Object.keys(s.commits)
    .filter((id) => reachable.has(id) || recent.has(id) || remoteOnly.has(id))
    .sort((a, b) => s.commits[a].order - s.commits[b].order);
  const col = new Map(ids.map((id, i) => [id, i]));
  const laneNames: string[] = [];
  Object.entries(s.laneOf).forEach(([n, l]) => {
    if (laneNames[l] === undefined && (n in s.branches || l === 0)) laneNames[l] = n;
  });
  return {
    commits: ids.map((id) => {
      const c = s.commits[id];
      return {
        id: short(id),
        msg: c.msg,
        lane: c.lane,
        col: col.get(id)!,
        parents: c.parents.filter((p) => col.has(p)).map(short),
        ghost: !reachable.has(id),
      };
    }),
    refs: [
      ...Object.entries(s.branches)
        .filter(([, t]) => t)
        .map(([name, t]) => ({ name, target: short(t!), kind: 'branch' as const })),
      ...Object.entries(s.remoteRefs).map(([name, t]) => ({ name, target: short(t), kind: 'remote' as const })),
      ...Object.entries(s.tags).map(([name, t]) => ({ name, target: short(t), kind: 'tag' as const })),
    ],
    head: s.head,
    laneNames,
  };
}

export function summary(s: SimState) {
  const st = status(s);
  return {
    branch: s.head,
    initialized: s.initialized,
    staged: st.staged,
    modified: st.modified,
    untracked: st.untracked,
    conflicts: st.conflicts,
    stash: s.stash.length,
    merging: !!s.merging,
    remote: s.remote?.url ?? null,
    upstream: s.upstream[s.head] ?? null,
  };
}

/* ------------------------------------------------- helpers for exercises */
export const inspect = {
  status,
  headId,
  isAncestor: (s: SimState, a: string | null | undefined, b: string | null | undefined) => !!a && !!b && isAncestor(s, a, b),
  headCommit: (s: SimState) => (headId(s) ? s.commits[headId(s)!] : null),
  snapshot: (s: SimState, id: string | null) => snap(s, id),
  findByMsg: (s: SimState, msg: string) => Object.values(s.commits).find((c) => c.msg === msg) ?? null,
  commitCount: (s: SimState) => Object.keys(s.commits).length,
};
