'use client';

import { useState, type ReactNode } from 'react';

/**
 * Information tier. Controls a left rail so the page has hierarchy instead
 * of five equal-weight stacked cards.
 *
 *   verdict    the kernel's answers — the only tier allowed a decision colour
 *   exposure   money at risk right now
 *   reference  configuration and provenance; recedes
 */
export type Tier = 'verdict' | 'exposure' | 'reference';

/** Panel shell. The number in the corner is the panel number from the spec. */
export function Panel({
  n,
  title,
  aside,
  children,
  bare,
  tier = 'reference',
}: {
  n: number;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  bare?: boolean;
  tier?: Tier;
}) {
  return (
    <section className={`panel tier-${tier}`} id={`panel-${n}`}>
      <header>
        <span className="n">{n}</span>
        <h2>{title}</h2>
        <div className="spacer" />
        {aside}
      </header>
      {bare ? children : <div className="body">{children}</div>}
    </section>
  );
}

export function Empty({
  title,
  children,
  command,
}: {
  title: string;
  children?: ReactNode;
  command?: string;
}) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
      {command ? <code className="cmd">{command}</code> : null}
    </div>
  );
}

export function CopyRow({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copyrow">
      {label ? <span className="k faint">{label}</span> : null}
      <span className="val">{value}</span>
      <button
        type="button"
        className="linkish"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }}
      >
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  );
}

export function Field({ k, v, sub }: { k: string; v: ReactNode; sub?: ReactNode }) {
  return (
    <div className="field">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

export function Err({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="err">{children}</div>;
}
