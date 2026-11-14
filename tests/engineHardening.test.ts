import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getElementF2UShieldReport,
  isF2USafeShape,
  sanitizeF2UBodyHtml,
} from '../src/engine/f2uShield';
import {
  escapeCssUrl,
  escapeHtmlAttr,
  generatePlatformExport,
} from '../src/engine/layoutSolver';
import { buildDefaultElement } from '../src/utils/elementFactory';
import { DesignElement, ImageShape } from '../src/types/schema';

test('sanitizeF2UBodyHtml preserves safe inline formatting and strips XSS vectors', () => {
  const dirty =
    '<b>Hello</b> <i>World</i> <u>u</u> <s>s</s> <br> ' +
    '<strong onclick="alert(1)">Strong</strong> ' +
    '<em onerror=alert(2)>Em</em> ' +
    '<small>sm</small> <mark>mk</mark> <code>cd</code> ' +
    '<span style="color: #C86D51;">Span</span> ' +
    '<p>Para</p> ' +
    '<a href="https://toyhou.se/user" target="_blank">Safe Link</a> ' +
    '<a href="javascript:alert(1)">Bad JS Link</a> ' +
    '<a href="data:text/html,<script>alert(2)</script>">Bad Data Link</a> ' +
    '<script>alert("xss")</script>' +
    '<style>body { display: none; }</style>' +
    '<iframe src="https://evil.example"></iframe>';

  const clean = sanitizeF2UBodyHtml(dirty);

  assert.match(clean, /<b>Hello<\/b>/i);
  assert.match(clean, /<i>World<\/i>/i);
  assert.match(clean, /<u>u<\/u>/i);
  assert.match(clean, /<s>s<\/s>/i);
  assert.match(clean, /<br\s*\/?>/i);
  assert.match(clean, /<strong\b[^>]*>Strong<\/strong>/i);
  assert.match(clean, /<em\b[^>]*>Em<\/em>/i);
  assert.match(clean, /<small>sm<\/small>/i);
  assert.match(clean, /<mark>mk<\/mark>/i);
  assert.match(clean, /<code>cd<\/code>/i);
  assert.match(clean, /<span\b[^>]*>Span<\/span>/i);
  assert.match(clean, /<p>Para<\/p>/i);
  assert.match(clean, /href="https:\/\/toyhou\.se\/user"/i);

  assert.equal(/<script|<\/script|<style|<iframe/i.test(clean), false);
  assert.equal(/\bon(?:click|error|load)\s*=/i.test(clean), false);
  assert.equal(/javascript:|vbscript:|data:text\/html/i.test(clean), false);
});

