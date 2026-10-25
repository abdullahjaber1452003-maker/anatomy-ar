const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const SITE = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');
const pages = ['index.html','cardio.html','neuro.html','henderson.html','quiz.html','3d.html','about.html','privacy.html','credits.html','404.html','friends.html','exams.html','live.html','tutor.html','classes.html'];
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
  assert.ok(total >= 5.5 && total <= 6.5, 'splash lasts about 6 s, got ' + total);
  const bar = css.match(/\.ns-bar i\{[^}]*animation:ns-bar ([\d.]+)s/);
  assert.ok(bar && Math.abs(+bar[1] - parseFloat(out[2])) < 0.01, 'progress bar ends when the fade starts');
  for (const m of css.matchAll(/\.ns-[^{]*\{[^}]*animation:[^}]*\}/g)) for (const d of m[0].matchAll(/ ([\d.]+)s (\d+)\b/g)) assert.ok(+d[2] <= 3, 'monitor beats fit inside 6 s: ' + m[0].slice(0, 40));
  const safe = js.match(/setTimeout\(kill,reduce\?\d+:(\d+)\)/);
  assert.ok(safe && +safe[1] > total * 1000 && +safe[1] <= 7000, 'JS fail-safe just after the CSS fade');
  assert.ok(js.includes('ns-skipbtn') && js.includes('تخطّي'), 'visible skip button');
  assert.ok(/addEventListener\('pointerdown',skip\)/.test(js), 'tap anywhere skips');
  for (const p of pages) { const h = read(p); assert.match(h, /<body[^>]*>\s*<script src="assets\/splash\.js\?v=/, p + ' splash'); assert.ok(h.includes('<main'), p + ' content stays in the HTML'); }
});
test('splash: Abdullah\'s round photo beside the heart logo (small, alt, fallback, timing unchanged)', () => {
  const js = read('assets/splash.js'), css = read('assets/style.css');
  assert.ok(/class="ns-row">'\+\s*'<svg class="ns-mark"/.test(js), 'logo and photo share one row');
  assert.ok(js.indexOf('ns-mark') < js.indexOf('ns-me') && js.indexOf('ns-me') < js.indexOf('ns-word'), 'photo sits right after the heart logo, before the name');
  assert.ok(js.includes('alt="عبدالله جابر"'), 'Arabic alt text');
  assert.ok(js.includes('assets/abdullah.webp?v=') && js.includes('assets/abdullah.png?v='), 'webp + png fallback');
  assert.ok(js.includes('onerror'), 'a missing photo removes itself, no broken icon');
  for (const f of ['assets/abdullah.webp', 'assets/abdullah.png']) { const n = fs.statSync(path.join(SITE, f)).size; assert.ok(n > 1000 && n < 60000, f + ' small: ' + n); }
  assert.ok(/\.ns-me\{[^}]*border-radius:50%/.test(css) && /\.ns-me img\{[^}]*border-radius:50%/.test(css), 'round');
  assert.ok(/\.ns-me\{[^}]*animation:ns-me [^}]*forwards/.test(css) && /\.ns-static \.ns-me\{opacity:1\}/.test(css), 'fades in; visible with reduced motion');
  assert.ok(/\.ns-row\{display:flex/.test(css), 'side by side');
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
  // cardio + neuro: top + end box + ONE mid-lesson banner (Oct 25) → d728 and box twice
  const want = { 'index.html': ['m320','d728'], 'cardio.html': ['m320','d728','box','d728','box'], 'neuro.html': ['m320','d728','box','d728','box'], 'henderson.html': ['m320','d728','box'], 'quiz.html': ['m320','d728','box'], '3d.html': ['box'], 'exams.html': ['m320','d728'] };
  for (const [p, keys] of Object.entries(want)) {
    const h = read(p);
    for (const k of Object.keys(K)) assert.strictEqual(h.split(K[k]).length - 1, keys.filter(x => x === k).length, p + ' ' + k);
    assert.strictEqual((h.match(/assets\/ads\.js\?v=/g) || []).length, 1, p + ' ads.js once');
    assert.ok(h.includes('ca-pub-2554036492962277') && h.includes('G-7MY0Z597WC'), p + ' AdSense + GA kept');
  }
  const q = read('quiz.html');
  assert.ok(q.indexOf(K.box) > q.indexOf('id="quiz"'), 'quiz box ad sits below the quiz/results area');
  for (const p of ['404.html','privacy.html','credits.html','about.html','tutor.html']) {
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

test('friends + levels: page, nav link and account script on every page, Firebase modular CDN, no Firebase Analytics', () => {
  assert.ok(pages.includes('friends.html'), 'friends.html checked by every page test above');
  for (const p of pages) {
    const h = read(p);
    assert.ok(h.includes('<a href="friends.html"'), p + ' nav links friends.html');
    assert.strictEqual((h.match(/assets\/account\.js\?v=20261025g/g) || []).length, 1, p + ' account.js once with cache tag');
    assert.ok(!h.includes('gstatic.com/firebasejs'), p + ' Firebase loads only through assets/fb.js, never in page HTML');
  }
  const f = read('friends.html');
  assert.ok(f.includes('id="friends-app"') && f.includes('aria-current="page"'), 'friends page shell');
  assert.ok(!f.includes('ads.js') && !f.includes('class="adx'), 'no Adsterra on the sign-in page');
  const fb = read('assets/fb.js');
  const imports = [...fb.matchAll(/from "([^"]+)"/g)].map(m => m[1]);
  assert.ok(imports.length >= 3, 'modular imports');
  for (const u of imports) assert.match(u, /^https:\/\/www\.gstatic\.com\/firebasejs\/1\d\.\d+\.\d+\/firebase-(app|auth|firestore)\.js$/, u);
  assert.ok(fb.includes('projectId: "nursin-5aaa0"') && fb.includes('authDomain: "nursin-5aaa0.firebaseapp.com"'), 'project config');
  assert.ok(!/measurementId|getAnalytics|firebase-analytics/.test(fb), 'no Firebase Analytics (site uses GA4)');
  assert.ok(fb.includes('signInWithPopup') && fb.includes('signInWithRedirect') && fb.includes('getRedirectResult'), 'popup with redirect fallback');
  assert.ok(fb.includes('تسجيل الدخول بغوغل') && fb.includes('ترتيب أصحابي') && fb.includes('wa.me'), 'Arabic UI, leaderboard, WhatsApp share');
  const rules = read('firestore.rules');
  for (const k of ['match /users/{uid}', 'points is int', 'points < 1000000', 'name.size() < 40', 'match /friends/{fid}', 'match /friendCodes/{code}', 'allow update, delete: if false', 'match /challenges/{cid}']) assert.ok(rules.includes(k), 'rules: ' + k);
  const pv = read('privacy.html');
  assert.ok(pv.includes('Firebase') && /name, photo and quiz points are stored with Google Firebase/.test(pv), 'privacy mentions Firebase (ar + en)');
  assert.ok(read('sitemap.xml').includes('friends.html'), 'sitemap');
  const q = read('assets/quiz.js');
  assert.ok(q.includes("'nursin:quiz-done'") && q.includes('id="qpts"'), 'quiz results fire the points hook');
});
test('levels and profile data fit the Firestore rules', () => {
  const vm = require('node:vm');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(read('assets/account.js'), ctx);
  const N = ctx.window.Nursin;
  const lv = [[0,1],[14,1],[15,2],[59,2],[60,3],[135,4],[240,5],[1215,10]];
  for (const [p, l] of lv) assert.strictEqual(N.level(p), l, 'level at ' + p);
  const g = N.progress(40);
  assert.strictEqual(g.level, 2); assert.strictEqual(g.to, 60); assert.strictEqual(g.left, 20); assert.ok(g.pct >= 0 && g.pct <= 100);
  assert.strictEqual(N.addPoints(30, 7), 51, 'correct answers x 3');
  const big = N.addPoints(999990, 20);
  assert.ok(Number.isInteger(big) && big >= 0 && big < 1000000, 'points stay an int under 1e6');
  assert.ok(Number.isInteger(N.addPoints(-5, 2.7)) && N.addPoints(-5, 0) === 0, 'never negative or fractional');
  const long = N.cleanName('عبدالله '.repeat(20));
  assert.ok(typeof long === 'string' && Array.from(long).length <= 39 && long.length < 40, 'name under 40 chars');
  assert.ok(N.cleanName('').length > 0, 'empty name gets a default');
  for (let i = 0; i < 200; i++) assert.match(N.newCode(), /^[A-Z0-9]{6}$/);
  assert.strictEqual(N.normCode(' k7q-2mx '), 'K7Q2MX');
  assert.strictEqual(N.esc('<img onerror=x>'), '&lt;img onerror=x&gt;');
});

test('phase 2: wrong answers cost 5 (never below 0), challenges pick the same 10 questions from a seed, rules allow the challenge lists', () => {
  const vm = require('node:vm');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(read('assets/quiz-data.js'), ctx);
  vm.runInContext(read('assets/account.js'), ctx);
  const N = ctx.window.Nursin, Q = ctx.window.QUIZ;
  assert.strictEqual(N.addPoints(100, 7, 3), 106, '+3 right, -5 wrong');
  assert.strictEqual(N.addPoints(10, 0, 5), 0, 'clamped at 0');
  assert.strictEqual(N.quizDelta(2, 6), -24);
  const ids = Q.map(q => q.id);
  const a = N.pickQids(12345, ids, 10), b = N.pickQids(12345, ids.slice().reverse(), 10);
  assert.strictEqual(a.length, 10); assert.strictEqual(new Set(a).size, 10, 'no repeats');
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b), 'same seed -> same questions, whatever the bank order');
  for (const id of a) assert.ok(ids.includes(id), id);
  assert.notStrictEqual(JSON.stringify(N.pickQids(999, ids, 10)), JSON.stringify(a), 'another seed -> another set');
  assert.strictEqual(N.winner(7, 5), 'from'); assert.strictEqual(N.winner(4, 6), 'to'); assert.strictEqual(N.winner(5, 5), 'tie'); assert.strictEqual(N.winner(5, null), null);
  const quiz = read('assets/quiz.js'), fb = read('assets/fb.js'), f = read('friends.html'), rules = read('firestore.rules');
  assert.ok(quiz.includes('NursinQuiz') && quiz.includes('startChallenge') && quiz.includes('p.challenge'), 'quiz challenge mode');
  assert.ok(f.includes('assets/quiz-data.js'), 'friends page has the question bank to pick challenge questions');
  assert.ok(fb.includes('تحدّيات إلك') && fb.includes('تحدّياتي') && fb.includes('تحدّى'), 'challenge UI');
  assert.ok(/where\("to", "==", user\.uid\)/.test(fb) && /where\("from", "==", user\.uid\)/.test(fb), 'challenge queries always filter by the signed-in user');
  assert.ok(fb.includes('Bonus') && fb.includes('+ N.BONUS') && N.BONUS === 10, 'winner bonus (+10) once, by flag');
  assert.ok(rules.includes('match /challenges/{cid}') && rules.includes('resource.data.to == request.auth.uid'), 'challenge rules with a list-friendly read');
});

function loadN() {
  const vm = require('node:vm');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(read('assets/quiz-data.js'), ctx);
  vm.runInContext(read('assets/account.js'), ctx);
  return { N: ctx.window.Nursin, Q: ctx.window.QUIZ };
}
test('phase 3: weekly exams — Mon–Sat, 2 different subjects a day, Sunday off, same questions for everyone, ids the rules accept', () => {
  const { N, Q } = loadN();
  const seen = new Set();
  for (let w = 0; w < 4; w++) {
    const week = N.weekOf(N.addDays('2026-10-26', 7 * w));
    assert.strictEqual(week.length, 6, 'Mon–Sat');
    assert.strictEqual(N.weekday(week[0].day), 0, 'starts Monday');
    for (const d of week) {
      assert.strictEqual(d.exams.length, 2, d.day + ' has 2 exams');
      assert.notStrictEqual(d.exams[0].k, d.exams[1].k, d.day + ' two different subjects');
      for (const e of d.exams) {
        seen.add(e.k);
        assert.match(e.id, /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z]+$/, 'rules regex ' + e.id);
        const a = N.examQids(e, Q), b = N.examQids(e, Q.slice().reverse());
        assert.ok(a.length >= 8 && a.length <= 10, e.id + ' 8–10 questions');
        assert.strictEqual(JSON.stringify(a), JSON.stringify(b), 'same questions for every student');
        for (const id of a) assert.ok(e.t.includes(Q.find(q => q.id === id).t), id + ' belongs to ' + e.k);
        assert.strictEqual(N.examById(e.id).k, e.k);
      }
    }
    assert.strictEqual(N.examsFor(N.addDays(week[0].day, 6)).length, 0, 'Sunday off');
  }
  assert.strictEqual(seen.size, N.SUBJECTS.length, 'rotation covers every subject');
  for (const s of N.SUBJECTS) for (const t of s.t) assert.ok(Q.some(q => q.t === t), 'subject topic exists: ' + t);
  assert.strictEqual(N.examById('2026-10-25-ecg'), null, 'no exam on a Sunday');
  assert.strictEqual(N.examById('bad'), null);
  assert.match(N.dayKey(new Date('2026-10-24T22:30:00Z')), /^2026-10-25$/, 'Lebanon day (UTC+3 in October)');
});
test('phase 3: month points reset with the month, live-room scoring, 50/50 counts', () => {
  const { N, Q } = loadN();
  const now = new Date('2026-10-24T12:00:00Z');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(N.monthWrite({ monthKey: '2026-10', monthPoints: 20 }, 100, 109, now))), { monthKey: '2026-10', monthPoints: 29, m202610: 29 });
  assert.strictEqual(N.monthWrite({ monthKey: '2026-09', monthPoints: 500 }, 100, 106, now).monthPoints, 6, 'new month starts from 0');
  assert.strictEqual(N.monthWrite({ monthKey: '2026-10', monthPoints: 4 }, 100, 90, now).monthPoints, 0, 'month points never below 0');
  assert.strictEqual(N.monthField('2026-10'), 'm202610'); assert.strictEqual(N.prevMonth('2026-01'), '2025-12');
  const qids = Q.slice(0, 4).map(q => q.id), right = Q[0].a, wrong = (Q[1].a + 1) % Q[1].o.length;
  const t = N.roomTally(qids, { 0: right, 1: wrong }, Q);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t)), { c: 1, w: 1, skip: 2 });
  assert.strictEqual(N.roomPoints(20, t, false), 18, '+3 −5, unanswered 0');
  assert.strictEqual(N.roomPoints(20, t, true), 28, 'winner +10');
  assert.strictEqual(N.roomPoints(0, { c: 0, w: 3 }, true), 10, 'clamp at 0 then the bonus');
  assert.strictEqual(N.roomWinner(5, 3, null, 'H', 'G'), 'host'); assert.strictEqual(N.roomWinner(2, 3, null, 'H', 'G'), 'guest');
  assert.strictEqual(N.roomWinner(3, 3, null, 'H', 'G'), 'tie'); assert.strictEqual(N.roomWinner(9, 0, 'H', 'H', 'G'), 'guest', 'the one who left loses');
  assert.strictEqual(N.LIVE.Q_SEC, 20); assert.ok(N.LIVE.STALE_MS > 2 * N.LIVE.HB_MS, 'timeout longer than two heartbeats');
  const today = N.dayKey();
  assert.strictEqual(N.puAvail({}, today), 1, 'one free a day');
  assert.strictEqual(N.puAvail({ puDay: today, powerups: 2 }, today), 2);
  assert.strictEqual(N.puAvail({ puDay: today, powerups: 99 }, today), 50, 'capped at 50');
  assert.strictEqual(N.PU_PRICE, 70, '50/50 costs 70 points (was 10)');
});
test('phase 3: live + exams pages, nav, module loading, rules for rooms / exams / month / power-ups', () => {
  for (const p of pages) assert.ok(read(p).includes('<a href="exams.html"'), p + ' nav links exams.html');
  const lv = read('live.html'), ex = read('exams.html');
  assert.ok(lv.includes('id="live-app"') && lv.includes('assets/quiz-data.js'), 'live page shell + question bank');
  assert.ok(ex.includes('id="exams-app"') && ex.includes('assets/quiz-data.js') && ex.includes('aria-current="page"'), 'exams page shell');
  const acc = read('assets/account.js');
  assert.ok(acc.includes("page==='live.html'") && acc.includes("page==='exams.html'"), 'Firebase loads on the new pages for signed-out visitors too');
  const fb = read('assets/fb.js'), live = read('assets/live.js'), exj = read('assets/exams.js'), quiz = read('assets/quiz.js');
  assert.ok(fb.includes('import("./" + name + ".js" + ver)'), 'live/exams modules load lazily with the same cache tag');
  for (const js of [live, exj]) assert.ok(!/from "/.test(js) && !/measurementId|getAnalytics/.test(js), 'no extra SDK imports in the lazy modules');
  assert.ok(live.includes('onSnapshot') && live.includes('Seen') && live.includes('runTransaction') && live.includes('serverTimestamps: "estimate"'), 'synced room: live listener, heartbeats, transactional next question');
  assert.ok(live.includes('where("invited", "==", A.user.uid)') && live.includes('ltoast'), 'invitations filtered by the signed-in user + toast');
  assert.ok(live.includes('مش مسموح باللايف') && quiz.includes('بالامتحان') && quiz.includes('بالتحدّي'), '50/50 disabled in live, exams and challenges');
  assert.ok(exj.includes('examStarts') && exj.includes('الأوائل هالشهر') && exj.includes('orderBy(f, "desc")'), 'exams: start marker, monthly leaderboard');
  assert.ok(fb.includes('"examResults", q.exam + "_" + user.uid') && fb.includes('{ merge: true }'), 'exam result keyed {examId}_{uid}; profile writes merge');
  assert.ok(fb.includes('NOT') || exj.includes('NOT_READY'), 'friendly message while the old rules are live');
  const rules = read('firestore.rules');
  for (const k of ['match /rooms/{rid}', 'match /examStarts/{key}', 'match /examResults/{key}', "optInt(request.resource.data, 'powerups', 50)", "optInt(request.resource.data, 'monthPoints', 999999)",
    'exists(/databases/$(database)/documents/examStarts/$(key))', 'changed().hasOnly(', 'examOpen(', "key.split('_')[1] == request.auth.uid"]) assert.ok(rules.includes(k), 'rules: ' + k);
  assert.strictEqual((rules.match(/allow update, delete: if false;/g) || []).length, 7, 'friendCodes, examStarts, examResults (+ v4 class weeks, starts, results, v5 daily answers) are create-only');
  assert.ok(read('sitemap.xml').includes('exams.html') && read('privacy.html').includes('monthly leaderboard'), 'sitemap + privacy');
});

test('3D page: short ad screen first (once per session, 5 s, «كمّل ←», no reward), models wait for it', () => {
  const g = read('assets/gate3d.js'), v = read('assets/viewer.js'), h = read('3d.html'), css = read('assets/style.css');
  assert.ok(h.indexOf('assets/gate3d.js?v=20261025g') > -1 && h.indexOf('assets/gate3d.js') < h.indexOf('assets/viewer.js'), 'gate runs before the viewer');
  assert.ok(g.includes('sessionStorage') && g.includes('WAIT=5') && g.includes('كمّل ←') && g.includes('إعلان') && g.includes('الصفحة عم تحضّر'), 'once per session, 5 s, button, label');
  assert.ok(g.includes('9892bba2f704f8ea66787de07f9f7be3') && g.includes('srcdoc') && g.includes('https://bauval.org/22/'), 'existing 300x250 unit in its own srcdoc iframe');
  assert.ok(!/points|نقاط|location\.(href|assign|replace)|history\.(push|replace)State/.test(g), 'no reward, no redirect, no history tricks');
  assert.ok(v.includes('window.nursin3dGate.then(go)'), 'models load only after the gate');
  assert.ok(/\.gate3d\{position:fixed;left:0;right:0;top:56px/.test(css), 'overlay starts under the site header');
  for (const p of ['cardio.html', 'neuro.html']) assert.ok(!read(p).includes('gate3d'), p + ' has no ad screen');
});

test('AI tutor page: nav on every page, chat shell, retry/busy/limit/voice logic, privacy + sitemap', () => {
  for (const p of pages) assert.ok(read(p).includes('<a href="tutor.html"'), p + ' nav links tutor.html');
  const h = read('tutor.html'), js = read('assets/tutor.js');
  assert.ok(h.includes('🧑‍🏫 الأستاذ المساعد') && h.includes('id="tlog"') && h.includes('id="tform"') && h.includes('aria-current="page"'), 'page shell');
  for (const c of ['درّسني لامتحان بكرا', 'شو عندي امتحانات هالأسبوع؟', 'اشرحلي الـ ECG', 'شو يعني troponine؟', 'اعملّي كويز صغير عن القلب', 'شو لازم إدرس بعدين؟']) assert.ok(h.includes(c), 'chip ' + c);
  assert.ok(h.includes('الأستاذ المساعد ذكاء اصطناعي وممكن يغلط، راجع دروسك 📚'), 'disclaimer');
  assert.ok(h.indexOf('assets/quiz-data.js') < h.indexOf('assets/weak.js') && h.indexOf('assets/weak.js') < h.indexOf('assets/tutor.js?v='), 'topics + weak points load before the tutor');
  assert.ok(js.includes('https://summer-forest-fd40.abdullahjaber1452003.workers.dev/') && js.includes('sessionStorage') && js.includes('AbortController'), 'worker URL, session history, abort');
  assert.ok(js.includes('TIMEOUT=45000') && js.includes('RETRY_MS=3000') && js.includes('الأستاذ مشغول هلّق، جرّب كمان شوي 🙏') && js.includes('tretry'), '45 s timeout, one retry after 3 s, busy message + retry button');
  assert.ok(js.includes("'speechSynthesis' in w") && js.includes("'ar-SA'") && js.includes('speechSynthesis.cancel'), 'voice with stop, hidden when unsupported');
  assert.ok(!/\(\?<[=!]/.test(js), 'no lookbehind regex (older Safari)');
  assert.ok(!/innerHTML\s*=\s*text|innerHTML\s*=\s*j\.text/.test(js), 'model text never goes raw into innerHTML');
  const T = require(path.join(SITE, 'assets/tutor.js'));
  assert.strictEqual(T.fmt('<img src=x onerror=alert(1)> **Troponine**\nسطر'), '&lt;img src=x onerror=alert(1)&gt; <b>Troponine</b><br>سطر');
  assert.ok(!T.fmt('**<script>**').includes('<script>'));
  assert.strictEqual(T.fmt('الـ *Troponine* و 2*3'), 'الـ Troponine و 2*3', 'single-star italics stripped');
  assert.strictEqual(T.speakable('**ECG** 🫀 تخطيط ✅'), 'ECG تخطيط');
  assert.ok(T.isBusy('صار في مشكلة: high demand') && T.isBusy('') && !T.isBusy('الجواب'));
  assert.strictEqual(T.LIMIT, 15); assert.strictEqual(T.KEEP, 12);
  const hist = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: 'm' + i }));
  assert.deepStrictEqual(T.trim(hist).map(m => m.text), hist.slice(-12).map(m => m.text));
  const mem = {}; const store = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
  for (let i = 0; i < 3; i++) T.countAdd(store, '2026-10-24');
  assert.strictEqual(T.countRead(store, '2026-10-24'), 3); assert.strictEqual(T.countRead(store, '2026-10-25'), 0, 'counter resets each day');
  const ctx = T.buildContext({ topics: { ecg: 'ECG (تخطيط القلب)', avc: 'AVC (جلطة دماغية)' }, me: { name: 'Ali', points: 70 }, level: 3, weak: [{ t: 'ecg', n: 2 }] });
  assert.ok(ctx.includes('دروس الموقع: ECG (تخطيط القلب)، AVC (جلطة دماغية)') && ctx.includes('نقاط ضعف الطالب') && ctx.includes('ECG (تخطيط القلب) (2 أسئلة)') && ctx.includes('ليفل 3'), 'context: topics, weak points, level');
  assert.ok(!T.buildContext({ topics: {}, weak: [] }).includes('ليفل'), 'signed-out context has no level');
  assert.ok(read('sitemap.xml').includes('tutor.html') && /Google Gemini/.test(read('privacy.html')) && /sent to Google Gemini via Cloudflare/.test(read('privacy.html')), 'sitemap + privacy (ar + en)');
});

