import React from 'react';

export interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_ITEMS: ReadonlyArray<readonly [string, string]> = [
  ['Drag Empty Space', 'Bounded Pan Viewport (click clears selection)'],
  ['Space + Drag / Mid-Click', 'Pan Viewport from anywhere (even over objects)'],
  ['Drag from Rulers', 'Create persistent Figma Guide (Double-click to delete)'],
  ['Shift + Drag Empty', 'Box Marquee Multi-Select elements'],
  ['Ctrl + Mouse Wheel', 'Cursor-Centered Zoom (25% – 400%)'],
  ['Ctrl + 0 / Ctrl + 1', 'Reset 100% Center / Fit Canvas to Viewport'],
  ['Ctrl + S / Ctrl + Shift + S', 'Save Project / Save Project As...'],
  ['Ctrl + O', 'Open Project (.dbx.json)'],
  ['Panel Edges / Splitters', 'Drag to resize (double-click edge to reset)'],
  ['Double-Click Container', 'Enter Isolation Edit-Inside Mode'],
  ['Top Terracotta Knob', 'Drag horizontally to rotate element'],
  ['Ctrl + D', 'Duplicate selected layer'],
  ['Ctrl + C / Ctrl + V', 'Copy & Paste layer'],
  ['Ctrl + Z / Ctrl + Y', 'Undo / Redo'],
  ['Delete / Backspace', 'Delete selected layer'],
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6">
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
        className="border rounded-[10px] max-w-md w-full overflow-hidden shadow-2xl"
      >
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="px-4 py-3 border-b flex items-center justify-between"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Shortcuts & Direct Manipulation
          </h3>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--bg-panel-alt)',
              borderColor: 'var(--border-strong)',
            }}
            className="px-2.5 py-1 rounded-[6px] border text-xs"
          >
            Close
          </button>
        </div>
        <div className="p-4 space-y-2 text-xs font-mono">
          {SHORTCUT_ITEMS.map(([key, desc]) => (
            <div
              key={key}
              style={{ borderColor: 'var(--border-main)' }}
              className="flex justify-between gap-3 py-1.5 border-b"
            >
              <span style={{ color: 'var(--accent)' }} className="shrink-0">
                {key}
              </span>
              <span style={{ color: 'var(--text-muted)' }} className="text-right">
                {desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