test('escapeHtmlAttr and escapeCssUrl block HTML attribute and CSS url() breakouts across exports', () => {
  assert.equal(escapeHtmlAttr('a" onclick="x'), 'a&quot; onclick=&quot;x');
  assert.equal(escapeHtmlAttr("a' onerror='x"), 'a&#39; onerror=&#39;x');
  assert.equal(escapeCssUrl("https://ex.com/a.png');background:red;url('"), '');
  assert.equal(escapeCssUrl('javascript:alert(1)'), '');
  assert.equal(escapeCssUrl('https://ex.com/pic.png?w=100&h=100'), 'https://ex.com/pic.png?w=100&amp;h=100');

  const boxWithBg: DesignElement = {
    ...buildDefaultElement('box', [], 'paper', null),
    id: 'box-xss',
    bgImageUrl: "https://evil.example/bg.png'); background: url('javascript:alert(1)",
    tooltip: 'Hint" onmouseover="alert(1)',
    label: 'Card" data-x="1',
    content: '<b>Safe</b><script>alert(1)</script>',
    subContent: '<span onclick="alert(2)">Body</span><iframe src="https://evil.test"></iframe>',
  };

  const imgWithHover: DesignElement = {
    ...buildDefaultElement('image', [], 'paper', null),
    id: 'img-xss',
    url: 'https://cdn.example/art.png" onerror="alert(1)',
    hoverImageUrl: "https://cdn.example/hover.png'); background: red; url('",
    linkUrl: 'javascript:alert(9)',
    clickAction: 'link',
    hoverAction: 'swap_image',
  };

  const f2u = generatePlatformExport([boxWithBg, imgWithHover], 'hybrid', 'toyhouse_free', 760, 540);
  assert.equal(/on(?:mouseover|onerror|click)\s*=\s*["']/i.test(f2u.html), false);
  assert.ok(f2u.html.includes('title="Hint&quot; onmouseover=&quot;alert(1)"'));
  assert.equal(/<script|<iframe|javascript:/i.test(f2u.html), false);
  assert.equal(/background:\s*red/i.test(f2u.html), false);
  assert.match(f2u.html, /<b>Safe<\/b>/i);
  assert.match(f2u.html, /<span>Body<\/span>/i);
});

test('custom_widget customProps substitutes keys with regex metacharacters and special $ values literally', () => {
  const widget: DesignElement = {
    ...buildDefaultElement('custom_widget', [], 'paper', null),
    id: 'cw-regex',
    customHtml: '<div>Price: {{price ($USD) [v1].*+?}} | Tag: {{tag}}</div>',
    customProps: {
      'price ($USD) [v1].*+?': "$' $& $$ $1 <b>$99</b>",
      tag: '<span onclick="alert(1)">ok</span><script>bad()</script>',
    },
  };

  const f2u = generatePlatformExport([widget], 'hybrid', 'toyhouse_free', 760, 540);
  assert.match(f2u.html, /Price:\s*\$' \$& \$\$ \$1 <b>\$99<\/b>/i);
  assert.match(f2u.html, /Tag:\s*<span>ok<\/span>/i);
  assert.equal(/onclick=|<script/i.test(f2u.html), false);
});

test('F2U Lightbox (toyhouse_free) strips onclick and backdrop-filter and emits Collapse open+close triggers', () => {
  const lightboxImg: DesignElement = {
    ...buildDefaultElement('image', [], 'paper', null),
    id: 'img lb/1',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600',
    clickAction: 'lightbox',
    content: 'Starlight Portrait',
  };

  const galleryEl: DesignElement = {
    ...buildDefaultElement('gallery', [], 'paper', null),
    id: 'gal-1',
    gallery: [
      {
        id: 'g-1',
        url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400',
        caption: 'Plate One',
        clickAction: 'lightbox',
      },
    ],
  };

  const f2u = generatePlatformExport([lightboxImg, galleryEl], 'hybrid', 'toyhouse_free', 760, 540);
  assert.equal(/onclick=/i.test(f2u.html), false);
  assert.equal(/backdrop-filter/i.test(f2u.html), false);
  assert.equal(/<style/i.test(f2u.html), false);

  // Uses Bootstrap 4 collapse triggers with matching href target and no inline display override on .collapse wrapper
  assert.match(f2u.html, /<a[^>]+href="#dbx-lb-imglb1"[^>]+data-toggle="collapse"/i);
  assert.match(f2u.html, /<div[^>]+id="dbx-lb-imglb1"[^>]+class="collapse"[^>]*>/i);

  const collapseOpenTag = f2u.html.match(/<div[^>]+id="dbx-lb-imglb1"[^>]*>/i)?.[0] ?? '';
  assert.equal(/\bdisplay\s*:/i.test(collapseOpenTag), false);

  // Must have at least 2 collapse toggles pointing to #dbx-lb-imglb1 (trigger + fullscreen close)
  const triggerMatches = f2u.html.match(/href="#dbx-lb-imglb1"[^>]+data-toggle="collapse"|data-toggle="collapse"[^>]+href="#dbx-lb-imglb1"/gi) ?? [];
  assert.ok(triggerMatches.length >= 2, `Expected open and close collapse triggers, got ${triggerMatches.length}`);

  // Carrd Pro preserves <details> lightbox + backdrop-filter
  const carrd = generatePlatformExport([lightboxImg], 'hybrid', 'carrd_pro', 760, 540);
  assert.match(carrd.html, /<details\b/i);
  assert.match(carrd.html, /backdrop-filter/i);
});

test('F2U Shape Parity supports ticket, cross_star, scallop, star, heart, shield, and pure_star in toyhouse_free', () => {
  const allShapes: ImageShape[] = [
    'rect',
    'circle',
    'pill',
    'arch',
    'leaf',
    'polaroid',
    'diamond',
    'hexagon',
    'hexagon_flat',
    'octagon',
    'bevel',
    'ticket',
    'shield',
    'cross_star',
    'scallop',
    'star',
    'heart',
  ];

  for (const shp of allShapes) {
    assert.equal(isF2USafeShape(shp), true, `Expected ${shp} to be F2U-safe`);
  }

  const boxAndImageShapes: ImageShape[] = [
    'ticket',
    'cross_star',
    'scallop',
    'star',
    'heart',
    'shield',
  ];

  const elements: DesignElement[] = [
    ...boxAndImageShapes.map((shp, idx) => ({
      ...buildDefaultElement('box', [], 'paper', null),
      id: `box-${shp}`,
      x: 20 + idx * 10,
      y: 20,
      boxClipShape: shp,
      bgColor: '#ECE7DF',
      borderColor: '#C86D51',
      borderWidth: 2,
      content: shp.toUpperCase(),
    })),
    ...boxAndImageShapes.map((shp, idx) => ({
      ...buildDefaultElement('image', [], 'paper', null),
      id: `img-${shp}`,
      x: 20 + idx * 10,
      y: 200,
      imageShape: shp,
      shapeMaskBgColor: '#FAF8F5',
    })),
    {
      ...buildDefaultElement('pure_star', [], 'paper', null),
      id: 'pure-star-1',
      bgColor: '#C86D51',
      content: 'STAR',
    },
  ];

  for (const el of elements) {
    const report = getElementF2UShieldReport(el);
    assert.equal(
      report.items.some((item) => item.category === 'clip'),
      false,
      `Expected no F2U clip warning for ${el.id}`
    );
  }

  const f2u = generatePlatformExport(elements, 'hybrid', 'toyhouse_free', 760, 540);
  assert.equal(/clip-path|<svg|<style/i.test(f2u.html), false);
  // Radial/gradient shapes & FA star/heart/shield cues present in F2U output
  assert.match(f2u.html, /radial-gradient\(/i);
  assert.match(f2u.html, /fa-star|★/i);
  assert.match(f2u.html, /fa-heart|♥/i);
  assert.match(f2u.html, /fa-shield/i);
});