test('classes page: nav on every page, signed-in only shell, light top banner (not inside the exam), privacy + sitemap', () => {
  for (const p of pages) assert.ok(read(p).includes('<a href="classes.html"'), p + ' nav links classes.html');
  const h = read('classes.html'), acc = read('assets/account.js'), fb = read('assets/fb.js'), js = read('assets/classes.js');
  assert.ok(h.includes('🏫 الصفوف') && h.includes('id="classes-app"') && h.includes('<a href="classes.html" aria-current="page"'), 'page shell');
  assert.ok(h.includes('class="adx adx-top" data-mobile="735f5c76ee5abde951ff9d70e2263fab" data-desktop="f0cd90c85278798fba5a155236050d61"') && !h.includes('9892bba2f704f8ea66787de07f9f7be3'), 'top banner only');
  assert.strictEqual((h.match(/assets\/ads\.js\?v=/g) || []).length, 1); assert.ok(h.includes('ca-pub-2554036492962277') && h.includes('G-7MY0Z597WC'));
  const rh = js.slice(js.indexOf('function resultHtml('), js.indexOf('\n}\n', js.indexOf('function resultHtml(')));
  assert.ok(!/adx|bauval/.test(js.replace(rh, '')), 'no ads inside the class exam (only on its result)');
  assert.ok(h.indexOf('assets/quiz-data.js') < h.indexOf('assets/weak.js') && h.includes('assets/weak.js?v=20261025g'), 'quiz bank + weak points loaded');
  assert.ok(acc.includes("page==='classes.html'") && fb.includes('mod("classes")') && fb.includes('getElementById("classes-app")'), 'Firebase + module load on classes page');
  assert.ok(js.includes('A.signInCard(') && js.includes('NOT_READY') && js.includes('permission-denied'), 'signed-out prompt + friendly message before rules v4');
  assert.ok(js.includes('runTransaction') && js.includes('"weeks", C.wk') && js.includes('"starts", C.wk + "_" + A.user.uid') && js.includes('"results", C.wk + "_" + A.user.uid'), 'one exam per week (transaction), start marker + result per student');
  assert.ok(js.includes('summer-forest-fd40') && js.includes('AI_TIMEOUT = 25000') && js.includes('AI_RETRY_MS') && js.includes('autoTopics(C.wk'), 'tutor picks the topics, retry once, fallback');
  assert.ok(js.includes('شدّ حالك بـ') && js.includes('tutor.html?q=') && read('assets/tutor.js').includes("get('q')"), 'advice + ask-the-tutor link prefilled');
  assert.ok(read('sitemap.xml').includes('classes.html') && /visible only to members of the same class/.test(read('privacy.html')), 'sitemap + privacy');
  const rules = read('firestore.rules');
  for (const k of ['match /classes/{cid}', 'match /classCodes/{code}', 'match /myClasses/{cid}', 'match /members/{uid}', 'match /weeks/{wk}', 'match /starts/{key}', 'match /results/{key}', 'isMember(cid)', 'isClassOwner(cid)', "key == request.resource.data.wk + '_' + request.auth.uid", 'match /examResults/{key}', 'match /rooms/{rid}', 'match /challenges/{cid}']) assert.ok(rules.includes(k), 'rules v4 keeps v3 and adds: ' + k);
});

