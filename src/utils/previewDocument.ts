import { DesignElement, PreviewSurface, TargetPlatform } from '../types/schema';
import { CuteThemeColors, extractDesignImageUrls } from './studioSettings';

export interface BuildPreviewSrcDocParams {
  elements: ReadonlyArray<DesignElement>;
  exportHtml: string;
  platform: TargetPlatform;
  canvasWidth: number;
  previewSurface: PreviewSurface;
  previewToyhouseShell: boolean;
  projectName: string;
  cuteThemeColors: CuteThemeColors;
}

interface PreviewSurfacePalette {
  bg: string;
  text: string;
  navBg: string;
  navText: string;
  sideBg: string;
  sideBorder: string;
  cardBg: string;
  muted: string;
  link: string;
  bannerBg: string;
  bannerText: string;
}

function escapeHtmlText(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttr(v: string): string {
  return escapeHtmlText(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Builds a self-contained Toyhouse live-preview HTML document for sandboxed iframe rendering. */
export function buildPreviewSrcDoc({
  elements,
  exportHtml,
  platform,
  canvasWidth,
  previewSurface,
  previewToyhouseShell,
  projectName,
  cuteThemeColors,
}: BuildPreviewSrcDocParams): string {
  const themeMap: Record<PreviewSurface, PreviewSurfacePalette> = {
    th_dark: {
      bg: '#16141C',
      text: '#DCD9E6',
      navBg: '#23202D',
      navText: '#EDEAF5',
      sideBg: '#272333',
      sideBorder: '#363147',
      cardBg: '#2B2537',
      muted: '#9D97B0',
      link: '#6CB8C0',
      bannerBg: '#4E8C93',
      bannerText: '#FFFFFF',
    },
    th_light: {
      bg: '#F4F5F7',
      text: '#212529',
      navBg: '#FFFFFF',
      navText: '#212529',
      sideBg: '#F8F9FA',
      sideBorder: '#DEE2E6',
      cardBg: '#FFFFFF',
      muted: '#6C757D',
      link: '#007BFF',
      bannerBg: '#007BFF',
      bannerText: '#FFFFFF',
    },
    th_pink: {
      bg: '#FDF3F7',
      text: '#472D38',
      navBg: '#D87A9D',
      navText: '#FFFFFF',
      sideBg: '#FFF9FB',
      sideBorder: '#F2D2DF',
      cardBg: '#FFF5F9',
      muted: '#946B7D',
      link: '#C94D7C',
      bannerBg: '#D87A9D',
      bannerText: '#FFFFFF',
    },
    th_teal: {
      bg: '#EDF6F7',
      text: '#1D373B',
      navBg: '#265C63',
      navText: '#FFFFFF',
      sideBg: '#F7FBFB',
      sideBorder: '#C7E0E3',
      cardBg: '#F1F9FA',
      muted: '#5D8085',
      link: '#247E88',
      bannerBg: '#3D8891',
      bannerText: '#FFFFFF',
    },
    th_cute: {
      bg: cuteThemeColors.bgApp,
      text: cuteThemeColors.textMain,
      navBg: cuteThemeColors.accentSecondary,
      navText: '#FFFFFF',
      sideBg: cuteThemeColors.bgPanel,
      sideBorder: cuteThemeColors.borderMain,
      cardBg: cuteThemeColors.bgPanelAlt,
      muted: cuteThemeColors.textMuted,
      link: cuteThemeColors.accentPrimary,
      bannerBg: cuteThemeColors.accentPrimary,
      bannerText: '#FFFFFF',
    },
    paper: {
      bg: '#E5E0D5',
      text: '#2C2A28',
      navBg: '#2C2A28',
      navText: '#F7F5F0',
      sideBg: '#F0ECE3',
      sideBorder: '#DCD6C8',
      cardBg: '#F7F5F0',
      muted: '#78736A',
      link: '#C86D51',
      bannerBg: '#C86D51',
      bannerText: '#FFFFFF',
    },
  };

  const palette = themeMap[previewSurface] || themeMap.th_dark;
  const isTh = platform.startsWith('toyhouse');
  const useShell = isTh && previewToyhouseShell;
  const safeTitle = escapeHtmlText(projectName || 'Character Profile');
  const designImages = extractDesignImageUrls(elements as DesignElement[]);
  const firstDesignImage = designImages[0];
  const createdDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const dbxIconBadge = (sizePx: number, fontSizePx: number, radiusPx = 4) => `
    <span class="th-dbx-avatar" style="width:${sizePx}px;height:${sizePx}px;border-radius:${radiusPx}px;font-size:${fontSizePx}px;">DBX</span>
  `;

  const primaryCharAvatarHtml = firstDesignImage
    ? `<img src="${escapeHtmlAttr(firstDesignImage)}" alt="${safeTitle}" class="th-char-avatar-img" />`
    : dbxIconBadge(64, 15, 6);

  const sidebarCharThumbHtml = firstDesignImage
    ? `<img src="${escapeHtmlAttr(firstDesignImage)}" alt="${safeTitle}" class="th-side-mini-img" />`
    : dbxIconBadge(26, 8, 4);

  const recentImagesHtml =
    designImages.length > 0
      ? designImages
          .slice(0, 6)
          .map(
            (imgUrl, idx) => `
        <div class="th-recent-thumb">
          <img src="${escapeHtmlAttr(imgUrl)}" alt="Design Image ${idx + 1}" />
          <span class="th-thumb-edit"><i class="fa-solid fa-pencil"></i></span>
        </div>`
          )
          .join('')
      : Array.from(
          { length: 4 },
          (_, idx) => `
        <div class="th-recent-thumb placeholder">
          <div class="th-thumb-placeholder-inner">
            <i class="fa-regular fa-image"></i>
            <span>Image ${idx + 1}</span>
          </div>
          <span class="th-thumb-edit"><i class="fa-solid fa-pencil"></i></span>
        </div>`
        ).join('');

  const bsFallbackCss = isTh
    ? `
    .collapse:not(.show) { display: none; }
    .container { width: 100%; padding-right: 15px; padding-left: 15px; margin-right: auto; margin-left: auto; }
    .row { display: flex; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; }
    .no-gutters { margin-right: 0; margin-left: 0; }
    .no-gutters > .col, .no-gutters > [class*="col-"] { padding-right: 0; padding-left: 0; }
    .mx-auto { margin-left: auto !important; margin-right: auto !important; }
    .w-100 { width: 100% !important; }
    .p-0 { padding: 0 !important; }
    .p-1 { padding: 0.25rem !important; }
    .p-3 { padding: 1rem !important; }
    .col-12 { position: relative; width: 100%; flex: 0 0 100%; max-width: 100%; }
    @media (min-width: 576px) {
      .col-sm-6 { position: relative; width: 100%; flex: 0 0 50%; max-width: 50%; }
    }
    @media (min-width: 768px) {
      ${Array.from({ length: 12 }, (_, i) => `.col-md-${i + 1} { flex: 0 0 ${(((i + 1) / 12) * 100).toFixed(4)}%; max-width: ${(((i + 1) / 12) * 100).toFixed(4)}%; }`).join('\n      ')}
    }
    @media (min-width: 992px) {
      ${Array.from({ length: 12 }, (_, i) => `.col-lg-${i + 1} { flex: 0 0 ${(((i + 1) / 12) * 100).toFixed(4)}%; max-width: ${(((i + 1) / 12) * 100).toFixed(4)}%; }`).join('\n      ')}
    }
    .card { background-color: ${palette.cardBg}; border: 1px solid ${palette.sideBorder}; border-radius: 0.25rem; }
    .card-header { border-bottom: 1px solid ${palette.sideBorder}; }
    .bg-faded { background-color: ${palette.sideBg}; }
    .text-muted { color: ${palette.muted} !important; }
    .btn { display: inline-block; font-weight: 400; text-align: center; vertical-align: middle; user-select: none; border: 1px solid transparent; padding: 0.375rem 0.75rem; font-size: 1rem; line-height: 1.5; border-radius: 0.25rem; }
    .btn-block { display: block; width: 100%; }
    .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.875rem; line-height: 1.5; border-radius: 0.2rem; }
    `
    : '';

  const shellStyles = useShell
    ? `
    .th-dbx-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, ${palette.bannerBg}, ${palette.link});
      color: #fff;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 800;
      letter-spacing: 0.04em;
      flex-shrink: 0;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22);
    }
    .th-sim-nav {
      height: 42px;
      background-color: ${palette.navBg};
      color: ${palette.navText};
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12.5px;
      border-bottom: 1px solid ${palette.sideBorder};
    }
    .th-nav-left, .th-nav-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .th-nav-brand {
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.04em;
    }
    .th-nav-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      opacity: 0.84;
      font-size: 12px;
    }
    .th-nav-user {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-weight: 600;
      font-size: 12px;
    }
    .th-sim-layout {
      display: flex;
      align-items: stretch;
      min-height: calc(100vh - 42px);
    }
    .th-sim-sidebar {
      width: 215px;
      flex-shrink: 0;
      background-color: ${palette.sideBg};
      border-right: 1px solid ${palette.sideBorder};
      font-size: 12px;
    }
    .th-side-banner {
      background-color: ${palette.bannerBg};
      color: ${palette.bannerText};
      padding: 7px 12px;
      font-weight: 600;
      font-size: 12.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .th-side-owner-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      color: ${palette.link};
      font-weight: 600;
    }
    .th-side-char-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: rgba(255,255,255,0.04);
      border-left: 3px solid ${palette.bannerBg};
      color: ${palette.text};
      font-weight: 600;
    }
    .th-side-mini-img {
      width: 26px;
      height: 26px;
      border-radius: 4px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid ${palette.sideBorder};
    }
    .th-side-group {
      border-top: 1px solid ${palette.sideBorder};
      padding: 5px 0;
    }
    .th-side-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 12px;
      color: ${palette.link};
      font-size: 12px;
    }
    .th-side-link-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .th-side-link-left i {
      width: 14px;
      text-align: center;
      opacity: 0.85;
    }
    .th-side-count {
      background-color: ${palette.cardBg};
      color: ${palette.muted};
      border: 1px solid ${palette.sideBorder};
      border-radius: 4px;
      padding: 0 5px;
      font-size: 10.5px;
      font-weight: 600;
    }
    .th-side-control-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      color: ${palette.link};
      font-size: 11.5px;
      border-bottom: 1px solid ${palette.sideBorder};
    }
    .th-sim-main {
      flex: 1;
      min-width: 0;
      padding: 14px 22px 24px;
    }
    .th-char-header {
      background-color: ${palette.cardBg};
      border: 1px solid ${palette.sideBorder};
      border-radius: 4px;
      padding: 12px 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 18px;
    }
    .th-char-identity {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .th-char-avatar-img {
      width: 64px;
      height: 64px;
      border-radius: 5px;
      object-fit: cover;
      border: 1px solid ${palette.sideBorder};
      flex-shrink: 0;
    }
    .th-char-title {
      font-size: 21px;
      font-weight: 500;
      margin: 0 0 2px;
      color: ${palette.text};
      line-height: 1.2;
    }
    .th-char-user {
      font-size: 12px;
      color: ${palette.link};
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .th-char-meta {
      display: grid;
      grid-template-columns: 78px auto;
      gap: 4px 20px;
      font-size: 11.5px;
      padding-left: 16px;
      border-left: 1px solid ${palette.sideBorder};
    }
    .th-meta-label {
      color: ${palette.muted};
      font-weight: 600;
    }
    .th-meta-value {
      color: ${palette.text};
    }
    .th-meta-link {
      color: ${palette.link};
    }
    .th-section-heading {
      font-size: 17px;
      font-weight: 400;
      color: ${palette.text};
      border-bottom: 1px solid ${palette.sideBorder};
      padding-bottom: 6px;
      margin: 0 0 14px;
    }
    .th-recent-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid ${palette.sideBorder};
      padding-bottom: 6px;
      margin: 26px 0 12px;
    }
    .th-recent-header h2 {
      font-size: 17px;
      font-weight: 400;
      margin: 0;
      color: ${palette.text};
    }
    .th-view-more {
      background-color: ${palette.cardBg};
      border: 1px solid ${palette.sideBorder};
      color: ${palette.text};
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 4px;
    }
    .th-recent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
      gap: 10px;
    }
    .th-recent-thumb {
      position: relative;
      aspect-ratio: 1 / 1;
      background-color: ${palette.cardBg};
      border: 1px solid ${palette.sideBorder};
      border-radius: 3px;
      padding: 5px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .th-recent-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 2px;
      display: block;
    }
    .th-recent-thumb.placeholder {
      border-style: dashed;
    }
    .th-thumb-placeholder-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: ${palette.muted};
      font-size: 11px;
      opacity: 0.7;
    }
    .th-thumb-placeholder-inner i {
      font-size: 20px;
    }
    .th-thumb-edit {
      position: absolute;
      right: 6px;
      bottom: 6px;
      width: 22px;
      height: 22px;
      border-radius: 3px;
      background-color: ${palette.sideBg};
      border: 1px solid ${palette.sideBorder};
      color: ${palette.muted};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
    @media (max-width: 767px) {
      .th-sim-sidebar { display: none; }
      .th-sim-main { padding: 10px; }
      .th-char-meta { border-left: none; padding-left: 0; }
    }
    `
    : '';

  const bodyContent = useShell
    ? `
  <header class="th-sim-nav">
    <div class="th-nav-left">
      <span class="th-nav-brand">TOYHOU.SE</span>
      <span class="th-nav-link"><i class="fa-solid fa-home"></i><span>Profile</span></span>
      <span class="th-nav-link"><i class="fa-solid fa-comments"></i><span>Forums</span></span>
      <span class="th-nav-link"><i class="fa-solid fa-search"></i><span>Browse</span><i class="fa-solid fa-caret-down" style="font-size:9px;"></i></span>
      <span class="th-nav-link"><i class="fa-solid fa-plus"></i><span>Submit</span><i class="fa-solid fa-caret-down" style="font-size:9px;"></i></span>
    </div>
    <div class="th-nav-right">
      <span class="th-nav-link" style="opacity:0.7;"><i class="fa-solid fa-envelope"></i></span>
      <span class="th-nav-user">
        ${dbxIconBadge(22, 8, 4)}
        <span>user</span>
        <i class="fa-solid fa-caret-down" style="font-size:9px;opacity:0.7;"></i>
      </span>
    </div>
  </header>
  <div class="th-sim-layout">
    <aside class="th-sim-sidebar">
      <div class="th-side-banner">
        <i class="fa-solid fa-heart"></i>
        <span>Character</span>
      </div>
      <div class="th-side-owner-row">
        ${dbxIconBadge(26, 8, 4)}
        <span class="text-truncate">user</span>
      </div>
      <div class="th-side-banner">
        <i class="fa-solid fa-folder"></i>
        <span>Character</span>
      </div>
      <div class="th-side-char-row">
        ${sidebarCharThumbHtml}
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeTitle}</span>
      </div>
      <div class="th-side-group">
        <div class="th-side-link">
          <span class="th-side-link-left"><i class="fa-regular fa-images"></i><span>Gallery</span></span>
          <span class="th-side-count">${designImages.length}</span>
        </div>
        <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-book"></i><span>Library</span></span></div>
        <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-globe"></i><span>Worlds</span></span></div>
        <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-link"></i><span>Links</span></span></div>
      </div>
      <div class="th-side-group">
        <div class="th-side-link"><span class="th-side-link-left"><i class="fa-regular fa-comments"></i><span>Comments</span></span></div>
        <div class="th-side-link">
          <span class="th-side-link-left"><i class="fa-regular fa-star"></i><span>Favorite</span></span>
          <span class="th-side-count">1</span>
        </div>
        <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-certificate"></i><span>Ownership</span></span></div>
      </div>
      <div class="th-side-group">
        <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-triangle-exclamation"></i><span>Report</span></span></div>
        <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-ban"></i><span>Block</span></span></div>
      </div>
      <div class="th-side-banner" style="margin-top:4px;">
        <i class="fa-solid fa-wrench"></i>
        <span>Control Panel</span>
      </div>
      <div class="th-side-control-item"><span>Manage Character</span><i class="fa-solid fa-caret-right"></i></div>
      <div class="th-side-control-item"><span>Manage Images</span><i class="fa-solid fa-caret-right"></i></div>
      <div class="th-side-control-item"><span>Manage Literatures</span><i class="fa-solid fa-caret-right"></i></div>
    </aside>
    <main class="th-sim-main">
      <div class="th-char-header">
        <div class="th-char-identity">
          ${primaryCharAvatarHtml}
          <div style="min-width:0;">
            <h1 class="th-char-title">${safeTitle}</h1>
            <div class="th-char-user"><i class="fa-solid fa-user"></i><span>user</span></div>
          </div>
        </div>
        <div class="th-char-meta">
          <span class="th-meta-label">Created</span>
          <span class="th-meta-value">${createdDateStr}</span>
          <span class="th-meta-label">Creator</span>
          <span class="th-meta-link"><i class="fa-solid fa-user" style="margin-right:4px;"></i>user</span>
          <span class="th-meta-label">Favorites</span>
          <span class="th-meta-link">1</span>
        </div>
      </div>

      <h2 class="th-section-heading">Profile</h2>
      <div class="user-content mx-auto" style="max-width: ${Math.max(canvasWidth + 32, 920)}px;">
        ${exportHtml}
      </div>

      <div class="th-recent-header">
        <h2>Recent Images</h2>
        <span class="th-view-more">View More</span>
      </div>
      <div class="th-recent-grid">
        ${recentImagesHtml}
      </div>
    </main>
  </div>`
    : `<div style="padding: 16px;">${exportHtml}</div>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Cinzel:wght@400..900&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Inter:wght@300..800&family=Montserrat:ital,wght@0,300..800;1,300..800&family=Orbitron:wght@400..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Press+Start+2P&family=Space+Grotesk:wght@300..700&family=Syne:wght@400..800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
    ${isTh ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css" crossorigin="anonymous" />' : ''}
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background-color: ${palette.bg};
        color: ${palette.text};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }
      a { color: ${palette.link}; }
      ${bsFallbackCss}
      ${shellStyles}
    </style>
  </head>
  <body>
    ${bodyContent}
    <script>
      document.addEventListener('click', function (e) {
        var tabTrigger = e.target.closest('[data-toggle="tab"]');
        if (tabTrigger) {
          e.preventDefault();
          var targetSel = tabTrigger.getAttribute('href') || tabTrigger.getAttribute('data-target');
          var nav = tabTrigger.closest('.nav');
          if (nav) {
            nav.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
            tabTrigger.classList.add('active');
          }
          if (targetSel) {
            var pane = document.querySelector(targetSel);
            if (pane && pane.parentElement) {
              pane.parentElement.querySelectorAll('.tab-pane').forEach(function (p) {
                p.classList.remove('active', 'show');
              });
              pane.classList.add('active', 'show');
            }
          }
          return;
        }
        var colTrigger = e.target.closest('[data-toggle="collapse"]');
        if (colTrigger) {
          e.preventDefault();
          var colSel = colTrigger.getAttribute('href') || colTrigger.getAttribute('data-target');
          if (colSel) {
            var colEl = document.querySelector(colSel);
            if (colEl) colEl.classList.toggle('show');
          }
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          window.parent.postMessage({ type: 'DBX_ESCAPE_KEY' }, '*');
        }
      });
    </script>
  </body>
</html>`;
}
