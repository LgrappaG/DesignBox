import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface InspectorCollapsibleSectionProps {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  summary?: React.ReactNode;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

/** Figma-style collapsible inspector section with live collapsed summary badge. */
export const InspectorCollapsibleSection: React.FC<InspectorCollapsibleSectionProps> = ({
  id,
  title,
  icon: Icon,
  summary,
  badge,
  headerRight,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <section
      style={{
        backgroundColor: 'var(--bg-panel-alt)',
        borderColor: 'var(--border-main)',
      }}
      className="rounded-[8px] border overflow-hidden"
    >
      <div className="flex items-center justify-between gap-1 px-2.5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={isOpen}
          className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left select-none"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <ChevronRight
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                isOpen ? 'rotate-90' : ''
              }`}
              style={{ color: 'var(--text-muted)' }}
            />
            {Icon && (
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
            )}
            <span className="font-semibold text-[11px] truncate">{title}</span>
            {badge}
          </span>

          {!isOpen && summary && (
            <span
              style={{ color: 'var(--text-muted)' }}
              className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 truncate max-w-[135px] shrink-0"
            >
              {summary}
            </span>
          )}
        </button>
        {headerRight && <div className="shrink-0 flex items-center">{headerRight}</div>}
      </div>

      {isOpen && (
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="p-2.5 pt-2 border-t space-y-2.5"
        >
          {children}
        </div>
      )}
    </section>
  );
};

export interface InspectorSubExpanderProps {
  title: string;
  summary?: string;
  isActive?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Compact nested collapsible row for secondary settings inside a main inspector section. */
export const InspectorSubExpander: React.FC<InspectorSubExpanderProps> = ({
  title,
  summary,
  isActive = false,
  defaultOpen = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: isActive ? 'var(--accent)' : 'var(--border-main)',
      }}
      className="rounded-[6px] border overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full px-2 py-1.5 flex items-center justify-between gap-2 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <ChevronRight
            className={`w-3 h-3 shrink-0 transition-transform duration-150 ${
              open ? 'rotate-90' : ''
            }`}
            style={{ color: 'var(--text-muted)' }}
          />
          <span className="text-[10.5px] font-semibold truncate">{title}</span>
          {isActive && (
            <span
              style={{ backgroundColor: 'var(--accent)' }}
              className="w-1.5 h-1.5 rounded-full shrink-0"
              title="Active custom setting"
            />
          )}
        </span>

        {summary && (
          <span
            style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
            className="text-[9px] font-mono truncate max-w-[120px] shrink-0"
          >
            {summary}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="p-2 pt-1.5 border-t space-y-2"
        >
          {children}
        </div>
      )}
    </div>
  );
};