test('classes logic: ISO week (Beirut day), 15 questions weighted to the class weak topics, same for everyone, tutor plan parsing, advice, ranking', async () => {
  const C = await import(require('node:url').pathToFileURL(path.join(SITE, 'assets/classes.js')).href);
  const src = read('assets/quiz-data.js'), Q = JSON.parse(src.match(/window\.QUIZ=(\[.*?\]);\n/s)[1]);
  assert.strictEqual(C.isoWeek('2026-10-24'), '2026-W43'); assert.strictEqual(C.isoWeek('2026-10-26'), '2026-W44'); assert.strictEqual(C.isoWeek('2027-01-01'), '2026-W53'); assert.strictEqual(C.isoWeek('2027-01-04'), '2027-W01');
  const ex = C.buildExam('C1:2026-W43', ['ecg', 'avc', 'htic'], Q);
  assert.strictEqual(ex.length, 15); assert.strictEqual(new Set(ex).size, 15, 'no repeats');
  assert.deepStrictEqual(ex, C.buildExam('C1:2026-W43', ['ecg', 'avc', 'htic'], Q), 'same questions for everyone');
  const by = Object.fromEntries(Q.map(q => [q.id, q.t]));
  assert.ok(ex.filter(id => ['ecg', 'avc', 'htic'].includes(by[id])).length >= 13, 'mostly the chosen topics (htic has only 3, rest filled)');
  const weak = C.classWeak([{ wrongQ: Q.filter(q => q.t === 'glasgow').map(q => q.id) }, { wrongQ: [Q.find(q => q.t === 'ecg').id] }], Q);
  assert.deepStrictEqual(weak.map(w => w.t), ['glasgow', 'ecg']);
  const at = C.autoTopics('2026-W43', weak, Q); assert.ok(at[0] === 'glasgow' && at[1] === 'ecg' && at.length === 5 && new Set(at).size === 5, 'fallback: weakest first + rotation');
  assert.strictEqual(C.autoTopics('2026-W43', [], Q).length, 4);
  assert.deepStrictEqual(C.parsePlan('```json\n{"topics":["ECG","avc","nope","ecg"],"intro":"**يلا** نشدّ"}\n```', Q), { topics: ['ecg', 'avc'], intro: 'يلا نشدّ' });
  assert.strictEqual(C.parsePlan('صار في مشكلة: high demand', Q), null); assert.strictEqual(C.parsePlan('{"topics":["ecg"]}', Q), null, 'needs 2+ valid topics');
  assert.ok(C.planPrompt('LT2', 12, ['ecg'], weak, { ecg: 'ECG' }).includes('LT2') && C.planPrompt('LT2', 1, ['ecg'], [], {}).includes('أوّل امتحان'));
  const ecg = Q.filter(q => q.t === 'ecg').map(q => q.id), avc = Q.find(q => q.t === 'avc').id;
  assert.deepStrictEqual(C.advice([ecg[0], avc, ecg[1]], Q), [{ t: 'ecg', n: 2 }, { t: 'avc', n: 1 }]);
  const rk = C.ranking([{ uid: 'a', score: 15, total: 15 }, { uid: 'b', score: 10, total: 15 }, { uid: 'b', score: 15, total: 15 }, { uid: 'gone', score: 15, total: 15 }], ['a', 'b']);
  assert.deepStrictEqual(rk.map(r => [r.uid, r.pct, r.weeks]), [['a', 100, 1], ['b', 83, 2]], 'average over weeks, current members only');
});
test('motivation: 🔥 streak (5 answers a Beirut day, missed day → 0, best kept), 🏅 badges (8, earned once), nav + friends + profile', () => {
  const vm = require('node:vm');
  const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(read('assets/account.js'), ctx);
  const N = ctx.window.Nursin, D = '2026-10-25', Y = '2026-10-24', OLD = '2026-10-22';
  const plain = o => JSON.parse(JSON.stringify(o));
  assert.strictEqual(N.STREAK_MIN, 5);
  let w = N.actWrite({}, 3, null, [], D);
  assert.ok(!w.streak && w.actN === 3 && w.qTotal === 3, '3 answers: the day does not count yet');
  assert.strictEqual(N.dayLeft(w, D), 2);
  w = N.actWrite(w, 2, null, [], D);
  assert.ok(w.streak === 1 && w.sDay === D && w.bestStreak === 1, '5th answer starts a streak');
  assert.strictEqual(N.dayLeft(w, D), 0);
  const again = N.actWrite({ ...w, ...plain(w) }, 10, null, [], D);
  assert.ok(again.streak === undefined && again.actN === 15, 'a day counts once');
  const y = N.actWrite({ streak: 6, sDay: Y, bestStreak: 6, actDay: Y, actN: 20, qTotal: 95 }, 10, [9, 10], [], D);
  assert.strictEqual(y.streak, 7, 'yesterday counted → +1'); assert.strictEqual(y.bestStreak, 7);
  assert.ok(y.badges.s7 === D && y.badges.q100 === D && !y.badges.ecg, '7-day streak + 100 questions badges; ECG needs ' + 15 + ' answers');
  const gap = N.actWrite({ streak: 9, sDay: OLD, bestStreak: 9 }, 5, null, [], D);
  assert.ok(gap.streak === 1 && gap.bestStreak === 9, 'a missed day restarts at 1, best kept');
  assert.strictEqual(N.streakNow({ streak: 9, sDay: OLD }, D), 0, 'shown as 0 after a missed day');
  assert.strictEqual(N.streakNow({ streak: 4, sDay: Y }, D), 4, 'still alive until today ends');
  const e = N.actWrite({ ecgN: 10, ecgOk: 8 }, 5, [5, 5], [], D);
  assert.ok(e.ecgN === 15 && e.ecgOk === 13 && e.badges.ecg === D, '«ملك الـ ECG» at 15 ECG answers, 80%+ right');
  assert.ok(!N.actWrite({ ecgN: 10, ecgOk: 5 }, 5, [5, 5], [], D).badges.ecg, 'not under 80%');
  const ev = N.actWrite({ badges: { q100: '2026-10-01', bogus: 'x' } }, 0, null, ['live1', 'nope'], D);
  assert.deepStrictEqual(plain(ev.badges), { q100: '2026-10-01', live1: D }, 'old dates kept, unknown ids dropped');
  assert.deepStrictEqual(plain(N.newBadges({ badges: { q100: 'x' } }, ev.badges)), ['live1']);
  assert.ok(N.BADGES.length >= 6 && N.BADGES.length <= 10 && new Set(N.BADGES.map(b => b.id)).size === N.BADGES.length, '6–10 badges');
  for (const id of ['s7', 'q100', 'ecg', 'champ', 'up', 'class1', 'live1', 'dq1']) assert.ok(N.badgeById(id), 'badge ' + id);
  for (const b of N.BADGES) assert.ok(/[\u0600-\u06FF]/.test(b.n) && b.e && b.how, 'Arabic name + emoji + how: ' + b.id);
  assert.ok(N.badgeById('ecg').n.includes('ECG') && N.badgeById('s7').n.includes('٧') && N.badgeById('q100').n.includes('١٠٠'));
  const qs = [{ t: 'ecg', a: 1 }, { t: 'avc', a: 0 }, { t: 'arythmies', a: 2 }];
  assert.deepStrictEqual(plain(N.ecgCount(qs, [1, 0, 0])), [1, 2]); assert.strictEqual(N.ecgCount([{ t: 'avc' }], [0]), null);
  assert.ok(N.streakPill({ streak: 3, sDay: N.dayKey() }).includes('🔥3') && N.streakPill({}) === '', 'pill only when alive');
  assert.ok(N.badgeRow({ badges: { live1: D, q100: D } }).includes('⚡') && N.badgeRow({}) === '');
  assert.ok(N.actLine({}, N.actWrite({}, 5, null, [], D), D).includes('سلسلة'), 'result line names the streak');
  assert.ok(N.esc(N.actLine({}, ev, D)).length && N.actLine({}, ev, D).includes('وسام جديد'));
  const acc = read('assets/account.js'), fb = read('assets/fb.js'), quiz = read('assets/quiz.js'), live = read('assets/live.js');
  assert.ok(acc.includes("streak:me.streak|0,sDay:me.sDay||''") && acc.includes('class="stk"'), 'nav pill from the cached profile');
  assert.ok(quiz.includes("ecg:s.eN?[s.eOk|0,s.eN]:null"), 'quiz reports ECG answers');
  assert.ok(fb.includes('async function logActivity(') && fb.includes('const act = await logActivity(') && fb.includes('logActivity, loadFriends'), 'quiz/exam/challenge results log the day');
  assert.ok(fb.includes('N.streakPill(p)') && fb.includes('N.badgeRow(p)'), 'friends list shows 🔥 + badges');
  assert.ok(fb.includes('id="badges"') && fb.includes('🏅 أوسمتي') && fb.includes('🔒'), 'profile badges section with locked state');
  assert.ok(live.includes('A.logActivity(p.tally.c + p.tally.w, null, p.won ? ["live1"] : [])'), 'live win → badge');
  const css = read('assets/style.css');
  for (const k of ['.stk{', '.bgrid{', '.bdgc.on', '.cdq{', '.caw{']) assert.ok(css.includes(k), 'css ' + k);
});
test('motivation in classes: 👑 champion + 📈 most improved (this + last week), ❓ سؤال اليوم (same all day, first right answer), rules v5 add only dq', async () => {
  const C = await import(require('node:url').pathToFileURL(path.join(SITE, 'assets/classes.js')).href);
  const src = read('assets/quiz-data.js'), Q = JSON.parse(src.match(/window\.QUIZ=(\[.*?\]);\n/s)[1]);
  assert.strictEqual(C.prevWeek('2026-10-25'), '2026-W42'); assert.strictEqual(C.prevWeek('2026-10-26'), '2026-W43');
  const R = [
    { uid: 'a', wk: '2026-W42', score: 6, total: 15 }, { uid: 'b', wk: '2026-W42', score: 12, total: 15 },
    { uid: 'a', wk: '2026-W43', score: 13, total: 15 }, { uid: 'b', wk: '2026-W43', score: 13, total: 15 }, { uid: 'c', wk: '2026-W43', score: 15, total: 15 },
    { uid: 'gone', wk: '2026-W43', score: 15, total: 15 }];
  const w = C.weekAwards(R, '2026-W43', ['a', 'b', 'c']);
  assert.deepStrictEqual(w.champ, ['c'], 'top % (removed members left out)'); assert.strictEqual(w.top, 100);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(w.up)), [{ uid: 'a', from: 40, to: 87 }], 'biggest rise vs the previous class exam');
  const tie = C.weekAwards([{ uid: 'x', wk: 'W', score: 5, total: 10 }, { uid: 'y', wk: 'W', score: 5, total: 10 }], 'W');
  assert.deepStrictEqual(tie.champ, ['x', 'y'], 'ties share'); assert.deepStrictEqual(tie.up, [], 'no previous exam → no improvement');
  assert.strictEqual(C.weekAwards(R, '2026-W44').n, 0);
  assert.deepStrictEqual(C.classBadges(R, 'a', '2026-W44').sort(), ['class1', 'up']);
  assert.deepStrictEqual(C.classBadges(R, 'b', '2026-W43'), ['class1', 'champ'], 'champion of a finished week (2+ students)');
  assert.deepStrictEqual(C.classBadges(R, 'c', '2026-W43'), ['class1'], 'the running week does not award yet');
  assert.deepStrictEqual(C.classBadges([{ uid: 'solo', wk: 'W1', score: 1, total: 15 }], 'solo', 'W2'), ['class1'], 'alone in a week is not a champion');
  const ids = new Set(Q.map(q => q.id)), d1 = C.dailyQid('C1', '2026-10-25', Q);
  assert.ok(ids.has(d1) && d1 === C.dailyQid('C1', '2026-10-25', Q), 'same question for the whole class all day');
  for (let i = 0; i < 40; i++) { const a = '2026-11-' + String(1 + (i % 28)).padStart(2, '0'); const b = new Date(Date.parse(a + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10); assert.notStrictEqual(C.dailyQid('K' + i, a, Q), C.dailyQid('K' + i, b, Q), 'never yesterday\'s'); }
  const sum = C.dqSummary([{ uid: 'b', ok: true, at: 200 }, { uid: 'a', ok: false, at: 100 }, { uid: 'c', ok: true, at: { toMillis: () => 150 } }]);
  assert.strictEqual(sum.first.uid, 'c'); assert.strictEqual(sum.right, 2); assert.strictEqual(sum.n, 3);
  assert.strictEqual(C.dqSummary([]).first, null);
  const js = read('assets/classes.js');
  assert.ok(js.includes('id="cdq"') && js.indexOf('id="cdq"') < js.indexOf('id="cweek"'), 'daily question at the top of the class page');
  assert.ok(js.includes('أول واحد جاوب صح') && js.includes('جاوبو صح من') && js.includes('DQ_NOT_READY'), 'first right answer + count + friendly message before rules v5');
  assert.ok(js.includes('بطل الأسبوع') && js.includes('أكثر واحد تحسّن') && js.includes('الأسبوع الماضي'), 'awards for this and last week');
  assert.ok(js.includes('N.streakPill(C.prof[m.uid]) + N.badgeRow(C.prof[m.uid])'), 'member list shows 🔥 + badges');
  assert.ok(js.includes('A.logActivity(qs.length, N.ecgCount(qs, p.ans), ["class1"])'), 'class exam counts for the streak');
  const rules = read('firestore.rules');
  assert.ok(rules.includes('rules v5') && rules.includes('match /dq/{key}') && rules.includes("key == request.resource.data.day + '_' + request.auth.uid") && rules.includes('examOpen(request.resource.data.day)'), 'v5: one answer per student per day');
  for (const k of ['match /classes/{cid}', 'match /members/{uid}', 'match /weeks/{wk}', 'match /results/{key}', 'match /rooms/{rid}', 'match /challenges/{cid}']) assert.ok(rules.includes(k), 'v4 kept: ' + k);
});

