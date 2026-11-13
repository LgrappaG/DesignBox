import React from 'react';
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { DesignElement, FontFamily } from '../../types/schema';

interface TypographySectionProps {
  el: DesignElement;
  updateSelected: (patch: Partial<DesignElement>) => void;
}

/** Typography family, Google Fonts, sizing, spacing, and alignment controls. */
export const TypographySection: React.FC<TypographySectionProps> = ({
  el,
  updateSelected,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-panel-alt)',
        borderColor: 'var(--border-main)',
      }}
      className="p-2.5 rounded-[8px] border space-y-2"
    >
      <div className="font-semibold text-[11px]">Typography</div>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
            Font Family
          </span>
          <select
            value={el.fontFamily || 'sans'}
            onChange={(e) => updateSelected({ fontFamily: e.target.value as FontFamily })}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="w-full border rounded-[5px] px-1.5 py-1 text-[11px]"
          >
            <option value="sans">Clean Sans</option>
            <option value="serif">Editorial Serif</option>
            <option value="mono">Typewriter Mono</option>
            <option value="handwriting">Sketchbook Script</option>
            <option value="display">Bold Display</option>
            <option value="pixel">Retro Console</option>
          </select>
        </label>

        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
            Font Size &amp; Weight
          </span>
          <div className="flex gap-1">
            <input
              type="number"
              min={9}
              max={42}
              value={el.fontSize}
              onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value, 10) || 13 })}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="w-14 border rounded-[5px] px-1.5 py-1 font-mono text-[11px]"
            />
            <select
              value={el.fontWeight}
              onChange={(e) =>
                updateSelected({ fontWeight: e.target.value as 'normal' | 'medium' | 'bold' })
              }
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="flex-1 border rounded-[5px] px-1 py-1 text-[11px]"
            >
              <option value="normal">Regular</option>
              <option value="medium">Medium</option>
              <option value="bold">Bold</option>
            </select>
          </div>
        </label>

        <label className="col-span-2">
          <span
            style={{ color: 'var(--text-muted)' }}
            className="text-[10px] mb-0.5 flex items-center justify-between"
          >
            <span>Live Google Font (@import)</span>
            {el.googleFont && (
              <button
                type="button"
                onClick={() => updateSelected({ googleFont: undefined })}
                className="text-[9px] text-stone-400 hover:text-red-500"
              >
                Reset
              </button>
            )}
          </span>
          <select
            value={el.googleFont || ''}
            onChange={(e) => updateSelected({ googleFont: e.target.value || undefined })}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: el.googleFont ? 'var(--accent)' : 'var(--border-strong)',
            }}
            className="w-full border rounded-[5px] px-1.5 py-1 text-[11px]"
          >
            <option value="">Default (System Font)</option>
            <option value="Cinzel">Cinzel (High Fantasy / Regal Serif)</option>
            <option value="Playfair Display">Playfair Display (Editorial High-Fashion)</option>
            <option value="Cormorant Garamond">Cormorant Garamond (Ethereal Archival)</option>
            <option value="Space Grotesk">Space Grotesk (Neo-Brutalist Tech)</option>
            <option value="Montserrat">Montserrat (Geometric Modern)</option>
            <option value="Orbitron">Orbitron (Cyberpunk / Sci-Fi HUD)</option>
            <option value="Caveat">Caveat (Organic Handwritten Script)</option>
            <option value="Press Start 2P">Press Start 2P (8-Bit Pixel Game)</option>
            <option value="Syne">Syne (Avant-Garde Display)</option>
            <option value="Inter">Inter (Ultra-Clean UI)</option>
          </select>
        </label>

        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
            Line Height ({el.lineHeight || 1.45})
          </span>
          <input
            type="range"
            min={1.0}
            max={2.2}
            step={0.05}
            value={el.lineHeight || 1.45}
            onChange={(e) => updateSelected({ lineHeight: parseFloat(e.target.value) })}
            className="w-full"
          />
        </label>

        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
            Letter Spacing ({el.letterSpacing || 0}px)
          </span>
          <input
            type="range"
            min={-1}
            max={6}
            step={0.5}
            value={el.letterSpacing || 0}
            onChange={(e) => updateSelected({ letterSpacing: parseFloat(e.target.value) })}
            className="w-full"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-1 pt-1">
        <div className="flex gap-1">
          {(
            [
              { id: 'left', icon: AlignLeft },
              { id: 'center', icon: AlignCenter },
              { id: 'right', icon: AlignRight },
            ] as const
          ).map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => updateSelected({ textAlign: a.id })}
                style={
                  el.textAlign === a.id
                    ? { backgroundColor: 'var(--accent)', color: '#fff' }
                    : { backgroundColor: 'var(--bg-input)' }
                }
                className="p-1.5 rounded-[5px] border border-stone-500/20"
              >
                <Icon className="w-3 h-3" />
              </button>
            );
          })}
        </div>

        <div className="flex gap-1 font-mono text-[10px]">
          <button
            type="button"
            onClick={() =>
              updateSelected({
                textTransform: el.textTransform === 'uppercase' ? 'none' : 'uppercase',
              })
            }
            style={
              el.textTransform === 'uppercase'
                ? { backgroundColor: 'var(--accent)', color: '#fff' }
                : { backgroundColor: 'var(--bg-input)' }
            }
            className="px-2 py-1 rounded-[5px] border border-stone-500/20"
            title="Uppercase"
          >
            AA
          </button>
          <button
            type="button"
            onClick={() =>
              updateSelected({
                fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic',
              })
            }
            style={
              el.fontStyle === 'italic'
                ? { backgroundColor: 'var(--accent)', color: '#fff' }
                : { backgroundColor: 'var(--bg-input)' }
            }
            className="px-2 py-1 rounded-[5px] border border-stone-500/20 italic"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() =>
              updateSelected({
                textDecoration: el.textDecoration === 'underline' ? 'none' : 'underline',
              })
            }
            style={
              el.textDecoration === 'underline'
                ? { backgroundColor: 'var(--accent)', color: '#fff' }
                : { backgroundColor: 'var(--bg-input)' }
            }
            className="px-2 py-1 rounded-[5px] border border-stone-500/20 underline"
            title="Underline"
          >
            U
          </button>
          <button
            type="button"
            onClick={() => updateSelected({ textShadow: !el.textShadow })}
            style={
              el.textShadow
                ? { backgroundColor: 'var(--accent)', color: '#fff' }
                : { backgroundColor: 'var(--bg-input)' }
            }
            className="px-2 py-1 rounded-[5px] border border-stone-500/20"
            title="Text Drop Shadow"
          >
            T-Shd
          </button>
        </div>
      </div>
    </div>
  );
};

