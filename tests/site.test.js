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