test('tutor knows the site: date, the exams.html schedule (today, tomorrow, the week, taken or not), classes, streak, badges, lesson pages', () => {
  global.window = global; delete require.cache[require.resolve(path.join(SITE, 'assets/account.js'))]; require(path.join(SITE, 'assets/account.js'));
  const N = global.Nursin; eval(read('assets/quiz-data.js'));
  delete require.cache[require.resolve(path.join(SITE, 'assets/tutor.js'))]; const T = require(path.join(SITE, 'assets/tutor.js'));
  const fake = Object.assign({}, N, { dayKey: () => '2026-10-25', me: null });           // Sunday: no exam today, two tomorrow
  const out = T.buildContext(T.gather(fake, null));
  assert.ok(out.includes('إذا الطالب طلب يدرس لامتحان، استعمل جدول الامتحانات تحت واشرح الدروس المطلوبة بالترتيب واعمل أسئلة تجريبية'), 'study-for-an-exam hint');
  assert.ok(out.includes('اليوم الأحد 25/10/2026') && out.includes('- اليوم (الأحد 25/10): ما في امتحان'), 'today in Beirut, Sunday off');
  const tom = N.examsFor('2026-10-26'); assert.strictEqual(tom.length, 2);
  const line = out.split('\n').find(l => l.startsWith('- بكرا (الاتنين 26/10)'));
  assert.ok(line, 'tomorrow line');
  for (const ex of tom) { assert.ok(line.includes(ex.n), 'tomorrow subject ' + ex.n); for (const t of ex.t) assert.ok(line.includes(window.QTOP[t]), 'tomorrow lesson ' + t); assert.ok(line.includes(N.examQids(ex, window.QUIZ).length + ' أسئلة')); }
  assert.ok(/صفحة (neuro|cardio|henderson)\.html/.test(line), 'tomorrow names the lesson page');
  assert.ok(out.includes('الأيام الجاية: التلاتا 27/10') && out.includes('السبت 31/10'), 'rest of the week');
  assert.ok(out.includes('الطالب مش مسجّل دخول') && out.includes('cardio.html (القلب)') && out.includes('henderson.html'), 'signed out still gets the schedule + lesson pages');
  assert.ok(out.length < 2500, 'compact: ' + out.length);
  const me = { name: 'Abdullah', points: 200, streak: 3, sDay: '2026-10-25', bestStreak: 5, qTotal: 140, badges: { q100: '2026-10-25' } };
  const mon = Object.assign({}, fake, { dayKey: () => '2026-10-26', me });
  const ids = N.examsFor('2026-10-26').map(x => x.id);
  const st = {}; st[ids[0]] = { s: 'done', score: 8, total: 10 }; st[ids[1]] = { s: 'open' };
  const cl = { list: [{ name: 'LT', owner: true, members: 6, week: { topics: ['ecg', 'avc'], intro: 'يلا', n: 15 }, mine: { score: 11, total: 15, pct: 73, weak: ['ecg'] }, now: { n: 2, top: 93, champ: ['Ali'], up: [{ name: 'Sara', from: 40, to: 80 }] }, last: { n: 0 }, dq: { t: 'htic', mine: null, first: 'Ali', right: 2, n: 3 } }] };
  const c2 = T.buildContext(T.gather(mon, { st, classes: cl, prof: me }));
  assert.ok(c2.includes('قدّمو الطالب: 8/10') && c2.includes('لسّا ما قدّمو'), 'today\'s exams: taken or not');
  assert.ok(c2.includes('سلسلة 🔥3') && c2.includes('💯 ١٠٠ سؤال') && c2.includes('ليفل 4'), 'streak, badges, level');
  assert.ok(c2.includes('صف «LT»') && c2.includes('11/15 (73%)') && c2.includes('بطل الأسبوع Ali 93%') && c2.includes('أكثر واحد تحسّن Sara (40%→80%)') && c2.includes('سؤال اليوم (عن HTIC): الطالب لسّا ما جاوب'), 'class exam, champion, most improved, daily question');
  assert.ok(c2.length < 2500, 'compact signed in: ' + c2.length);
  const js = read('assets/tutor.js'), ex = read('assets/exams.js'), cj = read('assets/classes.js');
  assert.ok(js.includes("api.mod('exams')") && js.includes("api.mod('classes')") && ex.includes('export async function tutorStatus') && cj.includes('export async function tutorSummary'), 'live data reuses the exams + classes modules');
  assert.ok(!/examsFor\s*\(dk\)\s*\{/.test(js), 'no second copy of the schedule in the tutor');
});

test('tutor: 15 free questions a day, then an ad screen gives +5, at most 3 times (30 a day)', () => {
  const T = require(path.join(SITE, 'assets', 'tutor.js'));
  assert.strictEqual(T.LIMIT, 15); assert.strictEqual(T.BONUS, 5); assert.strictEqual(T.MAX_UNLOCKS, 3); assert.strictEqual(T.AD_WAIT, 15);
  assert.strictEqual(T.LIMIT + T.BONUS * T.MAX_UNLOCKS, 30, 'never more than 30 a day');
  const mem = {}; const st = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } }; const day = '2026-10-25';
  for (let i = 0; i < 15; i++) T.countAdd(st, day);
  let q = T.quota(st, day); assert.deepStrictEqual([q.left, q.canUnlock, q.cap], [0, true, 15]);
  for (let u = 1; u <= 3; u++) {
    q = T.unlock(st, day); assert.strictEqual(q.left, 5, 'unlock ' + u + ' gives +5'); assert.strictEqual(q.unlocks, u);
    for (let i = 0; i < 5; i++) T.countAdd(st, day);
    assert.strictEqual(T.quota(st, day).left, 0);
  }
  q = T.quota(st, day); assert.deepStrictEqual([q.used, q.cap, q.canUnlock], [30, 30, false]);
  assert.strictEqual(T.unlock(st, day).cap, 30, 'a 4th unlock gives nothing');
  const t = T.quota(st, '2026-10-26'); assert.deepStrictEqual([t.left, t.unlocks, t.canUnlock], [15, 0, true], 'resets the next Beirut day');
  mem.nursin_tutor_day_v1 = JSON.stringify({ d: day, n: 12 }); assert.strictEqual(T.quota(st, day).left, 3, 'old counters (no u) still read');
  const js = read('assets/tutor.js'), h = read('tutor.html');
  assert.ok(js.includes('🎬 شوف إعلان وخود ٥ أسئلة') && js.includes('خلصت أسئلة اليوم، رجاع بكرا 🙏') && js.includes('باقيلك'), 'Arabic texts');
  assert.ok(js.includes('bauval.org/22/') && js.includes('9892bba2f704f8ea66787de07f9f7be3') && js.includes('>إعلان<'), 'Adsterra 300x250 labelled إعلان');
  assert.ok(!/adsbygoogle|data-ad-slot/.test(js), 'no AdSense unit on the ad screen');
  assert.ok(!h.includes('bauval.org') && !h.includes('class="adx'), 'no banner inside the chat page');
});

