import { useMemo, useState } from 'react';
import type { GraphRef, GraphState } from '../types';

const laneColor = (lane: number) => (lane === 0 ? 'var(--accent)' : `var(--b${((lane - 1) % 4) + 1})`);
const rgb = (v: string, a = 1) => `rgb(${v} / ${a})`;

interface Props {
  state: GraphState;
  /** bigger columns for teaching diagrams, tighter for the simulator */
  dense?: boolean;
  /** show the message of a commit when clicked */
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
  /** scale down to the container width instead of scrolling */
  fit?: boolean;
}

const PILL_H = 18;
const PILL_GAP = 4;

interface Placed {
  ref: GraphRef;
  text: string;
  w: number;
  row: number;
  isHead: boolean;
  dx: number;
}

export default function CommitGraph({ state, dense = false, interactive = true, className = '', ariaLabel, fit = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const colW = dense ? 62 : 78;
  const r = dense ? 9 : 12;

  const layout = useMemo(() => {
    const byId = new Map(state.commits.map((c) => [c.id, c]));
    const refsAt = new Map<string, typeof state.refs>();
    state.refs.forEach((ref) => {
      if (!byId.has(ref.target)) return;
      refsAt.set(ref.target, [...(refsAt.get(ref.target) ?? []), ref]);
    });
    const lanes = Math.max(1, ...state.commits.map((c) => c.lane + 1), state.laneNames?.length ?? 0);
    const hasNames = !!state.laneNames?.some(Boolean);
    const padLeft = hasNames ? (dense ? 92 : 104) : 28;
    const xOf = (col: number) => padLeft + col * colW;

    // Place ref pills above their commit; bump to a higher row when they would overlap a neighbour's pill.
    const placed = new Map<string, Placed[]>();
    const used: [number, number][][][] = Array.from({ length: lanes }, () => []);
    let maxX = 0;
    [...state.commits]
      .sort((a, b) => a.col - b.col)
      .forEach((c) => {
        const refs = [...(refsAt.get(c.id) ?? [])].sort((a, b) =>
          a.name === state.head ? -1 : b.name === state.head ? 1 : a.kind.localeCompare(b.kind),
        );
        const cx = xOf(c.col);
        const list: Placed[] = [];
        refs.forEach((ref) => {
          const isHead = ref.kind === 'branch' && ref.name === state.head;
          const text = isHead ? `HEAD → ${ref.name}` : ref.kind === 'tag' ? `◆ ${ref.name}` : ref.name;
          const w = text.length * 6.2 + 14;
          const x0 = Math.max(2, cx - w / 2);
          const x1 = x0 + w;
          let row = 0;
          while (used[c.lane][row]?.some(([a, b]) => x0 < b + 6 && x1 > a - 6)) row++;
          (used[c.lane][row] ??= []).push([x0, x1]);
          maxX = Math.max(maxX, x1);
          list.push({ ref, text, w, row, isHead, dx: x0 - cx });
        });
        placed.set(c.id, list);
      });

    const laneY: number[] = [];
    let y = 8;
    for (let l = 0; l < lanes; l++) {
      y += used[l].length * (PILL_H + PILL_GAP) + r + 8;
      laneY[l] = y;
      y += r + (dense ? 18 : 24);
    }
    const maxCol = Math.max(0, ...state.commits.map((c) => c.col));
    const width = Math.max(xOf(maxCol) + r + 16, maxX + 8);
    const pos = (id: string) => {
      const c = byId.get(id)!;
      return { x: xOf(c.col), y: laneY[c.lane] };
    };
    return { byId, placed, laneY, padLeft, width, height: y - 4, pos, lanes, hasNames };
  }, [state, colW, r, dense]);

  const sel = selected ? layout.byId.get(selected) : null;

  return (
    <div className={`min-w-0 ${className}`}>
      <div className={fit ? "" : "scroll-thin overflow-x-auto"}>
        <svg
          width={fit ? undefined : layout.width}
          height={fit ? undefined : layout.height}
          style={fit ? { width: '100%', height: 'auto', maxWidth: layout.width } : undefined}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label={ariaLabel ?? 'Commit graph'}
          className="block font-mono"
        >
          {/* lane names */}
          {layout.hasNames &&
            Array.from({ length: layout.lanes }).map((_, l) =>
              state.laneNames?.[l] ? (
                <g key={'ln' + l}>
                  <line x1={6} x2={layout.padLeft - 18} y1={layout.laneY[l]} y2={layout.laneY[l]} style={{ stroke: rgb(laneColor(l), 0.25) }} strokeDasharray="2 4" />
                  <text x={6} y={layout.laneY[l] - 6} fontSize={10.5} style={{ fontWeight: 600, fill: rgb(laneColor(l)) }}>
                    {state.laneNames[l].length > 15 ? state.laneNames[l].slice(0, 14) + '…' : state.laneNames[l]}
                  </text>
                </g>
              ) : null,
            )}

          {/* edges */}
          {state.commits.flatMap((c) =>
            c.parents
              .filter((p) => layout.byId.has(p))
              .map((p, i) => {
                const a = layout.pos(p);
                const b = layout.pos(c.id);
                const parent = layout.byId.get(p)!;
                const color = laneColor(i === 0 ? c.lane : parent.lane);
                const d =
                  a.y === b.y
                    ? `M ${a.x} ${a.y} C ${a.x + 10} ${a.y}, ${b.x - 10} ${b.y}, ${b.x} ${b.y}`
                    : `M ${a.x} ${a.y} C ${a.x + colW * 0.7} ${a.y}, ${b.x - colW * 0.7} ${b.y}, ${b.x} ${b.y}`;
                const ghost = c.ghost;
                return (
                  <path
                    key={`${p}-${c.id}`}
                    className="graph-edge"
                    d={d}
                    style={{ d: `path("${d}")`, stroke: rgb(color, ghost ? 0.35 : 0.9) } as React.CSSProperties}
                    fill="none"
                    strokeWidth={dense ? 2.25 : 2.75}
                    strokeDasharray={ghost ? '4 4' : undefined}
                  />
                );
              }),
          )}

          {/* nodes */}
          {state.commits.map((c) => {
            const { x, y } = layout.pos(c.id);
            const color = laneColor(c.lane);
            const label = c.id.length <= 3 ? c.id : null;
            const isSel = selected === c.id;
            return (
              <g key={c.id} className="graph-node" style={{ transform: `translate(${x}px, ${y}px)` }}>
                <g className="animate-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                  {c.highlight && <circle r={r + 6} style={{ fill: rgb(color, 0.16) }} />}
                  <circle
                    r={r}
                    strokeWidth={c.conflict || isSel ? 3 : 2}
                    strokeDasharray={c.ghost ? '3 3' : undefined}
                    onClick={interactive ? () => setSelected(isSel ? null : c.id) : undefined}
                    style={{
                      cursor: interactive ? 'pointer' : 'default',
                      fill: c.ghost ? 'rgb(var(--bg))' : rgb(color),
                      stroke: c.conflict ? 'rgb(var(--bad))' : isSel ? 'rgb(var(--fg))' : rgb(color, c.ghost ? 0.55 : 1),
                    }}
                  >
                    <title>{`${c.id}${c.msg ? ' — ' + c.msg : ''}`}</title>
                  </circle>
                  {c.conflict && (
                    <text textAnchor="middle" dy="0.35em" fontSize={13} fontWeight={800} style={{ fill: 'rgb(var(--bad))' }} pointerEvents="none">
                      !
                    </text>
                  )}
                  {label && !c.conflict && (
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={dense ? 9 : 11}
                      fontWeight={700}
                      style={{ fill: c.ghost ? rgb(color) : 'rgb(var(--bg))' }}
                      pointerEvents="none"
                    >
                      {label}
                    </text>
                  )}
                  {!label && (
                    <text textAnchor="middle" y={r + 12} fontSize={9.5} style={{ fill: 'rgb(var(--faint))' }} pointerEvents="none">
                      {c.id.slice(0, 7)}
                    </text>
                  )}
                </g>
                {/* ref pills, stacked above the node */}
                {(layout.placed.get(c.id) ?? []).map(({ ref, text, w, row, isHead, dx }) => {
                  const py = -r - 8 - (row + 1) * (PILL_H + PILL_GAP) + PILL_GAP;
                  const tone = ref.kind === 'remote' ? 'var(--info)' : ref.kind === 'tag' ? 'var(--warn)' : color;
                  return (
                    <g key={ref.kind + ref.name} transform={`translate(${dx}, ${py})`}>
                      <g className="animate-rise">
                        <rect
                          width={w}
                          height={PILL_H}
                          rx={ref.kind === 'tag' ? 3 : 9}
                          strokeDasharray={ref.kind === 'remote' ? '3 2' : undefined}
                          style={{ fill: isHead ? rgb(tone) : rgb(tone, 0.14), stroke: rgb(tone, ref.kind === 'remote' ? 0.8 : 0.55) }}
                        />
                        <text x={w / 2} y={12.5} textAnchor="middle" fontSize={10.5} fontWeight={600} style={{ fill: isHead ? 'rgb(var(--bg))' : rgb(tone) }}>
                          {text}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      {interactive && (
        <p className="mt-1 min-h-[1.5rem] text-[13px] text-muted">
          {sel ? (
            <>
              <span className="font-mono text-fg">{sel.id}</span>
              {sel.msg ? ` — ${sel.msg}` : ''}
              {sel.parents.length > 1 && <span className="text-faint"> · merge commit, parents {sel.parents.join(' + ')}</span>}
              {sel.ghost && <span className="text-faint"> · not on any branch</span>}
            </>
          ) : (
            <span className="text-faint">Tap a commit to see its message.</span>
          )}
        </p>
      )}
    </div>
  );
}
