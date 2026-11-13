# DesignBox

A visual no-code layout studio for **Toyhouse (F2U & Premium)** profiles and **Carrd Pro** designs, built with React, TypeScript, Vite, Tailwind CSS, and Tauri 2.

---

## Key Features

- **Shielded Dual-Mode Engine (`F2U Safe` ↔ `Pro`):** Switch between Toyhouse F2U (`toyhouse_free`), Toyhouse Premium (`toyhouse_premium`), and Carrd Pro non-destructively. Pro attributes (custom CSS, `<style>` tags, SVG cutouts, `backdrop-filter`, non-90° rotation) stay preserved in project state, appear masked with status badges on the canvas, and are automatically sanitized on F2U export.
- **Responsive Bootstrap 4 & Toyhouse Simulator:** Outputs clean `row` / `col-12 col-md-*` markup with Toyhouse shell width & theme simulation in the Live Preview modal.
- **4-Tab Compact Inspector:** Structured `Style`, `Layout`, `Effects & Modifiers`, and `F2U & Code` panels supporting pure CSS primitives, SVG masks, inner frames, diagonal stripes, split modifiers, and configurable FontAwesome watermark anchors/offsets.
- **Figma-Style Precision Canvas:** Object-to-object Smart Snap Guides, draggable persistent horizontal/vertical Ruler Guides, neighbor gap badges, and multi-select Align / Equal-Gap (`Gap H` / `Gap V`) controls.
- **Global Theme & Assets:** One-click global palette and typography updates (`src/engine/themeEngine.ts`), curated sticker/washi/stamp presets (`src/data/assets.ts`), and a searchable FontAwesome 6 browser (`src/components/shared/FaIconBrowser.tsx`) with F2U filtering.
- **Pragmatic Hybrid HTML Importer:** Converts standard Bootstrap `row`/`col`/`card`/`nav-tabs`, headings, text, and images into editable canvas blocks while preserving complex markup inside `custom_widget` elements.
- **Offline-Safe Media & Desktop Workflow:** Supports ImgBB image hosting when configured or persistent offline Base64 DataURL fallback with F2U export warnings, plus native Tauri 2 Save / Save As / Open dialogs, Recent Projects, and local recovery snapshots.

---

## Tech Stack

- **Frontend:** React 18, TypeScript 5.7 (strict mode, zero `any`), Vite 6, Tailwind CSS 3, Lucide Icons
- **Desktop Runtime:** Tauri 2 + Rust (`rfd`, `serde`, `serde_json`)
- **Testing:** Zero-dependency runner (`scripts/run-tests.mjs`) compiling TypeScript tests via `esbuild` onto Node's built-in `node:test` runner

---

## Getting Started

### Prerequisites

- **Node.js** `20+` (verified on `v24.14.0`)
- **Rust toolchain** (`rustup` / `cargo`) + Windows WebView2 (only required for Tauri desktop development/builds)

### Install & Run

```bash
# Install dependencies
npm install

# Run web editor in dev mode
npm run dev

# Run automated unit tests
npm test

# Strict TypeScript check + production Vite bundle
npx tsc --noEmit && npm run build
```

### Desktop App (Tauri 2)

```bash
# Launch desktop dev window
npm run tauri dev

# Verify Rust backend
cargo check --manifest-path src-tauri/Cargo.toml

# Build production desktop binary & installers (MSI / NSIS)
npm run tauri build
```

---

## Project Structure

```text
├── src/
│   ├── components/         # CanvasStage, DynamicRulers, LeftSidebar, RightInspector, TopBar, modals & shared UI
│   ├── data/               # Presets, templates, pure primitives, curated assets & FA6 icon catalog
│   ├── engine/             # F2U Shield, layoutSolver (HTML exporter), htmlImporter, modifierRenderer, themeEngine
│   ├── hooks/              # useProjectHistory, useViewportNavigation, useCanvasPointer
│   ├── types/              # Strict TypeScript domain schema (schema.ts)
│   └── utils/              # Geometry, snapping, element factory, image upload & Tauri desktop IPC
├── src-tauri/              # Tauri 2 Rust backend, capabilities & config (com.designbox.studio)
├── scripts/                # Zero-dependency Node/esbuild test runner (run-tests.mjs)
└── tests/                  # Automated unit & regression suites
```

---

## License

Licensed under the [MIT License](LICENSE).

