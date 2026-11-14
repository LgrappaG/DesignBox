import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Heart,
  History,
  Keyboard,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sliders,
  Sun,
  Upload,
} from 'lucide-react';
import { LayoutMode, UiTheme } from '../../types/schema';
import {
  applyStudioThemeToDocument,
  CUTE_THEME_PRESETS,
  CuteThemeColors,
  DEFAULT_CUTE_THEME_COLORS,
  DEFAULT_KEYBINDINGS,
  DEFAULT_STUDIO_PREFERENCES,
  formatComboDisplay,
  formatKeyboardEventToCombo,
  KeybindingMap,
  normalizeComboString,
  SHORTCUT_DEFINITIONS,
  SHORTCUT_PROFILES,
  ShortcutActionId,
  ShortcutProfileId,
  StudioPreferences,
} from '../../utils/studioSettings';
import { isTauriRuntime, SnapshotEntry } from '../../utils/tauriDesktop';

export type SettingsModalTab = 'general' | 'shortcuts' | 'hosting';

export interface SettingsModalProps {
  open: boolean;
  initialTab?: SettingsModalTab;
  uiTheme: UiTheme;
  imgbbApiKey: string;
  localSnapshots: SnapshotEntry[];
  lastSnapshotAt: number | null;
  studioPrefs: StudioPreferences;
  keybindings: KeybindingMap;
  onChangeUiTheme: (theme: UiTheme) => void;
  onChangeImgbbKey: (value: string) => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onChangeStudioPrefs: (prefs: StudioPreferences) => void;
  onChangeKeybindings: (bindings: KeybindingMap) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  initialTab = 'general',
  uiTheme,
  imgbbApiKey,
  localSnapshots,
  lastSnapshotAt,
  studioPrefs,
  keybindings,
  onChangeUiTheme,
  onChangeImgbbKey,
  onCreateSnapshot,
  onRestoreSnapshot,
  onChangeStudioPrefs,
  onChangeKeybindings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsModalTab>(initialTab);
  const [shortcutSearch, setShortcutSearch] = useState('');
  const [recordingId, setRecordingId] = useState<ShortcutActionId | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const [draftCuteColors, setDraftCuteColors] = useState<CuteThemeColors>(
    studioPrefs.cuteThemeColors
  );
  const draftCuteColorsRef = useRef<CuteThemeColors>(studioPrefs.cuteThemeColors);
  const studioPrefsRef = useRef<StudioPreferences>(studioPrefs);
  studioPrefsRef.current = studioPrefs;
  const onChangeStudioPrefsRef = useRef(onChangeStudioPrefs);
  onChangeStudioPrefsRef.current = onChangeStudioPrefs;
  const rafIdRef = useRef<number | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const pendingCommitColorsRef = useRef<CuteThemeColors | null>(null);

