import { useEffect, useRef, useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import type { Line } from '../lib/gitSim';
import { HighlightedCommand } from './CodeBlock';

const kindClass: Record<Line['kind'], string> = {
  cmd: 'text-fg',
  out: 'text-fg/80',
  err: 'text-bad',
  ok: 'text-ok',
  hint: 'text-faint italic',
  info: 'text-warn',
};

interface Props {
  lines: Line[];
  prompt: string;
  onRun: (cmd: string) => void;
  heightClass?: string;
  inputId: string;
  placeholder?: string;
}

/** Scrollback + prompt with history (↑/↓). Shared by the simulator and the exercises. */
export default function TerminalPane({ lines, prompt, onRun, heightClass = 'h-[340px] sm:h-[420px]', inputId, placeholder = 'git status' }: Props) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const submit = () => {
    const cmd = input.trim();
    if (!cmd) return;
    onRun(cmd);
    setHistory((h) => [...h, cmd]);
    setHIdx(-1);
    setInput('');
  };

  return (
    <div
      ref={scrollRef}
      onClick={(e) => {
        if (!window.getSelection()?.toString() && (e.target as HTMLElement).tagName !== 'BUTTON') inputRef.current?.focus({ preventScroll: true });
      }}
      className={`scroll-thin overflow-y-auto bg-term px-3 py-2 font-mono text-[12.5px] leading-[1.55] ${heightClass}`}
      role="log"
      aria-live="polite"
    >
      {lines.map((l, i) => (
        <div key={i} className={`whitespace-pre-wrap break-words ${kindClass[l.kind]}`}>
          {l.kind === 'cmd' ? (
            <>
              <span className="text-info">{l.text.slice(0, l.text.indexOf('$') + 1)}</span>{' '}
              <HighlightedCommand text={l.text.slice(l.text.indexOf('$') + 2)} />
            </>
          ) : (
            l.text || ' '
          )}
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2"
      >
        <label htmlFor={inputId} className="shrink-0 text-info">
          {prompt}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && history.length) {
              e.preventDefault();
              const n = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
              setHIdx(n);
              setInput(history[n]);
            } else if (e.key === 'ArrowDown' && hIdx >= 0) {
              e.preventDefault();
              const n = hIdx + 1;
              if (n >= history.length) {
                setHIdx(-1);
                setInput('');
              } else {
                setHIdx(n);
                setInput(history[n]);
              }
            }
          }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-fg caret-accent outline-none"
          placeholder={placeholder}
          aria-label="Type a git command"
        />
        <button type="submit" className="shrink-0 text-faint hover:text-fg" aria-label="Run command">
          <CornerDownLeft size={14} />
        </button>
      </form>
    </div>
  );
}
