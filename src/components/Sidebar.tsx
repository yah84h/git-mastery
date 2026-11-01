import { useEffect } from "react";
import {
  CheckCircle2,
  Flag,
  Github,
  Home,
  Library,
  SquareTerminal,
  Trophy,
  X,
} from "lucide-react";
import type { Progress } from "../types";
import { modules } from "../data/modules";
import ProgressTracker from "./ProgressTracker";

/* ------------------------------------------------------------ Sidebar */
interface NavProps {
  route: string;
  go: (r: string) => void;
  progress: Progress;
  onReset?: () => void;
}

function NavItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] transition ${
        active
          ? "bg-raised font-semibold text-fg"
          : "text-muted hover:bg-raised/60 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

export function NavContent({ route, go, progress, onReset }: NavProps) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Course navigation">
      <NavItem active={route === "home"} onClick={() => go("home")}>
        <Home size={16} /> Overview
      </NavItem>
      <div>
        <div className="eyebrow mb-1.5 px-2.5 text-faint">Course</div>
        <ol className="flex flex-col gap-0.5">
          {modules.map((m) => {
            const done = progress.completed.includes(m.id);
            const active = route === `module-${m.id}`;
            return (
              <li key={m.id}>
                <NavItem active={active} onClick={() => go(`module-${m.id}`)}>
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10.5px] font-bold tnum ${
                      done
                        ? "bg-ok text-bg"
                        : active
                          ? "bg-accent text-accent-fg"
                          : "border border-line text-faint"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 size={13} strokeWidth={3} />
                    ) : (
                      m.number
                    )}
                  </span>
                  <span className="truncate">{m.title}</span>
                </NavItem>
              </li>
            );
          })}
        </ol>
      </div>
      <div>
        <div className="eyebrow mb-1.5 px-2.5 text-faint">Practice</div>
        <NavItem active={route === "terminal"} onClick={() => go("terminal")}>
          <SquareTerminal size={16} /> Terminal simulator
        </NavItem>
        <NavItem active={route === "challenge"} onClick={() => go("challenge")}>
          <Trophy size={16} /> Git Challenge
        </NavItem>
        <NavItem active={route === "mission"} onClick={() => go("mission")}>
          <Flag size={16} /> Save the Repository
        </NavItem>
      </div>
      <ProgressTracker progress={progress} onReset={onReset} />
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-2.5 text-[12.5px] text-faint">
        <span>
          Designed by <span className="font-semibold text-muted">Yah84H</span>
        </span>
        <a
          href="https://github.com/yah84h"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-muted transition hover:bg-raised hover:text-fg"
          aria-label="Yah84H on GitHub"
        >
          <Github size={14} /> github.com/yah84h
        </a>
      </p>
    </nav>
  );
}

export function Sidebar(props: NavProps) {
  return (
    <aside className="scroll-thin sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] hidden h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] w-[264px] shrink-0 overflow-y-auto border-r border-line py-5 pl-[max(16px,env(safe-area-inset-left,0px))] pr-3 lg:block">
      <NavContent {...props} />
    </aside>
  );
}

/* ------------------------------------------------------------ Mobile */
export function MobileDrawer({
  open,
  onClose,
  ...props
}: NavProps & { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Course menu"
    >
      <button
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className="animate-rise absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-panel pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display font-bold">Menu</span>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-fg"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <NavContent
          {...props}
          go={(r) => {
            props.go(r);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

export function MobileNav({
  route,
  go,
  onOpenMenu,
}: {
  route: string;
  go: (r: string) => void;
  onOpenMenu: () => void;
}) {
  const items = [
    { r: "home", label: "Home", icon: Home },
    { r: "learn", label: "Learn", icon: Library },
    { r: "terminal", label: "Terminal", icon: SquareTerminal },
    { r: "challenge", label: "Challenge", icon: Trophy },
    { r: "mission", label: "Mission", icon: Flag },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active =
            it.r === "learn" ? route.startsWith("module-") : route === it.r;
          return (
            <button
              key={it.r}
              onClick={() => (it.r === "learn" ? onOpenMenu() : go(it.r))}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-accent" : "text-muted"}`}
              aria-current={active ? "page" : undefined}
            >
              <it.icon size={19} />
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