  const flushPendingCuteCommit = useCallback(() => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    const pending = pendingCommitColorsRef.current;
    if (pending) {
      pendingCommitColorsRef.current = null;
      onChangeStudioPrefsRef.current({
        ...studioPrefsRef.current,
        cuteThemeColors: pending,
      });
    }
  }, []);

  useEffect(() => {
    setDraftCuteColors(studioPrefs.cuteThemeColors);
    draftCuteColorsRef.current = studioPrefs.cuteThemeColors;
  }, [studioPrefs.cuteThemeColors]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setRecordingId(null);
      setConflictNotice(null);
      setImportError(null);
      setDraftCuteColors(studioPrefsRef.current.cuteThemeColors);
      draftCuteColorsRef.current = studioPrefsRef.current.cuteThemeColors;
    } else {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      flushPendingCuteCommit();
    }
  }, [open, initialTab, flushPendingCuteCommit]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      flushPendingCuteCommit();
    };
  }, [flushPendingCuteCommit]);

  const handleClose = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    flushPendingCuteCommit();
    onClose();
  }, [flushPendingCuteCommit, onClose]);

  useEffect(() => {
    if (!open || !recordingId) return;

    const handleCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (e.key === 'Escape') {
        setRecordingId(null);
        return;
      }

      const combo = formatKeyboardEventToCombo(e);
      if (!combo) return;

      const prevForCurrent = keybindings[recordingId] || '';
      const conflictingDef = SHORTCUT_DEFINITIONS.find(
        (d) => d.id !== recordingId && normalizeComboString(keybindings[d.id] || '') === combo
      );

      const nextMap: KeybindingMap = {
        ...keybindings,
        [recordingId]: combo,
      };

      if (conflictingDef) {
        // Swap keybinding with conflicting action so nothing silently breaks
        nextMap[conflictingDef.id] = prevForCurrent;
        setConflictNotice(
          `Swapped "${formatComboDisplay(combo)}" with "${conflictingDef.label}".`
        );
      } else {
        setConflictNotice(null);
      }

      onChangeKeybindings(nextMap);
      setRecordingId(null);
    };

    window.addEventListener('keydown', handleCapture, true);
    return () => window.removeEventListener('keydown', handleCapture, true);
  }, [open, recordingId, keybindings, onChangeKeybindings]);

  const filteredShortcuts = useMemo(() => {
    const q = shortcutSearch.trim().toLowerCase();
    if (!q) return SHORTCUT_DEFINITIONS;
    return SHORTCUT_DEFINITIONS.filter(
      (def) =>
        def.label.toLowerCase().includes(q) ||
        def.category.toLowerCase().includes(q) ||
        (keybindings[def.id] || '').toLowerCase().includes(q) ||
        formatComboDisplay(keybindings[def.id] || '').toLowerCase().includes(q)
    );
  }, [shortcutSearch, keybindings]);

  const groupedShortcuts = useMemo(() => {
    const categories: Array<{
      name: string;
      items: typeof SHORTCUT_DEFINITIONS[number][];
    }> = [];
    for (const def of filteredShortcuts) {
      let group = categories.find((c) => c.name === def.category);
      if (!group) {
        group = { name: def.category, items: [] };
        categories.push(group);
      }
      group.items.push(def);
    }
    return categories;
  }, [filteredShortcuts]);

  if (!open) return null;

  const handleExportShortcuts = () => {
    const blob = new Blob([JSON.stringify(keybindings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'designbox-shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportShortcutsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<Record<ShortcutActionId, string>>;
      const merged: KeybindingMap = { ...DEFAULT_KEYBINDINGS };
      for (const def of SHORTCUT_DEFINITIONS) {
        const val = parsed[def.id];
        if (typeof val === 'string') {
          merged[def.id] = normalizeComboString(val);
        }
      }
      onChangeKeybindings(merged);
      setImportError(null);
      setConflictNotice('Imported keybindings profile cleanly.');
    } catch {
      setImportError('Invalid JSON keybindings file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-[200] bg-black/75 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
        className="border rounded-[12px] max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Studio Settings &amp; Keybindings
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              backgroundColor: 'var(--bg-panel-alt)',
              borderColor: 'var(--border-strong)',
            }}
            className="px-3 py-1 rounded-[6px] border text-xs font-semibold hover:opacity-85"
          >
            Done
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-panel-alt)' }}
          className="flex border-b px-3 gap-1 shrink-0"
        >
          {(
            [
              { id: 'general', label: 'General & Canvas', icon: Sliders },
              { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
              { id: 'hosting', label: 'Hosting & Backups', icon: History },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  borderBottomColor: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--text-main)' : 'var(--text-muted)',
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 transition"
              >
                <Icon className="w-3.5 h-3.5" style={active ? { color: 'var(--accent)' } : undefined} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 text-xs space-y-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Studio UI Theme & Cute Customizer */}
              <div
                style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-main)' }}
                className="p-3 rounded-[10px] border space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span className="font-bold text-[11px] uppercase tracking-wider">
                      Studio UI Theme (Standard 3)
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }} className="text-[10px]">
                    Active: <strong style={{ color: 'var(--accent)' }}>{uiTheme.toUpperCase()}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: 'carbon',
                        label: 'Carbon Dark',
                        desc: 'Cozy studio dark',
                        previewBg: '#1A1918',
                        previewAccent: '#D97757',
                        icon: Moon,
                      },
                      {
                        id: 'paper',
                        label: 'Warm Paper',
                        desc: 'Oatmeal drafting UI',
                        previewBg: '#F7F5F0',
                        previewAccent: '#C86D51',
                        icon: Sun,
                      },
                      {
                        id: 'cute',
                        label: '♡ Kawaii Cute',
                        desc: 'Pastel pink & lilac',
                        previewBg: draftCuteColors.bgApp,
                        previewAccent: draftCuteColors.accentPrimary,
                        icon: Heart,
                      },
                    ] as const
                  ).map((themeOpt) => {
                    const Icon = themeOpt.icon;
                    const active = uiTheme === themeOpt.id;
                    return (
                      <button
                        key={themeOpt.id}
                        type="button"
                        onClick={() => onChangeUiTheme(themeOpt.id)}
                        style={
                          active
                            ? {
                                backgroundColor: 'var(--accent-soft)',
                                borderColor: 'var(--accent)',
                              }
                            : {
                                backgroundColor: 'var(--bg-input)',
                                borderColor: 'var(--border-main)',
                              }
                        }
                        className="p-2.5 rounded-[9px] border text-left transition hover:opacity-95 flex items-center gap-2"
                      >
                        <span
                          style={{
                            backgroundColor: themeOpt.previewBg,
                            borderColor: themeOpt.previewAccent,
                            color: themeOpt.previewAccent,
                          }}
                          className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0"
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-bold text-[11px] truncate">
                            {themeOpt.label}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9.5px] truncate">
                            {themeOpt.desc}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Manual Cute Palette Customizer */}
                <div
                  style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
                  className="p-2.5 rounded-[8px] border space-y-2.5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-bold text-[10.5px] flex items-center gap-1">
                        <span>♡ Cute Theme Manual Color Palette</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)' }} className="text-[9.5px]">
                        Changes apply live to Cute UI chrome and the &quot;TH Cute&quot; Live Preview shell.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (rafIdRef.current !== null) {
                          cancelAnimationFrame(rafIdRef.current);
                          rafIdRef.current = null;
                        }
                        if (commitTimerRef.current !== null) {
                          window.clearTimeout(commitTimerRef.current);
                          commitTimerRef.current = null;
                        }
                        pendingCommitColorsRef.current = null;
                        const nextColors = { ...DEFAULT_CUTE_THEME_COLORS };
                        draftCuteColorsRef.current = nextColors;
                        setDraftCuteColors(nextColors);
                        applyStudioThemeToDocument('cute', nextColors);
                        onChangeUiTheme('cute');
                        onChangeStudioPrefs({
                          ...studioPrefs,
                          cuteThemeColors: nextColors,
                        });
                      }}
                      style={{ color: 'var(--accent)' }}
                      className="text-[10px] font-mono hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Cute Palette
                    </button>
                  </div>

                  {/* Quick Cute Sub-Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {CUTE_THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (rafIdRef.current !== null) {
                            cancelAnimationFrame(rafIdRef.current);
                            rafIdRef.current = null;
                          }
                          if (commitTimerRef.current !== null) {
                            window.clearTimeout(commitTimerRef.current);
                            commitTimerRef.current = null;
                          }
                          pendingCommitColorsRef.current = null;
                          const nextColors = { ...preset.colors };
                          draftCuteColorsRef.current = nextColors;
                          setDraftCuteColors(nextColors);
                          applyStudioThemeToDocument('cute', nextColors);
                          onChangeUiTheme('cute');
                          onChangeStudioPrefs({
                            ...studioPrefs,
                            cuteThemeColors: nextColors,
                          });
                        }}
                        style={{
                          backgroundColor: preset.colors.bgPanelAlt,
                          borderColor: preset.colors.borderMain,
                          color: preset.colors.textMain,
                        }}
                        className="px-2 py-1 rounded-full border text-[10px] font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: preset.colors.accentPrimary }}
                        />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Manual Color Pickers */}
                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'bgApp', label: 'App Background' },
                        { key: 'bgPanel', label: 'Panel Surface' },
                        { key: 'bgPanelAlt', label: 'Alt Panel / Bar' },
                        { key: 'bgCanvasWell', label: 'Canvas Well' },
                        { key: 'rulerBg', label: 'Ruler Background' },
                        { key: 'rulerTick', label: 'Ruler Ticks & Text' },
                        { key: 'accentPrimary', label: 'Accent (Pink)' },
                        { key: 'accentSecondary', label: 'Accent 2 (Lilac)' },
                        { key: 'borderMain', label: 'Border Tone' },
                        { key: 'textMain', label: 'Main Text' },
                        { key: 'textMuted', label: 'Muted Text' },
                      ] as Array<{ key: keyof CuteThemeColors; label: string }>
                    ).map((field) => {
                      const val = draftCuteColors[field.key];
                      return (
                        <label
                          key={field.key}
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            borderColor: 'var(--border-main)',
                          }}
                          className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-[7px] border cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="block text-[10px] font-semibold truncate">
                              {field.label}
                            </span>
                            <span
                              style={{ color: 'var(--text-muted)' }}
                              className="block text-[9px] font-mono uppercase"
                            >
                              {val}
                            </span>
                          </div>
                          <input
                            type="color"
                            value={val}
                            onChange={(e) => {
                              const nextHex = e.target.value.toUpperCase();
                              const prev = draftCuteColorsRef.current;
                              const nextColors: CuteThemeColors = {
                                ...prev,
                                [field.key]: nextHex,
                              };
                              if (
                                field.key === 'bgPanelAlt' &&
                                prev.rulerBg.toUpperCase() === prev.bgPanelAlt.toUpperCase()
                              ) {
                                nextColors.rulerBg = nextHex;
                              }
                              if (
                                field.key === 'textMuted' &&
                                prev.rulerTick.toUpperCase() === prev.textMuted.toUpperCase()
                              ) {
                                nextColors.rulerTick = nextHex;
                              }

                              draftCuteColorsRef.current = nextColors;
                              pendingCommitColorsRef.current = nextColors;
                              setDraftCuteColors(nextColors);

                              if (uiTheme !== 'cute') onChangeUiTheme('cute');

                              if (rafIdRef.current !== null) {
                                cancelAnimationFrame(rafIdRef.current);
                              }
                              rafIdRef.current = requestAnimationFrame(() => {
                                rafIdRef.current = null;
                                applyStudioThemeToDocument('cute', draftCuteColorsRef.current);
                              });

                              if (commitTimerRef.current !== null) {
                                window.clearTimeout(commitTimerRef.current);
                              }
                              commitTimerRef.current = window.setTimeout(() => {
                                flushPendingCuteCommit();
                              }, 140);
                            }}
                            onBlur={() => flushPendingCuteCommit()}
                            className="w-6 h-6 rounded-md border-0 bg-transparent cursor-pointer shrink-0 p-0"
                            title={`Pick ${field.label}`}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-main)' }}
                className="p-3 rounded-[8px] border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase tracking-wider">
                    New Canvas Defaults
                  </span>
                  <button
                    type="button"
                    onClick={() => onChangeStudioPrefs({ ...DEFAULT_STUDIO_PREFERENCES })}
                    style={{ color: 'var(--accent)' }}
                    className="text-[10.5px] font-mono hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Defaults
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[10px]">
                      Default Mode
                    </span>
                    <select
                      value={studioPrefs.defaultLayoutMode}
                      onChange={(e) =>
                        onChangeStudioPrefs({
                          ...studioPrefs,
                          defaultLayoutMode: e.target.value as LayoutMode,
                        })
                      }
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                      }}
                      className="w-full border rounded-[6px] px-2 py-1.5 text-[11px]"
                    >
                      <option value="freeform">Freeform Collage (Default)</option>
                      <option value="hybrid">Dynamic Hybrid</option>
                      <option value="block">Block Stack</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[10px]">
                      Default Width (px)
                    </span>
                    <input
                      type="number"
                      min={200}
                      max={2400}
                      value={studioPrefs.defaultCanvasWidth}
                      onChange={(e) =>
                        onChangeStudioPrefs({
                          ...studioPrefs,
                          defaultCanvasWidth: Math.max(200, Math.min(2400, Number(e.target.value) || 760)),
                        })
                      }
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                      }}
                      className="w-full border rounded-[6px] px-2 py-1.5 font-mono text-[11px]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[10px]">
                      Default Height (px)
                    </span>
                    <input
                      type="number"
                      min={200}
                      max={2400}
                      value={studioPrefs.defaultCanvasHeight}
                      onChange={(e) =>
                        onChangeStudioPrefs({
                          ...studioPrefs,
                          defaultCanvasHeight: Math.max(200, Math.min(2400, Number(e.target.value) || 540)),
                        })
                      }
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                      }}
                      className="w-full border rounded-[6px] px-2 py-1.5 font-mono text-[11px]"
                    />
                  </label>
                </div>

                <label className="flex items-center justify-between pt-1 cursor-pointer">
                  <div>
                    <div className="font-semibold text-[11px]">Transparent Canvas by Default</div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-[10px]">
                      New blank drafts start transparent so elements sit directly on Toyhouse pages.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={studioPrefs.defaultTransparentCanvas}
                    onChange={(e) =>
                      onChangeStudioPrefs({
                        ...studioPrefs,
                        defaultTransparentCanvas: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                </label>
              </div>

              <div
                style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-main)' }}
                className="p-3 rounded-[8px] border space-y-3"
              >
                <span className="font-bold text-[11px] uppercase tracking-wider block">
                  Canvas Precision &amp; Workspace UI
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[10px]">
                      Arrow Nudge (px)
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={studioPrefs.nudgeStepPx}
                      onChange={(e) =>
                        onChangeStudioPrefs({
                          ...studioPrefs,
                          nudgeStepPx: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                        })
                      }
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                      }}
                      className="w-full border rounded-[6px] px-2 py-1.5 font-mono text-[11px]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[10px]">
                      Shift + Arrow (px)
                    </span>
                    <input
                      type="number"
                      min={2}
                      max={64}
                      value={studioPrefs.shiftNudgeStepPx}
                      onChange={(e) =>
                        onChangeStudioPrefs({
                          ...studioPrefs,
                          shiftNudgeStepPx: Math.max(2, Math.min(64, Number(e.target.value) || 8)),
                        })
                      }
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                      }}
                      className="w-full border rounded-[6px] px-2 py-1.5 font-mono text-[11px]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[10px]">
                      Auto-Snapshot
                    </span>
                    <select
                      value={studioPrefs.autoSnapshotIntervalSec}
                      onChange={(e) =>
                        onChangeStudioPrefs({
                          ...studioPrefs,
                          autoSnapshotIntervalSec: Number(e.target.value) as 0 | 30 | 60 | 300,
                        })
                      }
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                      }}
                      className="w-full border rounded-[6px] px-2 py-1.5 text-[11px]"
                    >
                      <option value={30}>Every 30s</option>
                      <option value={60}>Every 60s</option>
                      <option value={300}>Every 5m</option>
                      <option value={0}>Off</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[10px]">
                      UI Density
                    </span>
                    <select
                      value={studioPrefs.uiDensity}
                      onChange={(e) =>
                        onChangeStudioPrefs({
                          ...studioPrefs,
                          uiDensity: e.target.value as 'compact' | 'comfortable',
                        })
                      }
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                      }}
                      className="w-full border rounded-[6px] px-2 py-1.5 text-[11px]"
                    >
                      <option value="compact">Compact Studio</option>
                      <option value="comfortable">Comfortable</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center justify-between p-2 rounded-[6px] border cursor-pointer" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-input)' }}>
                    <span className="font-medium text-[11px]">Show Canvas Rulers</span>
                    <input
                      type="checkbox"
                      checked={studioPrefs.showRulers}
                      onChange={(e) =>
                        onChangeStudioPrefs({ ...studioPrefs, showRulers: e.target.checked })
                      }
                      className="accent-[var(--accent)]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-[6px] border cursor-pointer" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-input)' }}>
                    <span className="font-medium text-[11px]">Show Snap Spacing Badges</span>
                    <input
                      type="checkbox"
                      checked={studioPrefs.showSpacingBadges}
                      onChange={(e) =>
                        onChangeStudioPrefs({ ...studioPrefs, showSpacingBadges: e.target.checked })
                      }
                      className="accent-[var(--accent)]"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              {/* Top Toolbar: Search, Presets, Import/Export, Reset */}
              <div className="flex flex-wrap items-center gap-2">
                <div
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                  className="flex-1 min-w-[180px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] border"
                >
                  <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={shortcutSearch}
                    onChange={(e) => setShortcutSearch(e.target.value)}
                    placeholder="Filter actions or keys..."
                    className="w-full bg-transparent text-[11px] focus:outline-none"
                  />
                </div>

                <select
                  value=""
                  onChange={(e) => {
                    const pid = e.target.value as ShortcutProfileId;
                    if (!pid) return;
                    onChangeKeybindings({ ...SHORTCUT_PROFILES[pid].map });
                    setConflictNotice(`Loaded "${SHORTCUT_PROFILES[pid].label}" shortcut profile.`);
                  }}
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                  className="border rounded-[7px] px-2 py-1.5 text-[11px]"
                >
                  <option value="">Load Preset Profile...</option>
                  <option value="default">DesignBox Default</option>
                  <option value="figma">Figma / Canva Style</option>
                  <option value="krita">Krita / Creative Style</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportShortcuts}
                  style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-strong)' }}
                  className="border rounded-[7px] px-2 py-1.5 text-[10.5px] font-medium flex items-center gap-1 hover:opacity-85"
                  title="Export keybindings as JSON"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-strong)' }}
                  className="border rounded-[7px] px-2 py-1.5 text-[10.5px] font-medium flex items-center gap-1 hover:opacity-85"
                  title="Import keybindings JSON"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import</span>
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => void handleImportShortcutsFile(e)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => {
                    onChangeKeybindings({ ...DEFAULT_KEYBINDINGS });
                    setConflictNotice('Reset all shortcuts to defaults.');
                  }}
                  style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-strong)' }}
                  className="border rounded-[7px] px-2 py-1.5 text-[10.5px] font-medium flex items-center gap-1 hover:opacity-85"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {conflictNotice && (
                <div className="px-2.5 py-1.5 rounded-[6px] bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-300 text-[10.5px] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{conflictNotice}</span>
                </div>
              )}
              {importError && (
                <div className="px-2.5 py-1.5 rounded-[6px] bg-red-500/15 border border-red-500/35 text-red-500 text-[10.5px]">
                  {importError}
                </div>
              )}

              <div className="space-y-3">
                {groupedShortcuts.map((group) => (
                  <div key={group.name} className="space-y-1">
                    <div
                      style={{ color: 'var(--text-muted)' }}
                      className="text-[10px] font-mono uppercase tracking-wider pt-1"
                    >
                      {group.name}
                    </div>
                    <div
                      style={{ borderColor: 'var(--border-main)' }}
                      className="border rounded-[8px] divide-y overflow-hidden"
                    >
                      {group.items.map((def) => {
                        const isRecording = recordingId === def.id;
                        const currentCombo = keybindings[def.id] || '';
                        return (
                          <div
                            key={def.id}
                            style={{
                              borderColor: 'var(--border-main)',
                              backgroundColor: isRecording ? 'var(--accent-soft)' : 'var(--bg-panel-alt)',
                            }}
                            className="flex items-center justify-between px-3 py-1.5 gap-3"
                          >
                            <span className="text-[11px] font-medium">{def.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setRecordingId(isRecording ? null : def.id)}
                                style={
                                  isRecording
                                    ? {
                                        backgroundColor: 'var(--accent)',
                                        color: '#fff',
                                        borderColor: 'var(--accent)',
                                      }
                                    : {
                                        backgroundColor: 'var(--bg-input)',
                                        borderColor: 'var(--border-strong)',
                                        color: currentCombo ? 'var(--text-main)' : 'var(--text-muted)',
                                      }
                                }
                                className="min-w-[110px] px-2.5 py-1 rounded-[5px] border font-mono text-[10.5px] font-semibold text-center transition"
                                title="Click and press new key combination (Esc to cancel)"
                              >
                                {isRecording ? 'Press keys...' : formatComboDisplay(currentCombo)}
                              </button>
                              {currentCombo && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onChangeKeybindings({ ...keybindings, [def.id]: '' })
                                  }
                                  style={{ color: 'var(--text-muted)' }}
                                  className="text-[10px] px-1 hover:text-red-500"
                                  title="Clear shortcut"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hosting' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p style={{ color: 'var(--text-muted)' }} className="leading-relaxed">
                  Toyhouse and Carrd require external HTTPS image links. Add a free API key from{' '}
                  <span className="font-mono underline">api.imgbb.com</span> so DesignBox uploads
                  selected files automatically. Without a key, local files are embedded offline as
                  persistent Base64 DataURLs instead of temporary blobs.
                </p>
                <label className="block space-y-1">
                  <span className="font-semibold block">ImgBB API Key (Stored locally)</span>
                  <input
                    type="password"
                    placeholder="Paste ImgBB API key..."
                    value={imgbbApiKey}
                    onChange={(e) => onChangeImgbbKey(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-strong)',
                    }}
                    className="w-full border rounded-[6px] px-2.5 py-1.5 font-mono"
                  />
                </label>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-panel-alt)',
                  borderColor: 'var(--border-main)',
                }}
                className="p-3 rounded-[8px] border space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                    <History className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span>
                      {isTauriRuntime()
                        ? 'Native AppData Recovery Snapshots'
                        : 'Local Browser Recovery Snapshots'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onCreateSnapshot}
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    className="px-2 py-1 rounded-[5px] text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>Snapshot Now</span>
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="text-[10px]">
                  Auto-snapshots run every{' '}
                  {studioPrefs.autoSnapshotIntervalSec === 0
                    ? 'manual only'
                    : `${studioPrefs.autoSnapshotIntervalSec}s`}{' '}
                  when changes are pending.
                  {lastSnapshotAt
                    ? ` Last captured at ${new Date(lastSnapshotAt).toLocaleTimeString()}.`
                    : ''}
                </p>
                {localSnapshots.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto pt-1">
                    {localSnapshots.map((snap) => (
                      <div
                        key={snap.id}
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-strong)',
                        }}
                        className="flex items-center justify-between px-2 py-1 rounded-[5px] border text-[10px]"
                      >
                        <span className="truncate font-mono">
                          {snap.projectName} · {new Date(snap.createdAtMs).toLocaleTimeString()} (
                          {Math.max(1, Math.round(snap.byteSize / 1024))} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onRestoreSnapshot(snap.id);
                            onClose();
                          }}
                          style={{ color: 'var(--accent)' }}
                          className="font-semibold hover:underline ml-2 shrink-0"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
