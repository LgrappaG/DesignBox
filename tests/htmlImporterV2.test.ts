import test from 'node:test';
import assert from 'node:assert/strict';
import { installNodeDomParser } from './helpers/nodeDomParser';

installNodeDomParser();

import { parseToyhouseHtmlToDesign } from '../src/engine/htmlImporter';

const OPTS = {
  uiTheme: 'paper' as const,
  canvasWidth: 800,
  startRowIndex: 0,
  startY: 24,
};

test('HTML Importer v2 converts 2-col row into split_box with exact split ratio and 3-col row into 3 horizontal columns', () => {
  const twoColHtml = `
    <div class="row">
      <div class="col-md-4 p-2" style="background:#1F1D1B;color:#FAF8F5;">
        <p>Left Dossier Column</p>
      </div>
      <div class="col-md-8 p-2" style="background:#FAF8F5;color:#2C2A28;">
        <p>Right Story Column</p>
      </div>
    </div>
  `;

  const twoColRes = parseToyhouseHtmlToDesign(twoColHtml, OPTS);
  assert.equal(twoColRes.elements.length, 1);
  const splitEl = twoColRes.elements[0];
  assert.equal(splitEl.type, 'split_box');
  const splitMod = splitEl.modifiers?.find((m) => m.kind === 'split');
  assert.ok(splitMod && splitMod.kind === 'split');
  assert.equal(splitMod.ratio, 33);
  assert.match(splitEl.subContent || '', /Left Dossier Column.*\|\|.*Right Story Column/);

  const threeColHtml = `
    <div class="row">
      <div class="col-md-4"><div class="card p-2"><p>Col A</p></div></div>
      <div class="col-md-4"><div class="card p-2"><p>Col B</p></div></div>
      <div class="col-md-4"><div class="card p-2"><p>Col C</p></div></div>
    </div>
  `;

  const threeColRes = parseToyhouseHtmlToDesign(threeColHtml, OPTS);
  assert.equal(threeColRes.elements.length, 3);
  const [a, b, c] = threeColRes.elements;
  assert.equal(a.x, 0);
  assert.equal(b.x, 267);
  assert.equal(c.x, 533);
  assert.equal(a.width, 267);
  assert.equal(b.width, 267);
  assert.equal(c.width, 266);
});

test('HTML Importer v2 recognizes Bootstrap progress bars, details, collapse accordions, nav-tabs, alerts, badges, lists, and hr', () => {
  const html = `
    <div class="container">
      <div class="progress mb-2" style="height: 20px;">
        <div class="progress-bar progress-bar-striped" role="progressbar" aria-valuenow="75" style="width: 75%; background-color: #C86D51;">Resolve 75%</div>
      </div>

      <details>
        <summary>Spoiler Warning</summary>
        <div>Secret chapter four details here.</div>
      </details>

      <a class="btn btn-primary" data-toggle="collapse" href="#lore-sec">Lore Accordion</a>
      <div id="lore-sec" class="collapse">
        <div class="card card-body">Collapsed lore body text.</div>
      </div>

      <ul class="nav nav-tabs">
        <li class="nav-item"><a class="nav-link active" data-toggle="tab" href="#t-bio">Biography</a></li>
        <li class="nav-item"><a class="nav-link" data-toggle="tab" href="#t-gear">Equipment</a></li>
      </ul>
      <div class="tab-content">
        <div id="t-bio" class="tab-pane active">Born in Oakhaven.</div>
        <div id="t-gear" class="tab-pane">Brass Astrolabe.</div>
      </div>

      <div class="alert alert-warning" role="alert"><strong>Warning:</strong> Mild spoilers ahead.</div>
      <span class="badge badge-pill" style="background-color: #7A9A82; color: #FFFFFF;">STATUS: ACTIVE</span>

      <ul>
        <li>Item Alpha</li>
        <li>Item Beta</li>
      </ul>
      <ol>
        <li>Step One</li>
        <li>Step Two</li>
      </ol>

      <hr style="border-top: 2px dashed #C86D51;" />
    </div>
  `;

  const res = parseToyhouseHtmlToDesign(html, OPTS);
  const byType = new Map<string, typeof res.elements>();
  for (const el of res.elements) {
    const arr = byType.get(el.type) || [];
    arr.push(el);
    byType.set(el.type, arr);
  }

  // Progress bar
  const prog = byType.get('pure_progress')?.[0];
  assert.ok(prog, 'Expected pure_progress element from .progress/.progress-bar');
  assert.equal(prog.subContent, '75');
  assert.equal(prog.progressStriped, true);

  // <details> + data-toggle="collapse" -> 2 accordions
  const accordions = byType.get('accordion') || [];
  assert.equal(accordions.length, 2, 'Expected both <details> and data-toggle="collapse" to convert to accordion');
  assert.match(accordions[0].content, /Spoiler Warning/);
  assert.match(accordions[0].subContent || '', /Secret chapter four/);
  assert.match(accordions[1].content, /Lore Accordion/);
  assert.match(accordions[1].subContent || '', /Collapsed lore body/);

  // .nav-tabs + .tab-content -> tabs
  const tabsEl = byType.get('tabs')?.[0];
  assert.ok(tabsEl, 'Expected tabs element from .nav-tabs + .tab-content');
  assert.equal(tabsEl.tabs?.length, 2);
  assert.equal(tabsEl.tabs?.[0].title, 'Biography');
  assert.match(tabsEl.tabs?.[0].content || '', /Born in Oakhaven/);
  assert.equal(tabsEl.tabs?.[1].title, 'Equipment');
  assert.match(tabsEl.tabs?.[1].content || '', /Brass Astrolabe/);

  // .alert -> dni_warning
  const alertEl = byType.get('dni_warning')?.[0];
  assert.ok(alertEl, 'Expected dni_warning element from .alert');
  assert.match(`${alertEl.content} ${alertEl.subContent || ''}`, /Mild spoilers ahead/);

  // .badge / .badge-pill -> badge
  const badgeEl = byType.get('badge')?.[0];
  assert.ok(badgeEl, 'Expected badge element from .badge');
  assert.match(badgeEl.content, /STATUS: ACTIVE/);
  assert.equal(badgeEl.borderRadius, 999);

  // <ul> and <ol> -> pure_list
  const lists = byType.get('pure_list') || [];
  assert.equal(lists.length, 2);
  assert.equal(lists[0].listStyleType, 'disc');
  assert.match(lists[0].subContent || '', /Item Alpha\nItem Beta/);
  assert.equal(lists[1].listStyleType, 'decimal');
  assert.match(lists[1].subContent || '', /Step One\nStep Two/);

  // <hr> -> divider or pure_divider
  const dividers = [...(byType.get('divider') || []), ...(byType.get('pure_divider') || [])];
  assert.ok(dividers.length >= 1, 'Expected divider element from <hr>');
});
