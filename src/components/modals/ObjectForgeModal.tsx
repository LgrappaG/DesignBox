import React, { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { compileVisualForgeBlueprintHTML } from '../../data/templates';
import {
  CustomPropDefinition,
  CustomWidgetBlueprint,
  UiTheme,
  VisualForgeConfig,
} from '../../types/schema';

export interface ObjectForgeModalProps {
  open: boolean;
  canvasBg: string;
  uiTheme: UiTheme;
  onClose: () => void;
  onCreateBlueprint: (bp: CustomWidgetBlueprint) => void;
}

const DEFAULT_FORGE_CONFIG: VisualForgeConfig = {
  layout: 'row',
  glassmorphism: true,
  glowBorder: false,
  showAvatarSlot: true,
  showHeaderSlot: true,
  showBodySlot: true,
  showProgressSlot: true,
  showBadgeSlot: true,
  showButtonSlot: false,
};

const DEFAULT_FORGE_PROPS: CustomPropDefinition[] = [
  { key: 'badge', label: 'Rank / Status Badge', type: 'text', defaultValue: 'OMEGA' },
  { key: 'stat_label', label: 'Meter Label', type: 'text', defaultValue: 'SYNC RATE' },
  { key: 'stat_value', label: 'Meter % (0-100)', type: 'number', defaultValue: '84' },
  { key: 'role', label: 'Class / Role', type: 'text', defaultValue: 'Cartographer' },
];

export const ObjectForgeModal: React.FC<ObjectForgeModalProps> = ({
  open,
  canvasBg,
  uiTheme,
  onClose,
  onCreateBlueprint,
}) => {
  const [forgeTab, setForgeTab] = useState<'visual' | 'code'>('visual');
  const [forgeName, setForgeName] = useState<string>('Astral Character Card');
  const [forgeIcon, setForgeIcon] = useState<string>('✨');
  const [forgeDesc] = useState<string>('Modular visual widget with custom inspector fields');
  const [forgeTitle, setForgeTitle] = useState<string>('ELARA VALE // LVL 24');
  const [forgeSubtitle, setForgeSubtitle] = useState<string>(
    '“The brass astrolabe points toward the northern rift.”'
  );
  const [forgeVisualConfig, setForgeVisualConfig] =
    useState<VisualForgeConfig>(DEFAULT_FORGE_CONFIG);
  const [forgeCustomProps, setForgeCustomProps] =
    useState<CustomPropDefinition[]>(DEFAULT_FORGE_PROPS);
  const [forgeHtml, setForgeHtml] = useState<string>(() =>
    compileVisualForgeBlueprintHTML(DEFAULT_FORGE_CONFIG, DEFAULT_FORGE_PROPS)
  );

  useEffect(() => {
    if (forgeTab === 'visual') {
      setForgeHtml(compileVisualForgeBlueprintHTML(forgeVisualConfig, forgeCustomProps));
    }
  }, [forgeVisualConfig, forgeCustomProps, forgeTab]);

  if (!open) return null;

  const handleSave = () => {
    if (!forgeName.trim() || !forgeHtml.trim()) return;
    const newBp: CustomWidgetBlueprint = {
      id: `bp-${Date.now().toString().slice(-4)}`,
      name: forgeName.trim(),
      icon: forgeIcon || '✨',
      description: forgeDesc.trim() || 'User-created dynamic object',
      defaultWidth: forgeVisualConfig.layout === 'grid2' ? 420 : 360,
      defaultHeight:
        forgeVisualConfig.showProgressSlot || forgeVisualConfig.showButtonSlot ? 132 : 104,
      defaultContent: forgeTitle,
      defaultSubContent: forgeSubtitle,
      htmlTemplate: forgeHtml,
      customPropDefs: [...forgeCustomProps],
      visualConfig: { ...forgeVisualConfig },
    };
    onCreateBlueprint(newBp);
    onClose();
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-6"
    >
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
        className="border rounded-[12px] max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="px-5 py-3.5 border-b flex items-center justify-between"
        >
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span>Visual Object Forge — Dynamic Component & Prop Builder</span>
            </h3>
            <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">
              Combine visual slots, glass/glow effects, and custom Inspector data fields — or
              fine-tune the generated HTML/CSS directly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="flex p-0.5 rounded-[7px] border text-[11px]"
            >
              <button
                onClick={() => setForgeTab('visual')}
                style={
                  forgeTab === 'visual' ? { backgroundColor: 'var(--accent)', color: '#fff' } : {}
                }
                className="px-2.5 py-1 rounded-[5px] font-medium"
              >
                1. Visual Slot Builder
              </button>
              <button
                onClick={() => setForgeTab('code')}
                style={
                  forgeTab === 'code' ? { backgroundColor: 'var(--accent)', color: '#fff' } : {}
                }
                className="px-2.5 py-1 rounded-[5px] font-medium"
              >
                2. HTML/CSS Code
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'var(--bg-panel-alt)',
                borderColor: 'var(--border-strong)',
              }}
              className="px-3 py-1 rounded-[7px] border text-xs"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-12 gap-5 text-xs overflow-y-auto">
          <div className="col-span-7 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <label className="col-span-3">
                <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                  Widget Name
                </span>
                <input
                  type="text"
                  value={forgeName}
                  onChange={(e) => setForgeName(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="w-full border rounded-[6px] px-2.5 py-1.5"
                />
              </label>
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                  Icon
                </span>
                <input
                  type="text"
                  value={forgeIcon}
                  onChange={(e) => setForgeIcon(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="w-full border rounded-[6px] px-2 py-1.5 text-center"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                  Default Heading ({'{{title}}'})
                </span>
                <input
                  type="text"
                  value={forgeTitle}
                  onChange={(e) => setForgeTitle(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="w-full border rounded-[6px] px-2.5 py-1.5"
                />
              </label>
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                  Default Subtitle ({'{{subtitle}}'})
                </span>
                <input
                  type="text"
                  value={forgeSubtitle}
                  onChange={(e) => setForgeSubtitle(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="w-full border rounded-[6px] px-2.5 py-1.5"
                />
              </label>
            </div>

            {forgeTab === 'visual' ? (
              <>
                <div
                  style={{
                    backgroundColor: 'var(--bg-panel-alt)',
                    borderColor: 'var(--border-main)',
                  }}
                  className="p-3 rounded-[8px] border space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px]">
                      A. Active Component Slots & Layout
                    </span>
                    <div className="flex gap-1">
                      {(
                        [
                          { id: 'row', label: 'Horizontal Row' },
                          { id: 'col', label: 'Vertical Stack' },
                          { id: 'grid2', label: '2-Col Split' },
                        ] as const
                      ).map((l) => (
                        <button
                          key={l.id}
                          onClick={() =>
                            setForgeVisualConfig((prev) => ({ ...prev, layout: l.id }))
                          }
                          style={
                            forgeVisualConfig.layout === l.id
                              ? { backgroundColor: 'var(--accent)', color: '#fff' }
                              : { backgroundColor: 'var(--bg-input)' }
                          }
                          className="px-2 py-0.5 rounded-[5px] text-[10px] border border-stone-500/20"
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    {(
                      [
                        { key: 'showAvatarSlot', label: 'Avatar Slot' },
                        { key: 'showHeaderSlot', label: 'Title Header' },
                        { key: 'showBadgeSlot', label: 'Status Badge' },
                        { key: 'showBodySlot', label: 'Body Text' },
                        { key: 'showProgressSlot', label: 'Progress Bar' },
                        { key: 'showButtonSlot', label: 'Action Button' },
                        { key: 'glassmorphism', label: 'Glass Blur' },
                        { key: 'glowBorder', label: 'Accent Glow' },
                      ] as const
                    ).map((slot) => (
                      <label
                        key={slot.key}
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: forgeVisualConfig[slot.key]
                            ? 'var(--accent)'
                            : 'var(--border-strong)',
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={forgeVisualConfig[slot.key]}
                          onChange={(e) =>
                            setForgeVisualConfig((prev) => ({
                              ...prev,
                              [slot.key]: e.target.checked,
                            }))
                          }
                        />
                        <span>{slot.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-panel-alt)',
                    borderColor: 'var(--border-main)',
                  }}
                  className="p-3 rounded-[8px] border space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[11px]">
                        B. Custom Inspector Fields (Editable per instance)
                      </span>
                      <p style={{ color: 'var(--text-muted)' }} className="text-[10px]">
                        Each field creates an input box in the Right Inspector and a{' '}
                        <code>{'{{key}}'}</code> variable.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setForgeCustomProps((prev) => [
                          ...prev,
                          {
                            key: `field_${prev.length + 1}`,
                            label: 'New Field',
                            type: 'text',
                            defaultValue: 'Value',
                          },
                        ])
                      }
                      style={{ color: 'var(--accent)' }}
                      className="text-[10px] font-mono font-bold hover:underline"
                    >
                      + Add Custom Field
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {forgeCustomProps.map((prop, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          type="text"
                          value={prop.key}
                          onChange={(e) => {
                            const next = [...forgeCustomProps];
                            next[idx] = {
                              ...prop,
                              key: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                            };
                            setForgeCustomProps(next);
                          }}
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            borderColor: 'var(--border-strong)',
                          }}
                          className="col-span-3 border rounded-[5px] px-2 py-1 font-mono text-[10px]"
                          placeholder="key"
                        />
                        <input
                          type="text"
                          value={prop.label}
                          onChange={(e) => {
                            const next = [...forgeCustomProps];
                            next[idx] = { ...prop, label: e.target.value };
                            setForgeCustomProps(next);
                          }}
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            borderColor: 'var(--border-strong)',
                          }}
                          className="col-span-5 border rounded-[5px] px-2 py-1 text-[11px]"
                          placeholder="Inspector Label"
                        />
                        <input
                          type="text"
                          value={prop.defaultValue}
                          onChange={(e) => {
                            const next = [...forgeCustomProps];
                            next[idx] = { ...prop, defaultValue: e.target.value };
                            setForgeCustomProps(next);
                          }}
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            borderColor: 'var(--border-strong)',
                          }}
                          className="col-span-3 border rounded-[5px] px-2 py-1 text-[11px]"
                          placeholder="Default"
                        />
                        <button
                          onClick={() =>
                            setForgeCustomProps((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="col-span-1 text-red-400 hover:underline text-center font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }} className="text-[10px]">
                    Click a chip to insert variable into HTML:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      '{{title}}',
                      '{{subtitle}}',
                      '{{image}}',
                      '{{accent}}',
                      ...forgeCustomProps.map((p) => `{{${p.key}}}`),
                    ].map((token) => (
                      <button
                        key={token}
                        onClick={() => setForgeHtml((prev) => `${prev}\n<span>${token}</span>`)}
                        style={{
                          backgroundColor: 'var(--bg-panel-alt)',
                          borderColor: 'var(--border-strong)',
                        }}
                        className="px-1.5 py-0.5 rounded-[4px] border font-mono text-[10px] hover:opacity-80"
                      >
                        + {token}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={9}
                  value={forgeHtml}
                  onChange={(e) => setForgeHtml(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="w-full border rounded-[6px] p-2.5 font-mono text-[11px]"
                />
              </div>
            )}
          </div>

          <div className="col-span-5 flex flex-col justify-between">
            <div className="space-y-2">
              <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-mono">
                LIVE OBJECT PREVIEW
              </span>
              <div
                style={{
                  backgroundColor: canvasBg,
                  borderColor: 'var(--border-strong)',
                }}
                className="p-6 rounded-[10px] border flex items-center justify-center min-h-[240px]"
              >
                <div
                  style={{
                    backgroundColor:
                      uiTheme === 'cute' ? '#FDF8FF' : uiTheme === 'paper' ? '#F2EFE9' : '#242220',
                    color:
                      uiTheme === 'cute' ? '#3B234A' : uiTheme === 'paper' ? '#2C2A28' : '#ece7df',
                    border: '1px solid #C86D51',
                    borderRadius: '8px',
                    padding: '12px',
                    width: '100%',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: forgeCustomProps.reduce(
                      (acc, p) =>
                        acc.replace(new RegExp(`\\{\\{${p.key}\\}\\}`, 'g'), p.defaultValue),
                      forgeHtml
                        .replace(/\{\{title\}\}/g, forgeTitle)
                        .replace(/\{\{subtitle\}\}/g, forgeSubtitle)
                        .replace(
                          /\{\{image\}\}/g,
                          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80'
                        )
                        .replace(/\{\{accent\}\}/g, '#C86D51')
                        .replace(/\{\{button_text\}\}/g, 'OPEN DOSSIER')
                    ),
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              className="w-full py-2.5 rounded-[8px] font-semibold text-xs hover:opacity-95 transition shadow"
            >
              Save to Custom Objects & Add to Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