test('50/50 «حذف جواب غلط» costs 70 points: labels show the price, not-enough-points guard uses it', () => {
  const vm = require('node:vm'); const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(read('assets/account.js'), ctx);
  assert.strictEqual(ctx.window.Nursin.PU_PRICE, 70);
  const fb = read('assets/fb.js'), qz = read('assets/quiz.js'), fr = read('friends.html');
  assert.ok((fb.match(/before < N\.PU_PRICE|before >= N\.PU_PRICE/g) || []).length >= 2, 'buy + use check the balance against the price');
  assert.ok(fb.includes('ما عندك نقاط كفاية (بدّك " + N.PU_PRICE'), 'not-enough-points message names the price');
  assert.ok(qz.includes("<N.PU_PRICE?' disabled'") && fb.includes('< N.PU_PRICE ? " disabled"'), 'buy buttons disabled under 70 points');
  assert.ok(fr.includes('بـ ٧٠ نقطة') && !fr.includes('بـ ١٠ نقاط'), 'friends page explains the new price');
});

test('result-screen + mid-lesson banners (Oct 25): labelled Adsterra box after the score, never during questions, reserved size, one mid banner per long lesson page', () => {
  const box = '9892bba2f704f8ea66787de07f9f7be3', d728 = 'f0cd90c85278798fba5a155236050d61';
  const slot = 'class="adx adx-box adx-keep adx-res" data-mobile="' + box + '" data-desktop="' + d728 + '"';
  const quiz = read('assets/quiz.js'), cls = read('assets/classes.js'), live = read('assets/live.js');
  // quiz / daily exam / friend challenge: only in done(), after the score card, before the review list
  const done = quiz.slice(quiz.indexOf('function done('));
  assert.ok(quiz.indexOf(slot) > quiz.indexOf('function done(') && done.indexOf(slot) > done.indexOf('النتيجة:') && done.indexOf(slot) < done.indexOf('راجع هودي'), 'quiz result banner after the score');
  assert.strictEqual(quiz.split(slot).length - 1, 1, 'one banner in quiz.js');
  assert.ok(!/adx/.test(quiz.slice(0, quiz.indexOf('function done('))), 'no banner while answering');
  // class exam: only in resultHtml, after the score
  const rh = cls.slice(cls.indexOf('function resultHtml('));
  assert.ok(cls.split(slot).length - 1 === 1 && rh.indexOf(slot) > rh.indexOf('نتيجتك:') && cls.indexOf(slot) > cls.indexOf('function resultHtml('), 'class exam result banner');
  // live challenge: only in drawDone, created once beside the card (redraws do not reload it)
  const dd = live.slice(live.indexOf('function drawDone('));
  assert.ok(live.split(slot).length - 1 === 1 && live.indexOf(slot) > live.indexOf('function drawDone(') && dd.includes('getElementById("lresad")') && dd.includes('insertAdjacentHTML("afterend"'), 'live result banner once');
  const lh = read('live.html');
  assert.ok((lh.match(/assets\/ads\.js\?v=/g) || []).length === 1 && !lh.includes('class="adx'), 'live page: ads.js for the result only, no static slot');
  // ads.js fills slots added later, keeps the reserved box when empty
  const js = read('assets/ads.js'), css = read('assets/style.css');
  assert.ok(js.includes('MutationObserver') && js.includes(".adx:not([data-adx])") && js.includes("'adx-keep'") && js.includes("'adx-empty'"), 'late slots filled; keep slots never collapse');
  assert.ok(/\.adx\.adx-keep\{display:block;min-height:266px/.test(css) && /\.adx\.adx-keep\.adx-off\{display:block\}/.test(css) && /min-width:769px\)\{\.adx\.adx-keep\{min-height:106px\}/.test(css), 'reserved box size, phone + desktop');
  // lesson pages: exactly one mid banner, between two topics, roughly in the middle
  for (const [p, before] of [['cardio.html', 'pacemaker'], ['neuro.html', 'craniotomie']]) {
    const h = read(p), mid = '<div class="adx adx-box adx-keep adx-mid" data-mobile="' + box + '" data-desktop="' + d728 + '"></div>';
    assert.strictEqual(h.split('adx-mid').length - 1, 1, p + ' one mid banner');
    assert.ok(h.includes('</details>\n' + mid + '\n<details class="topic" id="' + before + '">'), p + ' mid banner between two lessons');
    const tops = h.split('<details class="topic"').length - 1, i = h.split(mid)[0].split('<details class="topic"').length - 1;
    assert.ok(i >= tops / 2 - 1 && i <= tops / 2 + 1, p + ' banner near the middle (' + i + '/' + tops + ')');
  }
});

test('3D heart (Oct 25): whole heart framed, slow auto-rotate that pauses on drag, coloured great vessels with Ar–Fr labels and a «🏷️ الأسماء» toggle', () => {
  const v = read('assets/viewer.js'), css = read('assets/style.css');
  const M = JSON.parse(v.slice(v.indexOf('var M=') + 6, v.indexOf('};\n', v.indexOf('var M=')) + 1).replace(/,\s*}$/, '}'));
  const h = M.heart;
  assert.ok(/^0deg \d+deg 1[2-4]\d%$/.test(h.orbit) && h.spin === true, 'framed with a margin + spin');
  for (const m of ['aorta', 'pulm_trunk', 'svc', 'pulm_veins']) assert.ok(Array.isArray(h.vcol[m]) && h.vcol[m].length === 3, 'colour for ' + m);
  const ves = h.hs.filter(x => x.ves);
  assert.deepStrictEqual(ves.map(x => x.key).sort(), ['aorta', 'ivc', 'pt', 'pv', 'svc']);
  for (const x of ves) assert.ok(/[\u0600-\u06FF].* – [A-Za-zé]/.test(x.lab) && /^#[0-9a-f]{6}$/i.test(x.ves) && x.normal, 'Ar – Fr label: ' + x.key);
  assert.ok(v.includes("'auto-rotate-delay','3000'") && v.includes("'rotation-per-second','12deg'") && v.includes('jumpCameraToGoal'), 'gentle spin, resumes after a drag, starts framed');
  assert.ok(v.includes('🏷️ الأسماء') && v.includes("classList.toggle('vlabels')") && v.includes('setEmissiveFactor'), 'labels toggle + brighter vessels');
  assert.ok(/\.vlabels \.hs\.ves:not\(\.back\) \.vlbl\{display:block\}/.test(css), 'labels only on the facing side');
  assert.ok(read('assets/gate3d.js').includes("KEY='nursin_3dgate_v1'"), '3D ad screen kept');
});

test('📢 announcements (Oct 25): banner + 🔔 on every page from one public read, owner-only admin page, rules v6', () => {
  const a = read('assets/announce.js');
  assert.ok(a.includes('announcements/current') && a.includes(':batchGet'), 'reads announcements/current over REST');
  assert.ok(!/firebase-firestore|import /.test(a), 'no Firebase SDK on every page');
  assert.ok(a.includes('textContent') && !/innerHTML\s*=\s*[^;]*ann\./.test(a), 'announcement text is never injected as HTML');
  assert.ok(a.includes('nursin_ann_seen_v1') && a.includes('localStorage'), 'dismiss remembered per browser');
  assert.ok(a.includes('.catch('), 'missing rules / doc are silent');
  for (const p of pages.concat('admin.html')) assert.match(read(p), /<script src="assets\/announce\.js\?v=20261025g" defer><\/script>/, p);
  const ad = read('admin.html');
  assert.match(ad, /name="robots" content="noindex/); assert.ok(ad.includes('id="admin-app"'));
  assert.ok(!ad.includes('adsbygoogle') && !ad.includes('bauval'), 'no ads on the admin page');
  for (const p of pages) assert.ok(!read(p).includes('href="admin.html"'), p + ' must not link the admin page');
  const m = read('assets/admin.js');
  assert.ok(m.includes('"abdullahjaber1452003@gmail.com"') && m.includes('emailVerified') && m.includes('مش مسموح'));
  assert.ok(m.includes('ابعت للكل') && m.includes('امحي الإعلان') && m.includes('maxlength="500"'));
  const fb = read('assets/fb.js');
  assert.equal((fb.match(/page === "admin\.html"/g) || []).length, 2, 'admin module wired signed in and out');
  assert.ok(fb.includes('href="admin.html"') && fb.includes('user.emailVerified'), 'admin link only for the owner');
  assert.ok(read('assets/account.js').includes("page==='admin.html'"), 'Firebase loads on admin.html');
  const r = read('firestore.rules');
  assert.ok(r.includes('match /announcements/{id}') && r.includes("request.auth.token.email == 'abdullahjaber1452003@gmail.com'") && r.includes('request.auth.token.email_verified == true'));
  assert.ok(r.includes('request.resource.data.text.size() <= 500') && r.includes('match /dq/{key}'), 'v6 keeps v5');
});

test('💬 chats (Oct 25): friends 1:1 + groups ≤ 15, text ≤ 500, members-only rules v7, no ads, live only while open', () => {
  for (const p of pages.concat('admin.html', 'chat.html')) assert.ok(read(p).includes('<a href="chat.html"'), p + ' nav links chat.html');
  const h = read('chat.html');
  assert.ok(h.includes('id="chat-app"') && /name="robots" content="noindex/.test(h), 'chat shell, noindex');
  assert.ok(!h.includes('adsbygoogle') && !h.includes('bauval') && !h.includes('ads.js'), 'no ads on the chat page');
  assert.ok(!read('sitemap.xml').includes('chat.html'), 'not in the sitemap');
  assert.ok(read('assets/account.js').includes("page==='chat.html'"), 'Firebase loads on chat.html');
  const fb = read('assets/fb.js');
  assert.equal((fb.match(/page === "chat\.html"/g) || []).length, 2, 'chat module wired signed in and out');
  assert.ok(fb.includes('href="chat.html?with=') && fb.includes('💬 حكي') && fb.includes('chat.html?new'), 'friends page: 💬 حكي per friend + new group');
  assert.ok(/writeBatch \}/.test(fb), 'writeBatch exposed to modules');
  const js = read('assets/chat.js');
  assert.ok(js.includes('limit(50)') && js.includes('onSnapshot') && js.includes('stop()') && js.includes('"pagehide"'), 'last 50, live only while open');
  assert.ok(js.includes('maxlength="500"') && js.includes('slice(0, 500)') && js.includes('maxlength="40"') && js.includes('MAXM = 15'), 'limits in the UI');
  assert.ok(js.includes('المحادثات عم تتجهّز') && js.includes('permission-denied'), 'friendly note until rules v7');
  assert.ok(!/<img|type="file"|بلّغ|حظر/.test(js), 'text only, no report/block');
  assert.ok(js.includes('API.esc(m.text)') && js.includes('API.esc(title(c))'), 'escaped');
  const r = read('firestore.rules');
  assert.ok(r.includes('match /announcements/{id}') && r.includes('match /chats/{cid}') && r.includes('match /messages/{mid}'), 'v7 = v6 + chats');
  assert.ok(r.includes('nd().members.size() <= 15') && r.includes('text.size() <= 500') && r.includes('friends(nd().members[0], nd().members[1])'), 'caps + DM only between friends');
  assert.ok(r.includes("resource.data.uid == request.auth.uid || isAnnOwner()") && r.includes('getAfter(chatPath(cid)).data.updatedAt == request.time'), 'author/owner delete, batched preview');
});
