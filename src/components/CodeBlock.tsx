import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../hooks/useAppState';

type Tok = { t: string; c: string };

/** Tiny bash highlighter tuned for git commands. */
export function highlightLine(line: string): Tok[] {
  if (/^\s*#/.test(line)) return [{ t: line, c: 'text-faint italic' }];
  const toks: Tok[] = [];
  const re = /("[^"]*"|'[^']*'|<[^>]+>|\s+|#.*$|[^\s]+)/g;
  let m: RegExpExecArray | null;
  let word = 0;
  let lastCmd = '';
  while ((m = re.exec(line))) {
    const t = m[0];
    if (/^\s+$/.test(t)) {
      toks.push({ t, c: '' });
      continue;
    }
    let c = 'text-fg';
    if (t.startsWith('#')) c = 'text-faint italic';
    else if (/^["']/.test(t)) c = 'text-ok';
    else if (t.startsWith('<')) c = 'text-warn italic';
    else if (/^-{1,2}[\w-]/.test(t)) c = 'text-b3';
    else if (t === '&&' || t === '|' || t === '\\' || t === '>') c = 'text-faint';
    else if (word === 0 || (lastCmd === '&&')) {
      c = t === 'git' || t === 'gh' ? 'text-accent font-semibold' : 'text-muted font-semibold';
      word = 0;
    } else if (word === 1) c = 'text-info';
    lastCmd = t;
    if (t !== '&&') word++;
    else word = 0;
    toks.push({ t, c });
  }
  return toks;
}

export function HighlightedCommand({ text }: { text: string }) {
  return (
    <>
      {highlightLine(text).map((k, i) => (
        <span key={i} className={k.c}>
          {k.t}
        </span>
      ))}
    </>
  );
}

interface Props {
  code: string;
  title?: string;
  variant?: 'bash' | 'output';
  copy?: boolean;
  className?: string;
}

export function CopyButton({ text, label = 'Copy', compact = false }: { text: string; label?: string; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? 'ok' : 'fail');
        window.setTimeout(() => setState('idle'), 1600);
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-[11px] text-muted transition hover:border-accent/60 hover:text-fg ${
        state === 'ok' ? '!border-ok/60 !text-ok' : ''
      }`}
      aria-label={`Copy: ${text}`}
    >
      {state === 'ok' ? <Check size={13} /> : <Copy size={13} />}
      {!compact && (state === 'ok' ? 'Copied' : state === 'fail' ? 'Select & copy' : label)}
    </button>
  );
}

export default function CodeBlock({ code, title, variant = 'bash', copy = true, className = '' }: Props) {
  const lines = code.split('\n');
  return (
    <div className={`min-w-0 overflow-hidden rounded-lg border border-line bg-term ${className}`}>
      {(title || copy) && (
        <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-1.5">
          <span className="eyebrow truncate text-faint">{title ?? (variant === 'output' ? 'output' : 'bash')}</span>
          {copy && variant === 'bash' && <CopyButton text={code} />}
        </div>
      )}
      <pre className="scroll-thin overflow-x-auto px-3 py-2.5 font-mono text-[13px] leading-relaxed">
        <code>
          {lines.map((l, i) => (
            <div key={i} className="whitespace-pre">
              {variant === 'bash' ? (
                l.trim() && !l.trim().startsWith('#') && !(i > 0 && lines[i - 1].trimEnd().endsWith('\\')) ? (
                  <>
                    <span className="select-none text-faint">$ </span>
                    <HighlightedCommand text={l} />
                  </>
                ) : (
                  <HighlightedCommand text={l || ' '} />
                )
              ) : (
                <span className={/^\s*[-]/.test(l) ? 'text-bad' : /^\s*\+/.test(l) ? 'text-ok' : 'text-muted'}>{l || ' '}</span>
              )}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
