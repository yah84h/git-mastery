import type { LucideIcon } from 'lucide-react';

export type Danger = 'caution' | 'destructive';

export interface Command {
  id: string;
  /** Display name, e.g. "git status" */
  name: string;
  /** Short English explanation */
  summary: string;
  /** Generic syntax with placeholders */
  syntax: string;
  /** Practical example (commands typed by the learner) */
  example: string;
  /** What the terminal shows / what changes */
  output?: string;
  expected: string;
  mistake: string;
  related: string[];
  danger?: Danger;
  dangerNote?: string;
}

export interface Concept {
  term: string;
  body: string;
}

export interface Comparison {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface WorkflowStep {
  title: string;
  body: string;
  code: string;
}

export type DiagramKind = 'workflow' | 'branching' | 'remote' | 'undo' | 'advanced' | 'github';

export interface Module {
  id: string;
  number: number;
  title: string;
  tagline: string;
  icon: LucideIcon;
  intro: string;
  concepts: Concept[];
  diagram?: DiagramKind;
  commands: Command[];
  comparisons?: Comparison[];
  callouts?: { kind: 'tip' | 'warning'; title: string; body: string }[];
  steps?: WorkflowStep[];
}

/* ---------- Commit graph ---------- */
export interface GraphCommit {
  id: string;
  msg?: string;
  lane: number;
  col: number;
  parents: string[];
  /** visual state */
  ghost?: boolean;
  conflict?: boolean;
  highlight?: boolean;
}

export interface GraphRef {
  name: string;
  target: string;
  kind: 'branch' | 'remote' | 'tag';
}

export interface GraphState {
  commits: GraphCommit[];
  refs: GraphRef[];
  /** branch name or commit id (detached) */
  head?: string;
  /** names for lanes shown at left edge */
  laneNames?: string[];
}

export interface GraphFrame {
  caption: string;
  command?: string;
  state: GraphState;
}

export interface GraphScenario {
  id: string;
  title: string;
  frames: GraphFrame[];
}

/* ---------- Quiz ---------- */
export interface QuizQuestion {
  id: string;
  topic: string;
  prompt: string;
  code?: string;
  options: string[];
  /** index into options of the correct one, before shuffling */
  answer: number;
  explanation: string;
  /** commit graph shown with the prompt */
  graph?: GraphState;
  graphCaption?: string;
  /** when set, each option is shown as a commit graph (same order as options) */
  optionGraphs?: GraphState[];
}

export interface PreparedQuestion extends QuizQuestion {
  shuffled: { text: string; correct: boolean; graph?: GraphState }[];
}

export interface AnswerRecord {
  questionId: string;
  correct: boolean;
  timeMs: number;
  points: number;
  timedOut: boolean;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  accuracy: number;
  avgMs: number;
  date: string;
}

/* ---------- Progress ---------- */
export interface Progress {
  completed: string[];
  visited: string[];
  bestScore: number;
  leaderboard: LeaderboardEntry[];
  missionBest: number | null; // fewest mistakes
  missionDone: boolean;
  exercises: string[];
}
