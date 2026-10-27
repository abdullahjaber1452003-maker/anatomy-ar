const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const SITE = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');
const pages = ['index.html','cardio.html','neuro.html','henderson.html','quiz.html','3d.html','about.html','privacy.html','credits.html','404.html','friends.html','exams.html','live.html','tutor.html','classes.html','law.html','mgmt.html','quality.html','pharma.html','games.html'];
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
  assert.ok(/شركاء إعلانيين آخرين/.test(read('privacy.html')) && /other ad partners/.test(read('privacy.html')), 'privacy covers other ad partners (ar + en)');
});

test('friends + levels: page, nav link and account script on every page, Firebase modular CDN, no Firebase Analytics', () => {
  assert.ok(pages.includes('friends.html'), 'friends.html checked by every page test above');
  for (const p of pages) {
    const h = read(p);
    assert.ok(h.includes('<a href="friends.html"'), p + ' nav links friends.html');
    assert.strictEqual((h.match(/assets\/account\.js\?v=20261026z/g) || []).length, 1, p + ' account.js once with cache tag');
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
  assert.ok(/بحساب Google/.test(pv) && /sign in with Google, we keep your basic account info \(your name\), your points and quiz results/.test(pv), 'privacy explains sign-in data (ar + en)');
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
  assert.strictEqual((rules.match(/allow update, delete: if false;/g) || []).length, 3, 'friendCodes, examStarts, examResults are create-only');
  assert.strictEqual((rules.match(/allow update: if false;\n\s*allow delete: if isAnnOwner\(\) \|\| isClassOwner\(cid\);/g) || []).length, 4, 'v10: class weeks, starts, results, daily answers are never edited, only deleted with the class (admin / owner)');
  assert.ok(read('sitemap.xml').includes('exams.html') && /rankings among friends and classes/.test(read('privacy.html')), 'sitemap + privacy');
});

test('3D page: short ad screen first (once per session, 5 s, «كمّل ←», no reward), models wait for it', () => {
  const g = read('assets/gate3d.js'), v = read('assets/viewer.js'), h = read('3d.html'), css = read('assets/style.css');
  assert.ok(h.indexOf('assets/gate3d.js?v=20261026z') > -1 && h.indexOf('assets/gate3d.js') < h.indexOf('assets/viewer.js'), 'gate runs before the viewer');
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
  assert.ok(read('sitemap.xml').includes('tutor.html') && read('privacy.html').includes('privacy'), 'sitemap + privacy (ar + en)');
});

test('classes page: nav on every page, signed-in only shell, light top banner (not inside the exam), privacy + sitemap', () => {
  for (const p of pages) assert.ok(read(p).includes('<a href="classes.html"'), p + ' nav links classes.html');
  const h = read('classes.html'), acc = read('assets/account.js'), fb = read('assets/fb.js'), js = read('assets/classes.js');
  assert.ok(h.includes('🏫 الصفوف') && h.includes('id="classes-app"') && h.includes('<a href="classes.html" aria-current="page"'), 'page shell');
  assert.ok(h.includes('class="adx adx-top" data-mobile="735f5c76ee5abde951ff9d70e2263fab" data-desktop="f0cd90c85278798fba5a155236050d61"') && !h.includes('9892bba2f704f8ea66787de07f9f7be3'), 'top banner only');
  assert.strictEqual((h.match(/assets\/ads\.js\?v=/g) || []).length, 1); assert.ok(h.includes('ca-pub-2554036492962277') && h.includes('G-7MY0Z597WC'));
  const rh = js.slice(js.indexOf('function resultHtml('), js.indexOf('\n}\n', js.indexOf('function resultHtml(')));
  assert.ok(!/adx|bauval/.test(js.replace(rh, '')), 'no ads inside the class exam (only on its result)');
  assert.ok(h.indexOf('assets/quiz-data.js') < h.indexOf('assets/weak.js') && h.includes('assets/weak.js?v=20261026z'), 'quiz bank + weak points loaded');
  assert.ok(acc.includes("page==='classes.html'") && fb.includes('mod("classes")') && fb.includes('getElementById("classes-app")'), 'Firebase + module load on classes page');
  assert.ok(js.includes('A.signInCard(') && js.includes('NOT_READY') && js.includes('permission-denied'), 'signed-out prompt + friendly message before rules v4');
  assert.ok(js.includes('runTransaction') && js.includes('"weeks", C.wk') && js.includes('"starts", C.wk + "_" + A.user.uid') && js.includes('"results", C.wk + "_" + A.user.uid'), 'one exam per week (transaction), start marker + result per student');
  assert.ok(js.includes('summer-forest-fd40') && js.includes('AI_TIMEOUT = 25000') && js.includes('AI_RETRY_MS') && js.includes('autoTopics(C.wk'), 'tutor picks the topics, retry once, fallback');
  assert.ok(js.includes('شدّ حالك بـ') && js.includes('tutor.html?q=') && read('assets/tutor.js').includes("get('q')"), 'advice + ask-the-tutor link prefilled');
  assert.ok(read('sitemap.xml').includes('classes.html') && /الصفوف/.test(read('privacy.html')), 'sitemap + privacy');
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
  assert.ok(N.BADGES.length >= 6 && N.BADGES.length <= 14 && new Set(N.BADGES.map(b => b.id)).size === N.BADGES.length, '6–14 badges');
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
  assert.ok(c2.length < 2800, 'compact signed in: ' + c2.length);  // +2 subjects (quality, pharma) Oct 26
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
    assert.ok(h.includes('</details>\n' + mid + '\n<details class="topic" id="' + before + '">') || new RegExp('</details>\\n<p class="lqz">[^\\n]*</p>\\n' + mid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\n<details class="topic" id="' + before + '">').test(h), p + ' mid banner between two lessons (after the lesson\'s quiz button)');
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
  for (const p of pages.concat('admin.html')) assert.match(read(p), /<script src="assets\/announce\.js\?v=20261026z" defer><\/script>/, p);
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

test('🩸 blood flow on the 3D heart (Oct 25): «مسار الدم» particles blue → red at the lungs, Ar–Fr step captions, small/big circulation, play/pause + step', () => {
  const f = read('assets/flow.js'), v = read('assets/viewer.js'), h = read('3d.html'), css = read('assets/style.css');
  assert.ok(h.indexOf('assets/flow.js?v=20261026z') > -1 && h.indexOf('assets/flow.js') < h.indexOf('assets/viewer.js'), 'flow.js before the viewer on 3d.html');
  assert.ok(v.includes("key==='heart'&&window.nursinFlow"), 'viewer hands the heart to the flow');
  assert.ok(f.includes('🩸 مسار الدم') && f.includes('التالي ▶') && f.includes('⏸ وقّف') && f.includes('▶ كمّل'), 'button, play/pause, next');
  const order = ['Veines caves','Oreillette droite','Valve tricuspide','Ventricule droit','Valve pulmonaire','Artère pulmonaire','Poumons','Veines pulmonaires','Oreillette gauche','Valve mitrale','Ventricule gauche','Valve aortique','Aorte','Organes'];
  let at = 0; for (const s of order) { const i = f.indexOf("fr:'" + s + "'"); assert.ok(i > at, 'step order: ' + s); at = i; }
  assert.ok(f.includes('الدورة الصغرى (الرئوية)') && f.includes('الدورة الكبرى (الجهازية)') && f.includes('يتأكسج الدم 🫁'), 'circulation labels + oxygenation');
  assert.ok(/BLUE=\[37,99,235\],RED=\[220,38,38\]/.test(f) && f.includes("setAlphaMode(b[3]<1?'BLEND':'OPAQUE')"), 'colour blue → red, see-through chambers');
  assert.ok(f.includes('prefers-reduced-motion') && !/import |three\.module|cdn\./.test(f) && f.length < 24000, 'light: no new library, reduced motion respected');
  assert.ok(css.includes('.fcap{') && /\.fcap \.fstep\{[^}]*overflow-wrap:anywhere/.test(css), 'caption bar wraps on phones');
});

test('💧 liquid blood flow (Oct 25): flowing stream instead of dots on the 3D heart, whole-body figure beside it, 🐢 speed slider shared by both', () => {
  const f = read('assets/flow.js'), css = read('assets/style.css'), h = read('3d.html');
  assert.ok(!f.includes('fdot') && !f.includes('updateHotspot') && !css.includes('.fdot{'), 'no more moving dots / per-frame hotspot moves');
  assert.ok(f.includes('function Liquid(') && f.includes('stroke-dashoffset') && f.includes('linearGradient') && f.includes("'stroke-linecap':'round'"), 'liquid: rounded tubes, gradient blue→red, flowing dash streaks');
  assert.ok(f.includes('camera-change') && f.includes('hotspot-fa') && f.includes('getBoundingClientRect'), 'heart stream re-projected from 3D anchors only when the camera moves');
  assert.ok(f.includes('function body(') && f.includes('🧍 الدم بكل الجسم') && ['الراس','الرئتين','القلب','الإيد','الإجر'].every(w => f.includes("'" + w + "'")), 'body figure with head, lungs, heart, arms, legs');
  assert.ok(f.includes('🐢 السرعة') && /min="0\.25" max="1\.5"/.test(f) && f.includes('spd=0.5') && f.includes('nursin_flow_speed'), 'speed 0.25×–1.5×, default 0.5×, remembered');
  assert.ok(f.includes('beat') && f.includes("'class':'fov fdyn'") && css.includes('.fdyn{will-change:transform}'), 'heartbeat pulse; moving layer kept apart so static vessels are not repainted');
  assert.ok(/@media \(min-width:860px\)\{[^@]*\.viewer\.flowon>\.fbody\{grid-column:2/.test(css), 'beside the heart on desktop, below on phones');
  assert.ok(h.includes('🐢 السرعة') && h.includes('assets/flow.js?v=20261026z'), '3d.html mentions it, fresh cache tag');
});

test('🔔 app mode + chat notifications (Oct 25): manifest, push-only service worker, 📲 install, opt-in, worker ping, rules v8', () => {
  const m = JSON.parse(read('manifest.json'));
  assert.equal(m.short_name, 'Nursin'); assert.equal(m.lang, 'ar'); assert.equal(m.dir, 'rtl'); assert.equal(m.display, 'standalone');
  assert.equal(m.theme_color, '#0f766e'); assert.equal(m.scope, '/');
  for (const sz of ['192x192', '512x512']) assert.ok(m.icons.some(i => i.sizes === sz), 'icon ' + sz);
  assert.ok(m.icons.some(i => i.purpose === 'maskable'), 'maskable icon');
  for (const i of m.icons) assert.strictEqual(fs.readFileSync(path.join(SITE, i.src)).slice(1, 4).toString(), 'PNG', i.src);
  assert.ok(fs.existsSync(path.join(SITE, 'assets/apple-touch-icon.png')) && fs.existsSync(path.join(SITE, 'assets/badge-96.png')), 'apple + badge icons');
  for (const p of pages.concat('admin.html', 'chat.html')) {
    const h = read(p);
    assert.ok(h.includes('<link rel="manifest" href="/manifest.json">') && h.includes('<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">'), p + ' manifest + apple icon');
    assert.equal((h.match(/<script src="assets\/pwa\.js\?v=20261026z" defer><\/script>/g) || []).length, 1, p + ' pwa.js once');
  }
  const sw = read('sw.js');
  assert.ok(sw.includes('"push"') && sw.includes('showNotification') && sw.includes('"notificationclick"') && sw.includes('/chat.html?c='), 'push + tap opens the chat');
  assert.ok(!sw.includes('"fetch"') && !/caches\./.test(sw), 'no fetch handler, no cache (never a stale site)');
  const pw = read('assets/pwa.js');
  assert.ok(pw.includes('register("/sw.js", { scope: "/" })') && pw.includes('beforeinstallprompt') && pw.includes('📲 زيد عالشاشة الرئيسية'), 'SW + install button');
  assert.ok(pw.includes('إضافة إلى الشاشة الرئيسية') && pw.includes('iOS 16.4') && pw.includes('⬆️'), 'iPhone sheet');
  assert.ok(pw.includes('🔔 فعّل الإشعارات') && pw.includes('🔕 وقّف الإشعارات') && pw.includes('Notification.requestPermission'), 'opt-in and off');
  assert.ok(/addEventListener\("click", async function \(\) \{\s*on\.disabled = true;[\s\S]{0,80}enable\(API\)/.test(pw) && (pw.match(/requestPermission/g) || []).length === 1, 'permission asked only on tap');
  assert.ok(pw.includes('"/push/seal"') && pw.includes('"/push"') && pw.includes('"pushSubs"') && pw.includes('userVisibleOnly: true'), 'seal + save + ping');
  const vapid = (pw.match(/VAPID = "([A-Za-z0-9_-]+)"/) || [])[1];
  assert.ok(vapid && Buffer.from(vapid, 'base64url').length === 65, 'VAPID public key (65 bytes)');
  for (const f of fs.readdirSync(SITE)) if (/\.(js|json|html|rules|md|txt)$/.test(f)) assert.ok(!/"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/.test(read(f)), f + ' no private key');
  assert.ok(read('assets/chat.js').includes('window.NursinPWA.ping(API, cid)') && read('assets/chat.js').includes('NursinPWA.pushCard($("cpush"), API)'), 'chat: ping after send + opt-in card');
  assert.ok(read('assets/fb.js').includes('NursinPWA.pushCard(document.getElementById("fpush"), API)'), 'account page opt-in card');
  const r = read('firestore.rules');
  assert.ok(r.includes('match /pushSubs/{uid}') && /allow list: if (false|isAnnOwner\(\));/.test(r) && r.includes("hasOnly(['d', 'updatedAt'])") && r.includes('d.size() <= 5'), 'rules v8 pushSubs');
  assert.ok(r.includes('match /chats/{cid}') && r.includes('match /announcements/{id}'), 'v8 keeps v7');
});

test('📢 broadcast notifications (Oct 25): owner-only «إشعار للكل» on admin.html (+ checkbox on the announcement), chunks to the worker, gone devices removed, news opens a site page, home 🔔 strip, rules v9', () => {
  const a = read('assets/admin.js');
  assert.ok(a.includes('📢 إشعار للكل') && a.includes('ابعت كمان إشعار عالتلفونات') && a.includes('id="ptitle"') && a.includes('id="pbody"') && a.includes('id="purl"'), 'form: title, text, page, announcement checkbox');
  assert.ok(a.includes('"/broadcast"') && a.includes('CHUNK = 25') && a.includes('getDocs(collection(API.db, "pushSubs"))'), 'lists pushSubs and sends chunks to the worker');
  assert.ok(a.includes('وصل لـ ') && a.includes('ما وصل لـ ') && a.includes('اشتراك قديم') && a.includes('updateDoc(doc(API.db, "pushSubs", id), { d: dd })'), 'reports reached / failed and removes gone devices');
  assert.ok(a.indexOf('u.email === OWNER && u.emailVerified') > -1 && a.indexOf('u.email === OWNER && u.emailVerified') < a.indexOf('"/broadcast"'), 'owner gate before anything');
  assert.ok(a.includes('قوانين v9') && a.includes('(v3)'), 'calm notes until rules v9 / worker v3');
  const sw = read('sw.js');
  assert.ok(sw.includes('m.url') && sw.includes('dt.u') && sw.includes('n.origin === self.location.origin'), 'news notification opens a page of this site only');
  assert.ok(sw.includes('/chat.html?c=') && sw.includes('"chat-" + c'), 'chat notifications unchanged');
  const pw = read('assets/pwa.js');
  assert.ok(pw.includes('enable: enable') && pw.includes('state: state') && pw.includes('env: env'), 'opt-in exposed to the welcome card (the old home strip is replaced by it, Oct 26)');
  assert.ok(pw.includes('رسائل + أخبار') && pw.includes('درس'), 'opt-in says messages + news');
  assert.equal((pw.match(/requestPermission/g) || []).length, 1, 'permission still asked only inside enable() (on tap)');
  const r = read('firestore.rules');
  assert.ok(r.includes('allow list: if isAnnOwner();') && r.includes("affectedKeys().hasOnly(['d'])") && r.includes('addedKeys().size() == 0') && r.includes('changedKeys().size() == 0'), 'v9: owner lists + only removes devices');
  assert.ok(r.includes("hasOnly(['d', 'updatedAt'])") && r.includes('match /chats/{cid}') && r.includes('match /announcements/{id}'), 'v9 keeps v8');
  assert.ok(read('index.html').includes('assets/pwa.js?v=20261026z'), 'fresh cache tag');
});

test('🧭 tidy navigation + 👋 welcome card (Oct 26): five groups, every page reachable, sign-in then notifications once per device, «بعدين» on each step, no ads inside', () => {
  const all = fs.readdirSync(SITE).filter(f => f.endsWith('.html'));
  for (const p of all) {
    const h = read(p);
    assert.equal((h.match(/<script src="assets\/nav\.js\?v=20261026z" defer><\/script>/g) || []).length, 1, p + ' nav.js once with cache tag');
    assert.ok(h.indexOf('assets/account.js?v=') < h.indexOf('assets/nav.js?v='), p + ' nav.js after account.js (uses Nursin.loadFB)');
    assert.ok(!h.includes('20261025l'), p + ' old cache tag gone');
  }
  for (const p of pages) assert.ok(read(p).includes('<nav id="nav" class="nav"'), p + ' static nav kept for no-JS + search engines');
  const n = read('assets/nav.js');
  const vm = require('node:vm'); const ctx = { window: {}, document: { readyState: 'loading', addEventListener() {} }, location: { pathname: '/index.html', search: '' } };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(n, ctx);
  const G = ctx.NursinNav.groups;
  assert.equal(G.length, 5, 'five tabs'); assert.deepEqual(G.map(g => g.n), ['الرئيسية', 'المواد', 'التمارين', 'أصحابي', 'الأستاذ']);
  const linked = new Set(); G.forEach(g => { if (g.href) linked.add(g.href); (g.items || []).forEach(i => linked.add(i[0].split('#')[0])); });
  for (const p of ['about.html', 'privacy.html', 'credits.html']) assert.ok(n.includes('"' + p + '"'), p + ' in the ☰ sheet');
  for (const p of pages.filter(p => !['about.html', 'privacy.html', 'credits.html', '404.html'].includes(p)).concat('chat.html')) assert.ok(linked.has(p), p + ' reachable from the 5 groups');
  for (const [l, f] of G.filter(g => g.items).flatMap(g => g.items.map(i => [i[0], g]))) assert.ok(fs.existsSync(path.join(SITE, l.split('#')[0])), l);
  assert.ok(n.includes('"admin" + ".html"') && n.includes('u.email === OWNER && u.emailVerified'), 'admin link only for the owner, built at run time');
  assert.ok(n.includes('html.jsnav') || n.includes('"jsnav"'), 'static nav hidden only when JS runs');
  // welcome card
  assert.ok(n.includes('سجّل دخول بغوغل') && n.includes('🔔 فعّل الإشعارات') && n.includes('📲 زيد عالشاشة الرئيسية') && n.includes('إضافة إلى الشاشة الرئيسية'), 'step 1 Google, step 2 notifications, iPhone install steps');
  assert.equal((n.match(/class="oblater"/g) || []).length, 3, '«بعدين» on every step');
  assert.ok(n.includes('A.signIn()') && n.includes('P.enable(A)') && !n.includes('requestPermission'), 'uses the existing sign-in and opt-in (permission only on tap, inside pwa.js)');
  assert.ok(n.includes('".nsplash"') && n.includes('"g3on"'), 'waits for the splash and the 3D ad screen');
  assert.ok(!/bauval|adsbygoogle|class="adx/.test(n), 'no ads inside the flow');
  assert.ok(n.includes('OUT_GAP = 4 * DAY') && n.includes('IN_GAP = 7 * DAY') && n.includes('nursin_onboard_v1'), 'once per device, re-asked gently');
  // scheduling logic (pure): fresh visitor → step 1; asked yesterday → nothing; 5 days later → step 1 again; signed in + push on → nothing
  const store = {};
  ctx.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  ctx.Nursin = { me: null }; ctx.NursinPWA = { env: () => ({ ios: false, standalone: false, canPush: true, perm: 'default', on: false }) };
  const due = ctx.NursinNav.due;
  assert.equal(due(), 1, 'first visit: sign in');
  store.nursin_onboard_v1 = JSON.stringify({ t: Date.now() - 864e5, n: 1 }); assert.equal(due(), 0, 'not again the next day');
  store.nursin_onboard_v1 = JSON.stringify({ t: Date.now() - 5 * 864e5, n: 1 }); assert.equal(due(), 1, 'gently again after a few days');
  store.nursin_onboard_v1 = JSON.stringify({ t: Date.now() - 50 * 864e5, n: 6 }); assert.equal(due(), 0, 'max 6 asks');
  ctx.Nursin.me = { name: 'x' }; delete store.nursin_onboard_v1; assert.equal(due(), 2, 'signed in, no push: notifications step');
  store.nursin_onboard_v1 = JSON.stringify({ t: Date.now() - 864e5, p: 2 }); assert.equal(due(), 2, 'back from the Google redirect: step 2');
  ctx.NursinPWA.env = () => ({ ios: false, standalone: false, canPush: true, perm: 'granted', on: true }); assert.equal(due(), 0, 'signed in + push on: never');
  ctx.NursinPWA.env = () => ({ ios: true, standalone: false, canPush: false, perm: 'none', on: false }); delete store.nursin_onboard_v1; assert.equal(due(), 2, 'iPhone not installed: install steps');
  ctx.NursinPWA.env = () => ({ ios: false, standalone: false, canPush: true, perm: 'denied', on: false }); assert.equal(due(), 0, 'denied: never');
  const fb = read('assets/fb.js');
  assert.ok(fb.includes('signIn, errText, signInCard') && fb.includes('"nursin:auth"'), 'fb.js exposes sign-in + auth event');
  assert.ok(read('assets/account.js').includes('N.loadFB=function'), 'Firebase can be loaded on demand');
  // tidy home
  const h = read('index.html');
  assert.ok(h.includes('id="homecont"') && h.includes('class="card hg"') && h.includes('details class="box warn hmist"'), 'home: continue + group cards + folded tips');
  assert.equal((h.match(/class="card hg"/g) || []).length, 4, 'one card per group (home is the 5th)');
  const css = read('assets/style.css');
  const adx = css.indexOf('.adx{');
  assert.ok(css.indexOf('.gnav{position:fixed') > -1 && css.indexOf('.gnav{position:fixed') < adx && css.indexOf('.obx{position:fixed') < adx, 'new fixed elements before .adx');
});

test('⚖️ law lessons (Oct 26): lessons from a data list (his notes only), 4-grade table, licence conditions, «قريباً» placeholder, 10 law quiz questions, listed in nav/home/quiz/live/tutor/admin', () => {
  const h = read('law.html');
  assert.ok(h.includes('id="lawlessons"') && h.includes('data-practice="class"') && h.includes('data-practice="blanks" data-t="law"') && h.includes('quiz.html?t=law'));
  for (const s of ['law-data.js', 'blanks-data.js', 'law.js', 'practice.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261026z'), s);
  assert.ok(h.indexOf('assets/law.js') < h.indexOf('assets/practice.js'), 'lessons render before practice mounts');
  assert.ok(h.indexOf('class="adx adx-box"') > h.indexOf('id="blanks"') && h.indexOf('class="adx adx-top"') < h.indexOf('id="lessons"'), 'ads only above/below, none inside lessons or quizzes');
  const w = {}; new Function('window', read('assets/law-data.js'))(w);
  const l1 = w.LAW.lessons[0]; assert.strictEqual(l1.k, 'l1'); assert.ok(l1.n.includes('تصنيفات التمريض'));
  for (const s of ['ممرض متخصص', 'ممرض فني', 'مساعد ممرض', 'لجنة الاختصاص في التمريض', 'المديرية العامة للتعليم المهني والتقني', 'colloquium', 'وزارة الصحة العامة', 'الممرض غير اللبناني — قريباً']) assert.ok(l1.html.includes(s), s);
  assert.strictEqual((l1.html.match(/<tr>/g) || []).length, 5, 'header + 4 grades');
  assert.ok(l1.cq.length >= 2 && l1.cq.length <= 4 && l1.cq.every(c => c.q && c.pts.length >= 3), '2–4 open questions with key points');
  assert.ok(w.LAW.soon.some(s => s.n === 'الممرض غير اللبناني'));
  new Function('window', read('assets/quiz-data.js'))(w);
  const law = w.QUIZ.filter(q => q.t === 'law');
  assert.strictEqual(law.length, 18); assert.deepStrictEqual(w.QGROUPS.law, ['law']); assert.ok(w.QTOP.law);
  const ans = [0, 1, 2].map(a => law.filter(q => q.a === a).length); assert.ok(Math.min(...ans) >= 3, 'answers spread ' + ans);
  for (const q of law) { assert.strictEqual(q.o.length, 3); assert.ok(q.x.length > 10); }
  assert.strictEqual(new Set(w.QUIZ.map(q => q.id)).size, w.QUIZ.length, 'unique ids');
  assert.ok(read('assets/nav.js').includes('["law.html", "⚖️"'), 'in 📚 الدروس');
  assert.ok(read('index.html').includes('href="law.html"') && read('quiz.html').includes('data-set="law"'));
  assert.ok(read('assets/quiz.js').includes("'law.html'") && read('assets/weak.js').includes("'law.html'") && read('assets/classes.js').includes('"law.html"'));
  assert.ok(read('assets/live.js').includes('["law", "⚖️ القانون"]') && read('assets/tutor.js').includes("law:'law.html'") && read('assets/admin.js').includes('/law.html'));
  assert.ok(read('sitemap.xml').includes('https://nursin.store/law.html'));
});
test('⚖️ law lesson 2 + licence conditions (Oct 26 photos): LT/BT/BP table, practice rule + Lebanese-nurse conditions in lesson 1, colloquium = private institutes, new quiz/blanks/class questions', () => {
  const w = {}; new Function('window', read('assets/law-data.js'))(w);
  const [l1, l2] = w.LAW.lessons;
  for (const s of ['مزاولة مهنة التمريض', 'نقابة الممرضات والممرضين', '١٨ سنة', 'بعد معادلتها', 'جنحة شائنة', 'المعاهد الخاصة']) assert.ok(l1.html.includes(s), s);
  assert.ok(!l1.html.includes('بدها معادلة') && !read('assets/blanks-data.js').includes('بدها معادلة') && !read('assets/quiz-data.js').includes('بدها معادلة'), 'colloquium is for private-institute students (his p6/p4)');
  assert.ok(l1.cq.some(c => c.q.includes('شروط حصول الممرض اللبناني')));
  assert.strictEqual(l2.k, 'l2'); assert.ok(l2.n.includes('الشهادات'));
  for (const s of ['الإجازة الفنية', 'البكالوريا الفنية', 'البريفيه المهنية', '٩ أشهر', 'معاون صحي', 'colloquium']) assert.ok(l2.html.includes(s), s);
  assert.strictEqual((l2.html.match(/<tr>/g) || []).length, 4, 'header + 3 certificates');
  assert.ok(l2.cq.length >= 2 && l2.cq.length <= 3 && l2.cq.every(c => c.q && c.pts.length >= 3));
  assert.strictEqual(new Set(w.LAW.lessons.map(l => l.k)).size, w.LAW.lessons.length, 'unique lesson keys');
  new Function('window', read('assets/blanks-data.js'))(w);
  const B = w.BLANKS.filter(b => b.t === 'law'); assert.ok(B.length >= 15); assert.strictEqual(new Set(w.BLANKS.map(b => b.id)).size, w.BLANKS.length);
  for (const p of ['index.html', 'quiz.html', 'assets/nav.js']) assert.ok(read(p).includes('244 سؤال'), p);
  new Function('window', read('assets/quiz-data.js'))(w); assert.strictEqual(w.QUIZ.length, 244);
});
test('✍️ «عبّي الفراغ» + 📝 «كويز متل الصف» (Oct 26): blanks for any subject (choice or typed, Arabic-normalized), class quiz self-check, optional ✨ tutor grading, on quiz.html outside the normal chips', () => {
  const w = {}; new Function('window', read('assets/blanks-data.js'))(w);
  const B = w.BLANKS.filter(b => b.t === 'law');
  assert.ok(B.length >= 8 && B.every(b => b.s.includes('___') && b.a));
  const mc = B.filter(b => b.o), typed = B.filter(b => !b.o);
  assert.ok(mc.length >= 3 && typed.length >= 3 && mc.every(b => b.o.includes(b.a)));
  const doc = { readyState: 'complete', querySelectorAll: () => [], getElementById: () => null, addEventListener() {} };
  new Function('window', 'document', 'location', read('assets/practice.js'))(w, doc, { hash: '' });
  const P = w.NursinPractice, find = id => w.BLANKS.find(b => b.id === id);
  assert.strictEqual(P.norm('الإشراف'), P.norm('اشراف'));
  assert.ok(P.okTyped('الاشراف', find('b04')) && P.okTyped(' إشراف ', find('b04')) && P.okTyped('ماجستير', find('b02')) && P.okTyped('الإختصاص', find('b06')) && P.okTyped('Colloqium', find('b08')));
  assert.ok(!P.okTyped('تربية', find('b06')) && !P.okTyped('', find('b02')));
  const js = read('assets/practice.js');
  assert.ok(js.includes('summer-forest-fd40') && js.includes('FIX_MAX'), '✨ صحّحلي uses the existing tutor worker, small daily cap');
  assert.ok(!/adsbygoogle|adx/.test(js), 'no ads inside practice');
  const q = read('quiz.html'), qs = q.indexOf('id="qsets"'), pm = q.indexOf('data-pm="blanks"');
  assert.ok(pm > -1 && q.includes('id="pmode"') && q.includes('assets/practice.js?v=20261026z'));
  const qsEnd = q.indexOf('<div id="quiz"'); assert.ok(pm > qsEnd - 400 && !q.slice(qs, q.indexOf('class="chips pmodes"')).includes('data-pm'), 'mode chips are outside #qsets');
  assert.ok(read('assets/nav.js').includes('quiz.html#blanks') && js.includes('"#blanks"'));
});

test('law wording: «الشهادة المتوسطة» (his page 4), never «الإفادة»', () => {
  for (const f of ['assets/law-data.js', 'assets/quiz-data.js', 'assets/blanks-data.js']) assert.ok(!read(f).includes('الإفادة'), f);
  const l = read('assets/law-data.js');
  assert.ok(l.includes('الشهادة المتوسطة الرسمية') && l.includes('الشهادة المتوسطة اللبنانية'));
});

test('🔒 sign-in gate (Oct 26): lessons show a preview then a lock card, quizzes fully locked for signed-out visitors, 📺 ad unlock for one page/hour, unlock on sign-in without reload', () => {
  const g = read('assets/gate.js'), css = read('assets/style.css');
  for (const p of pages.concat(['admin.html', 'chat.html'])) {
    const h = read(p), head = h.slice(0, h.indexOf('</head>'));
    assert.ok(head.includes('<script src="assets/gate.js?v=20261026z"></script>'), p + ': gate.js in <head>, synchronous (locked before first paint)');
  }
  for (const p of ['cardio.html', 'neuro.html', 'henderson.html', 'law.html', '3d.html']) assert.ok(g.includes('"' + p + '": 1'), p + ' is a lesson page');
  assert.ok(g.includes('"quiz.html": 1'));
  assert.ok(g.includes('🔒 الدرس مقفول — سجّل دخول بغوغل لتكمّل') && g.includes('🔒 الكويز مقفول'));
  assert.ok(g.includes('nursin:auth') && g.includes('nursin:me') && g.includes('nursin_me_v1'), 'follows the existing auth state');
  assert.ok(g.includes('Nursin.loadFB') && g.includes('NursinFB.signIn'), 'Google sign-in through fb.js');
  assert.ok(g.includes('.adx,.ad-slot'), 'ad slots are never hidden or moved by the gate');
  assert.ok(!/adsbygoogle|googlesyndication/.test(g), 'no AdSense in the gate');
  // 📺 ad unlock: Adsterra 300x250, labelled, 15 s timer, sessionStorage per page for 1 hour, unlock even if the ad fails
  assert.ok(g.includes('📺 شوف إعلان وافتح') && g.includes('9892bba2f704f8ea66787de07f9f7be3') && g.includes('bauval.org') && g.includes('<small class="g3lab">إعلان</small>'));
  assert.ok(/AD_WAIT = 15/.test(g) && /AD_HOURS = 1/.test(g) && g.includes('sessionStorage') && g.includes('m[page] = now + AD_HOURS * 36e5'));
  assert.ok(g.includes('the countdown runs even when the ad is blocked') && !/addEventListener\("blur"|onclick.*iframe/.test(g), 'reward by timer, never by clicking the ad');
  // CSS: everything keyed on html classes, so signing in unlocks at once and signed-in visitors see nothing new
  assert.ok(css.includes('.glk-card{display:none}') && css.includes('html.gl-lock .glk-x{display:none!important}') && css.includes('html.gl-lock details.glk-t>:not(summary){display:none!important}'));
  for (const s of ['#qsets', '.pmodes', '#pmode', '#quiz', '#weak[data-manual]', '.psec>:not(h2):not(.glk-card)']) assert.ok(css.includes('html.gl-lock ' + s), 'quiz part hidden: ' + s);
  assert.ok(css.includes('html.gl-out .gsheet a.gi[href^="quiz.html"] .git b::after') && css.includes('html.gl-out .hg a.chip[href^="cardio.html"]::after'), '🔒 in nav sheets + home cards');
  // logic: run gate.js with a fake DOM, signed out → locked; auth event → unlocked; ad unlock → page open, nav still 🔒
  function run(me, ad) {
    const cls = new Set(), L = {}, ev = {}, ss = {};
    if (me) L.nursin_me_v1 = JSON.stringify({ name: 'x' });
    if (ad) ss.nursin_adunlock_v1 = JSON.stringify({ 'cardio.html': Date.now() + 1e6 });
    const html = { classList: { toggle: (c, on) => on ? cls.add(c) : cls.delete(c), contains: c => cls.has(c), add: c => cls.add(c), remove: c => cls.delete(c) } };
    const doc = { documentElement: html, readyState: 'loading', addEventListener: (n, f) => { (ev[n] = ev[n] || []).push(f); }, getElementById: () => null, querySelector: () => null };
    const store = o => ({ getItem: k => o[k] || null, setItem: (k, v) => { o[k] = v; } });
    new Function('window', 'document', 'location', 'localStorage', 'sessionStorage', 'setTimeout', 'clearTimeout', g)({ Nursin: {} }, doc, { pathname: '/cardio.html' }, store(L), store(ss), () => 0, () => 0);
    return { cls, fire: (n, detail) => (ev[n] || []).forEach(f => f({ detail })) };
  }
  const out = run(false); assert.ok(out.cls.has('gl-out') && out.cls.has('gl-lock'), 'signed out: locked');
  out.fire('nursin:auth', { signedIn: true }); assert.ok(!out.cls.has('gl-out') && !out.cls.has('gl-lock'), 'sign-in unlocks without reload');
  const inn = run(true); assert.ok(!inn.cls.has('gl-out') && !inn.cls.has('gl-lock'), 'signed in: no change');
  inn.fire('nursin:auth', { signedIn: false }); assert.ok(inn.cls.has('gl-lock'), 'stale local sign-in hint: locks once Firebase says signed out');
  const ad = run(false, true); assert.ok(ad.cls.has('gl-out') && !ad.cls.has('gl-lock'), 'ad unlock opens this page, nav still shows 🔒');
  // texts that promised free access are gone
  assert.ok(!read('assets/fb.js').includes('ما في داعي تسجّل') && !read('assets/nav.js').includes('شغّالين بلا تسجيل'));
});

test('🔒 tutor lock + 🎯 one-tap weak points + ✅ today\'s goals (Oct 26, 12:28–12:37 PM)', () => {
  const g = read('assets/gate.js'), css = read('assets/style.css'), t = read('assets/tutor.js'), pr = read('assets/practice.js');
  // tutor: locked signed-out, Google only (no ad unlock), endpoint only when signed in, 🔒 on the 🤖 tab + home card
  assert.ok(g.includes('"tutor.html": 1') && g.includes('🔒 الأستاذ المساعد مقفول — سجّل دخول بغوغل لتحكي معه'));
  const tc = g.slice(g.indexOf('if (kind === "t")'), g.indexOf('return c;', g.indexOf('if (kind === "t")')));
  assert.ok(tc.includes('glk-go') && !tc.includes('glk-ad'), 'tutor card: Google button only');
  assert.ok(g.includes('!TUTOR[page] ? adUntil()'), 'no ad unlock for the tutor');
  assert.ok(css.includes('html.gl-lock .tchat{display:none!important}') && css.includes('html.gl-out .gnav a.gt[href="tutor.html"] .gn::after') && css.includes('html.gl-out .hg a.hgh[href="tutor.html"] h2::after'));
  assert.ok(/function post\(lv\)\{\s*if\(!signedIn\(\)\)return Promise\.reject/.test(t) && t.includes('if(!signedIn()){var lc='), 'tutor endpoint only when signed in');
  assert.ok(pr.includes('NursinGate && !w.NursinGate.signedIn) return Promise.reject'), '✨ صحّحلي only when signed in');
  assert.ok(t.includes('BONUS') && t.includes('adScreen'), 'in-chat +5 ad unlock for signed-in users stays');
  // gate logic on tutor.html with a fake DOM: signed out → locked even with an ad unlock entry; sign-in → open
  function run(me, ad) {
    const cls = new Set(), L = {}, ev = {}, ss = {};
    if (me) L.nursin_me_v1 = JSON.stringify({ name: 'x' });
    if (ad) ss.nursin_adunlock_v1 = JSON.stringify({ 'tutor.html': Date.now() + 1e6 });
    const html = { classList: { toggle: (c, on) => on ? cls.add(c) : cls.delete(c), contains: c => cls.has(c), add: c => cls.add(c), remove: c => cls.delete(c) } };
    const doc = { documentElement: html, readyState: 'loading', addEventListener: (n, f) => { (ev[n] = ev[n] || []).push(f); }, getElementById: () => null, querySelector: () => null };
    const store = o => ({ getItem: k => o[k] || null, setItem: (k, v) => { o[k] = v; } });
    new Function('window', 'document', 'location', 'localStorage', 'sessionStorage', 'setTimeout', 'clearTimeout', g)({ Nursin: {} }, doc, { pathname: '/tutor.html' }, store(L), store(ss), () => 0, () => 0);
    return { cls, fire: (n, detail) => (ev[n] || []).forEach(f => f({ detail })) };
  }
  const o = run(false, true); assert.ok(o.cls.has('gl-lock'), 'tutor locked signed out, ad unlock ignored');
  o.fire('nursin:auth', { signedIn: true }); assert.ok(!o.cls.has('gl-lock') && !o.cls.has('gl-out'), 'sign-in unlocks the tutor without reload');
  assert.ok(!run(true).cls.has('gl-lock'), 'signed in: tutor unchanged');
  // weak points: list stays, one tap starts the weak quiz, no delete
  const wk = read('assets/weak.js');
  assert.ok(wk.includes('🎯 ابدأ كويز نقاط ضعفي') && wk.includes('quiz.html?t=weak') && wk.includes("go('weak',e)") && wk.includes('wcount'));
  assert.ok(!wk.includes('data-reset') && !wk.includes('امحي نقاط ضعفي'), 'no delete step');
  assert.ok(wk.includes('ما في أخطاء لهلّق') && /streak>=GRAD/.test(wk) && /GRAD=2/.test(wk), 'empty text + 2-in-a-row rule kept');
  assert.ok(read('assets/quiz.js').includes('start:function(sel,n){start(sel,n||0,true);}'));
  // goals: on every page, pure build() from existing data, done marks per day
  for (const p of pages.concat(['admin.html', 'chat.html'])) assert.ok(read(p).includes('<script src="assets/goals.js?v=20261026z" defer></script>'), p + ' has goals.js');
  const G = require(path.join(SITE, 'assets/goals.js'));
  const b = G.build({ weak: 3, exams: [{ id: '2026-10-26-ecg', n: 'ECG + Arythmies' }, { id: '2026-10-26-ic', n: 'IC' }], st: { '2026-10-26-ic': { s: 'done' } }, classes: { list: [{ name: 'LT', mine: null, week: { n: 15 }, dq: { mine: null } }] }, done: { weak: 1 } });
  assert.deepStrictEqual(b.map(x => [x.e, x.href, x.done]), [['🎯', 'quiz.html?t=weak', true], ['📅', 'quiz.html?exam=2026-10-26-ecg', false], ['📅', 'quiz.html?exam=2026-10-26-ic', true], ['🏫', 'classes.html', false], ['❓', 'classes.html#cdq', false], ['⏱️', 'index.html#study', false], ['🎮', 'games.html', false]]);
  assert.ok(b[1].n === 'امتحان اليوم: ECG + Arythmies');
  const f = G.build({ weak: 0, exams: [], done: {} }); assert.deepStrictEqual(f.map(x => [x.n, x.href]), [['كويز ١٠ أسئلة', 'quiz.html?t=all&n=10'], ['جولة بومودورو وحدة (٢٥ دقيقة)', 'index.html#study'], ['العب لعبة وحدة', 'games.html']], 'fallback when nothing else (+ ⏱️ and 🎮 every day, Oct 26 7:41 PM)');
  assert.strictEqual(G.build({ weak: 0, exams: [], done: {} }).filter(x => x.k === 'weak').length, 0, 'no weak goal without weak points');
  const gs = read('assets/goals.js');
  assert.ok(gs.includes('nursin_goals_v1') && gs.includes('nursin:quiz-done') && gs.includes('أهدافك اليوم') && gs.includes('tutorStatus') && gs.includes('tutorSummary') && gs.includes('glk-go'), 'per-day done marks, existing data, sign-in when signed out');
  assert.ok(!/fetch\(/.test(gs.slice(0, gs.indexOf('/* ---- 🔔 goal reminders'))), 'goals list itself uses no new backend');
  assert.ok(css.includes('.gopill{') && css.includes('.goi .gotick'));
});

test('✅ goals read the REAL answers: «سؤال اليوم» / class exam / exams / weak quiz (Oct 26, 12:55 PM fix)', () => {
  const G = require(path.join(SITE, 'assets/goals.js'));
  // answered «سؤال اليوم» in ANY class → ticked (was: every class, and only a tap mark)
  const two = { list: [{ cid: 'A1', name: 'LT', mine: null, dq: { mine: null } }, { cid: 'B2', name: 'LT2', mine: { score: 9, total: 10 }, dq: { mine: 'ok' } }] };
  const b = G.build({ weak: 0, exams: [], classes: two, done: {} });
  const dq = b.find(x => x.k === 'dq'); assert.ok(dq && dq.done, 'dq done from the answer doc in one class');
  assert.strictEqual(dq.href, 'classes.html?c=B2#cdq');
  assert.deepStrictEqual(b.filter(x => x.e === '🏫').map(x => [x.k, x.href, x.done]), [['cls:A1', 'classes.html?c=A1', false], ['cls:B2', 'classes.html?c=B2', true]], 'class exam done from the result doc');
  const none = G.build({ weak: 0, exams: [], classes: { list: [{ cid: 'A1', name: 'LT', mine: null, dq: { mine: null } }] }, done: {} });
  assert.ok(!none.find(x => x.k === 'dq').done && none.find(x => x.k === 'dq').href === 'classes.html?c=A1#cdq', 'not answered → not ticked, tap opens that class');
  // a mark written on classes.html counts even before the Firebase read lands
  assert.ok(G.build({ weak: 0, exams: [], classes: null, done: { dq: 1, 'cls:A1': 1 } }).find(x => x.k === 'dq').done, 'dq mark alone shows the goal ticked');
  assert.ok(G.build({ weak: 0, exams: [], classes: { list: [{ cid: 'A1', name: 'LT', mine: null, dq: { mine: null } }] }, done: { 'cls:A1': 1 } }).find(x => x.k === 'cls:A1').done);
  // weak quiz finished today (weak store) / exam started or done (examResults/examStarts)
  assert.ok(G.build({ weak: 2, weakRan: true, exams: [], done: {} })[0].done, 'weak done from the weak store');
  assert.ok(G.build({ weak: 0, weakRan: true, exams: [], done: {} }).some(x => x.k === 'weak' && x.done), 'weak goal stays (ticked) after the quiz cleared them');
  const ex = G.build({ weak: 0, exams: [{ id: 'e1', n: 'IC' }], st: { e1: { s: 'done' } }, done: {} }); assert.ok(ex[0].done);
  // sources wired
  const c = read('assets/classes.js'), gs = read('assets/goals.js'), wk = read('assets/weak.js'), qz = read('assets/quiz.js');
  assert.ok(c.includes('export async function goalsStatus') && c.includes('"dq", dk + "_" + uid') && c.includes('"results", wk + "_" + uid'), 'goalsStatus reads dq/{day}_{uid} and results/{wk}_{uid}');
  assert.ok(/if \(mine\) \{\n    goalDone\("dq"\);/.test(c) && (c.match(/goalDone\("cls:" \+ C\.cid\)/g) || []).length === 2, 'classes.html marks dq / class exam the moment it is saved or shown');
  assert.ok(gs.includes('m.goalsStatus ? m.goalsStatus(A)') && gs.includes('fetchLive(!live || Date.now() - live.at > 5e3)') && gs.includes('nursin:goal-done') && gs.includes('stale: stale'), 're-read on open, marks from classes');
  assert.ok(wk.includes('ran:function()') && wk.includes('ranAt:function()') && qz.includes("if(s.sel==='weak'&&W&&W.ran)W.ran();"), 'weak store remembers the finished weak quiz');
});

test('🗑️ delete a class (Oct 26): admin deletes ANY class, owner his own, confirm, batch delete of the sub-docs, members drop a missing class, leave stays, rules v10', async () => {
  const C = await import(require('node:url').pathToFileURL(path.join(SITE, 'assets/classes.js')).href);
  const adm = { uid: 'A', email: 'abdullahjaber1452003@gmail.com', emailVerified: true };
  assert.ok(C.isAdminUser(adm) && !C.isAdminUser({ ...adm, emailVerified: false }) && !C.isAdminUser({ uid: 'F', email: 'abdullahjaber1452003@gmail.co', emailVerified: true }) && !C.isAdminUser(null), 'admin = his verified Gmail only');
  assert.ok(C.canDeleteClass(adm, { owner: 'X' }) && C.canDeleteClass({ uid: 'O', email: 'o@x.com', emailVerified: true }, { owner: 'O' }) && !C.canDeleteClass({ uid: 'M', email: 'm@x.com', emailVerified: true }, { owner: 'O' }), 'admin any class, owner his own, member no');
  assert.deepStrictEqual(C.chunks([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.strictEqual(C.DEL_SUBS[C.DEL_SUBS.length - 1], 'members', 'members deleted last');
  // deleteClass against a fake Firestore: every sub-doc, then code + class together, then my list entry
  const store = { 'classes/C1': { owner: 'O', code: 'AAAAAA' }, 'classCodes/AAAAAA': { cid: 'C1' }, 'classes/C1/weeks/w': {}, 'classes/C1/results/r1': {}, 'classes/C1/results/r2': {}, 'classes/C1/dq/d1': {}, 'classes/C1/starts/s1': {}, 'classes/C1/members/O': {}, 'classes/C1/members/M': {}, 'users/O/myClasses/C1': {}, 'users/M/myClasses/C1': {} };
  const ref = p => ({ path: p, id: p.split('/').pop(), parent: { id: p.split('/').slice(-2, -1)[0] } }), commits = [];
  const fs = { collection: (db, ...s) => s.join('/'), doc: (db, ...s) => ref(s.join('/')),
    getDocs: async col => ({ docs: Object.keys(store).filter(k => k.startsWith(col + '/') && k.split('/').length === col.split('/').length + 1).map(k => ({ ref: ref(k) })) }),
    getDoc: async r => ({ exists: () => r.path in store, data: () => store[r.path] }),
    deleteDoc: async r => { delete store[r.path]; },
    writeBatch: () => { const ops = []; return { delete: r => ops.push(r.path), commit: async () => { commits.push(ops.slice()); ops.forEach(p => delete store[p]); } }; } };
  const n = await C.deleteClass('C1', store['classes/C1'], { fs, db: {}, user: { uid: 'O' } });
  assert.strictEqual(n, 7, 'all sub-docs deleted');
  assert.deepStrictEqual(Object.keys(store), ['users/M/myClasses/C1'], 'only the other member\'s own list entry stays (his page drops it)');
  assert.deepStrictEqual(commits[commits.length - 1].sort(), ['classCodes/AAAAAA', 'classes/C1'], 'code + class in the final batch');
  assert.deepStrictEqual(commits[0].slice(-2), ['classes/C1/members/M', 'classes/C1/members/O'], 'my own member doc last');
  const js = read('assets/classes.js');
  assert.ok(js.includes('🗑️ احذف الصف') && js.includes('متأكد؟ رح ينحذف الصف لكل الأعضاء') && js.includes('confirm(DEL_CONFIRM'), 'button + confirm');
  assert.ok(js.includes('لازم تنشر القواعد الجديدة') && js.includes('isAdminUser(A.user) ? RULES_MSG'), 'admin hears the rules note until v10 is published');
  assert.ok(js.includes('🛡️ كل الصفوف') && js.includes('F.query(F.collection(A.db, "classes")'), 'admin list of every class');
  assert.ok(js.includes('🚪 اطلع من الصف') && js.includes('async function leave()'), 'members can still leave');
  assert.ok(js.includes('.then(x => !x.exists(), e => denied(e))') && js.includes('if (dq === "x" && r === "x") return null;'), 'a deleted class drops out of members\' lists + goals quietly');
  const rules = read('firestore.rules');
  assert.ok(rules.includes('// v10 = v9') && rules.includes("allow delete: if isAnnOwner() || (signedIn() && resource.data.owner == request.auth.uid);") && rules.includes('!existsAfter(classPath(resource.data.cid))'), 'rules v10: admin + owner delete');
  assert.strictEqual((rules.match(/allow read: if isMember\(cid\) \|\| isAnnOwner\(\);/g) || []).length, 5, 'admin reads members/weeks/starts/results/dq to delete them');
  assert.ok(/request\.auth\.token\.email == 'abdullahjaber1452003@gmail\.com' && request\.auth\.token\.email_verified == true/.test(rules), 'admin by verified email token');
});

test('🏫 «عندك كود صف؟» after sign-in (Oct 26, 1:59 PM): any class code, uses the class join, dismiss remembered, one card at a time, no ads', async () => {
  const C = await import(require('node:url').pathToFileURL(path.join(SITE, 'assets/classes.js')).href);
  const store = { 'classCodes/K7Q2MX': { cid: 'C9', name: 'TS' }, 'users/U/myClasses/OLD': { name: 'LT' } }, txs = [];
  const ref = p => ({ path: p, id: p.split('/').pop() });
  const fs = { collection: (db, ...s) => s.join('/'), doc: (db, ...s) => ref(s.join('/')), serverTimestamp: () => 'ts',
    getDoc: async r => ({ exists: () => r.path in store, data: () => store[r.path] }),
    getDocs: async col => ({ docs: Object.keys(store).filter(k => k.startsWith(col + '/') && k.split('/').length === col.split('/').length + 1).map(k => ({ id: k.split('/').pop() })) }),
    runTransaction: async (db, fn) => fn({ set: (r, v) => { txs.push(r.path); store[r.path] = v; } }) };
  const N = { normCode: s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, ''), cleanName: s => s || 'طالب', level: () => 3 };
  const api = { fs, db: {}, N, user: { uid: 'U', displayName: 'Ali' }, profile: { name: 'Ali', points: 10 } };
  assert.strictEqual(await C.myClassCount(api), 1);
  assert.strictEqual(await C.myClassCount({ ...api, user: null }), null);
  assert.deepStrictEqual(await C.joinWithCode(api, 'k7q-2mx'), { cid: 'C9', name: 'TS' }, 'any class code (TS here), normalised');
  assert.deepStrictEqual(txs.sort(), ['classes/C9/members/U', 'users/U/myClasses/C9'], 'same two writes as the class page join (no new rules)');
  assert.strictEqual(store['classes/C9/members/U'].code, 'K7Q2MX');
  assert.ok((await C.joinWithCode(api, 'K7Q2MX')).already, 'already in → just opens it');
  assert.ok((await C.joinWithCode(api, 'ABC')).err.includes('٦'), 'short code');
  assert.ok((await C.joinWithCode(api, 'ZZZZZZ')).err.includes('ما في صف'), 'unknown code');
  const js = read('assets/classes.js');
  assert.ok(js.includes('const r = await joinWithCode(A, raw,'), 'classes.html join uses the same function');
  const nav = read('assets/nav.js');
  assert.ok(nav.includes('🏫 عندك كود صف؟') && nav.includes('فوت عالصف') && nav.includes('ما عندي / بعدين') && nav.includes('nursin_classcode_v1'), 'card text + dismiss key');
  assert.ok(nav.includes('m.joinWithCode(A, inp.value)') && nav.includes('m.myClassCount(A)') && nav.includes('return k === 0;'), 'joins with the existing logic, only for students in no class');
  assert.ok(nav.includes('classStep(function () { if (need) step2(need, total);'), 'after Google sign-in, before the 🔔 step');
  assert.ok(nav.includes('page === "classes.html"'), 'not on classes.html (the join form is there)');
  const i = nav.indexOf('function classCard'), body = nav.slice(i, nav.indexOf('function classStep'));
  assert.ok(body.includes('shell(1, 1,') && !/adsbygoogle|bauval|\badx\b|ad-slot/.test(body), 'one card (shell replaces any other), no ads');
  assert.ok(read('assets/style.css').includes('.obccin{'));
});

test('✍️ «عبّي الفراغ» for EVERY subject (Oct 26, Abdullah 2:06 PM): 6–8 per subject from the site’s own lessons/explanations, choice + typed, picker with every subject + 🎲 كل المواد; «كويز متل الصف» stays law-only', () => {
  const w = {}; new Function('window', read('assets/quiz-data.js'))(w); new Function('window', read('assets/blanks-data.js'))(w);
  const doc = { readyState: 'complete', querySelectorAll: () => [], getElementById: () => null, addEventListener() {} };
  new Function('window', 'document', 'location', read('assets/practice.js'))(w, doc, { hash: '' });
  const P = w.NursinPractice, find = id => w.BLANKS.find(b => b.id === id);
  assert.strictEqual(new Set(w.BLANKS.map(b => b.id)).size, w.BLANKS.length, 'unique ids');
  assert.ok(w.BLANKS.every(b => w.QTOP[b.t] && b.s.split('___').length === 2 && b.a && (b.o ? b.o.includes(b.a) && !b.alts : Array.isArray(b.alts))), 'known topic, one blank, choice or typed');
  const by = {}; w.BLANKS.forEach(b => (by[P.subjOf(b.t)] = by[P.subjOf(b.t)] || []).push(b));
  for (const s of ['cardio', 'neuro', 'henderson', 'anatomy']) {
    const L = by[s] || []; assert.ok(L.length >= 6 && L.length <= 8, s + ' has 6–8');
    assert.ok(L.some(b => b.o) && L.some(b => !b.o), s + ' mixes pick-the-word and typed');
  }
  assert.ok(by.law.length >= 15, 'law items kept');
  assert.strictEqual(P.subjOf('heart'), 'anatomy'); assert.strictEqual(P.subjOf('infarctus'), 'cardio'); assert.strictEqual(P.subjOf('glasgow'), 'neuro');
  // every answer is a term already on the site (quiz bank + lesson pages), nothing invented
  const site = read('assets/quiz-data.js') + read('assets/mgmt-data.js') + read('assets/quality-data.js') + read('assets/pharma-data.js') + ['cardio.html', 'neuro.html', 'henderson.html', '3d.html'].map(read).join('');
  for (const b of w.BLANKS.filter(b => b.t !== 'law')) assert.ok(site.includes(b.a.replace(/\s*\(.*?\)/g, '').trim()), b.id + ' answer comes from the site');
  // picker: every subject + 🎲 mixed
  const S = P.subjects().map(s => s[0]); assert.deepStrictEqual(S.slice(0, 5), ['cardio', 'neuro', 'henderson', 'anatomy', 'law']);
  const el = { innerHTML: '', querySelectorAll: () => [] }; P.picker(el);
  assert.ok(el.innerHTML.includes('data-bs="all"') && el.innerHTML.includes('🎲 كل المواد') && S.every(k => el.innerHTML.includes('data-bs="' + k + '"')));
  assert.ok(!/adsbygoogle|adx|bauval/.test(el.innerHTML), 'no ads in the picker');
  assert.strictEqual(P.pickFor('anatomy').length, by.anatomy.length); assert.ok(P.pickFor('all').length === 15 && new Set(P.pickFor('all').map(b => P.subjOf(b.t))).size >= 1);
  // forgiving typing, French accents too
  assert.ok(P.okTyped('diabete insipide', find('b29')) && P.okTyped('السكري الكاذب', find('b29')) && P.okTyped('8', find('b25')) && P.okTyped('retention', find('b35')) && P.okTyped('troponin', find('b16')) && P.okTyped('المخيخ', find('b45')));
  assert.ok(!P.okTyped('frontal', find('b45')) && P.norm('Rétention') === P.norm('retention') && P.norm('الإشراف') === P.norm('اشراف'));
  const q = read('quiz.html');
  assert.ok(q.includes('data-pm="blanks" data-t="pick"') && q.includes('data-pm="class" data-lesson="l1">⚖️ كويز متل الصف (القانون)'), 'quiz page: blanks opens the subject picker, class quiz stays law');
  assert.ok(read('law.html').includes('data-practice="blanks" data-t="law"'), 'law page keeps its own law blanks');
  assert.ok(read('assets/style.css').includes('.bpicks{'));
});

test('🏢 الإدارة (Oct 26, his handwritten pages): lessons from a data list, Maslow pyramid + org-chart tree, 16 quiz Qs, 12 fill-blanks, listed everywhere law is; no «كويز متل الصف»', () => {
  const h = read('mgmt.html');
  assert.ok(h.includes('id="mgmtlessons"') && h.includes('data-practice="blanks" data-t="mgmt"') && h.includes('quiz.html?t=mgmt'));
  assert.ok(!h.includes('data-practice="class"') && !h.includes('كويز متل الصف'), 'class-style quiz stays law-only');
  for (const s of ['mgmt-data.js', 'blanks-data.js', 'mgmt.js', 'practice.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261026z'), s);
  assert.ok(h.indexOf('assets/mgmt.js') < h.indexOf('assets/practice.js'));
  assert.ok(h.indexOf('class="adx adx-box"') > h.indexOf('id="blanks"') && h.indexOf('class="adx adx-top"') < h.indexOf('id="lessons"'), 'ads only above/below, none inside lessons or quizzes');
  const w = {}; new Function('window', read('assets/mgmt-data.js'))(w);
  const [m1, m2] = w.MGMT.lessons;
  assert.strictEqual(m1.k, 'm1'); assert.strictEqual(m2.k, 'm2');
  for (const s of ['خصائص الدوافع', 'إستنباطه', 'إزدياد في قوة', 'هرم Maslow', 'الحاجة إلى إثبات الذات', 'الحاجة إلى الإحترام', 'الحاجة إلى العلاقات', 'الحاجة للأمان', 'الحاجات الفيزيولوجية', 'Self-actualization', 'Physiological']) assert.ok(m1.html.includes(s), s);
  assert.strictEqual((m1.html.match(/class="mpl mpl\d"/g) || []).length, 5, 'visual pyramid, 5 levels');
  assert.ok(m1.html.indexOf('mpl5') < m1.html.indexOf('mpl1'), 'top of the pyramid first');
  for (const s of ['مجلس الإدارة', 'المدير', 'دائرة الجودة', 'دائرة التسويق والعلاقات العامة', 'الدائرة التمريضية', 'الدائرة الطبية', 'دائرة الموارد البشرية HR', 'دائرة الصيانة', 'الدائرة الإدارية', 'الدائرة المالية', 'القسم المالي', 'قسم التدقيق', 'القسم الحسابي', 'الفوترة', 'الدخول', 'الصندوق', 'أمين الصندوق', 'مساعد أمين الصندوق', 'علاقة توجيهية', 'علاقة تنسيقية', 'بين <b>رئيس قسم</b> و<b>رئيس قسم آخر</b>', 'إقتراحات']) assert.ok(m2.html.includes(s), s);
  assert.ok(m2.html.includes('class="otree"') && (m2.html.match(/<ul>/g) || []).length >= 6, 'org chart as a nested tree');
  new Function('window', read('assets/quiz-data.js'))(w);
  const mq = w.QUIZ.filter(q => q.t === 'mgmt');
  assert.strictEqual(mq.length, 16); assert.deepStrictEqual(w.QGROUPS.mgmt, ['mgmt']); assert.ok(w.QTOP.mgmt.startsWith('الإدارة'));
  const ans = [0, 1, 2].map(a => mq.filter(q => q.a === a).length); assert.ok(Math.min(...ans) >= 4, 'answers spread ' + ans);
  for (const q of mq) { assert.strictEqual(q.o.length, 3); assert.ok(q.x.length > 10); }
  assert.strictEqual(new Set(w.QUIZ.map(q => q.id)).size, w.QUIZ.length, 'unique ids');
  new Function('window', read('assets/blanks-data.js'))(w);
  const mb = w.BLANKS.filter(b => b.t === 'mgmt');
  assert.strictEqual(mb.length, 12); assert.ok(mb.filter(b => b.o).length >= 5 && mb.filter(b => !b.o).length >= 5, 'pick + typed');
  for (const b of mb) assert.ok(read('assets/mgmt-data.js').includes(b.a), b.id + ' answer is in his lesson');
  assert.ok(read('assets/practice.js').includes('["mgmt", "🏢", "الإدارة"]'), 'in the all-subjects fill-blank picker');
  assert.ok(read('assets/nav.js').includes('["mgmt.html", "🏢"') && read('assets/nav.js').includes('"mgmt.html": "🏢 الإدارة"'), 'in 📚 الدروس');
  assert.ok(read('index.html').includes('href="mgmt.html"') && read('quiz.html').includes('data-set="mgmt"'));
  assert.ok(read('assets/quiz.js').includes("'mgmt.html'") && read('assets/weak.js').includes("'mgmt.html'") && read('assets/classes.js').includes('"mgmt.html"'));
  assert.ok(read('assets/live.js').includes('["mgmt", "🏢 الإدارة"]') && read('assets/tutor.js').includes("mgmt:'mgmt.html'") && read('assets/admin.js').includes('/mgmt.html'));
  assert.ok(read('assets/gate.js').includes('"mgmt.html": 1') && read('sitemap.xml').includes('https://nursin.store/mgmt.html'));
  assert.ok(read('assets/style.css').includes('.mpyr{') && read('assets/style.css').includes('.otree{'));
});

test('✅ الجودة والاعتماد + 💊 الأدوية (Oct 26, from his teacher\'s PDFs): 9 quality lessons + 55 drug cards, 12 Qs + 8 fill-blanks each, listed everywhere mgmt is; no «كويز متل الصف»', () => {
  const w = {};
  new Function('window', read('assets/quality-data.js'))(w); new Function('window', read('assets/pharma-data.js'))(w);
  new Function('window', read('assets/quiz-data.js'))(w); new Function('window', read('assets/blanks-data.js'))(w);
  const L = w.QUALITY.lessons;
  assert.strictEqual(L.length, 9); assert.deepStrictEqual(L.map(l => l.k), ['q1','q2','q3','q4','q5','q6','q7','q8','q9']);
  for (const s of ['مفاهيم الجودة', 'الأساليب والأدوات لتحسين الجودة', 'خطة تحسين الجودة', 'مؤشرات الأداء', 'السياسات والإجراءات', 'الوصف الوظيفي', 'إدارة المخاطر وسلامة المريض', 'الاعتماد ومعاييره', 'الملف الطبي']) assert.ok(L.some(l => l.n.includes(s)), s);
  const all = L.map(l => l.html).join('');
  for (const s of ['Donabedian', 'فلسفة جوران', 'كروسبي', 'خطط Plan', 'هيكل السمكة', 'Pareto', 'SWOT', 'SMART', 'RCA', 'تقييم طوعي', 'الوثيقة الاستشفائية الأهم']) assert.ok(all.includes(s), s);
  assert.ok(!/(^|[\s(])(اال|األ|اإل)/.test(all), 'no broken lam-alef from the PDF text');
  const P = w.PHARMA;
  assert.strictEqual(P.drugs.length, 55); assert.strictEqual(new Set(P.drugs.map(d => d.p)).size, 55);
  for (const d of P.drugs) { assert.ok(d.n.length && P.groups.some(g => g.k === d.g), d.p); assert.ok(d.ind.length + d.eff.length > 0, 'drug ' + d.p + ' has content'); }
  for (const n of ['Actilyse', 'Amikin', 'Lasix', 'Héparine', 'Lovenox', 'Ventoline', 'Zyloric']) assert.ok(P.drugs.some(d => d.n.includes(n)), n);
  for (const [t, page, data] of [['quality', 'quality.html', 'quality-data.js'], ['pharma', 'pharma.html', 'pharma-data.js']]) {
    const h = read(page);
    assert.ok(h.includes('data-practice="blanks" data-t="' + t + '"') && h.includes('quiz.html?t=' + t) && !h.includes('كويز متل الصف'), page);
    for (const s of [data, 'blanks-data.js', t + '.js', 'practice.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261026z'), page + ' ' + s);
    assert.ok(h.indexOf('class="adx adx-box"') > h.indexOf('id="blanks"') && h.indexOf('class="adx adx-top"') < h.indexOf('id="lessons"'), page + ': no ads inside lessons/quizzes');
    const q = w.QUIZ.filter(x => x.t === t); assert.strictEqual(q.length, { quality: 38, pharma: 39 }[t], t);
    const ans = [0, 1, 2].map(a => q.filter(x => x.a === a).length); assert.ok(Math.min(...ans) >= 4, t + ' answers spread ' + ans);
    for (const x of q) { assert.strictEqual(x.o.length, 3); assert.ok(x.x.length > 10); }
    assert.deepStrictEqual(w.QGROUPS[t], [t]); assert.ok(w.QTOP[t]);
    const b = w.BLANKS.filter(x => x.t === t); assert.strictEqual(b.length, 8, t + ' blanks');
    assert.ok(b.filter(x => x.o).length >= 4 && b.filter(x => !x.o).length >= 4);
    for (const x of b) assert.ok(read('assets/' + data).includes(x.a), x.id + ' answer is in the source');
    assert.ok(read('assets/nav.js').includes('["' + page + '"') && read('assets/gate.js').includes('"' + page + '": 1') && read('sitemap.xml').includes('https://nursin.store/' + page), page + ' nav/gate/sitemap');
    assert.ok(read('index.html').includes('href="' + page + '"') && read('quiz.html').includes('data-set="' + t + '"'), page + ' home + quiz chip');
    assert.ok(read('assets/quiz.js').includes("'" + page + "'") && read('assets/weak.js').includes("'" + page + "'") && read('assets/classes.js').includes('"' + page + '"'));
    assert.ok(read('assets/tutor.js').includes(t + ":'" + page + "'") && read('assets/admin.js').includes('/' + page) && read('assets/live.js').includes('["' + t + '"') && read('assets/practice.js').includes('["' + t + '"'));
  }
  assert.strictEqual(new Set(w.QUIZ.map(q => q.id)).size, w.QUIZ.length); assert.strictEqual(new Set(w.BLANKS.map(b => b.id)).size, w.BLANKS.length);
  assert.ok(read('pharma.html').includes('id="phq"') && read('pharma.html').includes('TS2') && read('assets/pharma.js').includes('data-s='));
});

test('pharma: Actilyse Hypotension = انخفاض الضغط (PDF slip fixed, Abdullah 26 Oct)', () => {
  const d = read('assets/pharma-data.js');
  assert.ok(!d.includes('انخفاض الحرارة'), 'no Hypotension = انخفاض الحرارة left');
  assert.ok(d.includes('"Hypotension","انخفاض الضغط"'), 'Actilyse fixed');
  assert.ok(d.includes('Amiolidipine'), 'Amlor left as in the PDF');
});

test('Monetag site-verification meta tag in index.html head', () => {
  const h = read('index.html');
  const tag = '<meta name="monetag" content="71218b62ec866c526790c5af3e092a78">';
  assert.equal(h.split(tag).length - 1, 1, 'tag exactly once');
  assert.ok(h.indexOf(tag) < h.indexOf('</head>'), 'tag inside <head>');
  assert.ok(!/<script[^>]+monetag/i.test(h), 'no Monetag script tag in the page itself (only the assets/mtag.js loader)');
});

test('💸 Monetag In-Page Push loader (Oct 26): content pages only, 20 s after load, no card on screen, max once / 4 min and 6 / day', () => {
  const vm = require('node:vm');
  const src = read('assets/mtag.js');
  assert.ok(src.includes("s.dataset.zone='12128353',s.src='https://nap5k.com/tag.min.js'"), 'exact tag');
  assert.ok(!/popunder|onclick|multitag|serviceWorker|Notification/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'no popunder / onclick / push code');
  const yes = ['index','cardio','neuro','henderson','law','mgmt','quality','pharma','3d','about','credits','friends'];
  const no = ['quiz','exams','live','tutor','chat','classes','admin','privacy','404'];
  for (const p of yes) assert.equal((read(p + '.html').match(/<script src="assets\/mtag\.js\?v=20261026z" defer><\/script>/g) || []).length, 1, p + ' has the loader once');
  for (const p of no) assert.ok(!read(p + '.html').includes('mtag.js'), p + ' has no loader');
  for (const p of pages.concat('admin.html','chat.html')) assert.ok(!read(p).includes('nap5k.com'), p + ' no tag inline');
  assert.match(read('privacy.html'), /شركاء إعلانيين آخرين/, 'privacy covers other ad partners');
  function run({ path, storage = {}, cards = [], hidden = false, now = Date.UTC(2026, 9, 26, 12) }) {
    const timers = [], added = [];
    const el = () => ({ dataset: {}, src: '' });
    const doc = {
      readyState: 'complete', hidden, body: { appendChild: x => (added.push(x), x) },
      documentElement: { appendChild: x => (added.push(x), x) },
      createElement: el, addEventListener() {}, removeEventListener() {},
      querySelectorAll: () => cards.map(r => ({ getBoundingClientRect: () => r }))
    };
    const ls = { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); } };
    const D = class extends Date { constructor(...a) { a.length ? super(...a) : super(now); } static now() { return now; } };
    const win = { location: { pathname: path }, localStorage: ls, innerWidth: 390, innerHeight: 844, addEventListener() {} };
    vm.runInNewContext(src, { window: win, document: doc, setTimeout: (f, ms) => timers.push([f, ms]), Date: D, JSON });
    return { timers, added, storage, M: win.NursinMtag, fireAll() { timers.forEach(([f]) => f()); } };
  }
  // excluded pages: nothing even scheduled
  for (const p of ['/quiz.html', '/tutor.html', '/chat.html', '/classes.html', '/privacy.html', '/404.html', '/exams.html', '/live.html']) {
    const r = run({ path: p }); assert.equal(r.timers.length, 0, p + ' not scheduled');
  }
  // content page: scheduled at 20 s, injects the exact tag once, records the cap
  for (const p of ['/', '/index.html', '/cardio.html', '/3d', '/friends.html']) {
    const r = run({ path: p });
    assert.equal(r.timers.length, 1, p); assert.ok(r.timers[0][1] >= 20000, '20 s delay');
    r.fireAll();
    assert.equal(r.added.length, 1, p + ' injected once');
    assert.equal(r.added[0].dataset.zone, '12128353'); assert.equal(r.added[0].src, 'https://nap5k.com/tag.min.js');
    assert.equal(JSON.parse(r.storage.nursin_mtag_v1).n, 1);
  }
  // a welcome / lock / class-code card on screen: skip; off screen: fine
  assert.equal((r => (r.fireAll(), r.added.length))(run({ path: '/cardio.html', cards: [{ top: 300, bottom: 500, left: 10, right: 380, width: 370, height: 200 }] })), 0, 'card on screen → skip');
  assert.equal((r => (r.fireAll(), r.added.length))(run({ path: '/cardio.html', cards: [{ top: 3000, bottom: 3200, left: 10, right: 380, width: 370, height: 200 }] })), 1, 'card far below → ok');
  // cap: 4 minutes
  const now = Date.UTC(2026, 9, 26, 12);
  const st = s => ({ nursin_mtag_v1: JSON.stringify(s) });
  const r0 = run({ path: '/' }); const day = r0.M.capMark(null, now).day;
  assert.equal((r => (r.fireAll(), r.added.length))(run({ path: '/', now, storage: st({ last: now - 3 * 60e3, day, n: 1 }) })), 0, '3 min ago → skip');
  assert.equal((r => (r.fireAll(), r.added.length))(run({ path: '/', now, storage: st({ last: now - 4 * 60e3 - 1, day, n: 1 }) })), 1, '4 min ago → show');
  // cap: 6 a day, resets on a new day
  assert.equal((r => (r.fireAll(), r.added.length))(run({ path: '/', now, storage: st({ last: now - 60 * 60e3, day, n: 6 }) })), 0, '6 today → skip');
  assert.equal((r => (r.fireAll(), r.added.length))(run({ path: '/', now, storage: st({ last: now - 60 * 60e3, day, n: 5 }) })), 1, '5 today → show');
  assert.equal((r => (r.fireAll(), r.added.length))(run({ path: '/', now, storage: st({ last: now - 30 * 3600e3, day: 'old', n: 6 }) })), 1, 'new day → show');
  const M = r0.M;
  assert.equal(M.capMark({ last: 1, day: 'old', n: 6 }, now).n, 1, 'count resets on a new day');
  assert.equal(M.capMark({ last: 1, day, n: 2 }, now).n, 3);
});

test('privacy page: short and plain (ar + en), real contact email, no placeholder, no vendor names, AdSense links kept', () => {
  const pv = read('privacy.html');
  const body = pv.slice(pv.indexOf('<main'), pv.indexOf('</main>'));
  assert.ok(body.includes('href="mailto:abdullahjaber1452003@gmail.com"'), 'contact email present');
  assert.ok(!pv.includes('ضع بريدك') && !pv.includes('[your email]'), 'placeholder gone');
  for (const k of ['Firebase', 'Cloudflare', 'Gemini', 'Adsterra', 'Monetag', 'الصورة', 'photo']) assert.ok(!body.includes(k), 'privacy body must not mention ' + k);
  assert.ok(body.includes('https://adssettings.google.com') && body.includes('https://policies.google.com/technologies/ads'), 'Google ad links kept');
  assert.ok(body.includes('نرس ستور') && body.includes('26 تشرين الأول 2026') && body.includes('Last updated: 26 October 2026'), 'intro + dates');
  assert.ok(body.replace(/<[^>]+>/g, '').length < 2600, 'short page');
  assert.ok(pv.includes('ca-pub-2554036492962277') && pv.includes('G-7MY0Z597WC') && pv.includes('name="monetag"'), 'head tags kept');
});

test('📝 مادة ← دروسها (Oct 26): every subject page has a whole-subject quiz button under the title and a quiz button under each lesson; lesson quizzes use only that lesson', () => {
  const w = {}; new Function('window', read('assets/quiz-data.js'))(w);
  const subj = { 'cardio.html': ['cardio', 'القلب'], 'neuro.html': ['neuro', 'الأعصاب'], 'henderson.html': ['henderson', 'Henderson'], 'law.html': ['law', 'القانون'], 'mgmt.html': ['mgmt', 'الإدارة'], 'quality.html': ['quality', 'الجودة والاعتماد'], 'pharma.html': ['pharma', 'الأدوية'] };
  for (const [p, [k, n]] of Object.entries(subj)) {
    const h = read(p), h1 = h.indexOf('</h1>'), b = h.indexOf('<a class="sqz" href="quiz.html?t=' + k + '"><b>📝 كويز بكل مادة ' + n + '</b>');
    assert.ok(b > h1 && b - h1 < 12, p + ' whole-subject button right under the title');
    assert.strictEqual(w.QSUBJ[k], n, p + ' subject name');
    assert.ok(w.QUIZ.filter(q => w.QGROUPS[k].includes(q.t)).length >= 8, p + ' subject has questions');
  }
  // cardio / neuro: one button after every lesson, pointing at that lesson (q.t)
  for (const p of ['cardio.html', 'neuro.html']) {
    const h = read(p), ids = [...h.matchAll(/<details class="topic" id="(\w+)">/g)].map(m => m[1]);
    const btns = [...h.matchAll(/<\/details>\n<p class="lqz"><a href="quiz\.html\?t=(\w+)">📝 كويز على هالدرس<\/a>/g)].map(m => m[1]);
    assert.deepStrictEqual(btns, ids, p + ' a button under each lesson');
    assert.ok(!h.includes('class="quizlink"'), p + ' old in-lesson link replaced');
    for (const t of ids) assert.ok(w.QTOP[t] && w.QGROUPS[subj[p][0]].includes(t), p + ' ' + t);
  }
  assert.ok(w.QUIZ.filter(q => q.t === 'heart').length >= 3 && w.QUIZ.filter(q => q.t === 'brain').length >= 3, 'anatomy lessons have their own questions');
  const hd = read('henderson.html');
  assert.ok(hd.includes('href="quiz.html?t=henderson&amp;l=h1">📝 كويز على هالدرس') && hd.includes('href="quiz.html?t=henderson&amp;l=h2">📝 كويز على هالدرس'), 'henderson two lessons');
  // rendered lesson pages: lq() after every lesson, keys exist in the data files
  const data = { law: ['law-data.js', 'LAW'], mgmt: ['mgmt-data.js', 'MGMT'], quality: ['quality-data.js', 'QUALITY'], pharma: ['pharma-data.js', 'PHARMA'] };
  for (const [k, [f, v]] of Object.entries(data)) {
    assert.ok(read('assets/' + k + '.js').includes("+ lq(\"" + k + "\", "), k + ' renderer adds the lesson button');
    new Function('window', read('assets/' + f))(w);
    const keys = (w[v].lessons || w[v].groups).map(x => x.k);
    assert.deepStrictEqual(Object.keys(w.QLES[k]).sort(), keys.slice().sort(), k + ' QLES = lessons');
    for (const q of w.QUIZ.filter(q => q.t === k)) assert.ok(keys.includes(q.l), k + ' ' + q.id + ' tagged with a real lesson');
  }
  for (const q of w.QUIZ.filter(q => q.t === 'henderson')) assert.ok(['h1', 'h2'].includes(q.l), q.id);
  // engine: lesson filter + graceful fallback under 3 questions
  const qj = read('assets/quiz.js');
  assert.ok(qj.includes('q.l===les') && qj.includes("p.l||''") && qj.includes('ما في أسئلة كافية لهالدرس بعد') && qj.includes('qs.length<3&&isLesson(sel,les)'), 'quiz.js lesson pool + fallback');
  assert.ok(qj.includes("'كل مادة '+QS[sel]") && qj.includes("'درس: '+"), 'labels: مادة / درس');
  // naming: subjects are «المواد», their parts «دروس»
  assert.ok(read('assets/nav.js').includes('{ k: "learn", e: "📚", n: "المواد",') && read('index.html').includes('<h2>المواد <span'), 'nav + home say المواد');
  assert.ok(read('quiz.html').includes('data-set="cardio">❤️ مادة القلب</button>'), 'quiz picker');
});

test('🎮 games page (Oct 26, 6:04 PM): 3 games from the site\'s own quiz bank + drug cards, subject picker, points + 🔥, in nav/home/sitemap, no ads', () => {
  const g = read('games.html');
  for (const k of ['id="gpick"', 'data-g="match"', 'data-g="tf"', 'data-g="mem"', 'id="garea"', 'id="wkch"']) assert.ok(g.includes(k), 'games.html ' + k);
  for (const s of ['quiz-data.js', 'pharma-data.js', 'games.js', 'study.js', 'account.js', 'nav.js']) assert.ok(g.includes('assets/' + s + '?v=20261026z'), 'games.html loads ' + s);
  assert.ok(!/bauval|ads\.js|mtag\.js|class="adx/.test(g), 'no ad units inside the games page');
  const gj = read('assets/games.js'), sj = read('assets/study.js');
  assert.ok(!/bauval|adsbygoogle|adx|nap5k/.test(gj + sj), 'no ads in games / timer / challenge code');
  assert.ok(read('sitemap.xml').includes('https://nursin.store/games.html'), 'sitemap');
  assert.ok(read('assets/nav.js').includes('["games.html", "🎮", "ألعاب"'), 'nav item under التمارين');
  assert.ok(read('index.html').includes('href="games.html"'), 'home links the games');
  const vm = require('node:vm'); const ctx = { window: {} }; vm.createContext(ctx);
  for (const f of ['assets/quiz-data.js', 'assets/pharma-data.js', 'assets/games.js']) vm.runInContext(read(f), ctx);
  const G = ctx.window.NursinGames, src = read('assets/quiz-data.js') + read('assets/pharma-data.js');
  const strip = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const terms = G.terms('all');
  assert.ok(terms.length >= 40, 'enough term pairs: ' + terms.length);
  for (const p of terms) assert.ok(src.includes(p.a) && src.includes(p.b), 'pair from the site content: ' + p.a + ' ↔ ' + p.b);
  for (const s of ['all', 'cardio', 'neuro', 'henderson', 'law', 'mgmt', 'quality', 'pharma'])
    for (const k of ['match', 'tf', 'mem']) assert.ok(G.enough(k, s), k + ' playable on ' + s);
  const mem = G.memPairs('pharma'); assert.ok(mem.length >= 6 && mem.every(p => p.drug), 'pharma memory = drug ↔ its use');
  const QZ = ctx.window.QUIZ, byQ = {}; QZ.forEach(q => { byQ[strip(q.q)] = q; });
  for (const it of G.tf('all')) { const q = byQ[it.q]; assert.ok(q, 'statement from a real question'); const right = strip(q.o[q.a]); assert.strictEqual(it.right, right); assert.strictEqual(it.ok, it.o === right, 'true = the right option, false = a wrong one'); }
  assert.ok(G.ROUND_MAX === 20 && sj.includes('GAME_CAP = 60'), 'points capped per round and per day');
});
test('🔥 study streak + ⏱️ pomodoro + 🏆 weekly challenge + 🎯 quiz before reading + 🍫 reward (Oct 26, 6:04 PM)', () => {
  const vm = require('node:vm');
  const c1 = { window: {} }; vm.createContext(c1); vm.runInContext(read('assets/study.js'), c1);
  const S = c1.window.NursinStudy, D = '2026-10-26', Y = '2026-10-25';
  let o = S.hit({}, 'quiz', D);
  assert.ok(o.streak === 1 && o.sDay === D && o.badges.fq1 === D && o._new.includes('fq1'), 'a finished quiz counts the day + «أوّل كويز»');
  o = S.hit(o, 'game', D); assert.strictEqual(o.streak, 1, 'a day counts once');
  o = S.hit({ streak: 2, sDay: Y, best: 2 }, 'pomo', D); assert.ok(o.streak === 3 && o.badges.s3 && o.badges.pomo1, 'pomodoro counts + 3 days + first pomodoro');
  o = S.hit({ streak: 5, sDay: '2026-10-20', best: 5 }, 'game', D); assert.ok(o.streak === 1 && o.best === 5, 'missed day → restart, best kept');
  let g = {}; for (let i = 0; i < 10; i++) g = S.hit(g, 'game', D); assert.ok(g.badges.gchamp && S.today(g, D).g === 10, '«بطل الألعاب» after 10 rounds');
  assert.ok(S.POMO_PTS === 5 && S.POMO_CAP === 8 && S.DUR.f === 25 * 60e3 && S.DUR.s === 5 * 60e3 && S.DUR.l === 15 * 60e3, '25 / 5 / 15 min, 5 points, 8 rounds a day');
  const sj = read('assets/study.js');
  for (const k of ['navigator.vibrate', 'AudioContext', 'SET = 4', 'جرّب حالك قبل ما تقرا', 'برافو! خود بريك وكافئ حالك 🍫', 'تحدّي الأسبوع', 'class="prq"'.replace('class="prq"', 'className = "prq"')]) assert.ok(sj.includes(k), 'study.js ' + k);
  const h = read('index.html'); assert.ok(h.includes('<section id="study"') && h.includes('assets/study.js?v=20261026z'), 'home: streak + timer + weekly card');
  for (const p of ['cardio.html', 'neuro.html', 'henderson.html', 'law.html', 'mgmt.html', 'quality.html', 'pharma.html', 'quiz.html']) assert.ok(read(p).includes('assets/study.js?v=20261026z'), p + ' loads study.js');
  // weekly points + badges + «day counts on a finished quiz/game/pomodoro» on the existing profile fields (rules unchanged)
  const c2 = { window: {} }; vm.createContext(c2); vm.runInContext(read('assets/account.js'), c2); const N = c2.window.Nursin;
  assert.strictEqual(N.weekStart('2026-11-01'), '2026-10-26', 'week starts Monday'); assert.strictEqual(N.weekStart('2026-10-26'), '2026-10-26');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(N.weekWrite({ weekKey: '2026-10-19', weekPoints: 50 }, 100, 110, D))), { weekKey: '2026-10-26', weekPoints: 10 }, 'resets each Monday');
  assert.strictEqual(N.weekWrite({ weekKey: '2026-10-26', weekPoints: 10 }, 110, 125, '2026-10-28').weekPoints, 25, 'adds up during the week');
  assert.strictEqual(N.weekPts({ weekKey: '2026-10-19', weekPoints: 99 }, D), 0, 'last week shows 0');
  assert.strictEqual(N.actWrite({}, 0, null, [], D, true).streak, 1, 'forced day (quiz / game / pomodoro) starts a streak');
  assert.ok(!N.actWrite({}, 0, null, [], D).streak, 'without force the 5-answer rule stays');
  for (const id of ['fq1', 's3', 'p100', 'pomo1', 'gchamp']) assert.ok(N.badgeById(id), 'badge ' + id);
  assert.ok(N.actWrite({ points: 120 }, 0, null, [], D, true).badges.p100 === D, '«١٠٠ نقطة»');
  const fb = read('assets/fb.js');
  assert.ok(fb.includes('q.bonus != null') && fb.includes('...N.weekWrite(d, before, points)') && fb.includes('board: () => loadBoard()') && fb.includes('logActivity(q.n | 0, null, q.badges || [], true)'), 'bonus points + week fields + board for the weekly card');
  const rules = read('firestore.rules'), users = rules.slice(rules.indexOf('match /users/{uid}'), rules.indexOf('match /friends/{fid}'));
  assert.ok(!users.includes('hasOnly'), 'users/{uid} accepts the extra fields with the published rules (no rules change needed)');
  const css = read('assets/style.css'), adx = css.indexOf('.adx{');
  for (const k of ['.pomofab{position:fixed', '.pomomini{position:fixed', '.stoast{position:fixed']) assert.ok(css.indexOf(k) > -1 && css.indexOf(k) < adx, k + ' before .adx');
});

test('quality + pharma: every lesson / drug group has ≥4 questions of its own (Abdullah approved Oct 26), ids continue q192–q244', () => {
  const w = {}; new Function('window', read('assets/quiz-data.js'))(w);
  for (const t of ['quality', 'pharma']) {
    for (const k of Object.keys(w.QLES[t])) {
      const q = w.QUIZ.filter(x => x.t === t && x.l === k);
      assert.ok(q.length >= 4, t + ' ' + k + ' has ' + q.length);
      for (const x of q) { assert.strictEqual(x.o.length, 3); assert.ok(x.a >= 0 && x.a <= 2 && x.x.length > 10, x.id); }
    }
  }
  const ids = w.QUIZ.map(q => q.id);
  for (let i = 192; i <= 244; i++) assert.ok(ids.includes('q' + i), 'q' + i);
  assert.ok(read('quality.html').includes('<small>38 سؤال') && read('pharma.html').includes('<small>39 سؤال'), 'whole-subject counts');
});

test('✅ goals: ⏱️ one pomodoro + 🎮 ONE game (not all) required, 📖 new lessons for 2 days, 📅 weekly exams pick up every lesson by themselves, 🎚️ game levels + ⌨️ fill game (Oct 26, 7:41–7:42 PM)', () => {
  const vm = require('node:vm');
  const G = require(path.join(SITE, 'assets/goals.js'));
  // ⏱️ + 🎮 always on the list, done from the real counts (study.js record: tp / tg); one game round is enough
  const g0 = G.build({ weak: 0, exams: [], done: {}, pomo: 0, game: 0 });
  assert.deepStrictEqual(g0.filter(x => x.k === 'pomo' || x.k === 'game').map(x => [x.k, x.done]), [['pomo', false], ['game', false]]);
  const g1 = G.build({ weak: 0, exams: [], done: {}, pomo: 1, game: 1 });
  assert.ok(g1.find(x => x.k === 'pomo').done && g1.find(x => x.k === 'game').done, 'one pomodoro round + ONE game round tick both');
  assert.strictEqual(g1.filter(x => /game|🎮/.test(x.k + x.e)).length, 1, 'a single game goal');
  assert.ok(!g1.some(x => /٣|3|التلات|كل الألعاب/.test(x.n) && x.e === '🎮'), 'never "play the 3 games"');
  const gs = read('assets/goals.js');
  assert.ok(gs.includes('nursin_study_v1') && gs.includes('o.tp') && gs.includes('o.tg') && gs.includes('nursin:study') && gs.includes('nursin:lesson-read'), 'reads the real pomodoro / game counts');
  assert.ok(read('assets/study.js').includes('new CustomEvent("nursin:study")'), 'study.js tells goals when a round counted');
  // 📖 the lesson registry: on every page before account.js, every topic and every lesson listed, documented "added" field
  const lj = read('assets/lessons.js');
  assert.ok(lj.includes('HOW TO ADD A NEW LESSON') && lj.includes("added: 'YYYY-MM-DD'"), 'how to set added is documented');
  for (const p of pages.concat(['admin.html', 'chat.html'])) { const h = read(p); assert.ok(h.includes('<script src="assets/lessons.js?v=20261026z" defer></script><script src="assets/account.js?v=20261026z"'), p + ' loads lessons.js before account.js'); }
  const w = {}; w.window = w; vm.createContext(w);
  for (const f of ['lessons.js', 'quiz-data.js', 'account.js']) vm.runInContext(read('assets/' + f), w);
  const L = w.NursinLessons, N = w.Nursin;
  for (const s in w.QGROUPS) for (const t of w.QGROUPS[s]) if (!w.QLES[s]) assert.ok(L.list.some(x => x.s === s && x.t === t && !x.l), 'registry has topic ' + s + '/' + t);
  for (const s in w.QLES) for (const l in w.QLES[s]) assert.ok(L.list.some(x => x.s === s && x.l === l), 'registry has lesson ' + s + '/' + l);
  assert.strictEqual(L.list.find(x => x.s === 'law' && x.l === 'l2').added, '2026-10-26');
  assert.ok(!L.list.find(x => x.s === 'law' && x.l === 'l1').added && !L.list.find(x => x.t === 'infarctus').added, 'older lessons never show as new');
  // new-lesson goal: shows on the added day and the next, not after; ticks when read
  const one = L.goals('2026-10-26', {}).find(x => x.k === 'new:law:l2');
  assert.ok(one && one.n === 'درس جديد: ' + w.QLES.law.l2 + ' — مرّ عليه واقرأه' && one.href === 'law.html#l2' && !one.done);
  assert.ok(L.goals('2026-10-26', { 'law:l2': 1 }).find(x => x.k === 'new:law:l2').done, 'read → ✅');
  assert.ok(L.goals('2026-10-27', {}).some(x => x.k === 'new:law:l2'), 'still there the next day');
  assert.strictEqual(L.goals('2026-10-28', {}).length, 0, 'gone on day 3');
  // a lesson added "today" (any day) gets its goal on top of today's list
  L.list.push({ s: 'neuro', t: 'zz', n: 'درس تجربة', href: 'neuro.html#zz', added: '2026-11-03' });
  const nl = L.goals('2026-11-03', {}); assert.ok(nl.length === 1 && nl[0].n === 'درس جديد: درس تجربة — مرّ عليه واقرأه');
  assert.strictEqual(G.build({ weak: 0, exams: [], done: {}, newL: nl })[0].k, 'new:neuro:zz', 'new lesson first in the goals');
  L.list.pop();
  // 📅 weekly exams: same 9-unit rotation up to Oct 26 (today never changes), then every lesson key is in the exam pool
  assert.strictEqual(N.examsFor('2026-10-26').map(e => e.k).join(','), 'eval,ic', "today's exams unchanged");
  const seen = {}, pool = {};
  for (let i = 0; i < 21; i++) { const dk = N.addDays('2026-10-28', i); N.examsFor(dk).forEach(e => { e.t.forEach(t => { seen[t] = 1; }); N.examPool(e, w.QUIZ).forEach(id => { pool[id] = 1; }); const qi = N.examQids(e, w.QUIZ); assert.ok(qi.length >= 8 && qi.length <= 10 && new Set(qi).size === qi.length, e.id + ' has 8–10 questions'); N.examPool(e, w.QUIZ).forEach(id => { if (/^x/.test(e.k)) assert.ok(qi.includes(id), e.id + ' keeps every question of the new topics'); }); }); }
  for (const x of L.list) assert.ok(seen[x.t], 'weekly exams cover ' + x.s + '/' + (x.l || x.t));
  for (const x of L.list.filter(x => x.l && x.s !== 'henderson')) assert.ok(w.QUIZ.some(q => q.t === x.t && q.l === x.l && pool[q.id]), 'exam pool has questions of ' + x.s + '/' + x.l);
  for (const q of w.QUIZ) assert.ok(seen[q.t], 'every quiz topic is in some weekly exam: ' + q.t);
  // a future lesson in a NEW topic joins the rotation the day after it's added, without touching account.js
  L.list.push({ s: 'cardio', t: 'valves', n: 'Valvulopathies', href: 'cardio.html#valves', added: '2026-11-03' });
  assert.ok(!N.examUnits('2026-11-03').some(u => u.t.includes('valves')) && N.examUnits('2026-11-04').some(u => u.t.includes('valves')), 'new topic joins from the next day');
  L.list.pop();
  // 🎚️ levels + ⌨️ fill game
  const gh = read('games.html'), gj = read('assets/games.js');
  assert.ok(gh.includes('id="glv"') && gh.includes('data-g="fill"') && gh.includes('assets/blanks-data.js?v=20261026z'), 'level picker + 4th game');
  assert.ok(gj.includes('match: 5, tf: 60, mem: 6') && gj.includes('match: 7, tf: 45, mem: 8') && gj.includes('match: 9, tf: 30, mem: 10') && gj.includes('Math.max(0, ok - bad)'), 'سهل/وسط/صعب sizes + −1 on صعب');
  const gw = {}; for (const f of ['quiz-data.js', 'pharma-data.js', 'blanks-data.js', 'games.js']) new Function('window', read('assets/' + f))(gw);
  const NG = gw.NursinGames;
  for (const s of ['all', 'cardio', 'neuro', 'law', 'mgmt', 'quality', 'pharma']) assert.ok(NG.enough('fill', s), 'fill game has content: ' + s);
  for (const b of gw.BLANKS) { assert.ok(NG.fillOk(b, b.a), b.id + ' right answer accepted'); (b.alts || []).forEach(a => assert.ok(NG.fillOk(b, a), b.id + ' alt ' + a)); assert.ok(!NG.fillOk(b, 'كلمة غلط'), b.id); }
  assert.ok(!/bauval|adsbygoogle|adx/.test(gj + lj), 'no ads in games / lessons');
});

test('🪜 سلّم المراحل (Oct 26, 7:44 PM): 5 levels back to back, 4 quiz-bank questions each, 20→8 s, 3 ❤️, counts as a game, best level saved, no ads', () => {
  const gh = read('games.html'), gj = read('assets/games.js');
  assert.ok(gh.includes('data-g="stage"') && gh.includes('سلّم المراحل'), 'card on games.html');
  assert.ok(gh.includes('assets/games.js?v=20261026z') && gh.includes('assets/quiz-data.js?v=20261026z'), 'fresh cache tag');
  const gw = {}; for (const f of ['quiz-data.js', 'pharma-data.js', 'blanks-data.js', 'games.js']) new Function('window', read('assets/' + f))(gw);
  const NG = gw.NursinGames, S = NG.STAGE;
  assert.strictEqual(S.levels, 5, '5 levels'); assert.strictEqual(S.lives, 3, '3 lives'); assert.strictEqual(S.per, 4, '4 questions a level');
  assert.deepStrictEqual(S.secs, [20, 17, 14, 11, 8], 'less time each level');
  assert.ok(S.levels * S.pts <= NG.ROUND_MAX, 'a full run stays within the round cap');
  for (const s of ['all', 'cardio', 'neuro', 'henderson', 'law', 'mgmt', 'quality', 'pharma']) {
    assert.ok(NG.enough('stage', s), 'stage game has questions: ' + s);
    for (const q of NG.mcq(s)) assert.ok(gw.QUIZ.includes(q) && q.a < q.o.length, 'only real quiz-bank questions');
  }
  assert.ok(gj.includes('S.activity("game"') && gj.includes('g === "stage" ? (score | 0) * STAGE.pts'), 'paid + counted through the shared game finish');
  assert.ok(gj.includes('lives--') && gj.includes('🎉 المرحلة') && gj.includes('best().stage'), 'lives, between-level screen, best level');
  assert.ok(!/bauval|adsbygoogle|adx/.test(gj), 'no ads in the stage game');
});

test('❌/✅ games (Oct 26, 9:05 PM): every game shows the correction right away and ends with «📋 أخطاءك» + «🎯 راجع أخطاءك» (no points)', () => {
  const gh = read('games.html'), gj = read('assets/games.js'), css = read('assets/style.css');
  assert.ok(gh.includes('assets/games.js?v=20261026z') && gh.includes('assets/style.css?v=20261026z'), 'fresh cache tag');
  assert.ok(gj.includes('❌ إنت اخترت: ') && gj.includes('✅ الصح: ') && gj.includes('كمّل ⬅️'), 'the correction line + «كمّل»');
  // each game's wrong branch records the mistake and shows the line
  const body = (name, nextName) => { const a = gj.indexOf('function ' + name + '('), b = gj.indexOf('function ' + nextName + '(', a + 1); assert.ok(a > 0 && b > a, name); return gj.slice(a, b); };
  const games = { match: body('match', 'tfGame'), tf: body('tfGame', 'mem'), mem: body('mem', 'fillGame'), fill: body('fillGame', 'stageGame'), stage: body('stageGame', 'start') };
  for (const [g, src] of Object.entries(games)) assert.ok(src.includes('addMiss(') && src.includes('fbLine('), g + ' shows the correction + keeps the mistake');
  for (const g of ['tf', 'fill']) assert.ok(games[g].includes('if (pz) return;') && games[g].includes('end += Date.now() - pz'), g + ' pauses its clock during the correction');
  assert.ok(games.stage.includes('clearInterval(timer)') && games.stage.includes('hold('), 'stage clock stays stopped until the correction is done');
  assert.ok(games.match.includes('"hint"') && games.mem.includes('"hint"') && /\.mt\.hint/.test(css) && /\.mc\.hint/.test(css), 'وصّل / الذاكرة flash the right partner');
  assert.ok(gj.includes('q0.x') && gj.includes('cur.x'), 'quiz explanations shown');
  assert.ok(gj.includes('missHtml(lastMiss = miss.slice())') && gj.includes('📋 أخطاءك') && gj.includes('data-review="1"') && gj.includes('🎯 '), 'end-of-round list + replay button');
  const rv = gj.slice(gj.indexOf('function review('), gj.indexOf('/* ---- 🧩'));
  assert.ok(rv.length > 200 && !rv.includes('activity(') && !rv.includes('saveBest(') && !rv.includes('finish('), 'replay pays no points, saves no best, is not a round');
  const gw = {}; for (const f of ['quiz-data.js', 'pharma-data.js', 'blanks-data.js', 'games.js']) new Function('window', read('assets/' + f))(gw);
  const NG = gw.NursinGames;
  assert.ok(NG.fbLine('A', 'B', 'شرح', 1).includes('❌ إنت اخترت: <b class="gy">A</b> — ✅ الصح: <b class="gr">B</b>') && NG.fbLine('A', 'B', 'شرح', 1).includes('💡 شرح'), 'line format');
  const html = NG.missHtml([{ q: 'سؤال', y: 'غلط', r: 'صح' }]);
  assert.ok(html.includes('📋 أخطاءك (1)') && html.includes('🎯 راجع أخطاءك') && NG.missHtml([]).includes('ولا غلطة'), 'mistakes list');
  assert.ok(NG.tf('all').every(it => gw.QUIZ.includes(it.src)), 'tf replay uses the real quiz question');
  assert.ok(!/bauval|adsbygoogle|adx/.test(gj), 'no ads in the games');
});

test('🔔 goal reminders (Oct 26, 9:56 PM): switch «ذكّرني بأهدافي» on the goals card + today\'s goals mirrored onto the own profile for the worker v4 cron', () => {
  const gs = read('assets/goals.js'), css = read('assets/style.css');
  assert.ok(read('index.html').includes('assets/goals.js?v=20261026z'), 'fresh cache tag');
  assert.ok(gs.includes('🔔 ذكّرني بأهدافي (4–10:30 المسا)') && gs.includes('role="switch"') && gs.includes('gpHtml()') && /\.gosheet \.gopsw/.test(css), 'the switch is on the goals card');
  assert.ok(gs.includes('P.enable(A)') && gs.includes('goalPush: true') && gs.includes('goalPush: false'), 'uses the existing push subscribe flow, stored on the profile');
  // mirror = only fields on the student's own users/{uid} (rules v10 allow any extra field there; no new collection)
  assert.ok(gs.includes('A.fs.doc(A.db, "users", A.user.uid)') && gs.includes('{ merge: true }') && !/pushSubs|collection\(/.test(gs.slice(gs.indexOf('/* ---- 🔔 goal reminders'), gs.indexOf('/* ---- UI ---- */'))), 'writes only the own profile, merged');
  assert.ok(gs.includes('function refresh() { paint(); fill(); mirror(); }') && gs.includes('if (!pushOn()) return;'), 'mirrors on every change, only when the reminders are on');
  const rules = read('firestore.rules'); const u = rules.slice(rules.indexOf('match /users/{uid}'), rules.indexOf('match /friends/{fid}'));
  assert.ok(u.includes('request.auth.uid == uid') && !u.includes('hasOnly'), 'users/{uid} owner writes accept the goal fields (no v11 needed)');
  // the pure part: what the worker reads
  const w = { Nursin: { dayKey: () => '2026-10-27' } }; new Function('window', 'document', 'module', gs)(w, null, undefined);
  const G = w.NursinGoals || require(path.join(SITE, 'assets/goals.js'));
  const list = G.build({ weak: 2, exams: [], done: {}, pomo: 1, game: 0, newL: [] });
  assert.ok(list.some(x => x.k === 'pomo' && x.done) && list.some(x => x.k === 'game' && !x.done), 'build still gives pomo/game');
  assert.ok(!/bauval|adsbygoogle|adx/.test(gs), 'no ads in goals');
});

test('🚑 ناوبة بالطوارئ (Oct 27): ER sim game on games.html, 7 cases from the réa notes, each step one best answer + an explanation', () => {
  const gh = read('games.html'), gj = read('assets/games.js'), dj = read('assets/ersim-data.js'), css = read('assets/style.css');
  assert.ok(gh.includes('data-g="er"') && gh.includes('ناوبة بالطوارئ') && gh.includes('assets/ersim-data.js?v=20261026z') && gh.indexOf('ersim-data.js') < gh.indexOf('assets/games.js'), 'card + data script before games.js');
  assert.ok(gj.includes('function erGame(') && gj.includes('function erCase(') && gj.includes('g === "er" ? erGame') && gj.includes('finish("er", ok'), 'game wired through the shared finish() (points caps + 🎮 goal)');
  const body = gj.slice(gj.indexOf('function erCase('), gj.indexOf('w.NursinGames ='));
  assert.ok(body.includes('addMiss(') && body.includes('fbLine(') && body.includes('paintBar(-1)') && body.includes('paintBar(1)'), 'correction + status bar reacts');
  assert.ok(/\.ercard/.test(css) && /\.erst/.test(css), 'css');
  const gw = {}; for (const f of ['quiz-data.js', 'pharma-data.js', 'blanks-data.js', 'ersim-data.js', 'games.js']) new Function('window', read('assets/' + f))(gw);
  const cs = gw.ERSIM, NG = gw.NursinGames;
  assert.strictEqual(cs.length, 7, '7 cases');
  assert.strictEqual(new Set(cs.map(c => c.id)).size, 7, 'unique ids');
  for (const c of cs) {
    assert.ok(c.who && c.t && c.ic && c.steps.length >= 5, c.id + ' arrival card');
    for (const s of c.steps) {
      assert.strictEqual(s.o.length, 3, c.id + ' 3 options: ' + s.q);
      assert.ok(Number.isInteger(s.a) && s.a >= 0 && s.a < 3, c.id + ' exactly one correct option');
      assert.strictEqual(new Set(s.o).size, 3, c.id + ' distinct options');
      assert.ok(typeof s.x === 'string' && s.x.length > 10, c.id + ' explanation');
    }
    assert.deepStrictEqual([1, 2, 3].map(l => NG.erSteps(c, l).length), [3, 4, 5], c.id + ' سهل/وسط/صعب = 3/4/5 steps');
  }
  assert.ok(NG.enough('er', 'law'), 'not tied to the subject picker');
  assert.ok(NG.fr('Kayexalate <b>').includes('<bdi dir="ltr" lang="fr">Kayexalate</bdi>') && !NG.fr('<b>').includes('<b>'), 'escaped, French kept LTR');
  assert.ok(!/3\.5|< ?3 /.test(cs.find(c => c.id === 'hypok').lab), 'hypokaliémie shows no number');
  assert.ok(!/bauval|adsbygoogle|adx/.test(dj + body), 'no ads in the sim');
});

test('🚑 ER sim v2 (Oct 27, 10:17 AM): realistic scenes + game HUD, tap spots open the same steps, each case has dialogue lines from its own data', () => {
  const gh = read('games.html'), gj = read('assets/games.js'), sj = read('assets/ersim-scene.js'), css = read('assets/style.css'), cr = read('credits.html');
  assert.ok(gh.includes('assets/ersim-scene.js?v=20261026z') && gh.indexOf('ersim-scene.js') < gh.indexOf('assets/games.js'), 'scene script before games.js');
  for (const k of ['a', 'b', 'c', 'd']) {
    const f = path.join(SITE, 'assets/er-scene-' + k + '.webp'), b = fs.readFileSync(f);
    assert.ok(b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' && b.length <= 150 * 1024, 'scene ' + k + ' webp ≤150 KB');
    assert.ok(!gh.includes('er-scene-' + k), 'scene images only load when a case starts');
  }
  for (const s of ['المهمة الحالية', 'ers-map', 'اليوم', 'ersecg', 'SpO2', 'IV:', 'تفاعل', 'احكي', 'الدواء', 'المخزون', 'القائمة', 'استلم المريض', 'المسعف', 'غرفة 3']) assert.ok(sj.includes(s), 'HUD/scene: ' + s);
  assert.ok(/prefers-reduced-motion:reduce\)\{\.ers/.test(css) && css.includes('.ers-spot.glow') && css.includes('.ers-sheet'), 'css + reduced motion');
  assert.ok(gj.includes('w.ERSCENE.open(c') && gj.includes('S.result(false, hp') && gj.includes('S.result(true, hp') && gj.includes('hold(0, next, R)'), 'games.js drives the scene with the same answer logic');
  assert.ok(cr.includes('assets/er-scene-') && cr.includes('مولّدة بالذكاء الاصطناعي'), 'credits say the scene images are generated');
  const gw = {}; for (const f of ['quiz-data.js', 'pharma-data.js', 'blanks-data.js', 'ersim-data.js', 'ersim-scene.js', 'games.js']) new Function('window', read('assets/' + f))(gw);
  const E = gw.ERSCENE, spots = Object.keys(E.SPOTS);
  for (const k of ['pt', 'mon', 'iv', 'cart', 'lab', 'phone']) assert.ok(spots.includes(k), 'spot ' + k);
  for (const c of gw.ERSIM) {
    for (const s of c.steps) assert.ok(spots.includes(E.spot(s)), c.id + ' step has a spot: ' + s.q);
    const L = E.dlg(c);
    assert.ok(L.length >= 3, c.id + ' dialogue');
    const sx = L.find(x => x.k === 'sx'), who = L.find(x => x.k === 'who');
    assert.ok(sx && c.sx.every(t => sx.a.includes(t)), c.id + ' symptoms answer = the case symptoms');
    assert.ok(who && who.a.includes(c.who), c.id + ' history answer = the case history');
    if (c.lab) assert.ok(L.find(x => x.k === 'lab').a.includes(c.lab), c.id + ' lab answer = the case lab');
    const known = [].concat(c.sx || [], [c.who], c.vit || [], c.lab ? [c.lab] : []);
    for (const x of L.filter(x => x.k !== 'calm')) assert.ok(known.some(t => x.a.includes(t)), c.id + ' every answer comes from the case: ' + x.k);
    const b = E.monBase(c), v = (c.vit || []).join(' '), fc = v.match(/FC\s*(\d+)/), ta = v.match(/TA\s*(\d+)\/(\d+)/);
    if (fc) assert.strictEqual(b.fc, +fc[1], c.id + ' monitor FC = case FC');
    if (ta) assert.ok(b.sys === +ta[1] && b.dia === +ta[2], c.id + ' monitor TA = case TA');
    assert.ok(E.monAt(b, 75).fc !== E.monAt(b, 35).fc || b.fc === 80, c.id + ' monitor moves with the patient bar');
  }
  assert.ok(!/bauval|adsbygoogle|adx/.test(sj), 'no ads in the scene');
});

test('🚑 ER sim v3 (Oct 27, 12:36 PM): each case is a living story — free actions (≥8), every action has an effect + a line from the notes, the patient gets worse untreated and better with the right sequence', () => {
  const gh = read('games.html'), gj = read('assets/games.js'), sj = read('assets/ersim-scene.js'), yj = read('assets/ersim-story.js'), css = read('assets/style.css');
  assert.ok(gh.includes('assets/ersim-story.js?v=20261026z') && gh.indexOf('ersim-story.js') < gh.indexOf('ersim-scene.js') && gh.indexOf('ersim-scene.js') < gh.indexOf('assets/games.js'), 'story engine before the scene and games.js');
  assert.ok(gj.includes('function erStory(') && gj.includes('finish("er", stars') && gj.includes('nursin_er3_v1') && gj.includes('addMiss(') && gj.includes('fbLine('), 'wired into finish() (points caps + 🎮 goal), saved for reload, mistakes reviewed');
  for (const s of ['📋 المهام', 'ملف المريض', 'سلّم', 'data-ers="pause"', 'ers-red', 'E.tick(', 'E.doAct(']) assert.ok(sj.includes(s), 'room UI: ' + s);
  assert.ok(css.includes('.ers-tasks') && /prefers-reduced-motion:reduce\)\{\.ers-mon\.alarm/.test(css) && css.indexOf('.ers-tasks') < css.indexOf('.adx{'), 'css (before .adx), reduced motion');
  assert.ok(!/bauval|adsbygoogle|adx/.test(yj), 'no ads');
  const gw = {}; for (const f of ['ersim-data.js', 'ersim-story.js']) new Function('window', read('assets/' + f))(gw);
  const E = gw.ERSTORY, cs = gw.ERSIM;
  assert.strictEqual(Object.keys(E.cases).length, 7, '7 stories');
  for (const c of cs) {
    const S = E.story(c.id); assert.ok(S, c.id + ' has a story');
    const A = E.actions(c.id), kinds = new Set(A.map(a => a.k));
    assert.ok(A.length >= 8 && A.length <= 22, c.id + ' 8+ actions: ' + A.length);
    assert.strictEqual(new Set(A.map(a => a.id)).size, A.length, c.id + ' unique action ids');
    for (const k of ['meas', 'call', 'tx', 'bad']) assert.ok(kinds.has(k), c.id + ' has ' + k);
    for (const a of A) {
      assert.ok(typeof a.x === 'string' && a.x.length > 8, c.id + ' explanation: ' + a.id);
      assert.ok(a.m > 0 && a.ic && a.n, c.id + ' costs time: ' + a.id);
      if (a.k === 'bad') assert.ok(a.d > 0 && a.right, c.id + ' wrong → worse + the right one: ' + a.id);
      if (a.k === 'tx' && a.key) assert.ok(a.d < 0, c.id + ' right → better: ' + a.id);
      if (a.k === 'quiz') for (const i of a.q.concat(a.q2 || [])) assert.ok(c.steps[i], c.id + ' quiz step exists');
      if (a.r && typeof a.r !== 'string') assert.strictEqual(a.r.length, 3, c.id + ' result per band: ' + a.id);
    }
    for (const lv of [1, 2, 3]) {
      // untreated → he gets worse and is lost
      const idle = E.create(c.id, lv); let saw = [];
      while (!idle.end && idle.t < 400) { E.tick(idle, 1); saw.push(E.status(idle).b); }
      assert.strictEqual(idle.end, 'lost', c.id + ' lv' + lv + ' untreated → lost');
      assert.ok(saw.includes(2) && idle.log.some(e => e.kind === 'alarm'), c.id + ' reaches 🔴 with an alarm first');
      // a wrong action makes it worse than doing nothing
      const w1 = E.create(c.id, lv), w0 = E.create(c.id, lv); w1.called = w0.called = true;
      const bad = A.find(a => a.k === 'bad'); E.doAct(w1, bad.id); E.tick(w0, bad.m); E.tick(w1, 3); E.tick(w0, 3);
      assert.ok(w1.sev > w0.sev && w1.miss.includes(bad.id), c.id + ' wrong action worsens + is a mistake');
      // the measured value is hidden until measured, and is the state's value
      const m = E.create(c.id, lv); assert.ok(!m.seen.fc); E.doAct(m, 'm_fc'); assert.strictEqual(m.seen.fc.val, E.vit(m, 'fc'));
      // the full correct sequence (his notes' order) stabilises him, and he got better, not instantly
      const st = E.create(c.id, lv);
      for (const id of S.ideal) { let r = E.doAct(st, id); if (r.blocked && !r.a) { E.tick(st, 10); r = E.doAct(st, id); } assert.ok(r.a || st.end, c.id + ' ideal step runs: ' + id); if (r.quiz) E.quiz(st, id, r.quiz.length, r.quiz.length, r.qk); }
      for (const k of E.keys(c.id)) assert.ok(st.done[k], c.id + ' ideal covers key ' + k);
      const before = st.sev; let n = 0; while (!st.end && n++ < 120) { E.tick(st, 1); if (st.okHint) E.doAct(st, 'm_fc'); }
      assert.strictEqual(st.end, 'ok', c.id + ' lv' + lv + ' correct sequence → stabilised');
      assert.ok(st.sev <= E.K.stab && st.log.some(e => e.kind === 'ok') && E.stars(st) >= 7, c.id + ' improved range + good score');
      if (S.vit && typeof S.vit.fc !== 'number') { const a = E.create(c.id, lv); const v0 = E.vit(a, 'fc'); a.sev = 5; assert.notStrictEqual(E.vit(a, 'fc'), v0, c.id + ' FC moves with the state'); }
    }
  }
  // his notes' rules: hypokaliémie shows no number; hypermagnésémie: stop Mg drugs + Calcium gluconate IV
  assert.ok(!/3\.5|< ?3\b/.test(JSON.stringify(E.cases.hypok)), 'hypokaliémie: no number');
  const mg = E.actions('hypermg'); assert.ok(mg.find(a => a.id === 'stop' && a.key) && mg.find(a => /Calcium gluconate IV/.test(a.n) && a.key), 'hypermagnésémie: stop Mg + Calcium gluconate IV');
});
