import { AlertTriangle, CheckCircle2, ChevronDown, Link2, OctagonAlert, XCircle } from 'lucide-react';
import type { Command } from '../types';
import CodeBlock, { CopyButton, HighlightedCommand } from './CodeBlock';

interface Props {
  cmd: Command;
  open: boolean;
  onToggle: () => void;
  onRelated: (name: string) => void;
  isKnown: (name: string) => boolean;
}

export default function CommandCard({ cmd, open, onToggle, onRelated, isKnown }: Props) {
  const firstSyntax = cmd.syntax.split('\n')[0];
  return (
    <article
      id={`cmd-${cmd.id}`}
      className={`scroll-mt-24 rounded-xl border bg-panel transition-colors ${
        cmd.danger === 'destructive' ? 'border-bad/35' : cmd.danger === 'caution' ? 'border-warn/35' : 'border-line'
      } ${open ? 'shadow-[0_1px_0_rgb(var(--line))]' : ''}`}
    >
      <header className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-mono text-[15px] font-semibold">
              <HighlightedCommand text={cmd.name} />
            </h4>
            {cmd.danger === 'destructive' && (
              <span className="inline-flex items-center gap-1 rounded bg-bad/10 px-1.5 py-0.5 text-[11px] font-semibold text-bad">
                <OctagonAlert size={12} /> Destructive
              </span>
            )}
            {cmd.danger === 'caution' && (
              <span className="inline-flex items-center gap-1 rounded bg-warn/10 px-1.5 py-0.5 text-[11px] font-semibold text-warn">
                <AlertTriangle size={12} /> Rewrites history
              </span>
            )}
          </div>
          <p className="mt-1 max-w-[65ch] text-[14.5px] text-fg/85">{cmd.summary}</p>
        </div>
        <CopyButton text={firstSyntax.replace(/\s*\[.*$/, '')} compact />
      </header>

      <div className="px-4 pb-3">
        <div className="flex min-w-0 items-center gap-2 rounded-md bg-term px-3 py-2">
          <span className="eyebrow shrink-0 text-faint">Syntax</span>
          <code className="scroll-thin min-w-0 overflow-x-auto whitespace-pre font-mono text-[13px]">
            {cmd.syntax.split('\n').map((l, i) => (
              <div key={i}>
                <HighlightedCommand text={l} />
              </div>
            ))}
          </code>
        </div>
      </div>

      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 border-t border-line/70 px-4 py-2 text-left text-[13px] font-medium text-muted transition hover:text-fg"
      >
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide example and pitfalls' : 'Example, result, common mistake'}
      </button>

      {open && (
        <div className="animate-rise grid gap-3 border-t border-line/70 p-4 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <CodeBlock code={cmd.example} title="Example" />
            {cmd.output && <CodeBlock code={cmd.output} variant="output" title="Terminal output" copy={false} />}
          </div>
          <div className="flex min-w-0 flex-col gap-3 text-[14px]">
            <div className="flex gap-2">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-ok" />
              <div>
                <div className="eyebrow mb-0.5 text-ok">Expected result</div>
                <p className="text-fg/85">{cmd.expected}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <XCircle size={17} className="mt-0.5 shrink-0 text-bad" />
              <div>
                <div className="eyebrow mb-0.5 text-bad">Common mistake</div>
                <p className="text-fg/85">{cmd.mistake}</p>
              </div>
            </div>
            {cmd.dangerNote && (
              <div
                className={`flex gap-2 rounded-lg border p-2.5 ${cmd.danger === 'destructive' ? 'border-bad/30 bg-bad/5' : 'border-warn/30 bg-warn/5'}`}
              >
                <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${cmd.danger === 'destructive' ? 'text-bad' : 'text-warn'}`} />
                <p className="text-fg/90">{cmd.dangerNote}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Link2 size={17} className="mt-0.5 shrink-0 text-info" />
              <div className="min-w-0">
                <div className="eyebrow mb-1 text-info">Related commands</div>
                <div className="flex flex-wrap gap-1.5">
                  {cmd.related.map((r) =>
                    isKnown(r) ? (
                      <button
                        key={r}
                        onClick={() => onRelated(r)}
                        className="rounded border border-info/40 bg-info/10 px-1.5 py-0.5 font-mono text-[12px] text-info hover:bg-info/20"
                      >
                        {r}
                      </button>
                    ) : (
                      <span key={r} className="rounded border border-line px-1.5 py-0.5 font-mono text-[12px] text-muted">
                        {r}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
