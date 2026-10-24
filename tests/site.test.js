const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const SITE = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');
const pages = ['index.html','cardio.html','neuro.html','henderson.html','quiz.html','3d.html','about.html','privacy.html','credits.html','404.html'];
test('pages exist with title, viewport, rtl', () => {
  for (const p of pages) {
    const h = read(p);
    assert.match(h, /<title>[^<]{5,}<\/title>/, p);
    assert.match(h, /name="viewport" content="width=device-width, initial-scale=1"/, p);
    assert.match(h, /<html lang="ar" dir="rtl">/, p);
    assert.ok(!/TODO|lorem ipsum/i.test(h), p + ' placeholder');
  }
});
test('local references resolve', () => {
  for (const p of pages) {
    const h = read(p);
    for (const m of h.matchAll(/(?:src|href)="([^"#:?]+)(?:[?#][^"]*)?"/g)) {
      const ref = m[1]; if (!ref || ref.startsWith('//')) continue;
      assert.ok(fs.existsSync(path.join(SITE, ref)), p + ' -> ' + ref);
    }
  }
});
test('3D models and viewer assets present and small', () => {
  for (const m of ['heart','brain','spine']) {
    const f = path.join(SITE, 'models', m + '.glb');
    const b = fs.readFileSync(f);
    assert.strictEqual(b.slice(0,4).toString(), 'glTF', m);
    assert.ok(b.length < 300000, m + ' too big');
  }
  assert.ok(fs.existsSync(path.join(SITE,'vendor','model-viewer.min.js.bin')));
  assert.ok(fs.existsSync(path.join(SITE,'vendor','meshopt_decoder.js')));
  const v = read('assets/viewer.js');
  for (const k of ['Ventricule gauche','Valve mitrale','Lobe frontal','Cervelet','Espace L3–L4','Espace L4–L5']) assert.ok(v.includes(k), k);
});
test('core content from the course is present', () => {
  const c = read('cardio.html'), n = read('neuro.html'), h = read('henderson.html');
  for (const k of ['Infarctus','Angor','ECG','Tamponnade','Endocardite','Myocardite','Pacemaker','Embolie','Choc cardiogénique','Insuffisance cardiaque','Arythmies','Chirurgie','Hémocultures','Troponine','Digoxine']) assert.ok(c.includes(k), 'cardio ' + k);
  for (const k of ['EEG','EMG','Ponction lombaire','Fond d','HTIC','Glasgow','Laminectomie','Craniotomie','AVC']) assert.ok(n.includes(k), 'neuro ' + k);
  for (const k of ['Respirer','Boire et manger','Éliminer','Se mouvoir','Dormir','Se vêtir','température','propre','Éviter les dangers','Communiquer','croyances','réaliser','récréer','Apprendre']) assert.ok(h.includes(k), 'henderson ' + k);
});
test('quiz bank: answers spread across a/b/c, 3 options, explanations', () => {
  const src = read('assets/quiz-data.js');
  const Q = JSON.parse(src.match(/window\.QUIZ=(\[.*?\]);\n/s)[1]);
  assert.ok(Q.length >= 100, 'count ' + Q.length);
  const cnt = [0,0,0];
  for (const q of Q) { assert.strictEqual(q.o.length, 3); assert.ok(q.x.length > 10); cnt[q.a]++; }
  for (const c of cnt) assert.ok(c > Q.length * 0.25, 'spread ' + cnt);
});
test('SEO files', () => {
  assert.match(read('sitemap.xml'), /<urlset/);
  assert.match(read('robots.txt'), /Sitemap:/);
  assert.ok(read('index.html').includes('class="ad-slot"'));
});
test('weak points are personal: no hard-coded list, every question has a stable id', () => {
  const src = read('assets/quiz-data.js');
  const Q = JSON.parse(src.match(/window\.QUIZ=(\[.*?\]);\n/s)[1]);
  const ids = new Set(Q.map(q => q.id));
  assert.strictEqual(ids.size, Q.length, 'ids unique');
  for (const q of Q) { assert.match(q.id, /^q\d{3,}$/); assert.ok(!('w' in q), q.id + ' still has a hard-coded weak flag'); }
  for (const p of pages) { const h = read(p); assert.ok(!/نقطة ضعف|نقاط الضعف/.test(h), p + ' still frames tips as the owner\'s weak points'); }
  for (const p of ['index.html','quiz.html']) { const h = read(p); assert.ok(h.includes('id="weak"'), p + ' #weak'); assert.ok(h.includes('assets/weak.js'), p + ' weak.js'); }
});
test('weak store: wrong answers saved per browser, graduate after 2 right in a row, reset clears', () => {
  const vm = require('node:vm');
  const store = {};
  const ctx = { window: { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } } };
  vm.createContext(ctx);
  vm.runInContext(read('assets/quiz-data.js'), ctx);
  vm.runInContext(read('assets/weak.js'), ctx);
  const W = ctx.window.Weak, Q = ctx.window.QUIZ;
  assert.strictEqual(W.count(), 0);
  assert.strictEqual(W.record(Q[0], true), null, 'right answer on a new question stores nothing');
  assert.strictEqual(W.record(Q[0], false), 'added');
  assert.strictEqual(W.record(Q[1], false), 'added');
  assert.strictEqual(W.record(Q[0], false), 'progress');
  assert.strictEqual(W.count(), 2);
  assert.strictEqual(JSON.stringify(W.questions().map(q => q.id).sort()), JSON.stringify([Q[0].id, Q[1].id].sort()));
  assert.ok(W.topics().length >= 1);
  assert.strictEqual(W.record(Q[0], true), 'progress');
  assert.strictEqual(W.record(Q[0], false), 'progress', 'a miss resets the streak');
  assert.strictEqual(W.record(Q[0], true), 'progress');
  assert.strictEqual(W.record(Q[0], true), 'graduated');
  assert.strictEqual(W.count(), 1);
  assert.ok(store.nursin_weak_v1.includes(Q[1].id), 'persisted in localStorage');
  W.reset();
  assert.strictEqual(W.count(), 0);
});
test('opening splash: on every page, once per session, reduced-motion aware, never blocks', () => {
  const js = read('assets/splash.js'), css = read('assets/style.css');
  assert.ok(js.includes('sessionStorage'), 'session rule');
  assert.ok(js.includes('prefers-reduced-motion'), 'reduced motion');
  assert.ok(/\.nsplash\{[^}]*animation:ns-out/.test(css), 'splash hides itself by CSS even if JS stops');
  const out = css.match(/\.nsplash\{[^}]*animation:ns-out ([\d.]+)s[^}]*? ([\d.]+)s forwards/);
  assert.ok(out, 'splash fade timing');
  const total = parseFloat(out[1]) + parseFloat(out[2]);
  assert.ok(total >= 9 && total <= 11, 'splash lasts about 10 s, got ' + total);
  const safe = js.match(/setTimeout\(kill,reduce\?\d+:(\d+)\)/);
  assert.ok(safe && +safe[1] > total * 1000 && +safe[1] <= 11000, 'JS fail-safe just after the CSS fade');
  assert.ok(js.includes('ns-skipbtn') && js.includes('تخطّي'), 'visible skip button');
  assert.ok(/addEventListener\('pointerdown',skip\)/.test(js), 'tap anywhere skips');
  for (const p of pages) { const h = read(p); assert.match(h, /<body[^>]*>\s*<script src="assets\/splash\.js\?v=/, p + ' splash'); assert.ok(h.includes('<main'), p + ' content stays in the HTML'); }
});
test('Google Analytics (GA4) tag on every page exactly once, inside <head>', () => {
  for (const p of pages) {
    const h = read(p);
    const head = h.slice(0, h.indexOf('</head>'));
    assert.strictEqual((h.match(/googletagmanager\.com\/gtag\/js\?id=G-7MY0Z597WC/g) || []).length, 1, p + ' gtag loader once');
    assert.strictEqual((h.match(/gtag\('config', 'G-7MY0Z597WC'\)/g) || []).length, 1, p + ' gtag config once');
    assert.ok(head.includes('gtag/js?id=G-7MY0Z597WC') && head.includes("gtag('config', 'G-7MY0Z597WC')"), p + ' tag inside <head>');
    assert.ok(h.includes('ca-pub-2554036492962277'), p + ' AdSense kept');
  }
});

test('Adsterra banners: ad pages carry the keys, non-ad pages carry none', () => {
  const K = { m320: '735f5c76ee5abde951ff9d70e2263fab', d728: 'f0cd90c85278798fba5a155236050d61', box: '9892bba2f704f8ea66787de07f9f7be3' };
  const want = { 'index.html': ['m320','d728'], 'cardio.html': ['m320','d728','box'], 'neuro.html': ['m320','d728','box'], 'henderson.html': ['m320','d728','box'], 'quiz.html': ['m320','d728','box'], '3d.html': ['box'] };
  for (const [p, keys] of Object.entries(want)) {
    const h = read(p);
    for (const k of Object.keys(K)) assert.strictEqual(h.split(K[k]).length - 1, keys.includes(k) ? 1 : 0, p + ' ' + k);
    assert.strictEqual((h.match(/assets\/ads\.js\?v=/g) || []).length, 1, p + ' ads.js once');
    assert.ok(h.includes('ca-pub-2554036492962277') && h.includes('G-7MY0Z597WC'), p + ' AdSense + GA kept');
  }
  const q = read('quiz.html');
  assert.ok(q.indexOf(K.box) > q.indexOf('id="quiz"'), 'quiz box ad sits below the quiz/results area');
  for (const p of ['404.html','privacy.html','credits.html','about.html']) {
    const h = read(p);
    for (const k of Object.values(K)) assert.ok(!h.includes(k), p + ' must not carry ' + k);
    assert.ok(!h.includes('ads.js') && !h.includes('bauval.org') && !h.includes('class="adx'), p + ' no Adsterra');
  }
  const js = read('assets/ads.js'), css = read('assets/style.css');
  for (const k of Object.values(K)) assert.ok(js.includes(k), 'ads.js knows ' + k);
  assert.ok(js.includes("matchMedia('(min-width: 769px)')"), 'phone/desktop split at 768px');
  assert.ok(js.includes('srcdoc') && js.includes('https://bauval.org/22/'), 'each unit in its own srcdoc iframe');
  assert.ok(js.includes('إعلان'), 'ad label');
  assert.ok(!/position\s*:\s*(fixed|sticky)/.test(css.slice(css.indexOf('.adx{'))), 'ads never sticky/overlay');
  assert.ok(read('privacy.html').includes('Adsterra'), 'privacy mentions Adsterra');
});
