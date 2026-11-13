import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  FA_ICON_CATEGORIES,
  FaIconCategory,
  filterFaIcons,
} from '../../data/faIcons';

export interface FaIconBrowserProps {
  selectedClass?: string;
  compact?: boolean;
  f2uDefaultOnly?: boolean;
  onSelectIcon: (faClass: string, label: string) => void;
}

export const FaIconBrowser: React.FC<FaIconBrowserProps> = ({
  selectedClass,
  compact = false,
  f2uDefaultOnly = false,
  onSelectIcon,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaIconCategory | 'all'>('all');
  const [f2uOnly, setF2uOnly] = useState(f2uDefaultOnly);

  const items = useMemo(
    () => filterFaIcons(query, category, f2uOnly),
    [query, category, f2uOnly]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 min-w-0">
          <Search
            className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FA icons (crown, moon, rpg...)"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="w-full border rounded-[5px] pl-6 pr-2 py-1 text-[10.5px]"
          />
        </div>
        <label
          style={{ color: 'var(--text-muted)' }}
          className="flex items-center gap-1 text-[9.5px] font-mono shrink-0 cursor-pointer"
          title="Hide FontAwesome Pro-only thin/light icons"
        >
          <input
            type="checkbox"
            checked={f2uOnly}
            onChange={(e) => setF2uOnly(e.target.checked)}
            className="rounded"
          />
          <span>F2U</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-1">
        {FA_ICON_CATEGORIES.map((cat) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              style={
                active
                  ? {
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      borderColor: 'var(--accent)',
                    }
                  : {
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-muted)',
                    }
              }
              className="border rounded-[4px] px-1.5 py-0.5 text-[9px] font-medium transition"
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div
        className={`grid ${compact ? 'grid-cols-6' : 'grid-cols-5'} gap-1 ${
          compact ? 'max-h-36' : 'max-h-48'
        } overflow-y-auto pr-0.5`}
      >
        {items.length === 0 ? (
          <div
            style={{ color: 'var(--text-muted)' }}
            className="col-span-full py-3 text-center text-[10px] italic"
          >
            No matching icons.
          </div>
        ) : (
          items.map((icon) => {
            const isActive = selectedClass === icon.cls;
            return (
              <button
                key={icon.cls}
                type="button"
                onClick={() => onSelectIcon(icon.cls, icon.label)}
                title={`${icon.label} (${icon.cls})${icon.f2uSafe ? '' : ' • Toyhouse Pro'}`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        borderColor: 'var(--accent)',
                      }
                    : {
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                      }
                }
                className="relative border rounded-[5px] py-1.5 flex flex-col items-center justify-center gap-0.5 hover:border-amber-500 transition"
              >
                <i className={`${icon.cls} text-xs`} />
                {!compact && (
                  <span className="text-[8px] truncate max-w-full px-1 opacity-75">
                    {icon.label.split(' ')[0]}
                  </span>
                )}
                {!icon.f2uSafe && (
                  <span
                    className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400"
                    title="Pro/Light class"
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

