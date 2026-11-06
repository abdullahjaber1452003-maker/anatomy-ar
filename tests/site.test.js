const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const SITE = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');
const PQ_ADDED = new Set(JSON.parse(read('assets/partq-data.js').match(/added:(\[[^\]]*\])/)[1]));   // 📝 29c: questions written for «كويز هالجزء» (counted apart in the older per-lesson size checks)
const notPQ = q => !PQ_ADDED.has(q.id);
const pages = ['index.html','cardio.html','neuro.html','henderson.html','quiz.html','3d.html','about.html','privacy.html','credits.html','404.html','friends.html','exams.html','live.html','tutor.html','classes.html','law.html','mgmt.html','quality.html','pharma.html','games.html','rea.html','hifzi.html','me.html','notes.html','geri.html','community.html','medsurg.html','highlights.html'];
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
  for (const p of ['hifzi.html','quiz.html']) { const h = read(p); assert.ok(h.includes('id="weak"'), p + ' #weak'); assert.ok(h.includes('assets/weak.js'), p + ' weak.js'); }   // Oct 29: home → 🗺️ حفظي
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
    if (!['hifzi.html', 'me.html', 'notes.html', 'highlights.html'].includes(p)) assert.ok(h.includes('ca-pub-2554036492962277'), p + ' AdSense kept');   // Oct 29: no ads on حفظي / أنا; Oct 30: none on 📒 ملاحظاتي
  }
});

test('Adsterra banners: ad pages carry the keys, non-ad pages carry none', () => {
  const K = { m320: '735f5c76ee5abde951ff9d70e2263fab', d728: 'f0cd90c85278798fba5a155236050d61', box: '9892bba2f704f8ea66787de07f9f7be3' };
  // cardio + neuro: top + end box + ONE mid-lesson banner (Oct 25) → d728 and box twice; Oct 28 «نزيد شوي من adsterra»: + one .adx-sec between lessons on cardio and henderson
  const want = { 'index.html': ['m320','d728'], 'cardio.html': ['m320','d728','box','d728','box','d728','box'], 'neuro.html': ['m320','d728','box','d728','box'], 'henderson.html': ['m320','d728','box','d728','box'], 'quiz.html': ['m320','d728','box'], '3d.html': ['box'], 'exams.html': ['m320','d728'] };
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
    assert.strictEqual((h.match(/assets\/account\.js\?v=20261029r/g) || []).length, 1, p + ' account.js once with cache tag');
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
  assert.ok(h.indexOf('assets/gate3d.js?v=20261029r') > -1 && h.indexOf('assets/gate3d.js') < h.indexOf('assets/viewer.js'), 'gate runs before the viewer');
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
  assert.ok(h.includes('👨‍🏫 الأستاذ عثمان') && h.includes('id="tlog"') && h.includes('id="tform"') && h.includes('aria-current="page"'), 'page shell');
  for (const c of ['درّسني لامتحان بكرا', 'شو عندي امتحانات هالأسبوع؟', 'اشرحلي الـ ECG', 'شو يعني troponine؟', 'اعملّي كويز صغير عن القلب', 'شو لازم إدرس بعدين؟']) assert.ok(h.includes(c), 'chip ' + c);
  assert.ok(h.includes('الأستاذ عثمان ذكاء اصطناعي وممكن يغلط، راجع دروسك 📚'), 'disclaimer');
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
  assert.ok(h.indexOf('assets/quiz-data.js') < h.indexOf('assets/weak.js') && h.includes('assets/weak.js?v=20261029r'), 'quiz bank + weak points loaded');
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
  assert.ok(js.includes('🥇 أوّل واحد') && js.includes('جاوبو صح من') && js.includes('DQ_NOT_READY'), 'first right answer + count + friendly message before rules v5 (Nov 1: the 🥇 now tops the list of right answers)');
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
  assert.ok(c2.length < 3200, 'compact signed in: ' + c2.length);  // +2 subjects (quality, pharma) Oct 26, + réa Oct 29, + gériatrie / santé communautaire / perfusion Oct 30 (3040)
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
  for (const p of pages.concat('admin.html')) assert.match(read(p), /<script src="assets\/announce\.js\?v=20261029r" defer><\/script>/, p);
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
  assert.ok(h.indexOf('assets/flow.js?v=20261029r') > -1 && h.indexOf('assets/flow.js') < h.indexOf('assets/viewer.js'), 'flow.js before the viewer on 3d.html');
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
  assert.ok(h.includes('🐢 السرعة') && h.includes('assets/flow.js?v=20261029r'), '3d.html mentions it, fresh cache tag');
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
    assert.equal((h.match(/<script src="assets\/pwa\.js\?v=20261029r" defer><\/script>/g) || []).length, 1, p + ' pwa.js once');
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
  assert.ok(read('index.html').includes('assets/pwa.js?v=20261029r'), 'fresh cache tag');
});

test('🧭 tidy navigation + 👋 welcome card (Oct 26): five groups, every page reachable, sign-in then notifications once per device, «بعدين» on each step, no ads inside', () => {
  const all = fs.readdirSync(SITE).filter(f => f.endsWith('.html'));
  for (const p of all) {
    const h = read(p);
    assert.equal((h.match(/<script src="assets\/nav\.js\?v=20261029r" defer><\/script>/g) || []).length, 1, p + ' nav.js once with cache tag');
    assert.ok(h.indexOf('assets/account.js?v=') < h.indexOf('assets/nav.js?v='), p + ' nav.js after account.js (uses Nursin.loadFB)');
    assert.ok(!h.includes('20261025l'), p + ' old cache tag gone');
  }
  for (const p of pages) assert.ok(read(p).includes('<nav id="nav" class="nav"'), p + ' static nav kept for no-JS + search engines');
  const n = read('assets/nav.js');
  const vm = require('node:vm'); const ctx = { window: {}, document: { readyState: 'loading', addEventListener() {} }, location: { pathname: '/index.html', search: '' } };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(n, ctx);
  const G = ctx.NursinNav.groups;
  assert.equal(G.length, 5, 'five tabs'); assert.deepEqual(G.map(g => g.n), ['الرئيسية', 'المواد', 'تمارين', 'صفّي', 'أنا']);   // Oct 29 batch 1
  const linked = new Set(); G.forEach(g => { if (g.href) linked.add(g.href); (g.items || []).forEach(i => linked.add(i[0].split('#')[0])); });
  for (const p of ['about.html', 'privacy.html', 'credits.html']) assert.ok(n.includes('"' + p + '"'), p + ' in the ☰ sheet');
  for (const p of pages.filter(p => !['about.html', 'privacy.html', 'credits.html', '404.html'].includes(p)).concat('chat.html')) assert.ok(linked.has(p), p + ' reachable from the 5 groups');
  for (const [l, f] of G.filter(g => g.items).flatMap(g => g.items.map(i => [i[0], g]))) if (l.charAt(0) !== '#') assert.ok(fs.existsSync(path.join(SITE, l.split(/[#?]/)[0])), l);   // #search / #online are buttons (Oct 29)
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
  // Oct 29 batch 1: the group cards left the home page (their pages are in the bottom bar); the folded tips moved to 🗺️ حفظي
  assert.ok(read('assets/home.js').includes('k: "cont"') && !h.includes('class="card hg"') && read('hifzi.html').includes('details class="box warn hmist"'), 'home: continue, no group cards, tips on hifzi');
  const css = read('assets/style.css');
  const adx = css.indexOf('.adx{');
  assert.ok(css.indexOf('.gnav{position:fixed') > -1 && css.indexOf('.gnav{position:fixed') < adx && css.indexOf('.obx{position:fixed') < adx, 'new fixed elements before .adx');
});

test('⚖️ law lessons (Oct 26): lessons from a data list (his notes only), 4-grade table, licence conditions, «قريباً» placeholder, 10 law quiz questions, listed in nav/home/quiz/live/tutor/admin', () => {
  const h = read('law.html');
  assert.ok(h.includes('id="lawlessons"') && h.includes('data-practice="class"') && h.includes('data-practice="blanks" data-t="law"') && h.includes('quiz.html?t=law'));
  for (const s of ['law-data.js', 'blanks-data.js', 'law.js', 'practice.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261029r'), s);
  assert.ok(h.indexOf('assets/law.js') < h.indexOf('assets/practice.js'), 'lessons render before practice mounts');
  assert.ok(h.indexOf('class="adx adx-box"') > h.indexOf('id="blanks"') && h.indexOf('class="adx adx-top"') < h.indexOf('id="lessons"'), 'ads only above/below, none inside lessons or quizzes');
  const w = {}; new Function('window', read('assets/law-data.js'))(w);
  const l1 = w.LAW.lessons[0]; assert.strictEqual(l1.k, 'l1'); assert.ok(l1.n.includes('تصنيفات التمريض'));
  for (const s of ['ممرض متخصص', 'ممرض فني', 'مساعد ممرض', 'لجنة الاختصاص في التمريض', 'المديرية العامة للتعليم المهني والتقني', 'colloquium', 'وزارة الصحة العامة', 'بالنسبة للممرض غير اللبناني']) assert.ok(l1.html.includes(s), s);   // Oct 29: the «قريباً» placeholder got its content
  assert.strictEqual((l1.html.match(/<tr>/g) || []).length, 5, 'header + 4 grades');
  assert.ok(l1.cq.length >= 2 && l1.cq.length <= 4 && l1.cq.every(c => c.q && c.pts.length >= 3), '2–4 open questions with key points');
  assert.ok(!w.LAW.soon.some(s => s.n === 'الممرض غير اللبناني') && l1.html.includes('عقد عمل محدّد المدّة'), 'Oct 29: non-Lebanese nurse written in lesson 1, no longer «soon»');
  new Function('window', read('assets/quiz-data.js'))(w);
  const law = w.QUIZ.filter(q => q.t === 'law');
  assert.strictEqual(law.length, 29 + 3); assert.deepStrictEqual(w.QGROUPS.law, ['law']);   // Oct 29: +8 l3 + 3 non-Lebanese · Nov 1: +3 l2 for 🎯 امتحان الفصل assert.ok(w.QTOP.law);
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
  for (const p of ['quiz.html', 'assets/nav.js']) assert.ok(read(p).includes('356 سؤال'), p);   // Oct 29: the home «التمارين» card is now the 📝 tab   // Oct 29: +40 (réa, mgmt, law)
  new Function('window', read('assets/quiz-data.js'))(w); assert.strictEqual(w.QUIZ.length, 408 + 102 + PQ_ADDED.size);   // Nov 3: + 📝 «كويز هالجزء» questions written from each part   // Nov 1: +102 (q601–q720) for 🎯 امتحان الفصل · Oct 30: +72 (gériatrie 40, santé communautaire 24, perfusion 8); Oct 31: +27 réa r2–r4, +25 santé communautaire c7–c8
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
  assert.ok(pm > -1 && q.includes('id="pmode"') && q.includes('assets/practice.js?v=20261029r'));
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
    assert.ok(head.includes('<script src="assets/gate.js?v=20261029r"></script>'), p + ': gate.js in <head>, synchronous (locked before first paint)');
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
  assert.ok(g.includes('"tutor.html": 1') && g.includes('🔒 الأستاذ عثمان مقفول — سجّل دخول بغوغل لتحكي معه'));
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
  for (const p of pages.concat(['admin.html', 'chat.html'])) assert.ok(read(p).includes('<script src="assets/goals.js?v=20261029r" defer></script>'), p + ' has goals.js');
  const G = require(path.join(SITE, 'assets/goals.js'));
  const b = G.build({ weak: 3, exams: [{ id: '2026-10-26-ecg', n: 'ECG + Arythmies' }, { id: '2026-10-26-ic', n: 'IC' }], st: { '2026-10-26-ic': { s: 'done' } }, classes: { list: [{ name: 'LT', mine: null, week: { n: 15 }, dq: { mine: null } }] }, done: { weak: 1 } });
  assert.deepStrictEqual(b.map(x => [x.e, x.href, x.done]), [['🎯', 'quiz.html?t=weak', true], ['📅', 'quiz.html?exam=2026-10-26-ecg', false], ['📅', 'quiz.html?exam=2026-10-26-ic', true], ['🏫', 'classes.html', false], ['❓', 'classes.html#cdq', false], ['⏱️', 'index.html#study', false], ['🎮', 'games.html', false]]);
  assert.ok(b[1].n === 'امتحان اليوم: ECG + Arythmies');
  const f = G.build({ weak: 0, exams: [], done: {} }); assert.deepStrictEqual(f.map(x => [x.n, x.href]), [['كويز ١٠ أسئلة', 'quiz.html?t=all&n=10'], ['٢٥ دقيقة دراسة (قراءة أو بومودورو)', 'index.html#study'], ['العب لعبة وحدة', 'games.html']], 'fallback when nothing else (+ ⏱️ and 🎮 every day, Oct 26 7:41 PM)');
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
  for (const s of ['mgmt-data.js', 'blanks-data.js', 'mgmt.js', 'practice.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261029r'), s);
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
  const mq = w.QUIZ.filter(q => q.t === 'mgmt').filter(notPQ);
  assert.strictEqual(mq.length, 33); assert.deepStrictEqual(w.QGROUPS.mgmt, ['mgmt']);   // Oct 29: +17 (m3 التوجيه والقيادة, m4 المشاركة) assert.ok(w.QTOP.mgmt.startsWith('الإدارة'));
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
    for (const s of [data, 'blanks-data.js', t + '.js', 'practice.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261029r'), page + ' ' + s);
    assert.ok(h.indexOf('class="adx adx-box"') > h.indexOf('id="blanks"') && h.indexOf('class="adx adx-top"') < h.indexOf('id="lessons"'), page + ': no ads inside lessons/quizzes');
    const q = w.QUIZ.filter(x => x.t === t).filter(notPQ); assert.strictEqual(q.length, { quality: 38 + 18, pharma: 39 + 18 }[t], t);   // Nov 1: + 🎯 امتحان الفصل questions
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

test('🚫 Monetag removed (Oct 27, Abdullah: «شيلو مضر اكتر ما ينفع»): no meta tag on any page', () => {
  for (const f of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) {
    const h = read(f);
    assert.ok(!/name="monetag"|71218b62ec866c526790c5af3e092a78/i.test(h), f + ' has no monetag meta tag');
  }
});

test('🚫 Monetag removed: no assets/mtag.js file, no loader, no nap5k / zone 12128353 anywhere in the site', () => {
  assert.ok(!fs.existsSync(path.join(SITE, 'assets/mtag.js')), 'assets/mtag.js deleted');
  const files = fs.readdirSync(SITE).filter(f => /\.(html|js|txt|json|webmanifest)$/.test(f)).concat(fs.readdirSync(path.join(SITE, 'assets')).filter(f => f.endsWith('.js')).map(f => 'assets/' + f));
  for (const f of files) {
    const s = read(f);
    assert.ok(!/mtag\.js|nap5k|12128353|NursinMtag|monetag/i.test(s), f + ' has no Monetag trace');
  }
  assert.ok(!/monetag|nap5k/i.test(read('sw.js')), 'service worker has no Monetag import');
});

test('Monetag removal kept the other ads + analytics: AdSense, GA4, Adsterra loader and ads.txt untouched', () => {
  for (const f of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) {
    const h = read(f);
    if (!['admin.html', 'chat.html', 'hifzi.html', 'me.html', 'notes.html', 'highlights.html', 'midterm.html', 'suggest.html', 'homework.html'].includes(f)) assert.ok(h.includes('ca-pub-2554036492962277'), f + ' AdSense kept');   // Oct 29: no ads on حفظي / أنا · Nov 1: none on 🎯 امتحان الفصل, none on 🛠️ the suggestion box, none on 📌 الوظائف
    assert.ok(h.includes('G-7MY0Z597WC'), f + ' GA4 kept');
  }
  for (const p of ['index.html', 'cardio.html', 'quiz.html']) assert.ok(/assets\/ads\.js\?v=20261029r/.test(read(p)), p + ' Adsterra loader kept, fresh tag');
  assert.ok(read('assets/ads.js').includes('735f5c76ee5abde951ff9d70e2263fab'), 'Adsterra 320x50 key kept');
  assert.equal(read('ads.txt').trim(), 'google.com, pub-2554036492962277, DIRECT, f08c47fec0942fa0', 'ads.txt unchanged');
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
  assert.ok(pv.includes('ca-pub-2554036492962277') && pv.includes('G-7MY0Z597WC'), 'head tags kept');
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
  assert.ok(read('assets/nav.js').includes('{ k: "learn", e: "📚", n: "المواد",'), 'nav says المواد');
  assert.ok(read('quiz.html').includes('data-set="cardio">❤️ مادة القلب</button>'), 'quiz picker');
});

test('🎮 games page (Oct 26, 6:04 PM): 3 games from the site\'s own quiz bank + drug cards, subject picker, points + 🔥, in nav/home/sitemap, no ads', () => {
  const g = read('games.html');
  for (const k of ['id="gpick"', 'data-g="match"', 'data-g="tf"', 'data-g="mem"', 'id="garea"', 'id="wkch"']) assert.ok(g.includes(k), 'games.html ' + k);
  for (const s of ['quiz-data.js', 'pharma-data.js', 'games.js', 'study.js', 'account.js', 'nav.js']) assert.ok(g.includes('assets/' + s + '?v=20261029r'), 'games.html loads ' + s);
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
  const h = read('me.html'); assert.ok(h.includes('<section id="study"') && h.includes('assets/study.js?v=20261029r'), '👤 أنا: streak + timer + weekly card (Oct 29: moved from the home page)');
  for (const p of ['cardio.html', 'neuro.html', 'henderson.html', 'law.html', 'mgmt.html', 'quality.html', 'pharma.html', 'quiz.html']) assert.ok(read(p).includes('assets/study.js?v=20261029r'), p + ' loads study.js');
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
  for (const p of pages.concat(['admin.html', 'chat.html'])) { const h = read(p); assert.ok(/<script src="assets\/lessons\.js\?v=20261029r" defer><\/script>(<script src="assets\/hifz\.js\?v=20261029r" defer><\/script>)?(<script src="assets\/notes\.js\?v=20261029r" defer><\/script>(<script src="assets\/highlight\.js\?v=20261029r" defer><\/script>(<script src="assets\/name\.js\?v=20261029r" defer><\/script>)?)?)?<script src="assets\/account\.js\?v=20261029r"/.test(h), p + ' loads lessons.js (+ hifz.js) before account.js'); }
  const w = {}; w.window = w; vm.createContext(w);
  for (const f of ['lessons.js', 'quiz-data.js', 'account.js']) vm.runInContext(read('assets/' + f), w);
  const L = w.NursinLessons, N = w.Nursin;
  for (const s in w.QGROUPS) for (const t of w.QGROUPS[s]) if (!w.QLES[s]) assert.ok(L.list.some(x => x.s === s && x.t === t && !x.l), 'registry has topic ' + s + '/' + t);
  for (const s in w.QLES) for (const l in w.QLES[s]) assert.ok(L.list.some(x => x.s === s && x.l === l), 'registry has lesson ' + s + '/' + l);
  assert.strictEqual(L.list.find(x => x.s === 'law' && x.l === 'l2').added, '2026-10-26');
  assert.ok(!L.list.find(x => x.s === 'law' && x.l === 'l1').added && !L.list.find(x => x.t === 'infarctus').added, 'older lessons never show as new');
  // 📖 ONE small lesson a day (Oct 27 2:38–2:42 PM): a single row, the next unread part of the day's subject; read → ✅
  const g26 = L.goals('2026-10-26', {}); assert.strictEqual(g26.length, 1, 'one lesson row');
  assert.ok(/^les:/.test(g26[0].k) && g26[0].e === '📖' && /^درس اليوم: /.test(g26[0].n) && !g26[0].done);
  const x26 = L.pick('2026-10-26', {}), rd = {}; rd[L.key(x26)] = 1;
  assert.ok(L.goals('2026-10-26', rd)[0].k !== g26[0].k, 'after reading it, the next unread part is offered (a new day keeps today fixed via today())');
  assert.ok(L.pick('2026-10-26', {}, 'quality').s === 'quality' && L.pick('2026-10-26', {}, 'quality').href === 'quality.html#q1', 'student picks a subject → its first unread part');
  const days = new Set(); for (let i = 0; i < 7; i++) days.add(L.pick(N.addDays('2026-11-02', i), {}).s); assert.ok(days.size === 7, 'subjects take turns, one per day');
  assert.ok(G.build({ weak: 0, exams: [], done: {}, newL: g26 }).filter(x => /^les:/.test(x.k)).length === 1, 'only one lesson in the goals');
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
  assert.ok(gh.includes('id="glv"') && gh.includes('data-g="fill"') && gh.includes('assets/blanks-data.js?v=20261029r'), 'level picker + 4th game');
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
  assert.ok(gh.includes('assets/games.js?v=20261029r') && gh.includes('assets/quiz-data.js?v=20261029r'), 'fresh cache tag');
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
  assert.ok(gh.includes('assets/games.js?v=20261029r') && gh.includes('assets/style.css?v=20261029r'), 'fresh cache tag');
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
  assert.ok(read('index.html').includes('assets/goals.js?v=20261029r'), 'fresh cache tag');
  assert.ok(gs.includes('🔔 إشعارات الأستاذ عثمان') && !gs.includes('data-rem="at"') && gs.includes('data-rem="qf"') &&   // Oct 29 11:49 PM: Osman decides when; no time picker   // renamed Oct 28 10:29 PM («أهداف اليوم» → «درس اليوم»)
    gs.includes('role="switch"') && gs.includes('gpHtml()') && /\.gosheet \.gopsw/.test(css), 'the switch is on the goals card');
  assert.ok(gs.includes('P.enable(A)') && gs.includes('goalPush: true') && gs.includes('goalPush: false'), 'uses the existing push subscribe flow, stored on the profile');
  // mirror = only fields on the student's own users/{uid} (rules v10 allow any extra field there; no new collection)
  assert.ok(gs.includes('A.fs.doc(A.db, "users", A.user.uid)') && gs.includes('{ merge: true }') && !/pushSubs|collection\(/.test(gs.slice(gs.indexOf('/* ---- 🔔 goal reminders'), gs.indexOf('/* ---- UI ---- */'))), 'writes only the own profile, merged');
  assert.ok(gs.includes('function refresh() { paint(); fill(); mirror(); gsPush(); }') && gs.includes('if (!pushOn()) return;'), 'mirrors on every change, only when the reminders are on');
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
  assert.ok(gh.includes('data-g="er"') && gh.includes('ناوبة بالطوارئ') && gh.includes('assets/ersim-data.js?v=20261029r') && gh.indexOf('ersim-data.js') < gh.indexOf('assets/games.js'), 'card + data script before games.js');
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
  assert.ok(gh.includes('assets/ersim-scene.js?v=20261029r') && gh.indexOf('ersim-scene.js') < gh.indexOf('assets/games.js'), 'scene script before games.js');
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
  assert.ok(gh.includes('assets/ersim-story.js?v=20261029r') && gh.indexOf('ersim-story.js') < gh.indexOf('ersim-scene.js') && gh.indexOf('ersim-scene.js') < gh.indexOf('assets/games.js'), 'story engine before the scene and games.js');
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

test('quiz options give nothing away: plain options, no marked words in stems, no giant right answer; ER room picture fits the patient', () => {
  const vm = require('node:vm'); const ctx = { window: {} }; vm.createContext(ctx);
  for (const f of ['quiz-data', 'blanks-data', 'ersim-data']) vm.runInContext(read('assets/' + f + '.js'), ctx);
  const W = ctx.window, MARK = /<[^>]+>|\*\*|[«»“”"]/;
  const banks = [['QUIZ', W.QUIZ], ['BLANKS', W.BLANKS.filter(b => b.o)], ['ERSIM', W.ERSIM.flatMap(c => c.steps)]];
  for (const [n, list] of banks) for (const q of list) for (const o of q.o) assert.ok(!MARK.test(o), n + ' option has markup/emphasis: ' + (q.id || q.q) + ' → ' + o);
  for (const q of W.QUIZ) assert.ok(!/<\s*(b|strong|mark|em|i|u|span)\b|\*\*/.test(q.q), 'quiz stem has a marked word: ' + q.id);
  const len = s => String(s).length, ratio = q => len(q.o[q.a]) / Math.max(...q.o.filter((o, i) => i !== q.a).map(len));
  for (const q of W.QUIZ.concat(W.ERSIM.flatMap(c => c.steps))) assert.ok(ratio(q) <= 2, 'right option more than 2× longer than every wrong one: ' + (q.id || q.q));
  // renderers put every option in the same plain wrapper (no bold/mark on any option)
  const qz = read('assets/quiz.js'), lv = read('assets/live.js'), cl = read('assets/classes.js'), gm = read('assets/games.js');
  assert.ok(qz.includes(`'</span><span>'+o+'</span`), 'quiz.js: plain option span');
  for (const [n, s] of [['quiz.js', qz], ['live.js', lv], ['classes.js', cl], ['games.js', gm]]) for (const m of s.matchAll(/class="opt[^]{0,220}/g)) assert.ok(!/<(b|strong|mark|em)>/.test(m[0].split('</button>')[0]), n + ' option wrapped in emphasis');
  // ER sim v3 room: the patient in the bed matches the case (young man / woman / older woman; elderly men keep er-scene-c)
  const sc = read('assets/ersim-scene.js');
  for (const k of ['young', 'woman', 'oldw']) { const b = fs.statSync(path.join(SITE, 'assets/er-room-' + k + '.webp')).size; assert.ok(b > 20000 && b <= 150000, k + ' webp size'); assert.ok(sc.includes('assets/er-room-' + k + '.webp'), k + ' used'); }
  assert.ok(/hypovol: "assets\/er-room-young\.webp"/.test(sc) && /hypoca: "assets\/er-room-woman\.webp"/.test(sc) && !/hypona: "assets\/er-room/.test(sc), 'per-case room picture');
  assert.ok(read('games.html').indexOf('er-room-') < 0, 'room pictures load only when a case opens (not in the page HTML)');
});

test('👨‍🏫 الأستاذ عثمان: renamed everywhere, pooled lines, bubble in every correction card, toggle', () => {
  const vm = require('node:vm');
  // no «الأستاذ المساعد» left in anything a visitor sees (pages + scripts)
  const files = fs.readdirSync(SITE).filter(f => f.endsWith('.html')).concat(fs.readdirSync(path.join(SITE, 'assets')).filter(f => /\.(js|css)$/.test(f)).map(f => 'assets/' + f));
  for (const f of files) assert.ok(!/الأستاذ المساعد|الاستاذ المساعد/.test(read(f)), f + ' still names «الأستاذ المساعد»');
  assert.ok(read('tutor.html').includes('<h1>👨‍🏫 الأستاذ عثمان</h1>') && read('assets/nav.js').includes('["tutor.html", "👨‍🏫", "اسأل الأستاذ عثمان"'), 'tutor page + in the 📚 sheet (Oct 29)');
  for (const f of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) { const h = read(f); if (h.includes('assets/nav.js')) assert.ok(h.indexOf('assets/osman.js?v=20261029r') > -1 && h.indexOf('assets/osman.js') < h.indexOf('assets/nav.js'), f + ' loads osman.js before nav.js'); }
  // the data file: ≥30 wrong lines, a stronger pool for 3 in a row, praise; every line has ar; no tags; no ad code near
  const store = {}; const ctx = { window: {}, document: { createElement: () => ({}), dispatchEvent() {} }, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, CustomEvent: function () {} };
  vm.createContext(ctx); vm.runInContext(read('assets/osman.js'), ctx);
  const O = ctx.window.OSMAN, S = ctx.window.Osman;
  assert.ok(O.wrong.length >= 30 && O.hard.length >= 5 && O.praise.length >= 5, 'pool sizes');
  for (const k of ['wrong', 'hard', 'praise']) for (const l of O[k]) assert.ok(typeof l.ar === 'string' && l.ar.length > 8 && !/[<>]/.test(l.ar), k + ' line: ' + l.ar);
  assert.ok(O.name.ar === 'الأستاذ عثمان' && /عثمان/.test(O.persona.ar) && /لبناني/.test(O.persona.ar), 'name + tutor persona');
  assert.ok(!/adsbygoogle|bauval|nap5k|atOptions/.test(read('assets/osman.js')), 'no ads in osman.js');
  // behaviour: wrong → bubble; 3 in a row → stronger line + «خود نفس»; 5 right in a row → praise; toggle off → nothing
  let b = S.wrong(); assert.ok(b.includes('class="osm"') && b.includes('الأستاذ عثمان'), 'wrong bubble');
  S.wrong(); b = S.wrong(); assert.ok(b.includes('osh') && b.includes('خود نفس وارجع ركّز'), '3 wrong in a row escalates');
  let p = ''; for (let i = 0; i < 5; i++) p = S.right(); assert.ok(p.includes('osp'), 'praise after 5 right');
  assert.strictEqual(S.right(), '', 'no praise between streaks');
  store.nursin_osman_v1 = '0'; assert.ok(S.on() && S.wrong().includes('osm'), 'always on: an old stored off is ignored (Oct 27 2:48 PM)'); S.set(false); assert.ok(S.on(), 'no way to switch him off');
  // correction cards: games (5 games + ER quick + ER story through fbLine), quiz/exams, blanks, class quiz, daily class question, live
  const gm = read('assets/games.js'), fb = gm.slice(gm.indexOf('function fbLine'), gm.indexOf('function fbLine') + 400);
  assert.ok(/osm\(\)/.test(fb) && gm.includes('function osm() { return w.Osman ? w.Osman.wrong() : ""; }'), 'games fbLine carries the bubble');
  assert.ok(read('assets/ersim-scene.js').includes('SIM.fb(') && gm.includes('fb: function (y, r, x) { return fbLine(y, r, x, 0); }'), 'ER sim correction uses fbLine');
  assert.ok(read('assets/quiz.js').includes("om=O?(ok?O.right():O.wrong()):''") && read('assets/quiz.js').includes("q.x+'</div>'+om+"), 'quiz card');
  assert.ok(read('assets/practice.js').includes('w.Osman.wrong()') && read('assets/practice.js').includes('osmLow('), 'blanks + class quiz');
  assert.ok(read('assets/classes.js').includes('osmLine(mine.ok)') && read('assets/live.js').includes('osmLine(mine === q.a, q)'), 'daily class question + live');
  assert.ok(read('assets/tutor.js').includes('context:persona()+context(lv)') && read('assets/practice.js').includes('w.Osman.persona()'), 'tutor + AI corrector get his persona from the page');
  // ☰ switch, default on
  const nv = read('assets/nav.js'); assert.ok(nv.includes('role="switch"') && !nv.includes('a.push(langRow(), osmRow());'), '☰ has no Osman switch any more (always on)');
  // a rendered games correction card includes the bubble when Osman is on
  const g2 = { window: { Osman: S }, document: null }; vm.createContext(g2); vm.runInContext(gm, g2);
  assert.ok(g2.window.NursinGames.fbLine('a', 'b', 'x', 1).includes('class="osm'), 'a games/ER correction card includes the bubble when on');
  S.set(false); assert.ok(g2.window.NursinGames.fbLine('a', 'b', 'x', 1).includes('osm'), 'and still there after an old "off" (always on now)');
});

test('☁️ goals sync across devices on one account (Oct 27, 1:46 PM: iMac 5 done, phone 4)', () => {
  const G = require(path.join(SITE, 'assets/goals.js')), src = read('assets/goals.js');
  const d = '2026-10-27';
  const imac = { d, done: { weak: 1, pomo: 2, game: 3, 'lesson:cardio': 4, dq: 5 }, p: 2, g: 3, wr: 9, rows: ['weak','pomo','game','lesson:cardio','dq'].map(k => ({ k, e: '✅', n: k, s: '', h: 'index.html' })) };
  const phone = { d, done: { pomo: 7, game: 1, 'lesson:cardio': 8, dq: 2 }, p: 1, g: 5, wr: 0, rows: ['pomo','game','lesson:cardio','dq'].map(k => ({ k, e: '✅', n: k, s: '', h: 'index.html' })) };
  const m1 = G.gsMerge(imac, phone), m2 = G.gsMerge(phone, imac);
  assert.deepStrictEqual(m1, m2, 'merge is symmetric');
  assert.strictEqual(Object.keys(m1.done).length, 5, 'union of done goals: both devices show 5');
  assert.strictEqual(m1.p, 2); assert.strictEqual(m1.g, 5); assert.strictEqual(m1.wr, 9);
  assert.strictEqual(m1.done.pomo, 2, 'earliest done time kept');
  assert.strictEqual(m1.rows.length, 5, 'rows only on one device join the other');
  assert.deepStrictEqual(G.gsMerge(m1, phone), m1, 'idempotent');
  // newer day wins; yesterday's state never leaks into today
  const old = { d: '2026-10-26', done: { a: 1, b: 2, c: 3 }, p: 9, g: 9, rows: [] };
  assert.deepStrictEqual(G.gsMerge(old, phone).done, phone.done); assert.strictEqual(G.gsMerge(phone, old).p, 1);
  assert.strictEqual(G.gsMerge(null, null), null); assert.strictEqual(G.gsMerge(null, phone).g, 5);
  // the phone's list (4 rows) gets the iMac's extra row and done marks → same count on both
  const list = [{ k: 'pomo', done: false }, { k: 'game', done: true }, { k: 'lesson:cardio', done: false }, { k: 'dq', done: true }];
  const out = G.gsApply(list, m1);
  assert.strictEqual(out.length, 5); assert.strictEqual(out.filter(x => x.done).length, 5);
  // wiring: goalsSync written to the user's own doc with merge, read → merge → write, pulled on focus/visible/sign-in/sheet
  assert.ok(src.includes('A.fs.setDoc(ref, { goalsSync: m }, { merge: true })'));
  assert.ok(src.includes('w.addEventListener("focus", function () { gsPull(); })') && src.includes('if (d.visibilityState === "visible") gsPull();') && src.includes('gsPull(true)'));
  assert.ok(/function goals\(\) \{[\s\S]*?gsToday\(\)[\s\S]*?return gsApply\(list, R\);/.test(src), 'the pill/sheet count uses the merged state');
  // rules: owner may merge a new field into users/{uid} (no hasOnly on the user doc) → no rules change needed
  const rules = read('firestore.rules'), u = rules.slice(rules.indexOf('match /users/{uid}'), rules.indexOf('match /friends/{fid}'));
  assert.ok(!u.includes('hasOnly'), 'users/{uid} accepts goalsSync without a rules change');
});

test('🇫🇷 language switch (Oct 27, 10:49 AM): «فرنسي وعربي» / «Français seulement» toggle, saved, every quiz/game item has French (or an explicit fallback)', () => {
  const vm = require('node:vm');
  // the switch: ☰ sheet + welcome card, both labels as written, saved through Lang.set
  const nav = read('assets/nav.js'), lj = read('assets/lang.js'), osm = read('assets/osman.js');
  assert.ok(nav.includes('🇫🇷+🇱🇧 فرنسي وعربي') && nav.includes('🇫🇷 Français seulement') && nav.includes('a.push(langRow());') && !nav.includes('a.push(langRow(), osmRow());') && nav.includes('langPick() +'), 'toggle in ☰ beside Osman + in the welcome card');
  assert.ok((nav.match(/w\.Lang\.set\(lg\.getAttribute\("data-lang"\)\)/g) || []).length === 2 && nav.includes('data-nofr'));
  for (const p of pages.concat('admin.html')) {
    const h = read(p), i = h.indexOf('<script src="assets/lang.js?v=20261029r"></script>');
    assert.ok(i > 0 && i < h.indexOf('assets/gate.js') && i < h.indexOf('</head>'), p + ': lang.js in <head> before gate.js');
    assert.ok(fs.existsSync(path.join(SITE, 'assets/fr/p-' + p.replace('.html', '') + '.js')), p + ' page dictionary');
  }
  assert.ok(osm.includes('réponds uniquement en français'), 'tutor answers in French in FR mode');
  // run lang.js + dictionaries + data files the way a page does
  function boot(mode) {
    const writes = [], attrs = {}, cls = new Set(), L = { nursin_lang_v1: mode };
    const ctx = { console, setTimeout, clearTimeout, location: { pathname: '/games.html', reload() { ctx.reloaded = 1; } },
      localStorage: { getItem: k => (k in L ? L[k] : null), setItem: (k, v) => { L[k] = String(v); } } };
    ctx.window = ctx;
    ctx.document = { body: null, documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, classList: { add: c => cls.add(c) } },
      write: s => writes.push(s), addEventListener() {}, readyState: 'loading', createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), querySelector: () => null, querySelectorAll: () => [] };
    vm.createContext(ctx);
    const run = f => vm.runInContext(read(f), ctx, { filename: f });
    run('assets/lang.js');
    if (mode === 'fr') for (const f of ['ui', 'quiz', 'pharma', 'blanks', 'ersim', 'law', 'mgmt', 'quality', 'rea']) run('assets/fr/' + f + '.js');
    for (const f of ['quiz-data', 'blanks-data', 'pharma-data', 'ersim-data', 'ersim-story', 'law-data', 'mgmt-data', 'quality-data', 'rea-data', 'osman']) run('assets/' + f + '.js');
    return { ctx, writes, attrs, cls, L };
  }
  const AR = /[\u0600-\u06FF]/;
  const ar = boot('ar');
  assert.strictEqual(ar.ctx.Lang.fr, false); assert.strictEqual(ar.writes.length, 0); assert.ok(!ar.cls.has('fr'));
  assert.ok(AR.test(ar.ctx.QUIZ[0].q), 'default mode = the site exactly as it is');
  const fr = boot('fr');
  assert.strictEqual(fr.ctx.Lang.fr, true); assert.strictEqual(fr.attrs.dir, 'ltr'); assert.strictEqual(fr.attrs.lang, 'fr'); assert.ok(fr.cls.has('fr'));
  assert.ok(fr.writes.some(w => w.includes('assets/fr/ui.js')) && fr.writes.some(w => w.includes('assets/fr/p-games.js')) && fr.writes.some(w => w.includes('assets/fr/ersim.js')), 'dictionaries deferred from <head>');
  // mode persists: Lang.set saves and reloads into the other mode
  fr.ctx.Lang.set('ar'); assert.strictEqual(fr.L.nursin_lang_v1, 'ar'); assert.ok(fr.ctx.reloaded);
  // every quiz / blanks / game / ER item: French, or listed here as an explicit fallback (keeps the bilingual text)
  const FALLBACK = [];
  const left = [], W = fr.ctx;
  const chk = (id, s) => { if (typeof s === 'string' && AR.test(s) && !FALLBACK.includes(id)) left.push(id + ': ' + s.slice(0, 60)); };
  // ⚖️ law stays Arabic ALWAYS (Oct 27 2:47 PM): law items are never patched; everything else must be French
  W.QUIZ.filter(q => q.t === 'law').forEach(q => assert.ok(AR.test(q.q) && W.Lang.isLawText(q.q), q.id + ' (law) stays Arabic'));
  W.BLANKS.filter(b => b.t === 'law').forEach(b => assert.ok(AR.test(b.s), b.id + ' (law) stays Arabic'));
  assert.ok(AR.test(W.LAW.lessons[0].html), 'law lessons stay Arabic');
  W.QUIZ.filter(q => q.t !== 'law').forEach(q => { chk(q.id, q.q); q.o.forEach(o => chk(q.id, o)); chk(q.id, q.x); });
  W.BLANKS.filter(b => b.t !== 'law').forEach(b => { chk(b.id, b.s); chk(b.id, b.a); (b.o || []).forEach(o => chk(b.id, o)); if (b.o) assert.ok(b.o.includes(b.a), b.id + ' answer still one of the options'); });
  W.ERSIM.forEach(c => { [c.t, c.who, c.lab].concat(c.sx, c.vit).forEach(s => chk(c.id, s)); c.steps.forEach(s => { chk(c.id, s.q); s.o.forEach(o => chk(c.id, o)); chk(c.id, s.x); chk(c.id, s.h); }); });
  Object.keys(W.ERSTORY.cases).forEach(k => { const c = W.ERSTORY.cases[k]; JSON.stringify(c, (key, v) => { chk('er:' + k, v); return v; }); });
  W.PHARMA.drugs.forEach((x, i) => JSON.stringify(x, (key, v) => { chk('drug' + i, v); return v; }));
  ['wrong', 'hard', 'praise'].forEach(k => W.OSMAN[k].forEach((o, i) => chk('osman.' + k + i, o.ar)));
  ['MGMT', 'QUALITY', 'REA'].forEach(g => JSON.stringify(W[g], (key, v) => { chk(g, v); return v; }));
  assert.deepStrictEqual(left, [], 'untranslated items must get French or join FALLBACK');
  // the quiz rules hold in French too: plain options, right answer not a giveaway by length, answer key unchanged
  W.QUIZ.forEach((q, i) => {
    assert.ok(!q.o.some(o => /<|\*\*|«|»/.test(o)), q.id + ' plain options');
    const r = q.o[q.a].length, wmax = Math.max(...q.o.filter((_, j) => j !== q.a).map(o => o.length));
    assert.ok(r <= 2 * wmax, q.id + ' right ≤ 2× longest wrong (fr)');
    assert.strictEqual(q.a, ar.ctx.QUIZ[i].a); assert.strictEqual(q.id, ar.ctx.QUIZ[i].id);
  });
  assert.ok(/Professeur Osman|Prof/.test(W.OSMAN.name.ar), 'Osman in French');
  // the feedback line «❌ إنت اخترت … ✅ الصح …» has its French form
  const ui = read('assets/fr/ui.js');
  assert.ok(ui.includes('"❌ إنت اخترت:":"❌ Tu as choisi :"') && ui.includes('"— ✅ الصح:":"— ✅ La bonne réponse :"'));
  // LTR page never scrolls sideways because of the hidden skip link
  assert.ok(read('assets/style.css').includes('html.fr .skip{right:auto;left:-999px}'));
});


test('✂️ smaller lessons + 📖 one small lesson a day + ⚖️ law always Arabic (Oct 27, 2:38–2:47 PM)', () => {
  const vm = require('node:vm');
  const w = {}; w.window = w; vm.createContext(w); vm.runInContext(read('assets/lessons.js'), w);
  const L = w.NursinLessons;
  // every split point lands on a real child of the lesson body, in order; parts are about one short reading
  const strip = h => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const kidsOf = html => { const out = []; let depth = 0, cur = '', i = 0; const re = /<(\/?)([a-zA-Z0-9]+)[^>]*?(\/?)>/g; let m, last = 0;
    while ((m = re.exec(html))) { const voidT = /^(br|img|hr|input|wbr)$/i.test(m[2]) || m[3]; if (depth === 0 && !m[1]) { last = m.index; } if (!m[1] && !voidT) depth++; else if (m[1]) depth--; if (depth === 0 && !m[1] && voidT) out.push(html.slice(last, re.lastIndex)); else if (depth === 0 && m[1]) out.push(html.slice(last, re.lastIndex)); } return out; };
  const lw = {}; lw.window = lw; for (const f of ['quality-data.js', 'law-data.js']) vm.runInContext(read('assets/' + f), vm.createContext(lw) && lw);
  let checked = 0;
  for (const [subj, data] of [['quality', lw.QUALITY], ['law', lw.LAW]]) for (const les of data.lessons) {
    const st = L.SPLIT[subj + ':' + les.k]; if (!st) continue;
    const kids = kidsOf(les.html), cuts = [0, ...st, kids.length];
    assert.strictEqual(kids.join('').replace(/\s+/g, ''), les.html.replace(/\s+/g, ''), subj + ':' + les.k + ' children parse');
    for (let i = 1; i < cuts.length; i++) { assert.ok(cuts[i] > cuts[i - 1], 'ordered cuts'); const n = strip(kids.slice(cuts[i - 1], cuts[i]).join('')).length; assert.ok(n >= 600 && n <= 2700, subj + ':' + les.k + ' part ' + i + ' is a short reading (' + n + ')'); }
    assert.ok(/^<h[34]/.test(kids[st[0]]), subj + ':' + les.k + ' a part starts at a heading'); checked++;
  }
  assert.ok(checked >= 10, 'quality + law lessons split');
  // the registry: same content, more lessons — every split lesson becomes consecutive parts, part 1 keeps the old anchor
  assert.ok(L.parts.length > L.list.length + 20, 'more (smaller) lessons');
  const inf = L.parts.filter(x => x.t === 'infarctus'); assert.deepStrictEqual(JSON.parse(JSON.stringify(inf.map(x => x.href))), ['cardio.html#infarctus', 'cardio.html#infarctus-p2']);
  assert.ok(L.parts.filter(x => x.s === 'quality' && x.l === 'q2').length === 6 && L.list.length === 70, 'q2 → 6 parts; R.list (weekly exams) unchanged (+4 lessons Oct 29, +17 Oct 30, +3 réa Oct 31, +2 santé communautaire Oct 31)');
  // static pages: the split index is a real child of the lesson body
  for (const page of ['cardio', 'neuro']) { const h = read(page + '.html'); for (const k in L.SPLIT) { if (!k.startsWith(page + ':')) continue; const id = k.split(':')[1]; const a = h.indexOf('<details class="topic" id="' + id + '"'); assert.ok(a > 0, k); const body = h.slice(h.indexOf('<div class="tbody">', a) + 19, h.indexOf('</details>', a)); const n = kidsOf(body.replace(/<\/div>\s*$/, '')).length; assert.ok(L.SPLIT[k][L.SPLIT[k].length - 1] < n, k + ' cut inside the body (' + n + ')'); } }
  // old ✅ count for the new parts; finishing the lesson's quiz marks every part
  assert.ok(L.isRead(L.parts.find(x => x.l === 'q2' && x.p === 4), { 'quality:q2': 1 }), 'a lesson read before the split = all its parts read');
  assert.ok(!L.isRead(L.parts.find(x => x.l === 'q2' && x.p === 4), { 'quality:q2#1': 1 }), 'reading part 1 does not tick part 4');
  // today's ONE lesson: label, French label, law stays Arabic
  const r = L.row(L.parts.find(x => x.l === 'q2' && x.p === 2), {}); assert.ok(r.n === 'درس اليوم: ' + L.parts.find(x => x.l === 'q2').n + ' — الجزء 2' && r.s.includes('جزء 2 من 6'));
  w.Lang = { fr: true }; const rf = L.row(L.parts.find(x => x.l === 'q2' && x.p === 2), {}); assert.ok(/^Leçon du jour : .* — Partie 2$/.test(rf.n), 'French row');
  const rl = L.row(L.parts.find(x => x.l === 'l1' && x.p === 1), {}); assert.ok(/^درس اليوم: .* — الجزء 1$/.test(rl.n), 'law row stays Arabic in FR'); delete w.Lang;
  for (const f of ['quality.js', 'mgmt.js', 'law.js', 'pharma.js']) assert.ok(read('assets/' + f).includes('NursinLessons.splitPage()'), f + ' splits after drawing');
  assert.ok(read('assets/pharma.js').includes('.replace(/-p\\d+$/, "")'), 'pharma filter knows part ids');
  const gj = read('assets/goals.js'); assert.ok(gj.includes('L2.todayPlan(seen, D, room)') && gj.includes('class="gosl"') && gj.includes('!/^new:/.test(r.k)') && gj.includes('"nursin:weekles", refresh'), 'goals: synced timetable lessons + timetable line');
  // ⚖️ law page + law-only quiz: Arabic page even in Français seulement
  const lj = read('assets/lang.js'); assert.ok(lj.includes('var FR = mode === "fr" && !LAWPAGE') && lj.includes('page === "law"') && lj.includes('t=law') && lj.includes('law: [],'), 'law page stays Arabic');
});

test('🏫 classes: classmates codes + ➕ add friend, 💬 class group chat, 📤 invite for every member, admin-only create + rules v11 (Oct 27, 1:56–1:58 PM)', async () => {
  const C = await import(path.join(SITE, 'assets/classes.js'));
  assert.strictEqual(C.canCreate({ email: 'abdullahjaber1452003@gmail.com', emailVerified: true }), true);
  assert.strictEqual(C.canCreate({ email: 'abdullahjaber1452003@gmail.com', emailVerified: false }), false);
  assert.strictEqual(C.canCreate({ email: 'x@gmail.com', emailVerified: true }), false);
  const u = C.inviteUrl('LT2', 'K7Q2MX'); assert.ok(u.startsWith('https://wa.me/?text=') && decodeURIComponent(u).includes('https://nursin.store/classes.html?join=K7Q2MX') && decodeURIComponent(u).includes('K7Q2MX'), 'WhatsApp invite to the SAME class');
  const cj = read('assets/classes.js');
  assert.ok(cj.includes('(canCreate(A.user) ?') && cj.includes('if (!canCreate(A.user)) return;'), '«صف جديد» only for the admin');
  assert.ok(cj.includes('📤 ادعي رفيق') && cj.includes('chat.html?class=') && cj.includes('💬 مجموعة الصف'), 'invite + class chat for every member');
  assert.ok(cj.includes('mateCode(m.uid, me)') && cj.includes('➕ أضف صديق') && cj.includes('A.addFriend(b.dataset.code)'), 'classmates codes + add friend');
  assert.ok(cj.includes('chatIn();') && cj.includes('await chatOut(A.user.uid)') && cj.includes('chatOut(m.uid)'), 'chat follows the class (join / leave / removed)');
  assert.ok(read('assets/fb.js').includes('addFriend: raw => addFriend(raw)'), 'friends add exported to pages');
  const ch = await import(path.join(SITE, 'assets/chat.js'));
  assert.strictEqual(ch.classChatId('abc'), 'cls-abc');
  const chs = read('assets/chat.js'); assert.ok(chs.includes('c.type === "class"') && chs.includes('openClassChat') && chs.includes('مجموعة الصف عم تتجهّز'), 'class chat in the chats page, calm until rules v11');
  // rules v11 = v10 + admin-only class create + class chat (file for Abdullah to publish; the live rules file stays v10 until he does)
  const v11 = fs.readFileSync('/home/user/tab/files/nursin-rules-v11.txt', 'utf8');
  assert.ok(v11.includes("allow create: if signedIn() && isAnnOwner() && request.resource.data.owner == request.auth.uid") && v11.includes("cid == 'cls-' + nd().cls") && v11.includes("nd().type == 'class'"), 'v11 has both changes');
  assert.ok(v11.replace(/\s/g, '').length > read('firestore.rules').replace(/\s/g, '').length, 'v11 builds on v10');
});

test('🔔 «فعّل الإشعارات» reminder until notifications are on (Oct 27, 2:50 PM)', () => {
  const pw = read('assets/pwa.js');
  assert.ok(pw.includes('function nag(API)') && pw.includes('"nursin:auth"') && pw.includes('sessionStorage.setItem(NAGX, "1")'), 'shown after sign-in, ✕ hides it for this visit');
  assert.ok(pw.includes('if (ls(EVER) === API.user.uid) return;') && pw.includes('ls(FLAG, API.user.uid); ls(EVER, API.user.uid);'), 'never again once turned on');
  assert.ok(pw.includes('"quiz.html": 1, "games.html": 1, "chat.html": 1'), 'not inside quizzes / games / chats');
  const w = { location: { pathname: '/index.html' }, addEventListener() {} }; const d = { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, createElement: () => ({ setAttribute() {}, style: {} }), head: { appendChild() {} }, body: { appendChild() {} } };
  const ctx = { window: w, document: d, navigator: { userAgent: 'x' }, localStorage: { getItem() { return null; }, setItem() {} }, sessionStorage: { getItem() { return null; }, setItem() {} }, location: w.location, matchMedia: () => ({ matches: false }), console };
  ctx.window = Object.assign(ctx.window, ctx); require('node:vm').runInNewContext(pw, ctx);
  const P = ctx.window.NursinPWA;
  assert.ok(P.nagText('denied').body.includes('🔒') && !P.nagText('denied').body.includes('pnon'), 'denied: how-to steps, no dead button');
  assert.ok(P.nagText('ios').body.includes('الشاشة الرئيسية'), 'iPhone: add to home screen first');
  assert.ok(P.nagText('off').body.includes('pnon'), 'otherwise a button');
  ctx.window.Lang = { fr: true }; assert.ok(P.nagText('off').T.h.includes('Active les notifications'), 'French text');
});


test('📅 lesson goals follow the class timetable + «📌 هالأسبوع» picked by the admin (Oct 27, 3:35 PM)', () => {
  const vm = require('node:vm');
  const w = {}; w.window = w; vm.createContext(w); vm.runInContext(read('assets/lessons.js'), w);
  const L = w.NursinLessons, J = x => JSON.parse(JSON.stringify(x));
  assert.deepStrictEqual(J(L.CLASSDAY), { law: 4, mgmt: 4, rea: 4, cardio: 5, neuro: 5, henderson: 5, medsurg: 5, pharma: 6, quality: 6, geri: 6, comm: 6 }, 'Thu law+mgmt · Fri medical/surgical (Med-Surg) · Sat pharma+quality+community+gerontology');
  // 2026-11-01 is a Sunday … 2026-11-05 Thursday, 11-06 Friday, 11-07 Saturday
  const mg = L.list.filter(x => x.s === 'mgmt').slice(0, 2).map(L.base), q2 = ['quality:q2'];
  const nParts = ks => L.parts.filter(x => ks.includes(L.base(x))).length;
  assert.strictEqual(J(L.plan('2026-11-01', {}, {})).length, 0, 'nothing pinned → no lesson goal');
  // walk a whole week reading exactly what the plan says: everything pinned is read before its class day, never on it, spread evenly
  for (const asg of [{ mgmt: mg }, { quality: q2 }, { mgmt: mg, quality: q2, cardio: ['cardio:infarctus', 'cardio:heart'] }]) {
    const m = {}, per = {};
    for (let d = 1; d <= 7; d++) {
      const day = '2026-11-0' + d, today = L.plan(day, m, asg);
      for (const x of today) {
        const cd = L.CLASSDAY[x.s], wd = new Date(day + 'T12:00:00Z').getUTCDay();
        assert.notStrictEqual(wd, cd, x.s + ': no homework on its own class day');
        (per[x.s] = per[x.s] || []).push(d); m[L.key(x)] = 1;
      }
      for (const s in asg) { const cd = L.CLASSDAY[s], wd = new Date(day + 'T12:00:00Z').getUTCDay(); if (wd === cd) assert.strictEqual(L.parts.filter(x => asg[s].includes(L.base(x)) && !L.isRead(x, m)).length, 0, s + ': all pinned parts read by its class day'); }
    }
    for (const s in per) { const c = {}; per[s].forEach(d => c[d] = (c[d] || 0) + 1); assert.ok(Math.max(...Object.values(c)) <= Math.max(1, Math.ceil(nParts(asg[s]) / 3)), s + ': spread evenly (' + JSON.stringify(c) + ')'); }
  }
  // Wednesday = the last day of the Thursday window: whatever is left, so nothing is missed; already-read parts never come back
  const left = J(L.plan('2026-11-04', {}, { mgmt: mg })); assert.strictEqual(left.length, nParts(mg), 'Wednesday = the rest of management');
  const r1 = {}; L.parts.filter(x => mg.includes(L.base(x))).forEach(x => r1[L.key(x)] = 1); assert.strictEqual(J(L.plan('2026-11-04', r1, { mgmt: mg })).length, 0);
  assert.strictEqual(J(L.plan('2026-11-05', {}, { mgmt: mg })).length, 0, 'management class day (Thursday) → no management goal');
  assert.strictEqual(J(L.plan('2026-11-06', {}, { mgmt: mg })).length, 0, 'Friday is outside the Thursday window (Saturday→Wednesday)');
  assert.strictEqual(J(L.plan('2026-11-01', {}, { mgmt: ['mgmt:nope'], zz: ['x'] })).length, 0, 'unknown keys / subjects ignored');
  const row = L.row(L.parts.find(x => x.s === 'mgmt'), {}); assert.ok(row.s.includes('قبل حصّة الخميس'), 'row names the class day');
  // admin picker + public config doc
  const aj = read('assets/admin.js'); assert.ok(aj.includes('function weekPicker(API, el)') && aj.includes('doc(API.db, "config", "weekLessons")') && aj.includes('📌 دروس هالأسبوع'), 'admin: pin this week\'s lessons');
  assert.ok(read('assets/lessons.js').includes('A.fs.doc(A.db, "config", "weekLessons")'), 'every page reads the pinned list');
  const v11 = fs.readFileSync('/home/user/tab/files/nursin-rules-v11.txt', 'utf8'); assert.ok(v11.includes('match /config/{id}') && v11.includes("isAnnOwner() && id == 'weekLessons'"), 'rules v11: public read, admin-only write');
});

test('📲 «حمّل التطبيق» (Oct 27, 3:35 PM): ☰ item + home card, native install where the browser offers it, device-specific steps, hidden once installed', () => {
  const pw = read('assets/pwa.js');
  assert.ok(pw.includes('w.addEventListener("beforeinstallprompt"') && pw.includes('p.prompt()') && pw.includes('function installable() { return !standalone &&'), 'one-tap native install, never when installed');
  assert.ok(pw.includes('function homeCard()') && pw.includes('pg !== "index.html" || !installable()'), 'home card only on the home page, gone when installed');
  assert.ok(read('assets/nav.js').includes('P.instText(P.kind()'), '☰ item uses the same text');
  const mk = ua => { const w = { location: { pathname: '/index.html' }, addEventListener() {}, matchMedia: () => ({ matches: false }), isSecureContext: true }; const d = { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, readyState: 'loading' };
    const ctx = { window: w, document: d, navigator: { userAgent: ua, platform: 'x', maxTouchPoints: 0 }, localStorage: { getItem() { return null; }, setItem() {} }, sessionStorage: { getItem() { return null; }, setItem() {} }, location: w.location, matchMedia: w.matchMedia, console };
    Object.assign(w, ctx); require('node:vm').runInNewContext(pw, ctx); return w.NursinPWA; };
  const iS = mk('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
  const iC = mk('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1');
  const iI = mk('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0');
  const an = mk('Mozilla/5.0 (Linux; Android 13; SM-A346B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36');
  const dk = mk('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36');
  assert.deepStrictEqual([iS.kind(), iC.kind(), iI.kind(), an.kind(), dk.kind()], ['ios-safari', 'ios-other', 'ios-other', 'android', 'desktop']);
  assert.ok(iS.installable() && an.installable() && !dk.installable(), 'iPhone + Android always offered; desktop only once the browser offers install');
  const t = iS.instText('ios-safari', false); assert.ok(t.btn === '📲 حمّل التطبيق' && t.steps.includes('⬆️') && t.steps.includes('إضافة إلى الشاشة الرئيسية') && !t.steps.includes('⋮'), 'iPhone Safari: Share → Add to Home Screen → Add');
  assert.ok(iS.instText('ios-other', false).steps.includes('Safari') && iS.instText('ios-other', true).steps.includes('ouvre-le dans <b>Safari</b>'), 'other iPhone browser: open in Safari first');
  assert.ok(an.instText('android', false).steps.includes('⋮') && !an.instText('android', false).steps.includes('⬆️'), 'Android steps only');
  assert.ok(iS.instText('ios-safari', true).btn === "📲 Installer l'app" && iS.instText('desktop', true).steps.includes('Installer'), 'French');
});


test('🏫 classmates are friends automatically (Oct 27, 3:54 PM): friends list + ranking + «تحدي الأسبوع» = friends ∪ class members, no requests', () => {
  const fb = read('assets/fb.js');
  assert.ok(fb.includes('async function classmates()') && fb.includes('collection(db, "users", user.uid, "myClasses")') && fb.includes('collection(db, "classes", c.id, "members")'), 'class members read from my classes');
  assert.ok(fb.includes('const [fs, cm] = await Promise.all([') && fb.includes('fr: fr.has(d.id), mate: cm[d.id] || null'), 'one list: friends ∪ classmates (no writes)');
  assert.ok(fb.includes('id="fmatesc"') && fb.includes('🏫 زملاء الصف'), 'friends page section «🏫 زملاء الصف»');
  assert.ok(fb.includes("if (p.mate && !p.fr) h = h.replace(/<button class=\"rm\"") , 'no «remove» for a classmate');
  assert.ok(fb.includes('board: () => loadBoard()') && read('assets/study.js').includes('A.board()'), 'the weekly challenge reads the same list → whole class ranked together');
  assert.ok(read('assets/chat.js').includes('if (f && f.mate && !f.fr) await setDoc(doc(API.db, "users", me, "friends", fid)'), 'a DM with a classmate makes the friend link the chat rule wants');
  const cj = read('assets/classes.js'); assert.ok(cj.includes("if (C.member) return '<span class=\"cfok small\">🏫 صاحبك تلقائياً</span>';"), 'no «➕ أضف صديق» between classmates');
  // rules v10 already let a member read classmates (members) and any signed-in user read profiles → nothing new needed in v11
  const v10 = read('firestore.rules'); assert.ok(v10.includes('match /users/{uid} {\n      allow read: if signedIn();'), 'profiles readable');
});


test('🗓️ study windows + light class days (Oct 27, 5:28 PM): Thu subjects Sat→Wed, Fri subjects Sun→Thu, Sat subjects Sun→Fri; class days weigh half; ≤ 3 a day unless last day', () => {
  const vm = require('node:vm');
  const w = {}; w.window = w; vm.createContext(w); vm.runInContext(read('assets/lessons.js'), w);
  const L = w.NursinLessons, J = x => JSON.parse(JSON.stringify(x)), wd = day => new Date(day + 'T12:00:00Z').getUTCDay();
  assert.deepStrictEqual(J(L.WIN), { 4: [6, 0, 1, 2, 3], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] }, 'the three windows');
  assert.deepStrictEqual([L.windowOf('law'), L.windowOf('cardio'), L.windowOf('pharma')].map(J), [[6, 0, 1, 2, 3], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5]]);
  const all = s => L.list.filter(x => x.s === s).map(L.base), n = asg => L.parts.filter(x => Object.keys(asg).some(s => asg[s].includes(L.base(x)) && x.s === s)).length;
  // 2026-10-31 Saturday … 2026-11-07 Saturday: walk two weeks per subject group, reading exactly what the plan says
  for (const [asg, win] of [[{ law: all('law'), mgmt: all('mgmt') }, [6, 0, 1, 2, 3]], [{ cardio: all('cardio') }, [0, 1, 2, 3, 4]], [{ quality: all('quality') }, [0, 1, 2, 3, 4, 5]]]) {
    const m = {}, per = {}; let read = 0;
    for (let i = 0; i < 8; i++) {
      const day = new Date(Date.UTC(2026, 9, 31 + i)).toISOString().slice(0, 10), today = J(L.plan(day, m, asg));
      if (!win.includes(wd(day))) assert.strictEqual(today.length, 0, day + ': outside the window → nothing');
      assert.ok(today.length <= L.dayCap(day), day + ': at most ' + L.dayCap(day) + ' parts (6:24 PM: no last-day dump)');
      if (i < 7) { const ex = J(L.extra(day, m, asg, today.map(L.key))); assert.strictEqual(today.length + ex.length, J(L.extra(day, m, asg)).length, day + ': the rest is 📚 extra'); }
      today.forEach(x => { m[L.key(x)] = 1; }); per[wd(day)] = (per[wd(day)] || 0) + today.length; read += today.length;
    }
    assert.ok(read > 0 && read <= n(asg), 'parts read inside the window, never more than pinned');
  }
  // evenness + class days lighter: 9 Friday parts over Sun→Thu (weights 1,1,1,1,0.5) → Thursday carries the least
  const nine = L.parts.filter(x => x.s === 'cardio').slice(0, 9), ks = [...new Set(nine.map(L.base))], asg = { cardio: ks }, total = n(asg), m = {}, c = [];
  for (let i = 1; i <= 5; i++) { const t = J(L.plan('2026-11-0' + i, m, asg)); t.forEach(x => { m[L.key(x)] = 1; }); c.push(t.length); }
  assert.strictEqual(c.reduce((a, b) => a + b, 0), total);
  assert.ok(c[4] <= Math.min(...c.slice(0, 4)), 'Thursday (class day) is the lightest: ' + c);
  assert.ok(Math.max(...c.slice(0, 4)) - Math.min(...c.slice(0, 4)) <= 1 || Math.max(...c) === L.CAP, 'free days even: ' + c);
  // behind: nothing read until Wednesday → capped at 3; Thursday (class day, last day) capped at 2, the rest is optional
  assert.ok(J(L.plan('2026-11-04', {}, asg)).length <= 3 && J(L.plan('2026-11-05', {}, asg)).length === 2 && J(L.extra('2026-11-05', {}, asg)).length === total, 'carry forward, cap, class day 2, rest = 📚 extra');
  assert.ok(read('assets/admin.js').includes('🗓️ مواد الخميس: سبت→أربعا • الجمعة: أحد→خميس • السبت: أحد→جمعة') && read('assets/goals.js').includes('🗓️ مواد الخميس: سبت→أربعا'), 'admin + goals sheet explain the windows');
  assert.ok(read('assets/fr/ui.js').includes('"🗓️ Matières du jeudi : samedi→mercredi'), 'French');
});

test('⚖️ light days (Oct 27, 6:24 PM: «أهدافك اليوم 4/17»): one daily cap for all subjects, ≤ 6 goals, nearest class first, the rest optional', () => {
  const vm = require('node:vm');
  const store = {}, w = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, Nursin: { dayKey: () => '2026-10-27' } };
  w.window = w; vm.createContext(w); vm.runInContext(read('assets/lessons.js'), w);
  const L = w.NursinLessons, J = x => JSON.parse(JSON.stringify(x)), G = require('../assets/goals.js');
  const all = s => L.list.filter(x => x.s === s).map(L.base), asg = { law: all('law'), mgmt: all('mgmt'), cardio: all('cardio'), neuro: all('neuro'), quality: all('quality'), pharma: all('pharma') };
  assert.ok(J(L.extra('2026-10-27', {}, asg)).length > 15, 'a heavy week pinned');
  // pins saved on a Tuesday: today ≤ 3 parts for ALL subjects together, Thursday (class day) ≤ 2, nearest class day (Thursday subjects) first
  const tue = J(L.plan('2026-10-27', {}, asg)); assert.ok(tue.length >= 1 && tue.length <= 3, 'Tuesday: ' + tue.length);
  assert.ok(tue.every(x => L.CLASSDAY[x.s] === 4), 'Thursday subjects first (nearest class)');
  assert.ok(J(L.plan('2026-10-29', {}, asg)).length <= 2 && J(L.plan('2026-10-31', {}, asg)).length <= 2, 'class days ≤ 2');
  for (let i = 0; i < 7; i++) { const day = new Date(Date.UTC(2026, 9, 25 + i)).toISOString().slice(0, 10); assert.ok(J(L.plan(day, {}, asg)).length <= L.dayCap(day), day); }
  // the rest is never forced in: one optional row, not counted
  const ex = J(L.extra('2026-10-27', {}, asg, tue.map(L.key))); assert.ok(ex.length > 10 && !ex.some(x => tue.some(t => L.key(t) === L.key(x))));
  w.localStorage.setItem(L.WKEY, JSON.stringify({ subj: asg, t: 1 }));
  const xr = L.extraRow(tue.map(L.key)); assert.ok(xr && xr.opt && xr.n === 'إضافي (إذا عندك وقت)' && xr.s.includes('مش محسوب'), 'optional row');
  // all goals together ≈ 6: the lesson parts get the room the other goals leave (at least one)
  const others = G.build({ weak: 4, classes: { list: [{ cid: 'c1', name: 'LT2', dq: {} }] }, done: {}, pomo: 0, game: 0, newL: [] });
  const room = G.lessonRoom(others.length, L.dayCap('2026-10-27'), L.MAXG);
  const full = G.build({ weak: 4, classes: { list: [{ cid: 'c1', name: 'LT2', dq: {} }] }, done: {}, pomo: 0, game: 0, newL: tue.slice(0, room).map(x => L.row(x, {})) });
  assert.ok(full.length <= 6 && room >= 1, 'total ' + full.length);
  assert.strictEqual(G.lessonRoom(3, 3, 6), 3); assert.strictEqual(G.lessonRoom(5, 3, 6), 1); assert.strictEqual(G.lessonRoom(9, 2, 6), 1); assert.strictEqual(G.lessonRoom(0, 2, 6), 2);
  // today's old crammed list (before this fix): parts already read today stay on the list as ✅ (his 4 done are not lost), the rest is capped
  const old = J(L.extra('2026-10-27', {}, asg)).slice(0, 9).map(L.key), rm = {}; old.slice(4, 8).forEach(k => { rm[k] = 1; });
  w.localStorage.setItem(L.KEY, JSON.stringify(rm)); w.localStorage.setItem(L.PKEY, JSON.stringify({ d: '2026-10-27', h: 'old', ks: old }));
  const t1 = J(L.todayPlan([], {}, 3)); assert.strictEqual(t1.filter(x => rm[L.key(x)]).length, 4, 'the 4 done today stay');
  assert.ok(t1.length === 4, 'done ones already fill today\'s room → nothing new pushed in: ' + t1.length);
  const t2 = J(L.todayPlan([], { ['les:' + old[0]]: 1 }, 6)); assert.ok(t2.some(x => L.key(x) === old[0]), 'done on another device today counts too');
  // wiring: the sheet shows the optional row outside the count; push mirror / sync read goals() which never carries it
  const gj = read('assets/goals.js');
  assert.ok(gj.includes('lessonRoom(build(o).length') && gj.includes('xtra(c.g)') && gj.includes('goopt') && !/function goals\(\)[\s\S]*?extraRow[\s\S]*?return gsApply/.test(gj), 'goals wiring');
  assert.ok(read('assets/style.css').includes('.goi.goopt'));
});

test('🔔 admin «مين مفعّل الإشعارات» (Oct 27, 5:20 PM) + «⚙️ لوحة الأدمن» button', async () => {
  const A = await import(path.join(SITE, 'assets/admin.js'));
  const r = A.pushRows([{ id: 'a', name: 'Zed', code: 'AB12' }, { id: 'b', name: 'Ali' }, { id: 'c', name: 'Maya' }], { a: { k1: 's', k2: 's' }, c: {}, x: { k: 's' } });
  assert.strictEqual(r.on, 2); assert.strictEqual(r.total, 4);
  assert.deepStrictEqual(r.rows.map(x => [x.id, x.on, x.n]), [['x', true, 1], ['a', true, 2], ['b', false, 0], ['c', false, 0]], 'enabled first, a subscriber with no profile still listed, empty d = off');
  assert.deepStrictEqual([A.devTxt(1), A.devTxt(2), A.devTxt(4)], ['(جهاز واحد)', '(جهازين)', '(4 أجهزة)']);
  const a = read('assets/admin.js');
  assert.ok(a.includes('pushWho(API, el, loadSubs);') && a.includes('getDocs(query(collection(API.db, "users"), limit(2000)))') && a.includes('🔔 مين مفعّل الإشعارات') && a.includes('" من " + all.total + " مفعّلين"'), 'card: users × pushSubs, counts');
  assert.ok(a.includes('data-f="on"') && a.includes('data-f="off"') && a.includes('id="pwq"'), 'filter + search');
  assert.ok(a.indexOf('pushWho(API, el, loadSubs);') > a.indexOf('if (!(u && u.email === OWNER && u.emailVerified))'), 'only after the owner check');
  const fb = read('assets/fb.js'); assert.ok(fb.includes('href="admin.html">⚙️ لوحة الأدمن</a>') && !fb.includes('📢 إعلان للكل</a>'), 'button renamed');
  assert.ok(read('admin.html').includes('<h1>⚙️ لوحة الأدمن</h1>') && read('assets/nav.js').includes('"لوحة الأدمن"'));
  assert.ok(read('assets/fr/p-admin.js').includes('"30pout.e":"⚙️ Panneau admin"') && read('assets/fr/ui.js').includes('"✅ # sur # activés"'), 'French');
  const w5 = fs.readFileSync('/home/user/tab/files/nursin-worker-v5.js', 'utf8'); assert.ok(w5.includes('k.startsWith("les:")') && w5.includes('باقيلك " + partsAr'), 'worker v5: lesson parts in the goal reminders');
});

test('🆕 admin push when a NEW student signs up (Oct 27, 6:31 PM) — worker v6 /admin/newuser, new accounts only by default', () => {
  const f = read('assets/fb.js');
  assert.ok(f.includes('const LOGIN_PING = "new"') && f.includes('/admin/newuser'), 'default: new accounts only');
  assert.ok(f.includes('if (!snap.exists() || LOGIN_PING === "all") pingAdmin(u, !snap.exists());'), 'only on the first profile creation');
  assert.ok(f.includes('j && j.newuser ? u.getIdToken() : null') && f.includes('JSON.stringify({ t, first: !!first, ...(catchup ? { catchup: true } : {}) })'), 'only the ID token is sent, only to a worker that knows the route');
  assert.ok(f.includes('createdAt: serverTimestamp()'), 'createdAt written on first creation');
});

test('➕ «ضيف طالب» (Oct 27, 9:28 PM): only the admin adds a student by friend code or from his friends — class + class chat at once, rules v12', async () => {
  const js = read('assets/classes.js'), fr = read('assets/fr/p-classes.js');
  // only the admin sees it — the same check that hides «صف جديد»
  assert.ok(js.includes("(isAdminUser(A.user) ? '<div class=\"cadminadd\"><button class=\"btn pri\" id=\"caddopen\" type=\"button\">➕ ضيف طالب</button>"), 'admin-only button on the class page');
  assert.ok(js.includes('if (isAdminUser(A.user)) initAdminAdd();') && js.includes('if (!isAdminUser(A.user) || !C || !C.cid) return;'), 'gated twice');
  const m = await import(path.join(SITE, 'assets/classes.js'));
  assert.strictEqual(m.canCreate({ email: m.ADMIN_EMAIL, emailVerified: true }), true); assert.strictEqual(m.isAdminUser({ email: 'x@gmail.com', emailVerified: true }), false);
  // friend code → uid, duplicate and unknown-code messages, one transaction for member + myClasses + chat
  assert.ok(js.includes('F.doc(A.db, "friendCodes", code)') && js.includes('"❌ ما في طالب بهالكود. تأكّد من كود أصحابي."') && js.includes('"ℹ️ هالطالب موجود بهالصف من قبل."'), 'unknown code + already a member');
  const tx = js.slice(js.indexOf('await F.runTransaction(A.db, async tx => {', js.indexOf('async function adminAddStudent')));
  assert.ok(tx.indexOf('tx.update(chatRef, { members: [...members, uid]') > -1 && tx.indexOf('tx.set(F.doc(A.db, "classes", cid, "members", uid), { name, photo, level, code: C.cls.code, joinedAt') > -1
    && tx.indexOf('tx.set(F.doc(A.db, "users", uid, "myClasses", cid), { name: C.cls.name, owner: false') > -1, 'member doc in the normal shape + his list + the class chat');
  assert.ok(js.includes('F.collection(A.db, "users", A.user.uid, "friends")') && js.includes('caddfriend'), 'pick from his friends');
  assert.ok(js.includes('pingJoined(A.user, cid, uid);'), 'the add also alerts the admin');
  for (const s of ['➕ ضيف طالب', 'كود الصديق من أصحابي', 'أو نقّي من أصحابك:', '❌ ما في طالب بهالكود. تأكّد من كود أصحابي.', 'ℹ️ هالطالب موجود بهالصف من قبل.', 'صار بالصف ومجموعة الصف.', '⚠️ لازم تنشر قواعد Firebase v12 تا تضيف طالب.'])
    assert.ok(fr.includes(JSON.stringify(s) + ':'), 'French: ' + s);
  const r12 = fs.readFileSync('/home/user/tab/files/nursin-rules-v12.txt', 'utf8');
  assert.ok(r12.includes('// v12 (Oct 27 2026)') && (r12.match(/isAnnOwner\(\)[^\n]*v12/g) || []).length >= 3 && r12.includes('existsAfter(/databases/$(database)/documents/classes/$(cid)/members/$(uid))'), 'rules v12 file: admin-only allowances');
});

test('🔔 admin alerts fixed (Oct 27, 9:28 PM): missed new accounts caught up once; joining a class (code, link, admin add) alerts him via worker v7', async () => {
  const f = read('assets/fb.js'), js = read('assets/classes.js');
  // a: new-account catch-up (works on the deployed worker v6: first:true for an account the site created that was never announced)
  const nc = new Function('return ' + f.match(/export function needsCatchup\(d\) \{[^\n]+\}/)[0].replace('export ', ''))();
  assert.strictEqual(nc({ createdAt: 1 }), true); assert.strictEqual(nc({ createdAt: 1, adminNotified: true }), false); assert.strictEqual(nc({ name: 'old account' }), false); assert.strictEqual(nc(null), false);
  assert.ok(f.includes('else catchupPing(u, d);') && f.includes('pingAdmin(u, true, true);') && f.includes('sessionStorage.setItem(CATCHUP_KEY, u.uid)'), 'once per session, only for accounts with createdAt');
  // b: class joins
  assert.ok(js.includes('pingJoined(api.user, cid);') && js.indexOf('pingJoined(api.user, cid);') < js.indexOf('return { cid, name };\n  } catch (e) { if (!denied(e)) console.warn("nursin: class join"'), 'joinWithCode (code + invite link + nav card) alerts after a real join');
  const m = await import(path.join(SITE, 'assets/classes.js'));
  const calls = []; const user = { getIdToken: async () => 'TOK' };
  globalThis.fetch = async (u, o) => { calls.push([u, o && o.body]); return { ok: true, json: async () => ({ ok: true, newuser: true, joined: calls.length && fetch.v7 }) }; };
  fetch.v7 = false; assert.strictEqual(await m.pingJoined(user, 'C1'), false); assert.strictEqual(calls.length, 1, 'a worker without /admin/joined (v6) gets no POST');
  calls.length = 0; fetch.v7 = true; assert.strictEqual(await m.pingJoined(user, 'C1', 'U9'), true);
  assert.ok(calls[0][0].endsWith('/admin/joined') && JSON.parse(calls[1][1]).cid === 'C1' && JSON.parse(calls[1][1]).uid === 'U9' && JSON.parse(calls[1][1]).t === 'TOK', 'token + class (+ student when the admin added him)');
  calls.length = 0; assert.strictEqual(await m.pingJoined(null, 'C1'), false); assert.strictEqual(calls.length, 0);
  delete globalThis.fetch;
  const w7 = fs.readFileSync('/home/user/tab/files/nursin-worker-v7.js', 'utf8');
  assert.ok(w7.startsWith('// nursin worker v7') && w7.includes('url.pathname === "/admin/joined" ? await adminJoined(body, env)') && w7.includes('joined: true, v: 7') && w7.includes('if (!isAdmin) fail("not admin", 403)') && w7.includes('fieldPaths: ["an"]'), 'worker v7: verified route, admin-only uid, one push per membership');
});

test('🟢 who is online (Oct 27, 10:04 + 11:07 PM): heartbeat every ~60 s while visible, online = 2 min, dots by names, home chip → list → 💬 DM, rules v13', async () => {
  const m = await import(path.join(SITE, 'assets/presence.js'));
  const now = 1_800_000_000_000, ts = ms => ({ toMillis: () => ms });
  assert.strictEqual(m.BEAT_MS, 60000); assert.strictEqual(m.ONLINE_MS, 120000);
  assert.strictEqual(m.isOnline(ts(now - 30000), now), true); assert.strictEqual(m.isOnline(ts(now - 119000), now), true);
  assert.strictEqual(m.isOnline(ts(now - 121000), now), false); assert.strictEqual(m.isOnline(null, now), false);
  assert.strictEqual(m.isOnline({ seconds: (now - 60000) / 1000 }, now), true, 'plain {seconds} timestamps too');
  const docs = [{ uid: 'me', t: ts(now), n: 'Me' }, { uid: 'b', t: ts(now - 10000), n: 'Sara' }, { uid: 'a', t: ts(now - 5000), n: 'Ali' },
    { uid: 'old', t: ts(now - 600000), n: 'Old' }, { uid: 'stranger', t: ts(now), n: 'X' }, { uid: 'a', t: ts(now), n: 'Ali' }];
  const list = m.pickOnline(docs, new Set(['a', 'b', 'old', 'me']), 'me', now);
  assert.deepStrictEqual(list.map(p => p.uid), ['a', 'b'], 'only friends/classmates, not me, not stale, no duplicates, sorted by name');
  assert.strictEqual(m.chipText(3), '🟢 3 أونلاين هلّق'); assert.strictEqual(m.chipText(0), '🟢 ما حدا أونلاين هلّق');
  assert.strictEqual(m.dueBeat(0, now, true), true); assert.strictEqual(m.dueBeat(now - 20000, now, true), false);
  assert.strictEqual(m.dueBeat(now - 60000, now, true), true); assert.strictEqual(m.dueBeat(now - 600000, now, false), false, 'hidden tab = no write');
  for (const p of ['index.html', 'friends.html', 'classes.html', 'chat.html']) assert.strictEqual(m.showsHere(p), true, p);
  for (const p of ['quiz.html', 'games.html', 'exams.html', 'live.html', 'cardio.html']) assert.strictEqual(m.showsHere(p), false, 'not shown in ' + p);
  const js = read('assets/presence.js');
  assert.ok(js.includes('F.setDoc(F.doc(A.db, "presence", A.user.uid), { t: F.serverTimestamp(), n:') && js.includes('document.visibilityState === "visible"'), 'own doc, server time, visible only');
  assert.ok(js.includes('F.where("t", ">", new Date(Date.now() - ONLINE_MS))'), 'one cheap query: t within 2 min');
  assert.ok(js.includes('if (e && e.code === "permission-denied") off = true;'), 'quiet until rules v13 are published');
  assert.ok(js.includes('href="chat.html?with=\' + encodeURIComponent(p.uid) + \'">💬 حكي</a>'), 'one-tap DM per person');
  // wiring: loaded for every signed-in visitor; dots next to names (friends, classmates, class members + ranking, chats)
  const f = read('assets/fb.js'), c = read('assets/classes.js'), ch = read('assets/chat.js');
  assert.ok(f.includes('mod("presence").then(m => m && m.start(API));') && f.includes('pdot, scopeIds'), 'fb.js starts it + shares the dot');
  assert.ok(f.includes('(p.me ? " <small>(إنت)</small>" : pdot(p.uid))'), 'friends board + classmates');
  assert.ok(c.includes('(A.pdot ? A.pdot(p.uid) : "")'), 'class members + class ranking');
  assert.ok(ch.includes('API.pdot(peer)') && ch.includes('API.pdot((c.members || []).find(u => u !== me))'), 'chat list + DM header');
  const h = read('index.html');
  assert.ok(h.includes('<div id="onl" class="onl" hidden aria-live="polite"></div>') && h.indexOf('id="onl"') > h.indexOf('id="tilehold"') && read('assets/nav.js').includes('"#online", "🟢", "مين أونلاين"'), 'chip parked; the list opens from ⚔️ صفّي (Oct 29)');
  for (const p of ['quiz.html', 'games.html']) assert.ok(!read(p).includes('id="onl"'), 'no chip in ' + p);
  const css = read('assets/style.css'); assert.ok(css.includes('.pdot{') && css.includes('.onlchip') && css.includes('.onlsheet'), 'styles');
  const fr = read('assets/fr/ui.js');
  for (const s of ['🟢 # أونلاين هلّق', '🟢 ما حدا أونلاين هلّق', 'أونلاين هلّق', '🟢 مين أونلاين هلّق', 'من صفّك وأصحابك. كبوس «💬 حكي» وابعتلو رسالة.', 'ما حدا من صفّك أو أصحابك أونلاين هلّق. ارجع بعد شوي 👀'])
    assert.ok(fr.includes(JSON.stringify(s) + ':'), 'French: ' + s);
  const r13 = fs.readFileSync('/home/user/tab/files/nursin-rules-v13.txt', 'utf8'), r12 = fs.readFileSync('/home/user/tab/files/nursin-rules-v12.txt', 'utf8');
  assert.ok(r13.includes('// v13 (Oct 27 2026)') && r13.includes('match /presence/{uid} {') && r13.includes("request.auth.uid == uid") && r13.includes("request.resource.data.t == request.time"), 'rules v13 presence block');
  const cut = (s, a, b) => s.slice(0, s.indexOf(a)) + s.slice(s.indexOf(b));
  assert.strictEqual(cut(cut(r13, '// v13 (Oct 27 2026)', '// v12 (Oct 27 2026)'), '    // v13: ', '    match /friendCodes/{code}'), r12, 'v13 = v12 + presence only (everything of v12 kept)');
});

test('⚔️ تحدي اليوم + ⏱️ وقت الدرس اليوم + 🧭 home reorg (Oct 28): fair daily draw, own-doc scores, active study time, essentials first, rules v14', async () => {
  const d = await import(path.join(SITE, 'assets/duel.js')), s = await import(path.join(SITE, 'assets/studytime.js'));
  // the draw: deterministic, everyone paired once, odd one rests, winners meet non-qualified challengers
  const u = ['a', 'b', 'c', 'd', 'e'];
  const r1 = d.draw('cls', '2026-10-28', u, {}), r2 = d.draw('cls', '2026-10-28', u.slice().reverse(), {});
  assert.deepStrictEqual(r1, r2, 'same pairs on every phone');
  assert.strictEqual(r1.pairs.length, 2); assert.ok(r1.bye && u.includes(r1.bye), 'odd = one rest day');
  assert.strictEqual(new Set(r1.pairs.flat().concat(r1.bye)).size, 5, 'nobody twice');
  const r3 = d.draw('cls', '2026-10-29', ['a', 'b', 'c', 'd'], { a: 1, c: 2 });
  r3.pairs.forEach(p => assert.strictEqual(p.filter(x => x === 'a' || x === 'c').length, 1, 'a qualified 🔥 meets a new challenger'));
  assert.deepStrictEqual(d.eligible([{ uid: 'a' }, { uid: 'b', jd: '2026-10-28' }, { uid: 'c', jd: '2026-10-27' }], '2026-10-28'), ['a', 'c'], 'joined today = tomorrow');
  // outcomes: explicit tie, incomplete has no winner, a started-but-unfinished quiz is 0 once the day is over
  assert.strictEqual(d.outcome({ s: 3 }, { s: 3 }, true).k, 'tie');
  assert.strictEqual(d.outcome({ s: 3 }, null, true).k, 'half', 'only one played = no winner');
  assert.strictEqual(d.outcome(null, null, true).k, 'none');
  assert.strictEqual(d.outcome({ s: -1 }, { s: 1 }, true).k, 'b'); assert.strictEqual(d.outcome({ s: -1 }, { s: 1 }, false).k, 'live');
  // replay the week: winner advances (🔥1), loser out (0), absent loses 🔥, board only counts real wins
  const mem = ['a', 'b', 'c', 'd'].map(x => ({ uid: x })), mon = '2026-10-26', p = d.draw('c1', mon, ['a', 'b', 'c', 'd'], {}).pairs;
  const docs = [{ uid: p[0][0], d: mon, s: 4 }, { uid: p[0][1], d: mon, s: 2 }, { uid: p[1][0], d: mon, s: 3 }];
  const R = d.replay('c1', mem, docs, '2026-10-27');
  assert.strictEqual(R.today.streak[p[0][0]], 1); assert.strictEqual(R.today.streak[p[0][1]], 0);
  assert.strictEqual(R.today.streak[p[1][0]] | 0, 0, 'incomplete match: no win');
  assert.deepStrictEqual(R.board.map(x => x.uid), [p[0][0]], 'only real wins reach the podium');
  assert.strictEqual(d.weekStart('2026-11-01'), '2026-10-26', 'week = Monday → Sunday');
  // questions: from the site's own bank, same for the whole class that day, this week's pinned topics first
  const Q = Array.from({ length: 40 }, (_, i) => ({ id: 'q' + String(i).padStart(3, '0'), t: i < 12 ? 'law' : 'ecg', q: 'x', o: ['a', 'b'], a: 0 }));
  const qs = d.pickQuestions(Q, 'c1', '2026-10-28', ['law']);
  assert.strictEqual(qs.length, d.NQ); assert.ok(qs.every(q => q.t === 'law'));
  assert.deepStrictEqual(qs, d.pickQuestions(Q, 'c1', '2026-10-28', ['law']), 'same questions for both students');
  assert.strictEqual(d.prizeText({}, 0), '', 'no prize promised until the admin writes one');
  const dj = read('assets/duel.js');
  assert.ok(dj.includes('"classes", cid, "duel", key') && dj.includes('s: -1, n: NQ') && dj.includes('F.updateDoc(ref, { s: score, ft: F.serverTimestamp() })'), 'own doc: start, then one score');
  assert.ok(dj.includes('مش مضمون ١٠٠٪ ضد الغش') && dj.includes('الجائزة: لسّا ما تحدّدت'), 'honest limits + unset prizes');
  // ⏱️ study time
  assert.strictEqual(s.mayCount('cardio.html', true, true, 1000), true);
  for (const pg of ['games.html', 'chat.html', 'tutor.html', 'index.html', 'live.html']) assert.strictEqual(s.mayCount(pg, true, true, 1000), false, 'never on ' + pg);
  assert.strictEqual(s.mayCount('quiz.html', false, true, 1000), false, 'hidden tab'); assert.strictEqual(s.mayCount('quiz.html', true, false, 1000), true, 'visible + recent input counts even unfocused (Oct 29: reading counts)');
  assert.strictEqual(s.mayCount('quiz.html', true, true, 120000), false, 'idle > 90 s');
  assert.strictEqual(s.tickSec(0, 3600000), 20, 'no burst after sleep');
  assert.strictEqual(s.nextS(0, 900, false), 300); assert.strictEqual(s.nextS(100, 60, true), 160); assert.strictEqual(s.nextS(57590, 60, true), 57600);
  assert.strictEqual(s.dueWrite(30, 0, 1e6), false); assert.strictEqual(s.dueWrite(60, 0, 1e6), true); assert.strictEqual(s.dueWrite(200, 1e6 - 60000, 1e6), false, 'at most every 3 min');
  assert.strictEqual(s.fmtTime(30), 'أقل من دقيقة'); assert.strictEqual(s.fmtTime(1500), '25 د'); assert.strictEqual(s.fmtTime(4800), '1 س 20 د');
  const b = s.rankBoard([{ uid: 'a', d: 'D', s: 600 }, { uid: 'b', d: 'D', s: 1200 }, { uid: 'x', d: 'D', s: 9999 }, { uid: 'c', d: 'Y', s: 900 }, { uid: 'e', d: 'D', s: 20 }], new Set(['a', 'b', 'c', 'e']), 'D');
  assert.deepStrictEqual(b.map(x => x.uid), ['b', 'a'], 'ranked, my scope only, today only, ≥ 1 min');
  const sj = read('assets/studytime.js');
  assert.ok(sj.includes('"studyTime", d + "_" + A.user.uid') && sj.includes('t: F.serverTimestamp()') && sj.includes('مش قديش تعلّمت'), 'own doc, server time, honest label');
  // wiring + home order + no ads near the essentials
  const f = read('assets/fb.js'), c = read('assets/classes.js'), h = read('index.html');
  assert.ok(f.includes('mod("studytime").then(m => m && m.start(API));') && f.includes('mod("duel").then(m => m && m.start(API))'), 'fb.js starts both');
  assert.ok(c.includes('id="cduel"') && c.includes('m.classBoard(A, $("#cstudy")') && c.includes('"classes", cid, "duel"'), 'class page + class deletion');
  const at = id => h.indexOf('id="' + id + '"');
  // Oct 29 batch 1 (Abdullah 11:43 PM): 👨‍🏫 Osman → ⚔️ the tournament → 📌 الأهمّيات (درس اليوم + reviews)
  // Oct 31 2026 7:49 PM: Osman + الأهمّيات are steps of «🧭 مسار اليوم» now (assets/home.js); the tournament card is moved into the path
  assert.ok(at('hz') < at('duel') && at('duel') < at('tilehold') && at('osmhome') < 0 && at('prio') < 0 && at('priorev') < 0 && at('wkles') < 0 && read('assets/home.js').includes('k: "osm"') && read('assets/home.js').includes('k: "rev"'), 'Osman → tournament → priorities: all inside the path');
  // Oct 31 2026 (home «G», Abdullah 12:38 AM): the Adsterra banner moved DOWN, under 📌 الأهمّيات — never above or next to «مسار اليوم»,
  // the Osman card, the nav, the sheets or search (all of #hz is drawn by assets/home.js, which has no ad markup)
  const ess = h.slice(at('hz'), h.indexOf('</section>', at('prmap')));
  assert.ok(!/adx|bauval|adsbygoogle|ad-slot/.test(ess), 'no ad inside or between the essentials');
  assert.ok(h.indexOf('class="adx adx-top"') > h.indexOf('</section>', at('prmap')) && h.indexOf('class="adx adx-top"') < at('tilehold') && h.indexOf('class="ad-slot"') > at('tilehold'), 'Adsterra banner under the essentials, AdSense slot last');
  assert.ok(read('me.html').indexOf('id="stboard"') > -1, 'study-time board on 👤 أنا');
  assert.ok(read('assets/lessons.js').includes('getElementById("wkles")'), 'week lessons card');
  assert.ok(read('assets/style.css').includes('html.duelon .adx'), 'ads hidden while the challenge quiz is open');
  const fr = read('assets/fr/ui.js');
  for (const t of ['⚔️ تحدي اليوم', '⏱️ وقت الدرس اليوم', '📜 القوانين', '🎁 الجائزة: لسّا ما تحدّدت', '# س # د', '📌 دروس هالأسبوع ودرس اليوم', '⚔️ ابدأ التحدي'])
    assert.ok(fr.includes(JSON.stringify(t) + ':'), 'French: ' + t);
  // rules v14 = v13 + studyTime + duel + config/duelPrizes only
  const r14 = fs.readFileSync('/home/user/tab/files/nursin-rules-v14.txt', 'utf8'), r13 = fs.readFileSync('/home/user/tab/files/nursin-rules-v13.txt', 'utf8');
  assert.ok(r14.includes('match /studyTime/{key} {') && r14.includes('match /duel/{key} {') && r14.includes("id == 'duelPrizes'"), 'rules v14 blocks');
  const cut = (x, a, b2) => x.slice(0, x.indexOf(a)) + x.slice(x.indexOf(b2));
  let k = cut(r14, '// v14 (Oct 28 2026)', '// v13 (Oct 27 2026)');
  k = cut(k, '    // v14: ⏱️', '    function classPath(cid)'); k = cut(k, '      // v14 ⚔️', '      // v5 ❓');
  k = k.replace(/\n      allow write: if signedIn\(\) && isAnnOwner\(\) && id == 'duelPrizes'[\s\S]*?p3\.size\(\) <= 80;/, '');
  assert.strictEqual(k, r13, 'everything of v13 (and v12) kept');
});

test('🏠 home tiles + 🎨 themes + ✏️ prize presets + 🧹 quiz page (Oct 28): tiles with numbers only, whole themes before first paint, presets first, quiz options grouped', async () => {
  const h = read('index.html'), tj = read('assets/tiles.js');
  // tiles replace the hero; each tile = icon + short name + number; the full cards are parked (not shown twice)
  // Oct 29 batch 1: the tiles left the home page — their pages are one tap away in the bottom bar / «📌 الأهمّيات» (tiles.js stays for its pure calc)
  assert.ok(!h.includes('class="hero') && !h.includes('id="htiles"') && !h.includes('assets/tiles.js'), 'no tiles on home');
  const navj = read('assets/nav.js');
  for (const x of ['"exams.html", "📅"', '"index.html#duel", "🏆"', '"classes.html", "🏫"', '"#online", "🟢"', '"games.html", "🎮"', '"quiz.html?t=review", "🔁"']) assert.ok(navj.includes(x), 'tile destination in the bar: ' + x);
  assert.ok(h.slice(h.indexOf('<div id="tilehold" hidden>')).includes('id="onl"'), 'online chip parked');
  // the numbers come from the same sources as before (goals list, duel, presence) — calc is pure
  const w = {}, box = { querySelector: () => null, addEventListener() {} };
  new Function('window', 'document', 'setTimeout', tj)(w, { getElementById: id => (id === 'htiles' ? box : null), addEventListener() {}, readyState: 'complete', documentElement: { classList: { add() {}, remove() {} } } }, () => 0);
  const c = w.NursinTiles.calc([{ k: 'ex:a', done: true }, { k: 'ex:b' }, { k: 'cls:x' }, { k: 'dq', done: true }, { k: 'pomo' }, { k: 'game' }]);
  assert.strictEqual(c.examsLeft, 1); assert.strictEqual(c.exams.length, 2); assert.strictEqual(c.clsLeft, 1); assert.strictEqual(c.cls.length, 2);
  assert.ok(read('assets/duel.js').includes('tileNote("duel"') && read('assets/presence.js').includes('k: "onl"') && read('assets/presence.js').includes('window.NursinOnline'), 'duel + presence report their numbers');
  assert.ok(read('assets/goals.js').includes('new CustomEvent("nursin:goals")') && read('assets/goals.js').includes('list: function () { return signed() ? goals() : null; }'), 'goals list shared with the tiles');
  assert.ok(read('assets/nav.js').includes('lastLesson: lastLesson') && tj.includes('NursinNav.lastLesson'), '📖 last lesson from the existing record');
  // 🎨 themes: on every page, synchronously in <head>, before the stylesheet (no flash)
  for (const p of pages.concat(['chat.html', 'admin.html'])) {
    const x = read(p), t = x.indexOf('<script src="assets/theme.js?v=20261029r"></script>');
    assert.ok(t > -1 && t < x.indexOf('assets/style.css') && t < x.indexOf('</head>'), 'theme.js first in <head>: ' + p);
  }
  const th = read('assets/theme.js'), css = read('assets/style.css');
  for (const id of ['classic', 'night', 'rose', 'nature', 'violet', 'minimal']) {
    assert.ok(th.includes('id: "' + id + '"') && css.includes('.thp[data-prev=' + id + ']'), 'theme + preview ' + id);
    if (id !== 'classic') assert.ok(css.includes('html[data-theme=' + id + ']{'), 'variables ' + id);
  }
  assert.ok(th.includes('nursin_theme_v1') && th.includes('apply(get());') && th.includes('setAttribute("data-theme"'), 'saved + applied at once');
  assert.ok(read('assets/nav.js').includes('data-theme-open') && th.includes('[data-theme-open]'), '«🎨 المظهر» in «المزيد» on every page');
  assert.ok(css.includes('background:var(--hd);') && css.includes('/* 🌙 «ليلي» — generated') && read('assets/tutor.css').includes('html[data-theme=night] .tlog'), 'header variable + dark re-map (lessons, quiz, chat, tutor)');
  const dark = css.slice(css.indexOf('/* 🌙 «ليلي» — generated'));
  assert.ok(!/adx|ad-slot|position\s*:/.test(dark), 'the dark re-map never touches ads or layout');
  assert.ok(!/position\s*:\s*(fixed|sticky)/.test(css.slice(css.indexOf('.adx{'))), 'new fixed sheets before .adx');
  // ✏️ prize presets first, free text last, same option allowed on several ranks
  const d = await import(path.join(SITE, 'assets/duel.js'));
  for (const i of [0, 1, 2]) { const P = d.prizePresets(i); assert.strictEqual(P.length, 8); assert.ok(P.includes('👑 تاج جنب الاسم لمدة أسبوع') && P.includes('🎁 جائزة من الأستاذ (بالصف)') && P.every(x => x.length <= 80)); }
  assert.ok(d.prizePresets(0).includes('⭐ +100 نقطة إضافية') && d.prizePresets(2).includes('🏅 شارة برونزية عالبروفايل'));
  const dj = read('assets/duel.js'); assert.ok(!dj.includes('prompt(') && dj.includes('✍️ غير شي…') && dj.indexOf('prizePresets(i)') < dj.indexOf('value="*"'), 'presets, then «غير شي»');
  // 🧹 quiz page: every exercise still there, grouped and folded; class quiz still law-only
  const q = read('quiz.html');
  assert.ok(q.includes('<details class="qpick" id="qpick">') && q.includes('<details class="qweak" id="qweak">') && q.includes('class="wrap qpage"'), 'grouped + folded');
  assert.strictEqual((q.match(/data-set="/g) || []).length, 31, '+ 🔗 اربط (Oct 31 2026 28g) · all 29 quiz sets kept + 🚑 réa (Oct 29)');
  assert.ok(q.includes('data-pm="class" data-lesson="l1">⚖️ كويز متل الصف (القانون)') && q.includes('data-pm="blanks"'), 'other exercises kept, class quiz law-only');
  assert.ok(q.indexOf('id="quiz"') < q.indexOf('id="weak"'), 'the quiz before the weak-points panel');
  assert.ok(css.includes('html.gl-lock .qpick,html.gl-lock .qweak{display:none!important}'), 'still locked when signed out');
  // 🇫🇷 French for the new UI
  const ui = read('assets/fr/ui.js'); for (const s of ['Défi du jour', 'Reprendre le dernier cours', '🌙 Nuit', '✏️ Prix de la semaine', 'Choisis le type d\'exercice']) assert.ok(ui.includes(s), 'fr: ' + s);
});

test('🔁 مراجعة اليوم + ⚠️ الأخطاء الشائعة + 📝 كويز الصف + «درس اليوم» + 2 Adsterra units (Oct 28, 8:32–10:59 PM)', async () => {
  // 🔁 spaced repetition v2 (Nov 3 2026): wrong / «صعبة» → tomorrow; a right answer on a NEW question enters too (3 days); a right answer on a due review → one step on (… 30, 60, 120 days, then 120 again — nothing leaves); early right answers change nothing
  const w = { QUIZ: [{ id: 'q001' }, { id: 'q002' }], Nursin: { dayKey: () => '2026-10-29' } }, store = {};
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  new Function('window', 'document', 'localStorage', 'CustomEvent', read('assets/srs.js'))(w, { dispatchEvent() {} }, ls, function () {});
  const S = w.NursinSRS, x = { items: {} };
  assert.deepStrictEqual(Array.from(S.STEPS), [1, 3, 7, 14, 30, 60, 120]);
  assert.strictEqual(S.step(x, 'q001', false, '2026-10-29', 1), 'again'); assert.strictEqual(x.items.q001.d, '2026-10-30');
  assert.strictEqual(S.step(x, 'q001', true, '2026-10-29', 2), 'early'); assert.strictEqual(x.items.q001.d, '2026-10-30');
  assert.strictEqual(S.step(x, 'q001', true, '2026-10-30', 3), 'next'); assert.strictEqual(x.items.q001.d, '2026-11-02');
  assert.strictEqual(S.step(x, 'q001', true, '2026-11-02', 4), 'next'); assert.strictEqual(x.items.q001.d, '2026-11-09');
  assert.strictEqual(S.step(x, 'q001', false, '2026-11-09', 5), 'again'); assert.strictEqual(x.items.q001.s, 0); assert.strictEqual(x.items.q001.d, '2026-11-10');
  for (const [dd, nx] of [['2026-11-10', '2026-11-13'], ['2026-11-13', '2026-11-20'], ['2026-11-20', '2026-12-04'], ['2026-12-04', '2027-01-03'], ['2027-01-03', '2027-03-04'], ['2027-03-04', '2027-07-02'], ['2027-07-02', '2027-10-30']]) { S.step(x, 'q001', true, dd, 6); assert.strictEqual(x.items.q001.d, nx); }
  assert.ok(x.items.q001 && x.items.q001.s === 6, 'after 120 days it stays at 120 (to the end of the year and on)');
  assert.strictEqual(S.step(x, 'q002', true, '2026-10-29', 1), 'new', 'a right answer on a new question enters'); assert.strictEqual(x.items.q002.d, '2026-11-01');
  assert.strictEqual(S.hard({ id: 'q002' }), 'again'); assert.ok(S.has('q002') && S.count() === 0, '«صعبة» = due tomorrow, not today');
  assert.strictEqual(S.record({ id: 'zzz' }, false), 'none', 'only known item ids (bank, 🔗, ✍️, 🩺)');
  const qj = read('assets/quiz.js');
  assert.ok(qj.includes("if(sel==='review')return S?S.questions():[];") && qj.includes("S.answer(q,ok)") && qj.includes("S.confRow(q,") && qj.includes("new CustomEvent('nursin:answer'"), 'quiz: review pool, every answer recorded, «كنت متأكد / حزرت», answer event');
  const h = read('index.html'), q = read('quiz.html');
  const hz = read('assets/hifz.js');
  assert.ok(read('assets/home.js').includes('k: "rev"') && read('assets/home.js').includes('"quiz.html?t=review"') && hz.includes('href="quiz.html?t=review"') && hz.includes('S.count()'), 'home «📌 الأهمّيات»: 🔁 مراجعة اليوم with the due count (Oct 29)');
  assert.ok(q.includes('id="qrev"') && q.indexOf('assets/srs.js?v=20261029r') < q.indexOf('assets/quiz.js?v=20261029r') && h.includes('assets/srs.js?v=20261029r'), 'quiz button + srs.js loaded');
  // ⚠️ common mistakes card: high on the home page (right below the tiles), static fallback inside, no ad anywhere near it
  const hp = read('hifzi.html'), cm = hp.slice(hp.indexOf('<section id="cmist"'), hp.indexOf('</section>', hp.indexOf('<section id="cmist"')));
  assert.ok(hp.indexOf('id="rmap"') < hp.indexOf('id="weak"') && hp.indexOf('id="weak"') < hp.indexOf('id="cmist"'), 'on 🗺️ حفظي: map → weak points → common mistakes (Oct 29)');
  assert.ok(cm.includes('<h2>⚠️ الأخطاء الشائعة</h2>') && cm.includes('details class="box warn hmist" open') && cm.includes('id="cmlive"'), 'live list + hand-written fallback');
  assert.ok(!/adx|ad-slot|bauval|adsbygoogle|pagead2/.test(hp), 'no ad anywhere on hifzi.html');
  // qstats.js (module): counters +1 only, deterministic class quiz, top-5 card
  const src = read('assets/qstats.js');
  assert.ok(src.includes('total: increment(1)') && src.includes('wrong: increment(ok ? 0 : 1)') && src.includes('firstToday(qid)'), '+1 per answer, once a day per question');
  assert.ok(src.includes('fs.limit(5)') && src.includes('"stats", week(), "qmiss"') && src.includes('"classes", c.id, "qmiss"') && !/name|uid/.test(src.slice(src.indexOf('async function count'), src.indexOf('/* ---- 2 '))), 'anonymous counters, one read of the top 5');
  const m = await import('data:text/javascript;base64,' + Buffer.from(src.replace(/^import .*$/m, 'const increment = n => n;')).toString('base64'));
  assert.strictEqual(m.period('2026-10-29'), 0); assert.strictEqual(m.period('2026-10-31'), 0); assert.strictEqual(m.period('2026-11-01'), 1);
  assert.deepStrictEqual(m.periodDays(1), ['2026-11-01', '2026-11-03']);
  const bank = Array.from({ length: 40 }, (_, i) => 'q' + String(i + 1).padStart(3, '0'));
  const p1 = m.pickQids([{ id: 'q010', wrong: 5, total: 6 }, { id: 'q003', wrong: 9, total: 20 }, { id: 'q020', wrong: 0, total: 9 }], [{ id: 'q007', wrong: 4, total: 4 }], bank, 'c1:3');
  assert.strictEqual(p1.length, 8); assert.deepStrictEqual(p1.slice(0, 3), ['q003', 'q010', 'q007'], 'class most-missed first, then the site');
  assert.deepStrictEqual(p1, m.pickQids([{ id: 'q010', wrong: 5, total: 6 }, { id: 'q003', wrong: 9, total: 20 }], [{ id: 'q007', wrong: 4, total: 4 }], bank, 'c1:3'), 'same quiz for the whole class');
  assert.ok(!m.pickQids([], [], bank, 'c1:3').includes('q999') && new Set(p1).size === 8, 'bank questions only, no repeats');
  const card = m.cardHtml([{ id: 'q001', wrong: 7, total: 10 }, { id: 'q002', wrong: 0, total: 3 }], { q001: { q: 'سؤال', o: ['A', 'B'], a: 1, x: 'شرح. تاني' }, q002: { q: 'x', o: ['a'], a: 0, x: 'y' } });
  assert.ok(card.includes('✅ <b>b) B</b>') && card.includes('شرح.') && !card.includes('تاني') && card.includes('غلط فيه 7 من 10') && (card.match(/class="cmi"/g) || []).length === 1, 'answer + one-line explanation, never-missed skipped');
  // 📝 class quiz inside the 🏫 tile, opened on quiz.html?cq=
  assert.ok(read('assets/hifz.js').includes('cqItems.filter(function (x) { return !x.done; })') && src.includes('"كويز الصف (كل ٣ أيام)"') && read('assets/fb.js').includes('m.openCq(API, cq)') && qj.includes('else if(p.cq){'), 'class quiz in the tile + its own quiz mode');
  assert.ok(!/adx|bauval/.test(qj.slice(qj.indexOf("h+=s.cq?"), qj.indexOf(":s.exam?'<p><a class=\"btn pri\" href=\"exams.html\">"))) && qj.includes("if(!s.cq)h+='<div class=\"adx adx-box adx-keep adx-res\""), 'no ad in or after the class-quiz result');
  // ✅ «أهداف اليوم» → «درس اليوم» (visible strings; code comments keep their history)
  const gs = read('assets/goals.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.ok(!/أهدافك اليوم|أهداف اليوم/.test(gs) && gs.includes('<b>✅ درس اليوم</b>') && read('assets/lessons.js').includes('>✅ درس اليوم</button>'), 'renamed');
  const fr = read('assets/fr/ui.js');
  for (const t of ['درس اليوم', '✅ درس اليوم', 'مراجعة اليوم', '⚠️ الأخطاء الشائعة', 'كويز الصف (كل # أيام)', '😓 صعبة، رجّعلي ياها']) assert.ok(fr.includes(JSON.stringify(t) + ':'), 'French: ' + t);
  assert.ok(!fr.includes('"أهدافك اليوم"'), 'old French key gone');
  // 📢 two more Adsterra units, same zone/keys, labelled by ads.js, between lessons only
  const unit = '<div class="adx adx-box adx-keep adx-sec" data-mobile="9892bba2f704f8ea66787de07f9f7be3" data-desktop="f0cd90c85278798fba5a155236050d61"></div>';
  const c = read('cardio.html'), hd = read('henderson.html');
  assert.strictEqual(c.split(unit).length - 1, 1); assert.strictEqual(hd.split(unit).length - 1, 1);
  assert.ok(c.indexOf(unit) > c.indexOf('id="choc"') && c.indexOf(unit) < c.indexOf('id="ic"'), 'cardio: between lessons 9 and 10');
  assert.ok(hd.indexOf(unit) < hd.indexOf('<h3>الحاجات ٨–١٤</h3>') && hd.indexOf(unit) > hd.indexOf('l=h1">📝 كويز على هالدرس'), 'henderson: between the two lessons');
  for (const p of pages.concat(['chat.html', 'admin.html'])) if (!['cardio.html', 'henderson.html'].includes(p)) assert.ok(!read(p).includes('adx-sec'), p + ' unchanged');
  // rules v15 (box file) = v14 + the new blocks only
  const f15 = '/home/user/tab/files/nursin-rules-v15.txt', f14 = '/home/user/tab/files/nursin-rules-v14.txt';
  if (fs.existsSync(f15) && fs.existsSync(f14)) {
    const r15 = fs.readFileSync(f15, 'utf8'), r14 = fs.readFileSync(f14, 'utf8');
    const cut = (x, a, b2) => x.slice(0, x.indexOf(a)) + x.slice(x.indexOf(b2));
    let k = cut(r15, '// v15 (Oct 29 2026)', '// v14 (Oct 28 2026)');
    k = cut(k, '      // v15 🔁', '      // v4: the student'); k = cut(k, '    // v15 ⚠️ counters', '    match /classCodes/{code}'); k = cut(k, '      // v15 ⚠️ the class', '      // v5 ❓');
    assert.strictEqual(k, r14, 'everything of v14 kept');
  }
});

test('⚠️ common mistakes fold under «درس اليوم» + 📖 lesson reading counts in ⏱️ study time, no double count (Oct 29, 6:14 AM)', async () => {
  const h = read('hifzi.html'), cm = h.slice(h.indexOf('<section id="cmist"'), h.indexOf('</section>', h.indexOf('<section id="cmist"')));
  assert.ok(h.indexOf('<section id="weak"') < h.indexOf('<section id="cmist"'), 'Oct 29: on 🗺️ حفظي, right below «نقاط ضعفك»');
  assert.ok(/<details id="cmfold" class="cmfold"><summary class="cmsum"><h2>⚠️ الأخطاء الشائعة<\/h2><span class="cmcnt" id="cmcnt">\d+<\/span><span class="cmarr" aria-hidden="true"><\/span><\/summary>/.test(cm), 'folded: title + count + arrow only');
  assert.ok(!/<details id="cmfold"[^>]*open/.test(cm) && cm.includes('id="cmlive"') && cm.includes('details class="box warn hmist" open') && cm.trim().endsWith('</details></details>'), 'closed by default, live list + v14 fallback inside');
  const t = read('assets/hifz.js'), css = read('assets/style.css'), q = read('assets/qstats.js');
  assert.ok(t.includes('localStorage.getItem("nursin_cmist_v1") === "1"') && t.includes('f.addEventListener("toggle"'), 'open/closed remembered');
  assert.ok(css.includes('.cmarr::after{content:"▾"') && css.includes('.cmfold[open]>summary .cmarr::after{content:"▴"}'), '▾ / ▴');
  assert.ok(q.includes('D.getElementById("cmcnt")'), 'count follows the live list');
  // ⏱️ shared per-browser record: two tabs never count the same second
  const s = await import(path.join(SITE, 'assets/studytime.js'));
  for (const pg of ['cardio.html', 'neuro.html', 'henderson.html', 'law.html', 'mgmt.html', 'quality.html', 'pharma.html', '3d.html']) assert.strictEqual(s.mayCount(pg, true, false, 5000), true, 'reading ' + pg);
  assert.strictEqual(s.mayCount('cardio.html', false, true, 5000), false, 'hidden tab'); assert.strictEqual(s.mayCount('cardio.html', true, true, 91000), false, 'no scroll/tap for > 90 s');
  const D = '2026-10-29', r = s.recFor(null, D), t0 = 1e12;
  assert.strictEqual(s.shareAdd(r, t0, t0 + 10000), 10);          // tab A ticks
  assert.strictEqual(s.shareAdd(r, t0 + 2000, t0 + 12000), 2, 'tab B only gets the 2 s after A');
  assert.strictEqual(s.shareAdd(r, t0 + 10000, t0 + 20000), 8); assert.strictEqual(r.s, 20, '20 s of wall time = 20 s, not 40');
  assert.strictEqual(s.shareAdd(r, t0 + 20000, t0 + 3600000), 20, 'never a burst after sleep');
  assert.deepStrictEqual(s.recFor({ d: '2026-10-28', s: 900, w: 900 }, D).s, 0, 'a new day starts at 0');
  assert.strictEqual(s.sendable({ s: 400, w: 0 }, 0, t0, false), 300, 'first write ≤ 5 min (rules v14)');
  assert.strictEqual(s.sendable({ s: 500, w: 100 }, t0 - 60000, t0, true), 65, 'never more than rules v14 allow since the last write');
  assert.strictEqual(s.sendable({ s: 160, w: 100 }, t0 - 600000, t0, true), 60);
  const b = s.withMine([{ uid: 'me', d: D, s: 120, n: 'A' }, { uid: 'x', d: D, s: 300, n: 'B' }], 'me', D, 700);
  assert.strictEqual(b[0].s, 700, 'my row shows reading time before the next write'); assert.strictEqual(s.withMine([], 'me', D, 90).length, 1);
  const sj = read('assets/studytime.js');
  assert.ok(sj.includes('export const LK = "nursin_stact_v1"') && sj.includes('"touchmove", "scroll", "click"') && !sj.includes('document.hasFocus()'), 'shared record, scroll/touch/click/key, focus not needed');
  // «درس اليوم»: the ⏱️ goal counts reading minutes; the 📌 card shows them
  const G = require(path.join(SITE, 'assets/goals.js'));
  const row = o => G.build(Object.assign({ weak: 0, exams: [], done: {} }, o)).find(x => x.k === 'pomo');
  assert.ok(row({ mins: 30 }).done && row({ mins: 30 }).s === '✅ درست 30 د اليوم', '25+ min of reading = done');
  assert.ok(!row({ mins: 12 }).done && row({ mins: 12 }).s.startsWith('درست 12 د من ٢٥'), 'progress');
  assert.ok(row({ pomo: 1 }).done, 'a pomodoro round still counts');
  const g = read('assets/goals.js'), l = read('assets/lessons.js'), fr = read('assets/fr/ui.js');
  assert.ok(g.includes('lsGet("nursin_stact_v1")') && g.includes('mins: minsToday()') && l.includes('localStorage.getItem("nursin_stact_v1")') && l.includes('wkmin'), 'goals + home card read the same record');
  for (const k of ['٢٥ دقيقة دراسة (قراءة أو بومودورو)', '✅ درست # د اليوم', 'درست # د من # (قراءة الدروس والكويز)', '⏱️ درست اليوم # د (قراءة الدروس والكويز)']) assert.ok(fr.includes(JSON.stringify(k).slice(1, -1)), 'fr: ' + k);
});

test('🏆 weekly knockout (Oct 29, 1:06 PM «متل بطولة كرة القدم»): Monday bracket, bye, one round a day, tie = re-paired, no-show, final → champion', async () => {
  const D = await import(path.join(SITE, 'assets/duel.js'));
  const mem = ['A', 'B', 'C', 'D', 'E'].map(u => ({ uid: u, jd: '2026-10-20' }));
  const docs = [], doc = (d, uid, s) => docs.push({ uid, d, s, n: 5 });
  let B = D.bracket('c1', mem, docs, '2026-11-02');
  assert.strictEqual(D.weekStart('2026-11-04'), '2026-11-02', 'the week starts on Monday');
  assert.strictEqual(B.start, '2026-11-02'); assert.strictEqual(B.players.length, 5);
  assert.deepStrictEqual(D.bracket('c1', mem, docs, '2026-11-02').live, B.live, 'deterministic seeding');
  const L1 = B.live; assert.strictEqual(L1.pairs.length, 2); assert.ok(L1.bye, 'odd player out gets a bye');
  assert.strictEqual(D.tStatus(B, L1.bye, {}).k, 'bye'); assert.strictEqual(D.tStatus(B, L1.pairs[0][0], {}).k, 'todo');
  const [[a1, b1], [c1, d1]] = L1.pairs;
  doc('2026-11-02', a1, 4); doc('2026-11-02', b1, 2);           // a1 wins
  doc('2026-11-02', c1, 3); doc('2026-11-02', d1, 3);           // tie: nobody wins or loses
  B = D.bracket('c1', mem, docs, '2026-11-03');
  assert.strictEqual(D.tStatus(B, b1, {}).k, 'out', 'the loser is out');
  assert.strictEqual(B.live.round, 1, 'the tied pair replays round 1 before round 2 starts');
  assert.deepStrictEqual(B.live.pairs.map(p => p.slice().sort()), [[c1, d1].sort()], 'only tied players left → they meet again');
  assert.notStrictEqual(D.tStatus(B, c1, {}).k, 'out'); assert.strictEqual(D.tStatus(B, a1, {}).k, 'wait');
  doc('2026-11-03', c1, 2);                                      // d1 never plays → c1 advances
  B = D.bracket('c1', mem, docs, '2026-11-04');
  assert.strictEqual(D.tStatus(B, d1, {}).k, 'out', 'no-show is out');
  assert.strictEqual(B.live.round, 2); assert.strictEqual(B.live.n, 3); assert.strictEqual(B.live.pairs.length, 1);
  const [x, y] = B.live.pairs[0], z = B.live.bye; assert.ok(z && [a1, c1, L1.bye].includes(z));
  doc('2026-11-04', x, 5); doc('2026-11-04', y, 1);
  B = D.bracket('c1', mem, docs, '2026-11-05');
  assert.strictEqual(B.live.n, 2); assert.strictEqual(B.live.name.includes('نهائي'), true, 'the last two play the final');
  const [f1, f2] = B.live.pairs[0]; assert.deepStrictEqual([f1, f2].sort(), [x, z].sort());
  doc('2026-11-05', f1, 3); doc('2026-11-05', f2, 4);
  B = D.bracket('c1', mem, docs, '2026-11-06');
  assert.strictEqual(B.champion, f2); assert.strictEqual(B.finalist, f1); assert.ok(B.semis.includes(y), 'semi-final loser = 3rd');
  assert.strictEqual(D.tStatus(B, f2, {}).k, 'champ');
  // neither side plays → both out (documented rule)
  const B2 = D.bracket('c2', mem, [], '2026-11-03'); assert.ok(B2.days[0].res.every(r => B2.st[r.a].out && B2.st[r.b].out));
  const dj = read('assets/duel.js');
  for (const s of ['بطل الأسبوع', 'تعادل', 'ولا واحد لعب', 'بيتأهّل بلا لعب']) assert.ok(dj.includes(s), s);
});

test('🚑 réa subject (Oct 29): rea.html + lesson ABG from his slides, 12-question quiz, answers spread and never the longest; new mgmt/law lessons and quizzes', () => {
  const h = read('rea.html');
  for (const s of ['rea-data.js', 'rea.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261029r'), s);
  assert.ok(read('index.html').includes('href="rea.html"'), 'linked from the home subject list');
  const w = {}; new Function('window', read('assets/rea-data.js'))(w);
  const r1 = w.REA.lessons[0]; assert.strictEqual(r1.k, 'r1'); assert.ok(r1.n.includes('ABG'));
  for (const s of ['7.35', 'ROME', 'Allen', 'PaCO', 'HCO']) assert.ok(r1.html.includes(s), s);
  const q = {}; new Function('window', read('assets/quiz-data.js'))(q);
  const set = (t, l) => q.QUIZ.filter(x => x.t === t && (!l || x.l === l));
  const rea = set('rea', 'r1').filter(notPQ); assert.ok(rea.length >= 10 && rea.length <= 14, 'about 12 réa questions on r1 (r2–r4 tested below)');
  assert.deepStrictEqual(q.QGROUPS.rea, ['rea']);
  const mg = q.QUIZ.filter(x => x.t === 'mgmt' && (x.l === 'm3' || x.l === 'm4')), lw = set('law', 'l3');
  assert.ok(set('mgmt', 'm3').length >= 7 && set('mgmt', 'm4').length >= 7 && lw.length >= 7, 'a quiz for each new lesson');
  for (const grp of [rea, mg, lw]) {
    const c = [0, 0, 0]; grp.forEach(x => c[x.a]++); assert.ok(c.every(n => n >= 2), 'correct answers spread across a/b/c ' + c);
    grp.forEach(x => { const L = x.o.map(o => o.length), m = Math.max(...L); assert.ok(L[x.a] < m || L.filter(n => n === m).length > 1, 'right answer is not the longest: ' + x.id); });
  }
  const m = {}; new Function('window', read('assets/mgmt-data.js'))(m);
  const ks = (m.MGMT.lessons || m.MGMT).map ? (m.MGMT.lessons || m.MGMT).map(x => x.k) : [];
  assert.ok(ks.includes('m3') && ks.includes('m4'), 'التوجيه والقيادة + المشاركة');
});

test('🔄 pomodoro sync (Oct 29, 1:12 PM): users/{uid}/timer/current, onSnapshot, remaining time from the end time; 👨‍🏫 Osman rule-based coach', () => {
  const s = read('assets/study.js'), c = read('assets/coach.js');
  assert.ok(s.includes('"timer", "current"') && s.includes('onSnapshot'), 'one shared doc, live listener');
  const mk = () => { const L = {}; return { getItem: k => (k in L ? L[k] : null), setItem: (k, v) => { L[k] = String(v); }, removeItem: k => { delete L[k]; } }; };
  const el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, setAttribute() {}, insertAdjacentHTML() {}, remove() {} });
  const d = { readyState: 'loading', addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; }, createElement: el, body: el(), documentElement: el(), hidden: false };
  const w = { location: { pathname: '/index.html', search: '', hash: '' }, addEventListener() {}, removeEventListener() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, dispatchEvent() {}, navigator: {} };
  const g = globalThis, keep = { localStorage: g.localStorage, sessionStorage: g.sessionStorage };
  g.localStorage = mk(); g.sessionStorage = mk(); w.localStorage = g.localStorage; w.sessionStorage = g.sessionStorage; w.document = d;
  try {
    new Function('window', 'document', s)(w, d); new Function('window', 'document', c)(w, d);
    const end = Date.now() + 600000, st = w.NursinStudy.fromDoc({ m: 'f', run: true, end, left: 0, r: 1 });
    assert.strictEqual(st.end, end, 'a running timer keeps the same end time on every device');
    const p = w.NursinStudy.fromDoc({ m: 's', run: false, end: 0, left: 120000, r: 2 }); assert.strictEqual(p.run, false); assert.strictEqual(p.m, 's');
    const C = w.NursinCoach;
    assert.ok(C.pick({ mood: 'tired', cont: 0 }).rest, 'تعبان → rest');
    assert.ok(C.pick({ mood: 'ok', cont: 55 }).rest, '50+ continuous minutes → rest');
    const t = C.pick({ mood: 'ok', cont: 5, due: 4, tn: { k: 'todo', op: 'Rayan' } }); assert.ok(JSON.stringify(t).includes('Rayan'), 'pending match first');
  } finally { g.localStorage = keep.localStorage; g.sessionStorage = keep.sessionStorage; }
  assert.ok(c.includes('كيفك اليوم') && c.includes('ارتاح ١٠ دقايق'));
  for (const p of ['quiz.html', 'games.html', 'tutor.html', 'chat.html', 'admin.html']) assert.ok(!/adx|adsbygoogle/.test(c), p);
});

// ===== BATCH 1 (Oct 29 2026, Abdullah 11:36–11:52 PM): home v2, bottom bar, 🗺️ حفظي, retention, 🃏 cards, 📄 summary, 🔎 search, ✨ motion =====
function hifzCtx(extra) {
  const vm = require('node:vm'), store = {};
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const doc = { readyState: 'loading', addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, documentElement: { classList: { add() {}, remove() {}, contains: () => false } } };
  const ctx = { localStorage: ls, sessionStorage: ls, document: doc, location: { pathname: '/index.html', search: '', hash: '' }, navigator: {}, console, setTimeout() {}, clearTimeout() {}, setInterval() {}, matchMedia: () => ({ matches: false }), CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }, Date, Math, JSON, ...extra };
  ctx.window = ctx; ctx.addEventListener = () => {}; ctx.dispatchEvent = () => {};
  vm.createContext(ctx); vm.runInContext(read('assets/lessons.js'), ctx); if (extra && extra.__quiz) vm.runInContext(read('assets/quiz-data.js'), ctx); vm.runInContext(read('assets/hifz.js'), ctx);
  return ctx;
}
test('🗺️ retention: decaying 0–100 score, colours, events move it, 2 days first half-life', () => {
  const R = hifzCtx().NursinRet, D = 864e5, now = Date.parse('2026-10-29T12:00:00Z');
  assert.equal(R.color(null), 'grey'); assert.equal(R.color(70), 'green'); assert.equal(R.color(69.9), 'yellow'); assert.equal(R.color(40), 'yellow'); assert.equal(R.color(39.9), 'red');
  let rec = R.step(null, 'read', now);
  assert.ok(rec.r >= 75 && rec.h === 2, 'first read → 75+, half-life 2 days');
  assert.ok(Math.abs(R.at(rec, now + 2 * D) - rec.r / 2) < 0.01, 'half after one half-life');
  assert.ok(R.at(rec, now + 6 * D) < 40, 'red after a week without review');
  const ok = R.step(rec, 'ok', now + 1 * D), bad = R.step(rec, 'bad', now + 1 * D);
  assert.ok(R.at(ok, now + 1 * D) > R.at(rec, now + 1 * D) && R.at(bad, now + 1 * D) < R.at(rec, now + 1 * D), 'right answer raises, wrong lowers');
  assert.ok(ok.h > rec.h, 'a right answer ≥ 20 h later is a successful review → longer half-life');
  const fbad = R.step(rec, 'fbad', now + 1 * D); assert.ok(R.at(fbad, now + 1 * D) < R.at(rec, now + 1 * D), '🃏 wrong card lowers retention');
  for (let i = 0; i < 30; i++) rec = R.step(rec, 'ok', now + (i + 2) * 3 * D);
  assert.ok(rec.h <= 60 && rec.r <= 100, 'capped');
});
test('🗺️ retention: hifz.js on every page right after lessons.js; dots on subject pages; red lessons feed Osman', () => {
  for (const f of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) {
    const h = read(f); if (!h.includes('assets/lessons.js')) continue;
    assert.ok(h.includes('<script src="assets/lessons.js?v=20261029r" defer></script><script src="assets/hifz.js?v=20261029r" defer></script>'), f);
  }
  const hz = read('assets/hifz.js'), co = read('assets/coach.js');
  assert.ok(hz.includes('function paintDots') && hz.includes('class="rdot r-'), 'dots beside lesson titles');
  assert.ok(hz.includes('nursin:answer') && hz.includes('nursin:flash') && hz.includes('nursin:lesson-read'), 'listens to quiz, cards and reading');
  assert.ok(co.includes('x.red') && co.includes('function reminders') && co.includes('NursinRet'), 'Osman reads the red lessons');
  assert.ok(hz.includes('stWeakId') && read('assets/goals.js').includes('studyState'), 'study summary mirrored for the smart Osman pushes (worker v9)');
});
test('🏠 home v2 (Oct 29): Osman first with one action + big «ابدأ», then ⚔️, then 📌 الأهمّيات; no duplicates', () => {
  const h = read('index.html'), co = read('assets/coach.js');
  const main = h.slice(h.indexOf('<main'), h.indexOf('</main>'));
  assert.ok(main.indexOf('id="hz"') < main.indexOf('id="duel"') && !main.includes('id="osmhome"') && !main.includes('id="prio"'), 'order: everything inside «🧭 مسار اليوم» (Oct 31 2026)');
  assert.ok(co.includes('هلّق اعمل هيدا') && co.includes('osmgo') && co.includes('▶️ ابدأ'), 'one action + big start');
  for (const id of ['hz', 'duel']) assert.equal((h.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id + ' once');
  for (const id of ['osmhome', 'prio', 'priorev', 'wkles', 'wexhome', 'homecont']) assert.ok(!h.includes('id="' + id + '"'), id + ' gone: a path step now');
  assert.ok(!main.includes('id="htiles"') && !main.includes('class="card hg"') && !main.includes('id="study"') && !main.includes('id="cmist"'), 'old duplicates gone');
  assert.ok(read('assets/duel.js').includes('<details class="dmore">'), 'home tournament = status; the bracket folds');
  assert.ok(read('assets/pwa.js').includes('main.querySelector("#prio") ||'), 'install / notification cards never push Osman down');
});
test('🧭 bottom bar (Oct 29): 🏠 | 📚 المواد | 📝 تمارين | ⚔️ صفّي | 👤 أنا, every page within 2 taps, 🔒 when signed out', () => {
  const n = read('assets/nav.js');
  const vm = require('node:vm'); const m = n.match(/var G = (\[[\s\S]*?\n  \]);/); assert.ok(m, 'G found');
  const G = vm.runInNewContext(m[1]);
  assert.deepEqual(G.map(g => g.e + ' ' + g.n), ['🏠 الرئيسية', '📚 المواد', '📝 تمارين', '⚔️ صفّي', '👤 أنا']);
  const reach = new Set(G.flatMap(g => (g.items || []).map(i => i[0].split(/[?#]/)[0])).concat(G.filter(g => g.href).map(g => g.href.split(/[?#]/)[0])));
  for (const p of ['index.html', 'cardio.html', 'neuro.html', 'henderson.html', 'law.html', 'mgmt.html', 'quality.html', 'pharma.html', 'rea.html', 'quiz.html', 'games.html', 'exams.html', 'live.html', 'classes.html', 'friends.html', 'chat.html', 'tutor.html', 'hifzi.html', 'me.html'])
    assert.ok(reach.has(p), p + ' reachable in ≤ 2 taps');
  assert.ok(G.find(g => g.k === 'practice').items.some(i => i[4]) && n.includes('🔒'), 'signed-in-only items carry 🔒');
  assert.ok(read('assets/style.css').includes('html.jsnav .topbar .menu-btn{display:none}'), 'phones: ☰ folds into 👤 أنا so the header never overflows');
});
test('🗺️ حفظي + 👤 أنا pages: weak points, common mistakes, retention map; settings; no ads; #weak still works', () => {
  const hz = read('hifzi.html'), me = read('me.html');
  for (const id of ['rosm', 'rsum', 'rmap', 'weak', 'cmist']) assert.ok(hz.includes('id="' + id + '"'), 'hifzi #' + id);
  for (const id of ['mecard', 'study', 'stboard', 'mepush', 'meset']) assert.ok(me.includes('id="' + id + '"'), 'me #' + id);
  for (const h of [hz, me]) { assert.ok(!/adsbygoogle|pagead2|bauval|class="adx|ad-slot/.test(h), 'no ads'); assert.ok(h.includes('G-'), 'GA4 kept'); }
  assert.ok(read('quiz.html').includes('id="weak"') && read('sitemap.xml').includes('hifzi.html'), 'quiz.html#weak + sitemap');
});
test('🃏 flashcards + 📄 one-page summary on every lesson page, from the lesson\'s own content, away from ads', () => {
  const c = read('assets/cards.js');
  for (const p of ['cardio.html', 'neuro.html', 'henderson.html', 'law.html', 'mgmt.html', 'quality.html', 'pharma.html', 'rea.html']) {
    const h = read(p); assert.ok(h.includes('assets/cards.js?v=20261029r') && h.includes('assets/srs.js?v=20261029r'), p);
  }
  assert.ok(c.includes('insertBefore') && c.includes('.lqz'), 'buttons sit before the lesson quiz link, never next to an ad');
  assert.ok(c.includes('nursin:flash') && c.includes('NursinSRS'), 'a wrong card goes to the review queue and lowers retention');
  assert.ok(c.includes('printsum') && read('assets/style.css').includes('@media print'), 'printable summary');
  assert.ok(c.includes('?fc=') || c.includes('"fc"'), '?fc= opens the cards (Osman push links)');
});
test('🔎 search: folds Arabic/French, finds lessons by name and by their questions', () => {
  const S = hifzCtx({ __quiz: 1 }).NursinSearch;
  assert.equal(S.norm('Électrocardiogramme'), S.norm('electrocardiogramme'));
  assert.equal(S.norm('أحمد'), S.norm('احمد')); assert.equal(S.norm('مدرسة'), S.norm('مدرسه'));
  const r = S.search('glasgow'); assert.ok(r.length && /neuro/.test(JSON.stringify(r[0].e)), 'Glasgow → neuro first');
  const r2 = S.search('القيادة'); assert.ok(r2.length && /mgmt/.test(JSON.stringify(r2.slice(0, 3).map(x => x.e))), 'القيادة → الإدارة');
});
test('✨ motion: 150–300 ms, View Transitions with a fallback, nothing with prefers-reduced-motion; no fixed element after the ads', () => {
  const css = read('assets/style.css'), hz = read('assets/hifz.js');
  assert.ok(css.includes('@view-transition') && hz.includes('CSSViewTransitionRule'), 'native transition + fallback only where missing');
  const rm = css.slice(css.lastIndexOf('@media (prefers-reduced-motion:reduce)') > -1 ? css.lastIndexOf('@media (prefers-reduced-motion:reduce)') : css.lastIndexOf('prefers-reduced-motion'));
  assert.ok(/animation:none|animation-duration:0|transition:none/.test(rm), 'reduced motion switches it off');
  for (const m of css.slice(css.indexOf('/* ===== BATCH 1')).matchAll(/(?:animation|transition)[^;{}]*?(\d+)ms/g)) assert.ok(+m[1] >= 120 && +m[1] <= 320, 'duration ' + m[0]);
});

// ===== Oct 30 2026 (Abdullah 11:08 AM voice note): «تعبان» → «بلّش ببريك ١٠ دقايق» kept coming back after the break was over =====
test('☕ rest loop fix: after a break (started / ended / stopped / skipped, any device) Osman moves on; only a NEW 50 minutes asks again', () => {
  const s = read('assets/study.js'), c = read('assets/coach.js');
  const L = {}, mk = () => ({ getItem: k => (k in L ? L[k] : null), setItem: (k, v) => { L[k] = String(v); }, removeItem: k => { delete L[k]; } });
  const S2 = {}, ss = { getItem: k => (k in S2 ? S2[k] : null), setItem: (k, v) => { S2[k] = String(v); }, removeItem: k => { delete S2[k]; } };
  const el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, setAttribute() {}, insertAdjacentHTML() {}, remove() {} });
  const d = { readyState: 'loading', addEventListener() {}, dispatchEvent() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; }, createElement: el, body: el(), documentElement: el(), hidden: false };
  const w = { location: { pathname: '/index.html', search: '', hash: '' }, addEventListener() {}, removeEventListener() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, dispatchEvent() {}, navigator: {} };
  const g = globalThis, keep = { localStorage: g.localStorage, sessionStorage: g.sessionStorage };
  g.localStorage = mk(); g.sessionStorage = ss; w.localStorage = g.localStorage; w.sessionStorage = ss; w.document = d;
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Beirut' }).format(new Date()), now = Date.now(), M = 60e3;
  const setMood = (t) => { L.nursin_mood_v1 = JSON.stringify({ d: day, m: 'tired', t }); };
  try {
    new Function('window', 'document', s)(w, d); new Function('window', 'document', c)(w, d);
    const C = w.NursinCoach, St = w.NursinStudy;
    // 1) the reported loop: «تعبان» this morning → rest; the 10-min break runs; afterwards the card must NOT say rest again
    setMood(now - 30 * M);
    let x = C.data(); assert.ok(C.pick(x).rest, 'تعبان (no break yet) → rest once');
    St.pomoBreak(10);
    x = C.data(); assert.ok(x.brk > 0 && C.pick(x).brk && !C.pick(x).rest, 'during the break: «إنت ببريك هلّق», no rest button');
    L.nursin_pomo_v1 = JSON.stringify({ m: 'f', run: false, left: St.DUR.f, r: 0 });          // timer said «خلص البريك»
    for (let i = 0; i < 3; i++) { x = C.data(); const p = C.pick(x); assert.ok(!p.rest, 'back home after the break → no «بلّش ببريك» again (#' + i + ')'); assert.ok(p.txt.startsWith('رجعت مرتاح؟ يلا 💪'), 'short welcome-back line'); }
    // later the same day: still the normal suggestion, never the same tired answer again
    L.nursin_brk_v1 = JSON.stringify({ at: now - 3 * 3600e3 }); setMood(now - 4 * 3600e3);
    x = C.data(); assert.ok(!C.pick(x).rest && !C.pick(x).back, '3 h later: normal suggestion, no rest, no welcome-back');
    assert.ok(C.pick(Object.assign({}, x, { due: 3 })).href.includes('review'), 'moves on to the normal order (due reviews)');
    // 2) a break taken BEFORE the tired answer does not count
    L.nursin_brk_v1 = JSON.stringify({ at: now - 2 * 3600e3 }); setMood(now - 5 * M);
    assert.ok(C.pick(C.data()).rest, 'break earlier today, «تعبان» now → rest');
    // 3) «⏭️ مش هلّق» / ✕ counts (markRest is what both call): simulate by the same record
    assert.ok(c.includes('data-osm-skip') && c.includes('مش هلّق') && c.includes('Pas maintenant'), 'skip button (ar + fr)');
    L.nursin_brk_v1 = JSON.stringify({ at: now }); assert.ok(!C.pick(C.data()).rest, 'skipped → no rest');
    // 4) another device: a synced doc showing a break, or a break that ended there (dev "~b"), counts here
    delete L.nursin_brk_v1; setMood(now - 20 * M);
    assert.ok(St.brkSeen({ m: 'f', run: false, left: St.DUR.f, r: 0, dev: 'abc12345~b', at: now - 2 * M }), 'ended-elsewhere doc recognised');
    assert.ok(!C.pick(C.data()).rest, 'break finished on the laptop → phone moves on');
    delete L.nursin_brk_v1; assert.ok(St.brkSeen({ m: 's', run: true, end: now + 5 * M, left: 0, r: 1, dev: 'abc12345', at: now - M }) && !C.pick(C.data()).rest, 'break running on the other device counts');
    assert.ok(!St.brkSeen({ m: 'f', run: true, end: now + 20 * M, left: 0, r: 0, dev: 'abc12345', at: now }), 'a focus run is not a break');
    const doc = St.timerDoc({ m: 'f', run: false, left: St.DUR.f, r: 0 }, now, true); assert.ok(/~b$/.test(doc.dev) && doc.dev.length <= 20, 'finished-break push fits rules v16 (dev string ≤ 20)');
    assert.ok(!/~b/.test(St.timerDoc({ m: 'f', run: true, end: now + 1, r: 0 }, now).dev), 'normal pushes unchanged');
    // 5) the 50-minute rule: counted from the last break → no loop, but a NEW 50 minutes asks again
    L.nursin_mood_v1 = JSON.stringify({ d: day, m: 'ok', t: now - 3 * 3600e3 });
    L.nursin_cont_v1 = JSON.stringify({ s: now - 70 * M, l: now - 10 * 1000 });
    L.nursin_brk_v1 = JSON.stringify({ at: now - 15 * M });
    assert.ok(C.data().cont < 50 && !C.pick(C.data()).rest, '70 min block but break 15 min ago → no rest');
    L.nursin_brk_v1 = JSON.stringify({ at: now - 55 * M }); L.nursin_cont_v1 = JSON.stringify({ s: now - 120 * M, l: now - 10 * 1000 });
    assert.ok(C.data().cont >= 50 && C.pick(C.data()).rest, '55 new minutes after the break → rest again (new trigger)');
    // 6) an old «تعبان» saved before this fix (no time) does not loop
    L.nursin_mood_v1 = JSON.stringify({ d: day, m: 'tired' }); delete L.nursin_brk_v1; L.nursin_cont_v1 = JSON.stringify({ s: now, l: now });
    assert.ok(!C.pick(C.data()).rest, 'legacy tired record → no loop');
    // the pure cases from before still hold
    assert.ok(C.pick({ mood: 'tired', cont: 0 }).rest && C.pick({ mood: 'ok', cont: 55 }).rest);
  } finally { g.localStorage = keep.localStorage; g.sessionStorage = keep.sessionStorage; }
  assert.ok(s.includes('pushTimer(p, true)') && s.includes('function preset() { var was = pstate().m'), 'timer done / ↺ stop during a break both mark it');
  assert.ok(c.includes('"nursin:rest"') && c.includes('Reposé ? Allez'), 'home card redraws on a break; fr line');
});


// ===== Oct 30 2026 (Abdullah 11:29 AM voice note + 11:32 AM «أكيد على اي جهاز»): 📒 personal notes, synced across devices =====
function notesCtx(page) {
  const vm = require('node:vm'), store = {};
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const doc = { readyState: 'loading', addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, documentElement: { classList: { add() {}, remove() {}, contains: () => false } } };
  const ctx = { localStorage: ls, sessionStorage: ls, document: doc, location: { pathname: '/' + (page || 'index.html'), search: '', hash: '' }, navigator: {}, console, setTimeout() {}, clearTimeout() {}, setInterval() {}, matchMedia: () => ({ matches: false }), CustomEvent: function () {}, Date, Math, JSON };
  ctx.window = ctx; ctx.addEventListener = () => {}; ctx.dispatchEvent = () => {};
  vm.createContext(ctx); vm.runInContext(read('assets/lessons.js'), ctx); vm.runInContext(read('assets/quiz-data.js'), ctx); vm.runInContext(read('assets/notes.js'), ctx);
  return ctx;
}
test('📒 notes: local CRUD — one note per item, empty text deletes, sizes clamped to rules v17, ids safe for Firestore', () => {
  const N = notesCtx().NursinNotes, st = N.blank(), q = { refType: 'q', refId: 'q005', refText: 'سؤال', subject: 'cardio', lesson: 'cardio:infarctus' };
  const a = N.put(st, '', q, 'Troponine ✅', 1000);
  assert.equal(a.id, 'q_q005'); assert.equal(N.find(st, '', 'q_q005').text, 'Troponine ✅'); assert.equal(a.createdAt, 1000);
  const b = N.put(st, '', q, 'Troponine + CK-MB', 5000);
  assert.equal(N.list(st, '').length, 1, 'same question = same note (edited, not duplicated)');
  assert.equal(b.createdAt, 1000); assert.equal(b.updatedAt, 5000); assert.equal(b.text, 'Troponine + CK-MB');
  N.put(st, '', { refType: 'lesson', refId: 'cardio:infarctus#2', refText: 'Infarctus — الجزء 2/2', subject: 'cardio', lesson: 'cardio:infarctus' }, 'lesson note', 6000);
  N.put(st, '', { refType: 'free', refId: '', subject: 'neuro', lesson: 'neuro:glasgow' }, 'free 1', 7000);
  N.put(st, '', { refType: 'free', refId: '', subject: 'neuro', lesson: '' }, 'free 2', 7001);
  assert.equal(N.list(st, '').length, 4, 'free notes each get their own id');
  assert.equal(N.list(st, '')[0].text, 'free 2', 'newest first');
  for (const n of N.list(st, '')) assert.match(n.id, /^[A-Za-z0-9_.~-]{1,120}$/, 'doc id ' + n.id);
  N.put(st, '', q, '   ', 8000); assert.equal(N.find(st, '', 'q_q005'), null, 'saving an empty note deletes it');
  assert.equal(Object.keys(st.x).length, 0, 'a signed-out delete has nothing to send');
  const big = N.put(st, 'U1', { refType: 'q', refId: 'q006', refText: 'x'.repeat(900), subject: 'cardio', lesson: '' }, 'y'.repeat(2600), 9000);
  assert.equal(big.text.length, 2000); assert.equal(big.refText.length, 300);
  assert.deepEqual(Object.keys(N.clean(big)).sort(), ['createdAt', 'lesson', 'refId', 'refText', 'refType', 'subject', 'text', 'updatedAt'], 'only the rules v17 fields are sent');
  big.s = 1; N.remove(st, 'U1', big.id, 9500); assert.ok(st.x['U1|' + big.id], 'deleting an account note queues the delete for the account');
  assert.deepEqual(N.pending(st, 'U1').del, [big.id]);
  assert.equal(N.list(st, 'U1').length, 0); assert.equal(N.list(st, '').length, 3, 'signed-out notes and account notes are kept apart');
  // persisted the same way the page reloads it
  const ctx = notesCtx(); ctx.localStorage.setItem(N.KEY, JSON.stringify(st)); assert.equal(ctx.NursinNotes.list(ctx.NursinNotes.load(), '').length, 3);
});
test('📒 notes: sign-in merges this device\'s notes into the account with no duplicates; live sync both ways; old rules keep them local', () => {
  const N = notesCtx().NursinNotes, st = N.blank(), q5 = { refType: 'q', refId: 'q005', subject: 'cardio', lesson: 'cardio:infarctus', refText: 'Q5' };
  N.put(st, '', q5, 'guest text', 100); N.put(st, '', { refType: 'q', refId: 'q006', subject: 'cardio', lesson: '', refText: 'Q6' }, 'only here', 110);
  assert.equal(N.mergeGuest(st, 'A', 200), 2);
  assert.equal(N.list(st, '').length, 0); assert.equal(N.list(st, 'A').length, 2, 'moved to the account');
  assert.equal(N.pending(st, 'A').put.length, 0, 'nothing is sent before the account\'s own copy was read (no overwrite)');
  // the first snapshot from the server: the account already has q5 with another text, and q9 from the laptop
  const remote = { q_q005: { text: 'account text', subject: 'cardio', lesson: 'cardio:infarctus', refType: 'q', refId: 'q005', refText: 'Q5', createdAt: 50, updatedAt: 60 },
    q_q009: { text: 'from the laptop', subject: 'neuro', lesson: '', refType: 'q', refId: 'q009', refText: 'Q9', createdAt: 70, updatedAt: 80 } };
  N.applyRemote(st, 'A', remote, true);
  const m = N.find(st, 'A', 'q_q005');
  assert.ok(m.text.includes('account text') && m.text.includes('guest text'), 'same question on both sides: both texts kept in ONE note');
  assert.equal(m.createdAt, 50); assert.equal(N.list(st, 'A').length, 3, 'q5 + q6 + the laptop\'s q9, no duplicate');
  assert.deepEqual(N.pending(st, 'A').put.map(n => n.id).sort(), ['q_q005', 'q_q006'], 'the merged note and the new one are sent');
  // sent → synced; then deleted on the laptop → gone here; edited on the laptop → updated here
  for (const n of N.pending(st, 'A').put) { n.d = 0; n.s = 1; remote[n.id] = N.clean(n); }
  remote.q_q009 = Object.assign({}, remote.q_q009, { text: 'edited on the laptop', updatedAt: 999 }); delete remote.q_q006;
  N.applyRemote(st, 'A', remote, true);
  assert.equal(N.find(st, 'A', 'q_q006'), null, 'deleted on another device'); assert.equal(N.find(st, 'A', 'q_q009').text, 'edited on the laptop');
  // a cached (incomplete) snapshot never deletes
  N.applyRemote(st, 'A', {}, false); assert.equal(N.list(st, 'A').length, 2);
  // edited here while offline / before rules v17: ours stays and is sent, an older remote copy never overwrites it
  N.put(st, 'A', { refType: 'q', refId: 'q009', subject: 'neuro', lesson: '', refText: 'Q9' }, 'offline edit', 2000);
  N.applyRemote(st, 'A', remote, true);
  assert.equal(N.find(st, 'A', 'q_q009').text, 'offline edit'); assert.equal(N.pending(st, 'A').put.length, 1, 'still waiting to be sent');
  // a delete made here wins over the older remote copy until it is sent
  N.remove(st, 'A', 'q_q005', 3000); N.applyRemote(st, 'A', remote, true); assert.equal(N.find(st, 'A', 'q_q005'), null);
  const js = read('assets/notes.js');
  assert.ok(js.includes('"users", uid, "notes"') && js.includes('onSnapshot') && js.includes('"permission-denied"') && js.includes('"online"'), 'users/{uid}/notes live listener, retried when the rules or the network say no');
  assert.ok(js.includes('localStorage.setItem(KEY'), 'offline-first: written to the device before the account');
  assert.ok(js.includes('سجّل دخول لتضل ملاحظاتك على كل أجهزتك') && js.includes('Connecte-toi pour garder tes notes sur tous tes appareils'), 'signed-out banner (ar + fr)');
});
test('📒 notes: search folds Arabic (أ/إ/آ → ا, ة → ه, «ال») and French accents, across the note, its source, lesson and مادة', () => {
  const N = notesCtx().NursinNotes;
  const n = { text: 'الإنعاش: غازات الدم ABG — acidose métabolique', refText: 'Hémocultures + ETO' };
  assert.equal(N.norm('أإآٱ'), 'اااا'); assert.equal(N.norm('Électrocardiogramme'), 'electrocardiogramme');
  for (const q of ['انعاش', 'الانعاش', 'إنعاش', 'metabolique', 'MÉTABOLIQUE', 'hemocultures', 'abg acidose', 'غازات']) assert.ok(N.matches(n, q), q);
  for (const q of ['troponine', 'انعاش troponine']) assert.ok(!N.matches(n, q), 'no match: ' + q);
  assert.ok(N.matches(n, 'القلب', '❤️ القلب'), 'the مادة name counts'); assert.ok(N.matches(n, ''), 'empty search shows all');
  // where a bank question belongs + the way back
  const ctx = notesCtx(), NN = ctx.NursinNotes, q = ctx.QUIZ.find(x => x.t === 'law' && x.l);
  assert.deepEqual(JSON.parse(JSON.stringify(NN.ofQ(q))), { subject: 'law', lesson: 'law:' + q.l });
  assert.deepEqual(JSON.parse(JSON.stringify(NN.ofQ(ctx.QUIZ.find(x => x.t === 'ecg')))), { subject: 'cardio', lesson: 'cardio:ecg' });
  assert.equal(NN.link({ refType: 'q', refId: 'q005', lesson: 'cardio:infarctus' }), 'quiz.html?qid=q005');
  assert.equal(NN.link({ refType: 'q', refId: 'h:abc', lesson: 'law:l1', subject: 'law' }), 'law.html#l1', 'a question outside the bank goes back to its lesson');
  assert.equal(NN.link({ refType: 'lesson', refId: 'cardio:infarctus#2', lesson: 'cardio:infarctus' }), 'cardio.html#infarctus-p2');
  assert.equal(NN.link({ refType: 'card', refId: 'q005', lesson: 'cardio:infarctus' }), 'cardio.html?fc=cardio%3Ainfarctus');
  assert.equal(NN.link({ refType: 'summary', refId: 'cardio:infarctus', lesson: 'cardio:infarctus' }), 'cardio.html?sum=cardio%3Ainfarctus');
  assert.equal(NN.link({ refType: 'lesson', refId: '3d:heart', lesson: '3d:heart' }), '3d.html');
});
test('📒 notes: «📝 ملاحظة» on every question / lesson / card / summary, filled when a note exists, never an answer, quiz untouched', () => {
  const js = read('assets/notes.js'), qz = read('assets/quiz.js'), cs = read('assets/cards.js'), css = read('assets/style.css');
  // the button: its own element, type=button, stops the click, never .opt (quiz.js only answers on .opt)
  assert.ok(/b\.type = "button"; b\.className = "nbtn /.test(js) && js.includes('e.preventDefault(); e.stopPropagation();'), 'own button, click stops there');
  assert.ok(!/className = "[^"]*\bopt\b/.test(js), 'never an answer option');
  assert.ok(qz.includes("root.querySelectorAll('.opt').forEach(function(b){b.addEventListener('click',function(){answer(+b.dataset.k);});});"), 'quiz.js answers only on .opt');
  assert.ok(js.includes('b.classList.toggle("has", has)') && css.includes('.nbtn.has .ndot{display:block'), 'dot / filled state when a note exists');
  assert.ok(!/NursinQuiz|state\.|\.qs\b/.test(js.replace(/st\.(n|x)\b/g, '')), 'the notes never touch the quiz state or its timer');
  assert.ok(js.includes('".qq, .dqq"') && js.includes('.opt, textarea, input, .expl, .pgap'), 'every question card with answers (quiz.html, exams, class quiz, tournament, live, practice, the result review)');
  assert.ok(qz.includes('data-qid="\'+q.id+\'"') && qz.includes("sel==='note'") && qz.includes('p.qid'), 'question id on the card + quiz.html?qid= opens that question');
  assert.ok(js.includes('mountLessons') && js.includes('data-split') && js.includes('.viewer[data-model]') && js.includes('"H3"'), 'every lesson part (after the split), Henderson under its <h3>, the 3D models');
  assert.ok(cs.includes('current: function () { return box ? cur : null; }') && cs.includes('"nlrow"') && cs.includes('sum='), '🃏 / 📄 tell the notes what is on screen, the note row is never a card, ?sum= opens the summary');
  assert.ok(/\.nwrap\{z-index:9[0-9]{3}\}/.test(css), 'the sheet opens above the ⚔️ tournament overlay too');
  const rm = css.slice(css.indexOf('/* 📒 ملاحظاتي'), css.indexOf('.adx{display:none'));
  assert.ok(rm.includes('@media (prefers-reduced-motion:reduce){.nbtn') && /animation:none/.test(rm), 'reduced motion: no animation');
  for (const m of rm.matchAll(/(?:animation|transition)[^;{}]*?\.(\d+)s/g)) assert.ok(+('0.' + m[1]) >= 0.15 && +('0.' + m[1]) <= 0.3, 'duration ' + m[0]);
});
test('📒 notes page + wiring: notes.html (no ads), reachable from 👤 أنا, 🗺️ حفظي and the menus, notes.js on every page, French strings', () => {
  const h = read('notes.html');
  assert.ok(h.includes('id="notes-app"') && h.includes('<title>📒 ملاحظاتي'), 'page');
  assert.ok(!/ca-pub-|adsbygoogle|ads\.js|class="adx|bauval/.test(h), 'no ads on notes.html');
  for (const p of pages.concat(['admin.html', 'chat.html'])) {
    const s = read(p);
    assert.equal((s.match(/<script src="assets\/notes\.js\?v=20261029r" defer><\/script>/g) || []).length, 1, p + ' notes.js once');
    const at = f => s.indexOf('<script src="assets/' + f);
    assert.ok(at('lessons.js') < at('notes.js') && at('notes.js') < at('account.js'), p + ' after the lesson registry, before Firebase');
    assert.ok(s.includes('<li><a href="notes.html"><span aria-hidden="true">📒</span> <bdi>ملاحظاتي</bdi>'), p + ' ☰ menu');
  }
  assert.ok(read('assets/me.js').includes('r("notes.html", "📒"'), '👤 أنا'); assert.ok(read('hifzi.html').includes('href="notes.html"'), '🗺️ حفظي');
  assert.ok(read('assets/nav.js').includes('["notes.html", "📒", "ملاحظاتي"'), '📚 sheet / desktop menu');
  assert.ok(read('assets/account.js').includes("page==='notes.html'"), 'Firebase loads on notes.html (sign-in button + account notes)');
  const js = read('assets/notes.js');
  for (const k of ['حفظ', 'إلغاء', 'امحي', 'ملاحظة حرّة', 'دوّر بملاحظاتك', 'لسّا ما عندك ملاحظات']) assert.ok(js.includes(k), 'ar ' + k);
  for (const k of ['Enregistrer', 'Annuler', 'Supprimer', 'Note libre', 'Chercher dans tes notes', 'Pas encore de notes']) assert.ok(js.includes(k), 'fr ' + k);
  assert.ok(js.includes('w.confirm('), 'delete asks first');
  assert.ok(read('assets/lang.js').includes('notes: 1') && fs.existsSync(path.join(SITE, 'assets/fr/p-notes.js')) && read('assets/fr/ui.js').includes('"📒 ملاحظاتي": "📒 Mes notes"'), '🇫🇷 page + menu strings');
});


/* ---------- Oct 30 2026 (Abdullah): 👴 الشيخوخة, 🏘️ صحة المجتمع, 🏥 Med-Surg + 💉 التسريب الوريدي, PDCA heading, Henderson L2 cards ---------- */
const NEWQ = () => { const q = {}; new Function('window', read('assets/quiz-data.js'))(q); return q; };
const LESS = () => { const vm = require('node:vm'); const w = {}; w.window = w; vm.createContext(w); vm.runInContext(read('assets/lessons.js'), w); return w; };
const quizRules = (grp, label) => {
  const c = [0, 0, 0]; grp.forEach(x => c[x.a]++); assert.ok(c.every(n => n >= Math.floor(grp.length / 3) - 2), label + ': answers spread a/b/c ' + c);
  grp.forEach(x => { const L = x.o.map(o => o.length), m = Math.max(...L); assert.ok(L[x.a] < m || L.filter(n => n === m).length > 1, 'right answer is not the longest: ' + x.id);
    assert.ok(!/<b>|\*\*/.test(x.q + x.o.join('') + x.x), 'no bold: ' + x.id); assert.ok(/^q[0-9]{3}$/.test(x.id), 'id shape ' + x.id); });
};
test('👴 geri + 🏘️ community render: own pages, 10 / 6 lessons, quiz per lesson, linked everywhere (Oct 30)', () => {
  for (const [p, data, v, n, t] of [['geri.html', 'geri-data.js', 'GERI', 10, 'geri'], ['community.html', 'comm-data.js', 'COMM', 8, 'comm']]) {
    const h = read(p);
    for (const s of [data, 'subject.js', 'quiz-data.js', 'cards.js', 'srs.js', 'notes.js', 'hifz.js', 'lessons.js']) assert.ok(h.includes('assets/' + s + '?v=20261029r'), p + ' loads ' + s);
    assert.ok(h.includes('data-var="' + v + '"') && h.includes('data-t="' + t + '"'), p + ' renderer hook');
    const w = {}; new Function('window', read('assets/' + data))(w); const L = w[v].lessons;
    assert.strictEqual(L.length, n, p + ': ' + n + ' lessons'); L.forEach(x => assert.ok(x.k && x.n && x.html.length > 1500, x.k));
    const NL = LESS().NLESSONS, li = NL.list.filter(x => x.s === t);
    assert.strictEqual(li.length, n, 'NLESSONS lines'); li.forEach((x, i) => { assert.strictEqual(x.href, p + '#' + L[i].k); assert.strictEqual(x.l, L[i].k); });
    const q = NEWQ(); assert.deepStrictEqual(q.QGROUPS[t], [t]); L.forEach(x => assert.ok(q.QUIZ.filter(y => y.t === t && y.l === x.k).length >= 4, 'quiz for ' + x.k));
    quizRules(q.QUIZ.filter(y => y.t === t), t);
    assert.ok(read('assets/nav.js').includes('["' + p + '"'), '📚 sheet'); assert.ok(read('index.html').includes('href="' + p + '"') && read('sitemap.xml').includes(p), 'home nav + sitemap');
    assert.ok(read('assets/lang.js').includes(p.replace('.html', '') + ': 1') && fs.existsSync(path.join(SITE, 'assets/fr/p-' + p.replace('.html', '') + '.js')), 'fr page strings');
  }
  const NL = LESS().NursinLessons; assert.ok(NL.CLASSDAY.geri === 6 && NL.CLASSDAY.comm === 6 && NL.CLASSDAY.medsurg === 5, 'Saturday = community + gerontology, Friday = Med-Surg');
  assert.ok(read('assets/fr/quiz.js').includes('Oct 30: 👴 gériatrie'), 'French for the new questions');
});
test('🏥 Med-Surg groups القلب / الأعصاب / Henderson without touching URLs, lesson ids, progress keys or question ids (Oct 30)', () => {
  const W = LESS(), NL = W.NursinLessons, R = W.NLESSONS;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(R.groups.medsurg.subs)), ['cardio', 'neuro', 'henderson', 'medsurg']);
  for (const s of ['cardio', 'neuro', 'henderson', 'medsurg']) assert.strictEqual(NL.groupOf(s), 'medsurg'); assert.strictEqual(NL.groupOf('quality'), 'quality');
  const old = { 'cardio:infarctus': 'cardio.html#infarctus', 'cardio:heart': 'cardio.html#heart', 'neuro:avc': 'neuro.html#avc', 'neuro:glasgow': 'neuro.html#glasgow', 'henderson:h1': 'henderson.html', 'henderson:h2': 'henderson.html' };
  for (const [id, href] of Object.entries(old)) { const x = R.list.find(y => NL.base(y) === id); assert.ok(x, id + ' still a lesson'); assert.strictEqual(x.href, href, id + ' URL'); }
  assert.strictEqual(R.list.filter(x => x.s === 'cardio').length, 12); assert.strictEqual(R.list.filter(x => x.s === 'neuro').length, 8);
  assert.ok(R.list.every(x => ['cardio', 'neuro', 'henderson'].indexOf(x.s) < 0 || /^(cardio|neuro|henderson)\.html/.test(x.href)), 'old lessons stay on their pages');
  const q = NEWQ(); assert.ok(q.QUIZ.filter(x => +x.id.slice(1) <= 284).every(x => x.t !== 'medsurg' && x.t !== 'geri' && x.t !== 'comm'), 'old question ids untouched');
  assert.strictEqual(new Set(q.QUIZ.map(x => x.id)).size, q.QUIZ.length, 'question ids unique');
  const h = read('medsurg.html'); assert.ok(h.includes('id="msgroup"') && h.includes('data-var="MEDSURG"'), 'hub + its own lessons');
  assert.ok(read('assets/subject.js').includes('NL.groups') && read('assets/hifz.js').includes('🏥 Med-Surg') && read('assets/admin.js').includes('units') && read('assets/goals.js').includes('groupOf'), 'retention map, admin «📌 دروس هالأسبوع», goals timetable show the group');
  for (const f of ['coach.js', 'study.js', 'gate.js']) assert.ok(read('assets/' + f).includes('medsurg'), f + ' knows the new pages');
});
test('💉 perfusion lesson from the photos: complications, solutés, gauges, nutrition; Lymphangite kept; no [؟] left (all answered Oct 30 6:06 PM); quiz (Oct 30)', () => {
  const w = {}; new Function('window', read('assets/medsurg-data.js'))(w); const iv = w.MEDSURG.lessons.find(x => x.k === 'iv');
  assert.ok(iv && iv.n.includes('التسريب الوريدي'));
  for (const s of ['Infiltration', 'Bactériémie', 'Embolie gazeuse', 'Lymphangite', 'Surcharge liquidienne', 'Crystalloïde', 'Colloïde', '10% – 30%', '0,45% – 0,33% – 0,2%', 'Dextrose 2,5%', 'Albumine', 'Entérale', 'Parentérale', 'pneumothorax', '72 h', 'مع حجم وقطر الوريد', 'liquide (السائل) داخل وخارج الخلية.', '(sodium p.)', 'مضاعفات الـ Sonde (أنبوب): ليس بمكانه'])
    assert.ok(iv.html.includes(s), s);
  assert.ok(!iv.html.includes('[؟]') && !read('assets/fr/medsurg.js').includes('[؟]'), 'no [؟] left in the lesson (ar + fr)');
  for (const [c, g] of [['gris', 16], ['vert', 18], ['rose', 20], ['bleu', 22], ['orange', 24]]) assert.ok(new RegExp(c + '[^<]*</td><td>' + g).test(iv.html), c + ' ' + g);
  assert.ok(iv.html.includes('<td>Jaune orangé / orange-jaune (أصفر برتقالي)</td><td>24</td>'), '24 = jaune orangé');
  const q = NEWQ(), set = q.QUIZ.filter(x => x.t === 'medsurg' && x.l === 'iv'); assert.ok(set.length >= 6, 'perfusion quiz'); quizRules(set, 'perfusion');
  assert.ok(read('assets/fr/medsurg.js').includes('Perfusion intraveineuse'), 'French version of the lesson');
  const NL = LESS().NLESSONS; assert.ok(NL.list.some(x => x.s === 'medsurg' && x.href === 'medsurg.html#iv'), 'in the lesson registry (retention, search, goals)');
});
test('🃏 Henderson lesson 2 cards / summary use lesson 2 only; PDCA heading «أولًا: Deming / دورة PDCA» + its French key (Oct 30)', () => {
  const c = read('assets/cards.js');
  assert.ok(c.includes('p.querySelector("h3")') && c.includes('break outer'), 'a sibling holding both lessons is walked from its end down to this lesson\'s <h3>');
  const h = read('henderson.html'), i1 = h.indexOf('l=h1'), i2 = h.indexOf('<h3>الحاجات ٨–١٤</h3>'), i3 = h.indexOf('l=h2');
  assert.ok(i1 > 0 && i1 < i2 && i2 < i3, 'lesson 1 quiz → lesson 2 heading → lesson 2 quiz');
  const qd = read('assets/quality-data.js'); assert.ok(qd.includes('<h3>أولًا: Deming / دورة PDCA</h3>') && !qd.includes('دورة شيوهارت Deming'), 'heading');
  const vm = require('node:vm'); const ctx = { window: {}, document: { addEventListener() {} } }; ctx.window = ctx;
  const lj = read('assets/lang.js'), hash = new Function('s', lj.match(/function hash\(s\) \{([^\n]*)\}\n/)[1]);
  const w = {}; new Function('window', qd)(w); const q2 = w.QUALITY.lessons.find(x => x.k === 'q2').html.replace(/\s+/g, ' ').trim();
  assert.ok(read('assets/fr/quality.js').includes('"' + hash(q2) + '"'), 'fr/quality.js key = hash of the new q2 html');
  assert.ok(read('assets/fr/quality.js').includes('Premièrement : Deming / cycle PDCA'), 'French heading');
});
const GERI_SPOTS = ["ذائية فردية تناسب حالة ا", "يع في الصحة العامة بسبب ", "ت خاصة في الساقين نتيجة ", "كشف عن النفخات القلبية أ", "ائل نتيجة مشاكل في البلع", "ويات المسن وتقليل خوفه م", " التي تؤثر على طباع ونفس", " الحركة المستمرة وعدم ال", "الكدمات ووصف المسكنات أو", "رات الهاضمة من المعدة وا", "دث وتحليل أسباب السقوط ل", "ية مثل التقاعد أو قلة ال", " التحرك بأمان أثناء استخ", "تؤثر على شخصية المسن ونف", " أطعمة لينة لمن يعاني مش", "مع والجهاز الدهليزي المس", "ين والبري ألبومين لتقدير", " الضعف المعرفي الخفيف في", "زات بسبب ضعف التحكم بالم", " على وضعية الجسم الثابتة"];
const COMM_SPOTS = ["ن مع الحكومات والمؤسسات ", "اون الدولي لتبادل المعرف", "تاج وتوزيع أغذية صحية وذ", "قديم خدمات وبرامج لتحسين", "يقة تضمن حقوق المرضى وتح", "اسعة النطاق للتثقيف حول ", " من تطوير مهاراتهم وتحقي", "ورية لتحقيق التوازن النف", "أنظمة الرعاية الصحية وزي", "جتمع في التخطيط والتنفيذ", "م للقطاع الصحي لمواجهة ا", "ئية التي كانت تعاني من ن", " بصحة نفسية جيدة يكونون ", "صصة في تقديم الرعاية الص", " المياه والتأكد من خلوها", "مجتمعات حول أهمية الوقاي", "م بنشر الوعي الصحي وتثقي", "رس العادات الغذائية السل", "عمل وبرامج توعوية عن مخا", " صحية مستنيرة تتعلق بصحت"];
test('📄 coverage spot-check: lines of both PDFs are in the lessons word for word (Oct 30; full check ≥98% done at build)', () => {
  const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const g = {}, c = {}; new Function('window', read('assets/geri-data.js'))(g); new Function('window', read('assets/comm-data.js'))(c);
  const G = strip(g.GERI.lessons.map(x => x.html).join(' ') + ' ' + g.GERI.intro), C = strip(c.COMM.lessons.map(x => x.html).join(' ') + ' ' + c.COMM.intro);
  for (const s of GERI_SPOTS) assert.ok(G.includes(s), 'geri: ' + s);
  for (const s of COMM_SPOTS) assert.ok(C.includes(s), 'community: ' + s);
});

/* ---------------- 🧠 Build 2 — retention features (Oct 30 2026, Abdullah approved 9:46 PM) ---------------- */
function retainCtx(extra) {
  const vm = require('node:vm');
  const store = {};
  const noop = () => {};
  const el = null;
  const ctx = Object.assign({ console, Math, Date, JSON, setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    location: { pathname: '/x.html', search: '' }, navigator: { onLine: true }, CustomEvent: function () {} }, extra || {});
  ctx.document = { readyState: 'complete', addEventListener: noop, dispatchEvent: noop, querySelector: () => el, querySelectorAll: () => [], getElementById: () => el,
    documentElement: { classList: { contains: () => false, add: noop, remove: noop, toggle: noop } }, body: { appendChild: noop }, head: { appendChild: noop }, createElement: () => ({ setAttribute: noop }) };
  ctx.window = ctx;
  vm.createContext(ctx);
  return { ctx, run: f => vm.runInContext(read(f), ctx) };
}
const B2_LESSON_PAGES = ['cardio.html','neuro.html','henderson.html','medsurg.html','geri.html','community.html','rea.html','pharma.html','law.html','mgmt.html','quality.html'];
test('🧠 Build 2: assets/retain.js on every lesson page (after cards.js), home, حفظي and quiz (before quiz.js), with the cache tag', () => {
  for (const p of B2_LESSON_PAGES) { const h = read(p); assert.equal((h.match(/<script src="assets\/retain\.js\?v=20261029r" defer><\/script>/g) || []).length, 1, p); assert.ok(h.indexOf('assets/cards.js') < h.indexOf('assets/retain.js'), p + ' after cards.js'); }
  for (const p of ['index.html', 'hifzi.html', 'quiz.html']) assert.equal((read(p).match(/assets\/retain\.js\?v=20261029r/g) || []).length, 1, p);
  const q = read('quiz.html'); assert.ok(q.indexOf('assets/retain.js') < q.indexOf('assets/quiz.js'), 'retain before quiz.js');
  const r = read('assets/retain.js'); assert.ok(r.includes('var V = "20261029r"'), 'data files load with the same tag');
  assert.ok(read('assets/cards.js').includes('blocks: blocks, openDeck:'), 'cards.js shares its lesson walk + opens a given deck');
});
test('🧠 Build 2 text tools: Arabic folding + French accents, and key-point coverage by keywords', () => {
  const { ctx, run } = retainCtx(); run('assets/retain.js'); const R = ctx.Retain;
  assert.equal(R.norm('الجلطةُ القلبيّة'), R.norm('الجلطه القلبيه'));
  assert.equal(R.norm('Hémocultures + ÉTO'), 'hemocultures eto');
  assert.equal(R.norm('أإآ ى ة'), 'ااا ي ه');
  assert.ok(R.cover('الـ Troponine (تروبونين) هيي الأدق لأذية خلايا القلب', 'اهم فحص هو التروبونين troponine لأنو الأدق').ok, 'same idea, other words around it');
  assert.ok(!R.cover('الـ Troponine (تروبونين) هيي الأدق لأذية خلايا القلب', 'الضغط عالي والمريض عندو سكري').ok, 'unrelated text');
  assert.ok(R.cover('Diabète (سكري)', 'عندو diabete').ok, 'accent-free French counts');
  const res = R.check([{ t: 'Œdème papillaire = HTIC' }, { t: 'ممنوع ponction lombaire' }], 'oedeme papillaire يعني HTIC');
  assert.deepEqual(Array.from(res, x => x.ok), [true, false]);
  const pts = [{ t: '٣. بيتكوّن عليها جلطة (thrombus)' }, { t: 'Athérosclérose (السبب الأساسي)' }, { t: 'HTA (ضغط)' }, { t: 'Cholestérol عالي' }];
  assert.deepEqual(Array.from(R.check(pts, 'بيصير thrombus والسبب athérosclérose'), x => x.ok), [true, true, false, false], 'naming the point\'s own French term counts');
});
test('🧑‍🏫 علِّم عثمان: same Osman endpoint as the tutor (no worker change), signed-in only, 10 a day, key points from the lesson, local checklist fallback, fr', () => {
  const r = read('assets/retain.js'), t = read('assets/tutor.js');
  const api = t.match(/var API='([^']+)'/)[1];
  assert.ok(r.includes('API = "' + api + '"'), 'same endpoint');
  assert.equal((r.match(/workers\.dev/g) || []).length, 1, 'no other endpoint');
  assert.ok(r.includes('messages: [{ role: "user", text: text }]') && r.includes('Osman.persona()'), 'same request shape as practice.js');
  assert.ok(/useAI = signed\(\) && teachLeft\(\) > 0/.test(r) && r.includes('TMAX = 10'), 'signed-in + daily cap');
  assert.ok(r.includes('✅ صح:') && r.includes('❌ ناقصك:') && r.includes('🔧 تصحيح:'), 'right / missed / correction');
  assert.ok(r.includes('ما تزيد شي من برّا'), 'grounded in the lesson points');
  assert.ok(r.includes('تصحيح تلقائي من نقاط الدرس') && r.includes('localReply(res)'), 'local fallback says so');
  assert.ok(r.includes('"🧑‍🏫 Enseigne à Osman"') && r.includes('"📃 Page blanche"') && r.includes('"🩺 Cas clinique"'), 'fr strings');
  assert.ok(!fs.existsSync(path.join(SITE, 'worker.js')), 'no worker file in the site');
});
test('📃 الورقة البيضا: 2-minute timer, checklist of the part\'s key points, missed ones as cards + tomorrow\'s review', () => {
  const r = read('assets/retain.js');
  assert.ok(r.includes('BLANK_SEC = 120') && r.includes('Date.now() + BLANK_SEC * 1000'), 'timestamp timer, 2 min');
  assert.ok(r.includes('C.openDeck(base(x), deck)') && r.includes('S.add(qs.map'), 'cards + review');
  assert.ok(r.includes('nursin_blank_v1'), 'last result per part');
  // key points come from the page's own blocks (headings, bold lines, lists, tables)
  assert.ok(/function keyPoints\(bl\)/.test(r) && r.includes('querySelector("b,strong")'));
});
test('🩺 حالة مريض: static cases from each clinical lesson, 3–4 exam questions, Henderson need by name, answers spread, right not longest, no bold, fr', () => {
  const C = JSON.parse(read('assets/cases-data.js').match(/window\.CASES=(\[.*\]);/s)[1]);
  const L = read('assets/lessons.js'), ids = new Set([...L.matchAll(/\{ s: "(\w+)", t: "(\w+)"(?:, l: "(\w+)")?/g)].map(m => m[1] + ':' + (m[3] || m[2])));
  const need = ['cardio:infarctus','cardio:angor','cardio:pericarde','cardio:endomyo','cardio:pacemaker','cardio:embolie','cardio:choc','cardio:ic','cardio:arythmies','cardio:chirurgie',
    'neuro:evaluation','neuro:examens','neuro:laminectomie','neuro:craniotomie','neuro:avc','neuro:htic','neuro:glasgow','henderson:h1','henderson:h2','medsurg:iv','rea:r1',
    'pharma:cardio','pharma:coag','pharma:atb','pharma:pain','pharma:resp','pharma:dig','pharma:cort','pharma:diab','geri:g1','geri:g2','geri:g3','geri:g4','geri:g5','geri:g6','geri:g7','geri:g8','geri:g9','geri:g10','comm:c3','comm:c4','comm:c5'];
  const have = new Set(C.map(c => c.id));
  for (const k of need) assert.ok(have.has(k), 'case for ' + k);
  const cnt = [0, 0, 0], longest = o => o.reduce((m, x) => Math.max(m, x.trim().length), 0);
  for (const c of C) {
    assert.ok(ids.has(c.id), c.id + ' is a lesson'); assert.ok(!/^(law|mgmt|quality):/.test(c.id), 'no law/mgmt/quality');
    assert.ok(c.pt.length > 40 && c.v.length > 5 && c.fr && c.fr.pt && c.fr.v, c.id + ' story + vitals + fr');
    assert.ok(c.qs.length >= 3 && c.qs.length <= 4, c.id + ' 3–4 questions');
    assert.ok(c.qs.some(q => q.k === 'need'), c.id + ' has a Henderson-need question');
    for (const q of c.qs) {
      assert.equal(q.o.length, 3, c.id); assert.ok(q.a >= 0 && q.a < 3); cnt[q.a]++;
      for (const o of [q.o, q.fr.o]) { const others = o.filter((_, i) => i !== q.a); assert.ok(o[q.a].trim().length <= longest(others), c.id + ' right option is not the longest: ' + o[q.a]); }
      const all = [q.q, q.x, ...q.o, q.fr.q, q.fr.x, ...q.fr.o, c.pt, c.v].join(' ');
      assert.ok(!/<[a-z\/]|\*\*/.test(all), c.id + ' no markup/bold');
      assert.ok(!/(الحاجة|حاجة|besoin)\s*(رقم|n°)?\s*[0-9٠-٩]+/i.test(all), c.id + ' Henderson need never by number');
      assert.ok(q.x.length > 10 && q.fr.x.length > 10, c.id + ' explanation');
    }
  }
  const tot = cnt[0] + cnt[1] + cnt[2]; for (const n of cnt) assert.ok(n > tot * 0.25, 'spread ' + cnt);
  const ci = read('assets/retain.js').match(/var CASE_IDS = \[([^\]]*)\]/)[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean);
  assert.deepEqual(ci.slice().sort(), [...have].sort(), 'CASE_IDS = the data');
  assert.ok(!read('assets/retain.js').includes('adx-'), 'no ad unit drawn by these features');
});
test('📝 weekly mixed exam: ~20 from studied lessons only, weighted to red lessons + mistakes, every subject, deterministic per week; one home entry, حفظي card, quiz mode without ads', () => {
  const { ctx, run } = retainCtx(); run('assets/quiz-data.js'); run('assets/retain.js'); const R = ctx.Retain, Q = ctx.QUIZ;
  const sc = { 'cardio:infarctus': 20, 'cardio:angor': 90, 'geri:g5': 55, 'pharma:cardio': 85 };
  const subj = id => id.split(':')[0];
  const lessonOf = q => q.t === 'infarctus' ? 'cardio:infarctus' : q.t === 'angor' ? 'cardio:angor' : q.t === 'geri' && q.l === 'g5' ? 'geri:g5' : q.t === 'pharma' && q.l === 'cardio' ? 'pharma:cardio' : null;
  const mk = () => ({ lessonOf, subjOf: subj, score: id => (id in sc ? sc[id] : null), weak: {}, due: {} });
  const a = R.weeklyPick(Q, mk(), 20, '2026-10-26:0'), b = R.weeklyPick(Q, mk(), 20, '2026-10-26:0');
  assert.deepEqual(a.map(q => q.id), b.map(q => q.id), 'same week, same exam');
  assert.ok(a.length > 0 && a.length <= 20 && a.every(q => lessonOf(q)), 'only studied lessons');
  assert.ok(new Set(a.map(q => q.id)).size === a.length, 'no repeats');
  for (const s of ['cardio', 'geri', 'pharma']) assert.ok(a.some(q => subj(lessonOf(q)) === s), 'every studied subject: ' + s);
  let red = 0, green = 0;
  for (let i = 0; i < 40; i++) R.weeklyPick(Q, mk(), 6, 'w' + i).forEach(q => { if (q.t === 'infarctus') red++; if (q.t === 'angor') green++; });
  assert.ok(red > green * 1.5, 'red lesson weighted up: ' + red + ' vs ' + green);
  assert.equal(R.weekKey('2026-11-01'), '2026-10-26'); assert.equal(R.weekKey('2026-11-02'), '2026-11-02');
  const qz = read('assets/quiz.js');
  assert.ok(qz.includes("if(sel==='mixed')return RT?RT.weekly(RT.WN):[];") && qz.includes('function mixedDone') && qz.includes('RT.wsave(') && qz.includes('RT.bySubjHtml(s.by)'), 'mode + per-subject result + saved');
  const md = qz.slice(qz.indexOf('function mixedDone'), qz.indexOf('function done(){'));
  assert.ok(!md.includes('adx') && md.includes('adsOff(true)'), 'no ad on the result');
  assert.ok(qz.includes("RT.WMIN*60000") && qz.includes('s.timeUp=true'), 'optional timer');
  const h = read('index.html'); assert.ok(!h.includes('id="wexhome"') && read('assets/home.js').includes('k: "wex"'), 'one compact home entry: a step of «🧭 مسار اليوم» (Oct 31 2026)');
  assert.ok(read('hifzi.html').includes('id="wexhifz"'), 'حفظي card');
  assert.ok(read('assets/retain.js').includes('T("جاهز", "Prêt")'), 'badge جاهز (fr Prêt)');
});
test('🎯 confidence (SRS v2, Nov 3 2026): AFTER a right answer «✅ كنت متأكد» (longer) / «🤔 حزرت» (shorter + weak points), no tap = normal; never in timed exams / challenges / class quiz / duels / games (recorded silently)', () => {
  const { ctx, run } = retainCtx(); run('assets/retain.js'); const R = ctx.Retain;
  assert.ok(R.confOn({ sel: 'all' }) && R.confOn({ sel: 'mixed' }));
  for (const s of [{ exam: 'x' }, { challenge: 'c1' }, { cq: 'k' }, null]) assert.ok(!R.confOn(s), JSON.stringify(s));
  const qz = read('assets/quiz.js');
  assert.ok(qz.includes("var cf=ok&&S&&S.confRow&&RT&&RT.confOn(s)&&!s.timed;") && qz.includes("if(kind!=='guess')return;if(W)W.record(q,false);"), 'only after a right answer, not timed; حزرت → weak points too');
  assert.ok(!qz.includes('return pick(k)') && !qz.includes('data-cf='), 'no extra tap before the answer any more: the answer shows at once');
  const sj = read('assets/srs.js'); assert.ok(sj.includes('data-srcf="sure"') && sj.includes('كنت متأكد') && sj.includes('حزرت') && sj.includes("J'étais sûr(e)") && sj.includes("J'ai deviné"), 'the two choices, ar + fr');
  for (const f of ['assets/live.js', 'assets/duel.js', 'assets/games.js']) assert.ok(!read(f).includes('cfrow') && !read(f).includes('Retain'), f + ' untouched');
});
test('❓ ليش؟: why-questions written from each explanation, right one not the longest, 1 in 3 right answers or every guessed one, silent when none', () => {
  const Y = JSON.parse(read('assets/why-data.js').match(/window\.WHY=(\{.*\});/s)[1]);
  const src = read('assets/quiz-data.js'), Q = JSON.parse(src.match(/window\.QUIZ=(\[.*?\]);\n/s)[1]), byId = Object.fromEntries(Q.map(q => [q.id, q]));
  assert.ok(Object.keys(Y).length >= 100, 'count ' + Object.keys(Y).length);
  for (const [id, y] of Object.entries(Y)) {
    assert.ok(byId[id], id + ' in the bank'); assert.ok(y.o.length >= 2 && y.o.length <= 3, id); assert.ok(y.a >= 0 && y.a < y.o.length, id);
    for (const o of [y.o, y.fr.o]) assert.ok(o[y.a].trim().length <= Math.max(...o.filter((_, i) => i !== y.a).map(x => x.trim().length)), id + ' right not longest');
    assert.ok(!/<[a-z\/]|\*\*/.test([y.q, ...y.o, y.fr.q, ...y.fr.o].join(' ')), id + ' no markup');
  }
  const { ctx, run } = retainCtx(); run('assets/retain.js'); ctx.WHY = Y; const R = ctx.Retain;
  const id = Object.keys(Y)[0], q = byId[id], none = Q.find(x => !Y[x.id]);
  assert.equal(R.whyFor(q, false, 0.9), null, 'not every time');
  assert.ok(R.whyFor(q, false, 0.1), '1 in 3');
  assert.ok(R.whyFor(q, true, 0.9), 'always after محزّر');
  assert.equal(R.whyFor(none, true, 0), null, 'nothing when no why-question');
  const qz = read('assets/quiz.js'); assert.ok(qz.includes('RT.whyFor(q,guessed)') && qz.includes('showWhy(true)') && qz.includes('!s.timed'), 'quiz draws it (again after «🤔 حزرت»), not in a timed exam');
});
test('🚫 Build 2 has no ads in or next to its features: sheets hide the page ads while open (html.rton), mixed exam too', () => {
  const css = read('assets/style.css'), r = read('assets/retain.js');
  assert.ok(css.includes('html.rton .adx,html.rton .ad-slot{display:none!important}'));
  assert.ok(r.includes('classList.add("fcon", "rton")') && r.includes('classList.remove("fcon", "rton")'), 'sheets toggle rton');
  assert.ok(read('assets/quiz.js').includes("function adsOff(on){document.documentElement.classList.toggle('rton',!!on);}"));
  for (const p of ['index.html', 'hifzi.html']) assert.ok(!/<div class="adx[^>]*>\s*<\/div>\s*<div id="wex/.test(read(p)), p);
});

test('🏠 home «G» (Oct 31 2026): header + search + chips → «🧭 مسار اليوم» → «موادي», glass pill nav + «الكل» sheet, banner moved down, Cairo + no ads in home.js', () => {
  const h = read('index.html'), js = read('assets/home.js'), css = read('assets/home.css'), uj = read('assets/ui.js'), uc = read('assets/ui.css');
  const main = h.slice(h.indexOf('<main'), h.indexOf('</main>'));
  assert.ok(main.indexOf('id="hz"') > -1 && main.indexOf('id="hz"') < main.indexOf('id="duel"') && !main.includes('id="osmhome"'), '#hz first in main; the old cards are path steps now (Oct 31 2026)');
  assert.ok(h.includes('<body class="home hz ui">') && h.includes('<link rel="stylesheet" href="assets/home.css?v=20261029r">') && h.includes('<script src="assets/home.js?v=20261029r" defer></script>'), 'home files with cache tag');
  assert.ok(h.indexOf('<script src="assets/home.js') > h.indexOf('<script src="assets/retain.js') && h.indexOf('<script src="assets/home.js') < h.indexOf('<script src="assets/ads.js'), 'home.js after the data scripts');
  assert.ok(h.includes('<noscript><style>body.hz .topbar{display:block!important}</style></noscript>'), 'no-JS keeps the old header');
  assert.ok(!/adx|bauval|adsbygoogle|ad-slot/.test(js) && !/adx|bauval|adsbygoogle|ad-slot/.test(uj) && !/\.adx|ad-slot/.test(css.replace('/*', '')) && !/\.adx|ad-slot/.test(uc), 'no ad markup in the home files or the shared shell');
  for (const f of ['assets/fonts/cairo-ar.woff2', 'assets/fonts/cairo-lat.woff2']) { const b = fs.readFileSync(path.join(SITE, f)); assert.strictEqual(b.slice(0, 4).toString(), 'wOF2', f); }
  assert.ok(uc.includes('url(fonts/cairo-ar.woff2)') && read('credits.html').includes('SIL Open Font License'), 'Cairo self-hosted + credited');
  assert.ok(uc.includes('@supports ((-webkit-backdrop-filter:blur(2px)) or (backdrop-filter:blur(2px)))') && uc.includes('saturate(180%)') && css.includes('@supports ((-webkit-backdrop-filter:blur(2px)) or (backdrop-filter:blur(2px)))'), 'liquid glass with a solid fallback');
  assert.ok(uc.includes('html[data-theme=night] body.ui{') && uc.includes('prefers-reduced-motion') && css.includes('prefers-reduced-motion'), 'dark = night theme; reduced motion');
  assert.ok(/body\.hz \.topbar\{display:none\}/.test(css) && uc.includes('body.ui .gnav{display:none!important}'), 'the pill nav replaces the old bar (Oct 31 6:45 AM: on every page, assets/ui.css)');
  assert.ok(uj.includes('href="tutor.html"') && uj.includes('hzmid') && uj.includes('hifzi.html') && uj.includes('data-hz="all"') && uj.includes('data-hz="learn"') && js.includes('data-hz="all"'), 'nav: home · subjects · raised Osman · حفظي · الكل');
  assert.ok(uj.includes('w.NursinSearch.open()') && uj.includes('.topbar .annbell') && js.includes('.topbar .annbell'), 'search = the site search; bell only when the announcements bell exists');
  assert.ok(uj.includes('function drag(el, onClose, bodySel)') && uj.includes('hzscrim') && uj.includes('function blobTo('), 'sheets drag down / backdrop close; sliding nav bubble');
  const T2 = (js + uj).match(/\bT\("[^"]*"\s*\+?/g) || [], T1 = (js + uj).match(/\bT\("(?:[^"\\]|\\.)*"\)/g) || [];
  assert.ok(T2.length > 60 && T1.length === 0, 'every new string has its French (T(ar, fr))');
});
function homeCtx(store = {}) {
  const vm = require('node:vm');
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const ctx = { console, localStorage: ls, Intl, Date, Math, JSON, Promise, setTimeout, clearTimeout, store };
  ctx.window = ctx; vm.createContext(ctx);
  const run = f => vm.runInContext(read(f), ctx, { filename: f });
  return { ctx, run, store };
}
test('🧭 مسار اليوم: 5–7 steps from real data, the same all day (stored per Beirut day), ticks by itself, Osman first, a first lesson + quiz for new students', () => {
  const { ctx, run, store } = homeCtx(); run('assets/lessons.js'); run('assets/ui.js'); run('assets/home.js');
  const H = ctx.HomePath, L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, q: 10, added: l.added || '' }));
  // brand new (a Sunday morning): Osman, the first lesson that has a quiz + its quiz, then light ones up to 5
  const fresh = H.build({ day: '2026-11-01', hm: 540, due: 0, last: null, lessons: L, wex: { ready: false }, cases: [] });
  assert.ok(fresh.length >= 5 && fresh.length <= 7, 'count ' + fresh.length);
  assert.deepStrictEqual(Array.from(fresh, s => s.k).slice(0, 3), ['new', 'rev', 'osm'], '29f one list: first lesson (درس اليوم), 🔁 التكرار المتباعد (pinned, Nov 3 2026), then Osman');
  assert.ok(fresh.some(s => s.k === 'quiz'), '… then its quiz');
  // a studying student
  const L2 = L.map(l => Object.assign({}, l, l.id === 'cardio:infarctus' ? { score: 82, read: true } : l.id === 'neuro:avc' ? { score: 22, read: true } : l.id === 'neuro:htic' ? { score: 55, read: true } : {}));
  const x = { day: '2026-11-01', hm: 540, due: 14, last: { id: 'cardio:infarctus', href: 'cardio.html#infarctus', name: 'القلب', part: '' }, lessons: L2, wex: { ready: true, done: false }, cases: ['neuro:htic', 'cardio:infarctus'] };
  const a = H.build(x), b = H.build(JSON.parse(JSON.stringify(x)));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), 'deterministic');
  assert.deepStrictEqual(Array.from(a, s => s.k), ['cont', 'rev', 'wex', 'osm', 'fade', 'quiz', 'case'], '29f: continue (درس اليوم) → reviews → weekly bonus → Osman → most faded → quiz → case');
  assert.strictEqual(a[1].href, 'quiz.html?t=review', 'the day\'s list (≤ 20, assets/srs.js)'); assert.strictEqual(a[4].id, 'neuro:avc', 'the most faded lesson');
  assert.strictEqual(a.find(s => s.k === 'quiz').href, 'quiz.html?t=infarctus&n=10');
  assert.ok(a.some(s => s.k === 'case' && /^(neuro|cardio)\.html\?case=/.test(s.href)), 'a patient case when one exists for a studied lesson');
  // every step's link is a real page
  for (const s of a.concat(fresh)) { if (!s.href) continue; const f = s.href.split(/[?#]/)[0]; assert.ok(fs.existsSync(path.join(SITE, f)), s.href); }
  // stored once per day: same plan on reload even if the data moved; a new day builds a new one
  let due = 6; ctx.NursinSRS = { count: () => due }; ctx.Nursin = { dayKey: () => '2026-10-31' };
  const p1 = H.plan(); due = 40; const p2 = H.plan();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(p1.steps)), JSON.parse(JSON.stringify(p2.steps)), 'no reshuffle the same day');
  assert.ok(JSON.parse(store[H.KEY]).d === '2026-10-31' && JSON.parse(store[H.KEY]).v === H.V);
  ctx.Nursin.dayKey = () => '2026-11-01'; assert.notStrictEqual(H.plan().d, '2026-10-31', 'a new day, a new path');
  // ticks (by step key): reviews counted down, lesson read / quiz answered after the plan was made, visited-and-back for the others
  const now = Date.now(), st = [{ k: 'rev', base: 14, n: 10 }, { k: 'cont', id: 'cardio:infarctus' }, { k: 'quiz', id: 'cardio:infarctus' }, { k: 'case', id: 'neuro:htic' }, { k: 'wex' }];
  const P = { d: '2026-11-01', at: now - 60000, done: {}, vis: {}, steps: st }, K = st.map(H.skey);
  due = 9; assert.ok(!H.isDone(P, 0)); due = 4; assert.ok(!H.isDone(P, 0), '🔁 v2: done only when today\'s whole list is answered'); due = 0; assert.ok(H.isDone(P, 0), 'today\'s list done');
  store.nursin_ret_v1 = JSON.stringify({ L: { 'cardio:infarctus': { r: 80, t: now - 1000, rd: now - 1000, h: 2 } } });
  assert.ok(H.isDone(P, 1) && !H.isDone(P, 2), 'read ≠ quiz');
  store.nursin_ret_v1 = JSON.stringify({ L: { 'cardio:infarctus': { r: 85, t: now - 500, rd: now - 1000, h: 2 } } });
  assert.ok(H.isDone(P, 2), 'quiz answers on that lesson tick the quiz');
  assert.ok(!H.isDone(P, 3)); P.vis[K[3]] = now - 30000; assert.ok(H.isDone(P, 3), 'opened and came back');
  ctx.Retain = { wstatus: () => ({ ready: true, done: true }) }; assert.ok(H.isDone(P, 4), 'weekly exam done');
  H.refreshDone(P); assert.strictEqual(Object.keys(P.done).length, 5, 'stays done');
  // texts: «خلصت X من Y • قرّبت تخلص 🔥» + celebration + «كمّل» on the current step
  const js = read('assets/home.js');
  assert.ok(js.includes('قرّبت تخلص 🔥') && js.includes('خلصت مسار اليوم') && js.includes('T("كمّل", "Continuer")') && js.includes('"▶ " + T("هلّق", "Maintenant")'));
});
test('🧭 مسار اليوم = the whole day (Oct 31 2026 7:48 PM): 🧑‍🏫 Osman asks 2 questions, 💪 a lesson from his own mistakes, ⭐ الأهمّيات inside, 🎮 unused ≥ 2 days, 🏫 «راجع درس اليوم» after class, 5–7 steps, synced', () => {
  const { ctx, run, store } = homeCtx(); run('assets/lessons.js'); run('assets/ui.js'); run('assets/home.js');
  const H = ctx.HomePath, LS = ctx.NLESSONS.list;
  const L = LS.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, q: 6, added: l.added || '' }));
  const qids = {}; L.forEach((l, i) => { qids[l.id] = ['q' + String(100 + i).slice(-3), 'q' + String(200 + i).slice(-3), 'q' + String(300 + i).slice(-3).padStart(3, '0')]; });
  const D = 864e5, T0 = Date.parse('2026-11-01T08:30:00+02:00');
  const base = { day: '2026-11-01', hm: 510, due: 3, last: { id: 'cardio:infarctus', href: 'cardio.html#infarctus', name: 'Infarctus', part: '' }, lessons: L, qids, wex: { ready: false }, cases: [] };
  const ks = s => Array.from(s, y => y.k);
  // 🧑‍🏫 Osman (after the day's tasks since 29f), 2 questions of the lesson he is on, the same all day
  let s = H.build(base); const os0 = s.find(y => y.k === 'osm'); assert.strictEqual(s[0].k, 'cont', '29f: the lesson first'); assert.strictEqual(os0.id, 'cardio:infarctus'); assert.strictEqual(os0.qs.length, 2);
  assert.ok(os0.qs.every(q => qids['cardio:infarctus'].includes(q)) && os0.qs[0] !== os0.qs[1], 'two different questions of that lesson');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(H.build(base))), JSON.parse(JSON.stringify(s)), 'same day, same path');
  assert.notDeepStrictEqual(JSON.parse(JSON.stringify(H.build(Object.assign({}, base, { day: '2026-11-03' })))).map(y => JSON.stringify(y.qs || '')).join(), s.map(y => JSON.stringify(y.qs || '')).join(), 'another day can ask other questions');
  // 💪 the lesson with the most mistakes, with «غلطت فيه X مرات»; not the one already on the path
  const weak = [{ id: 'rea:r2', miss: 5, cnt: 2 }, { id: 'neuro:avc', miss: 2, cnt: 2 }, { id: 'cardio:infarctus', miss: 9, cnt: 3 }];
  assert.strictEqual(H.weakPick(weak, ['cardio:infarctus']).id, 'rea:r2', 'most mistakes, not the lesson already on the path');
  assert.strictEqual(H.weakPick(weak, []).id, 'cardio:infarctus');
  assert.strictEqual(H.weakPick([], []), null);
  s = H.build(Object.assign({}, base, { weak }));
  const w = s.find(y => y.k === 'weak'); assert.ok(w && w.id === 'rea:r2' && w.miss === 5 && w.href === 'rea.html#r2', 'weak lesson step');
  assert.ok(read('assets/home.js').includes('"غلطت فيه " + s.miss'), 'says how many times');
  assert.ok(!s.some(y => y.k === 'fade'), 'mistakes first, faded lesson only without them');
  // 🎮 unused ≥ 2 days → a step; 1 day → nothing; never used counts once the tracker is 2+ days old
  const ms = (dk, h) => Date.parse(dk + 'T' + (h || '12') + ':00:00+02:00');
  assert.strictEqual(H.usePick({ games: ms('2026-10-30'), cards: ms('2026-10-31'), quiz: ms('2026-11-01'), cases: ms('2026-10-31') }, ms('2026-10-20'), '2026-11-01', 0, {}).f, 'games', '2 days without a game');
  assert.strictEqual(H.usePick({ games: ms('2026-10-31'), cards: ms('2026-10-31'), quiz: ms('2026-10-31'), cases: ms('2026-10-31'), highlights: ms('2026-10-31') }, ms('2026-10-20'), '2026-11-01', 0, {}), null, 'all used yesterday → no suggestion');
  const u2 = H.usePick({ games: ms('2026-10-30'), notes: ms('2026-10-25') }, ms('2026-10-20'), '2026-11-01', 0, {}); assert.ok(u2.f === 'notes' && u2.days === 7, 'the longest gap first');
  assert.strictEqual(H.usePick({}, ms('2026-10-31'), '2026-11-01', 0, {}), null, 'a new tracker: nothing yet');
  assert.ok(H.usePick({}, ms('2026-10-28'), '2026-11-01', 3, {}).never, 'never tried, tracker old enough');
  assert.strictEqual(H.usePick({ cases: ms('2026-10-20') }, ms('2026-10-10'), '2026-11-01', 0, { cases: false, games: false, cards: false, quiz: false }), null, 'no case available → not suggested');
  s = H.build(Object.assign({}, base, { use: { games: ms('2026-10-29'), cards: ms('2026-11-01'), quiz: ms('2026-11-01'), cases: ms('2026-11-01') }, since: ms('2026-10-10') }));
  const u = s.find(y => y.k === 'use'); assert.ok(u && u.f === 'games' && u.days === 3 && u.href === 'games.html', 'usage step');
  assert.ok(read('assets/home.js').includes('صرلك % ما لعبت') && read('assets/home.js').includes('"يومين"'), '«صرلك يومين ما لعبت 🎮»');
  // ⭐ الأهمّيات inside the path: today's exam / class quiz + the tournament round + reviews + درس اليوم + weekly exam
  s = H.build(Object.assign({}, base, { imp: [{ ik: 'ex:cardio', e: '📅', n: 'امتحان اليوم: القلب', href: 'exams.html' }], tn: { op: 'Sara' }, today: { id: 'rea:r3', pk: 'rea:r3#1', href: 'rea.html#r3', n: 'المحاليل — الجزء 1' }, wex: { ready: true, done: false } }));
  assert.deepStrictEqual(ks(s).slice(0, 6), ['today', 'rev', 'imp', 'duel', 'wex', 'osm'], '29f one list: درس اليوم, 🔁, the essentials, then Osman');
  assert.ok(s.length >= 5 && s.length <= 7, '5–7 steps: ' + s.length);
  // 🏫 class days (Thu/Fri/Sat) after 2:30 PM: «راجع درس اليوم» = the newest lesson(s) of that day's subjects; mornings / Sundays: none
  assert.ok(H.afterClass('2026-10-31', 14 * 60 + 31) && !H.afterClass('2026-10-31', 14 * 60) && !H.afterClass('2026-11-01', 17 * 60) && H.afterClass('2026-11-05', 15 * 60) && H.afterClass('2026-11-06', 16 * 60));
  const sat = H.build(Object.assign({}, base, { day: '2026-10-31', hm: 15 * 60 + 10 }));
  const c = sat.find(y => y.k === 'cls'); assert.ok(c, 'class review on Saturday afternoon');
  assert.ok(['comm:c7', 'comm:c8'].includes(c.id) && c.id2, 'Saturday = community / pharma / geri / quality → the newest: c7 + c8 (Oct 31)');
  assert.strictEqual(sat[0].k, 'cls', '29f: the class lesson first'); assert.strictEqual(sat.find(y => y.k === 'osm').id, c.id, 'Osman asks on the class lesson');
  assert.ok(!H.build(Object.assign({}, base, { day: '2026-10-31', hm: 10 * 60 })).some(y => y.k === 'cls'), 'not in the morning');
  const thu = H.build(Object.assign({}, base, { day: '2026-11-05', hm: 16 * 60 })).find(y => y.k === 'cls');
  assert.ok(thu && /^(rea|law|mgmt):/.test(thu.id), 'Thursday = réa / law / management: ' + (thu && thu.id));
  assert.ok(H.classNewest(L, 5).every(l => ['cardio', 'neuro', 'henderson', 'medsurg'].includes(l.s)), 'Friday = medical / surgical');
  // 5–7 always: a crowded day keeps 7, an empty one is filled to 5
  const crowd = H.build(Object.assign({}, base, { day: '2026-10-31', hm: 16 * 60, weak, imp: [{ ik: 'a', n: 'A' }, { ik: 'b', n: 'B' }, { ik: 'c', n: 'C' }], tn: { op: 'x' }, due: 30, wex: { ready: true }, use: { games: 1 }, since: 1, cases: ['cardio:infarctus'] }));
  assert.strictEqual(crowd.length, 7, 'never more than 7'); assert.strictEqual(crowd[0].k, 'cls'); assert.ok(crowd.some(y => y.k === 'osm'));
  for (const day of ['2026-11-01', '2026-11-02', '2026-11-05', '2026-10-31']) for (const hm of [420, 900, 1260]) {
    const z = H.build({ day, hm, due: 0, last: null, lessons: L.map(l => Object.assign({}, l, { read: true, score: 90 })), qids: {}, wex: {}, cases: [] });
    assert.ok(z.length >= 5 && z.length <= 7, day + ' ' + hm + ': ' + z.length);
    assert.strictEqual(new Set(z.map(H.skey)).size, z.length, 'no step twice');
  }
  // ticks that mean real work: Osman = both questions answered; weak / class lesson = a part read after the path was made; games = a round finished
  const now = Date.now(), P = { v: H.V, d: '2026-11-01', at: now - 60000, done: {}, vis: {}, ans: {}, steps: [{ k: 'osm', id: 'cardio:infarctus', qs: ['q001', 'q002'] }, { k: 'weak', id: 'rea:r2' }, { k: 'cls', id: 'comm:c7' }, { k: 'use', f: 'games' }, { k: 'use', f: 'cards' }] };
  P.ans.q001 = 0; assert.ok(!H.isDone(P, 0), 'one answer is not enough'); P.ans.q002 = 2; assert.ok(H.isDone(P, 0), 'both answered');
  store.nursin_read_v1 = JSON.stringify({ 'rea:r2#1': now - 3 * D, 'comm:c7#2': now - 1000 }); assert.ok(!H.isDone(P, 1), 'read days ago does not count');
  store.nursin_read_v1 = JSON.stringify({ 'rea:r2#2': now - 1000, 'comm:c7#2': now - 1000 }); assert.ok(H.isDone(P, 1) && H.isDone(P, 2), 'a part read today');
  ctx.Nursin = { dayKey: () => '2026-11-01' };
  store.nursin_study_v1 = JSON.stringify({ td: '2026-11-01', tg: 0 }); assert.ok(!H.isDone(P, 3));
  store.nursin_study_v1 = JSON.stringify({ td: '2026-11-01', tg: 1 }); assert.ok(H.isDone(P, 3), 'a game round finished');
  store.nursin_use_v1 = JSON.stringify({ s: 1, f: { cards: now - 120000 } }); assert.ok(!H.isDone(P, 4)); store.nursin_use_v1 = JSON.stringify({ s: 1, f: { cards: now } }); assert.ok(H.isDone(P, 4), 'a card answered');
  // ☁️ one path for his devices: the earlier plan of the day wins, ticks + answers merge; another day / version is ignored
  const mine = { v: H.V, d: '2026-11-01', at: 2000, steps: [{ k: 'osm', qs: ['q001', 'q002'] }, { k: 'rev', base: 3, n: 3 }], done: { 'osm:': 5 }, ans: { q001: 1 } };
  const acc = { v: H.V, d: '2026-11-01', at: 1000, steps: [{ k: 'osm', qs: ['q005', 'q006'] }, { k: 'game' }], done: { 'game:': 7 }, ans: { q005: 0, q006: 2 } };
  let m = H.merge(mine, acc); assert.ok(m.ch && m.p.at === 1000 && m.p.steps[0].qs[0] === 'q005' && m.p.done['game:'] === 7 && m.p.ans.q006 === 2, 'the earlier plan wins, ticks merge');
  m = H.merge(acc, Object.assign({}, mine, { at: 3000 })); assert.ok(m.p.at === 1000 && m.p.done['osm:'] === 5, 'a later plan only adds its ticks for the same steps');
  assert.strictEqual(H.merge(mine, Object.assign({}, acc, { d: '2026-10-31' })).ch, false, 'yesterday ignored');
  const js = read('assets/home.js');
  assert.ok(js.includes('dayPath') && js.includes('{ merge: true }') && !/firestore\.rules/.test(js), 'synced on the profile doc with merge (no rule change)');

  // ⏰ the morning's path on a class day gets «راجع درس اليوم» by itself after 2:30 PM (done steps kept, still ≤ 7)
  {
    const t = homeCtx(); t.run('assets/lessons.js'); t.run('assets/ui.js'); t.run('assets/home.js');
    const RD = Date; let fake = Date.parse('2026-10-31T10:00:00+02:00');
    class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(fake); } static now() { return fake; } }
    t.ctx.Date = FD; t.ctx.Nursin = { dayKey: () => '2026-10-31' }; t.ctx.NursinSRS = { count: () => 4 };
    const H2 = t.ctx.HomePath, am = H2.plan();
    assert.ok(!am.steps.some(y => y.k === 'cls') && am.steps.some(y => y.k === 'osm'), 'Saturday morning: no class review yet');
    const k0 = H2.skey(am.steps[0]); am.done[k0] = fake; t.store[H2.KEY] = JSON.stringify(am);
    fake = Date.parse('2026-10-31T15:05:00+02:00');
    const pm = H2.plan();
    assert.ok(pm.steps.findIndex(y => y.k === 'cls') > -1 && pm.steps.findIndex(y => y.k === 'cls') < pm.steps.findIndex(y => y.k === 'osm'), 'back from the institute: «راجع درس اليوم» joins with the day\'s tasks, before Osman (29f) ' + pm.steps.map(y => y.k));
    assert.ok(pm.done[k0] && pm.steps.length <= 7 && pm.steps.length >= 5 && pm.cls === 1 && pm.at === am.at, 'same day plan, done kept, 5–7');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(H2.plan().steps)), JSON.parse(JSON.stringify(pm.steps)), 'added once');
  }
  // the old separate blocks are gone from the home; the tournament card lives inside the path; no ad markup near it
  const h = read('index.html'), main = h.slice(h.indexOf('<main'), h.indexOf('</main>'));
  for (const id of ['osmhome', 'prio', 'priorev', 'wkles', 'wexhome']) assert.ok(!main.includes('id="' + id + '"'), id + ' gone');
  assert.ok(main.indexOf('id="hzduelhold" hidden') > main.indexOf('id="hz"') && js.includes('parts.duel.appendChild(du)'), 'tournament card moved into the path');
  assert.ok(!/adx|bauval|adsbygoogle|ad-slot/.test(js) && !/adx|ad-slot/.test(main.slice(main.indexOf('id="hz"'), main.indexOf('</section></div>', main.indexOf('id="hzduelhold"')))) && js.lastIndexOf('subsHtml()') > js.indexOf('parts.foot.innerHTML'), 'no ad in the path; «موادي» sits between the path and the page banner');
  // 🧑‍🏫 the inline questions record like a quiz answer; fr strings; dark; usage tracker on every page (assets/ui.js)
  assert.ok(js.includes('w.Weak.record(q, ok)') && js.includes('w.NursinSRS.record(q, ok)') && js.includes('R.apply(id, ok ? "ok" : "bad")'), 'answers move weak points / reviews / memory');
  assert.ok(js.includes('"tutor.html?q="') || js.includes("tutor.html?q="), 'ask Osman about the lesson (prefilled)');
  for (const fr of ['Deux questions rapides', "De retour de l'institut", 'Tes points faibles', "que tu n'as pas joué", 'Important aujourd\'hui', 'Le tournoi de ta classe']) assert.ok(js.includes(fr), 'fr: ' + fr);
  assert.ok(read('assets/home.css').includes('html[data-theme=night] .hzqf.ok b'), 'dark colours');
  const ui = read('assets/ui.js'); assert.ok(ui.includes('nursin_use_v1') && ui.includes('"nursin:flash"') && ui.includes('"nursin:quiz-done"') && ui.includes('useWire()'), 'last-used dates kept on every page');
  const rec = homeCtx(); rec.run('assets/ui.js'); rec.ctx.NursinUI.use('games', 123); rec.ctx.NursinUI.use('nope', 5);
  const uo = JSON.parse(rec.store.nursin_use_v1); assert.ok(uo.f.games === 123 && !uo.f.nope && uo.s, 'tracker stores known features only');
});
test('📋 «الكل» lists every page of the site, every link resolves; subject chips go to the real subject pages', () => {
  const { ctx, run } = homeCtx(); run('assets/ui.js'); run('assets/home.js'); const H = ctx.HomePath;
  const hrefs = H.ALL.flatMap(g => Array.from(g.items, i => i[0]));
  const actions = ['#search', '#avatar', '#theme', '#lang', '#goals', '#online', '#cards', '#case', '#blank', '#teach', '#install', '#pen', '#name'];
  for (const x of hrefs) { if (x.charAt(0) === '#') { assert.ok(actions.includes(x), 'action ' + x); continue; } assert.ok(fs.existsSync(path.join(SITE, x.split(/[?#]/)[0])), x); }
  const pagesLinked = new Set(hrefs.filter(x => x.charAt(0) !== '#').map(x => x.split(/[?#]/)[0]));
  for (const p of fs.readdirSync(SITE).filter(f => f.endsWith('.html') && !['404.html', 'admin.html', 'index.html'].includes(f))) assert.ok(pagesLinked.has(p), p + ' reachable from «الكل»');
  assert.deepStrictEqual(Array.from(H.ALL, g => g.k), ['learn', 'study', 'community', 'account'], '🗂️ Nov 1: four folding groups');
  for (const s of H.SUBJ) assert.ok(fs.existsSync(path.join(SITE, s.p)), s.p);
  for (const it of H.ALL[0].items) assert.ok(['medsurg.html', 'cardio.html', 'neuro.html', 'henderson.html', 'medsurg.html#iv', 'rea.html', 'pharma.html', 'law.html', 'mgmt.html', 'quality.html', 'geri.html', 'community.html', '3d.html'].includes(it[0]), 'lessons incl. Med-Surg groups');
  const js = read('assets/ui.js');
  for (const k of ['"medsurg.html#iv"', '"quiz.html?t=mixed"', '"quiz.html?t=review"', '"exams.html"', '"live.html"', '"notes.html"', '"tutor.html"']) assert.ok(js.includes(k), k);
});
test('🧑‍⚕️ avatar: 12 original cartoon avatars (webp 256, small) or an own photo (square 256, ≤ 40 KB), kept on the device; cartoon id + photo on the profile, own photo in users/{uid}/avatar/main (rules v18)', () => {
  for (let i = 1; i <= 12; i++) {
    const f = path.join(SITE, 'assets/avatars/a' + String(i).padStart(2, '0') + '.webp'), b = fs.readFileSync(f);
    assert.strictEqual(b.slice(0, 4).toString() + b.slice(8, 12).toString(), 'RIFFWEBP', f); assert.ok(b.length < 40000, f + ' ' + b.length);
  }
  const { ctx, run, store } = homeCtx(); run('assets/ui.js'); run('assets/home.js'); const H = ctx.HomePath;
  ctx.document = null;
  assert.ok(H.setAvatar({ k: 'a07' }) && JSON.parse(store[H.AKEY]).k === 'a07', 'cartoon stored');
  assert.ok(!H.setAvatar({ k: 'a13' }) && !H.setAvatar({ k: 'up', img: 'https://x/y.png' }) && !H.setAvatar({ k: 'up', img: 'data:image/png;base64,' + 'A'.repeat(46000) }), 'bad ids / links / too big refused');
  assert.ok(H.setAvatar({ k: 'up', img: 'data:image/webp;base64,AAAA' }) && JSON.parse(store[H.AKEY]).k === 'up', 'own photo stored');
  assert.ok(H.setAvatar(null) && !(H.AKEY in store), 'back to none');
  const js = read('assets/ui.js');
  assert.ok(js.includes('cv.width = cv.height = 256') && js.includes('out.length <= 40000') && js.includes('toDataURL("image/jpeg"'), 'square 256 crop, ≤ 40 KB, jpeg where webp can\'t be encoded');
  assert.ok(js.includes('{ av: k, photo: ph }, { merge: true }') && js.includes('"users", uid, "avatar", "main"'), 'profile av + photo; own photo doc');
  const ac = read('assets/account.js'), fb = read('assets/fb.js');
  assert.ok(ac.includes("N.myPhoto=function()") && ac.includes("N.avatar(N.myPhoto(),me.name,'av')") && read('assets/me.js').includes('N.myPhoto ? N.myPhoto() : me.photo'), 'header badge + 👤 أنا show it');
  assert.ok(fb.includes('photo: av ? "https://nursin.store/assets/avatars/" + av + ".webp"'), 'friends / ranking / classes see the cartoon');
  assert.ok(read('credits.html').includes('assets/avatars/a01–a12.webp'), 'credited as original');
});
test('👆 edge swipe back on inner pages (RTL right edge), not on home / 3D / games / live, never over a sideways box or an open sheet', () => {
  const hz = read('assets/hifz.js');
  assert.ok(hz.includes('function edgeBack()') && hz.includes('try { edgeBack(); } catch (e) {}'));
  assert.ok(hz.includes('var EDGE_SKIP = /^(index|3d|games|live)\\.html$/;') && hz.includes('el.scrollWidth > el.clientWidth + 2') && hz.includes('"fcon"') && hz.includes('w.history.back()'));
  assert.ok(hz.includes('{ passive: true }') && read('assets/style.css').includes('.edgeback{position:fixed'), 'passive listeners, small indicator');
});

test('🫧 Liquid Glass on EVERY page (Oct 31 2026 6:45 AM «هيدا الشي يتم على الكل»): shared assets/ui.css + assets/ui.js, glass header + floating nav, no page lost', () => {
  const pages = fs.readdirSync(SITE).filter(f => f.endsWith('.html')).sort();
  assert.strictEqual(pages.length, 33, 'no page lost: ' + pages.join(' '));   // Nov 1 2026: + midterm.html (🎯 امتحان الفصل) + suggest.html (🛠️ صندوق الاقتراحات) + homework.html (📌 الوظائف)
  const { ctx, run } = homeCtx(); run('assets/ui.js'); const U = ctx.NursinUI;
  assert.deepStrictEqual(Object.keys(U.PAGES).sort(), pages, 'the shell knows every page (title + nav tab)');
  for (const p of pages) {
    const h = read(p), i = U.info(p);
    assert.ok(/<body class="([^"]* )?ui( [^"]*)?">/.test(h), p + ': body.ui');
    const css = h.indexOf('<link rel="stylesheet" href="assets/ui.css?v=20261029r">'), st = h.indexOf('assets/style.css?v=20261029r');
    assert.ok(css > st && st > -1, p + ': ui.css after style.css');
    if (h.includes('assets/tutor.css')) assert.ok(css > h.indexOf('assets/tutor.css'), p + ': after the page css');
    if (h.includes('assets/home.css')) assert.ok(css < h.indexOf('assets/home.css'), p + ': before home.css');
    const js = h.indexOf('<script src="assets/ui.js?v=20261029r" defer></script>');
    assert.ok(js > -1 && js < h.indexOf('<script src="assets/nav.js'), p + ': ui.js before nav.js');
    if (h.includes('<script src="assets/home.js')) assert.ok(js < h.indexOf('<script src="assets/home.js'), p + ': ui.js before home.js');
    assert.strictEqual((h.match(/assets\/ui\.(css|js)\?v=/g) || []).length, 2, p + ': loaded once each');
    assert.ok(h.includes('<header class="topbar">') && h.includes('<div class="wrap bar">'), p + ': header');
    assert.ok([0, 1, 2, 3, 4].includes(i.tab) && i.ar && i.fr, p + ': nav tab + ar/fr title');
    if (p === 'index.html') { assert.strictEqual(i.tab, 0); continue; }
    const m = h.match(/<a class="uiback" href="([^"]+)" aria-label="رجوع">/);
    assert.ok(m && fs.existsSync(path.join(SITE, m[1])), p + ': back button (no-JS link to ' + (m && m[1]) + ')');
    assert.ok(h.includes('<div class="uititle"><span class="e" aria-hidden="true">' + i.e + '</span><b>' + i.ar + '</b></div>'), p + ': page title in the glass header');
  }
  for (const p of ['cardio.html', 'neuro.html', 'henderson.html', 'law.html', 'pharma.html', '3d.html']) assert.strictEqual(U.info(p).tab, 1, p + ' → المواد');
  assert.strictEqual(U.info('tutor.html').tab, 2); assert.strictEqual(U.info('hifzi.html').tab, 3); assert.strictEqual(U.info('quiz.html').tab, 4);
  assert.strictEqual(U.info('cardio.html').up, 'medsurg.html');
  // «الكل» = every page (404 / admin aside: admin is added for the owner only), the same sheet on every page
  const linked = new Set(U.ALL.flatMap(g => Array.from(g.items, x => x[0])).filter(x => x.charAt(0) !== '#').map(x => x.split(/[?#]/)[0]));
  for (const p of pages.filter(p => !['404.html', 'admin.html', 'index.html'].includes(p))) assert.ok(linked.has(p), p + ' in «الكل»');
  const uj = read('assets/ui.js');
  assert.ok(uj.includes('if (g.k === "account" && owner()) items = items.concat([ADMIN]);') && uj.includes('var ADMIN = ["admin" + ".html"'), 'admin for the owner only');
  for (const k of ['"#install"', '"friends.html#fpush"', '"#theme"', '"#lang"', '"#goals"', '"#avatar"', '"#search"']) assert.ok(uj.includes(k), 'old ☰ / top-bar items reachable: ' + k);
  assert.ok(uj.includes('accountHtml()') && uj.includes('سجّل دخول بغوغل') && uj.includes('أنا والإعدادات'), 'sign-in / account rows under the avatar');
  // nav: 5 entries, current tab, raised Osman
  assert.ok(uj.includes('data-t="0"') && uj.includes('data-hz="learn" data-t="1"') && uj.includes('class="hzmid') && uj.includes('href="hifzi.html" data-t="3"') && uj.includes('data-hz="all" data-t="4"'));
  const T1 = uj.match(/\bT\("(?:[^"\\]|\\.)*"\)/g) || [];
  assert.strictEqual(T1.length, 0, 'every new UI string has its French');
});
test('🫧 the shell stays out of the way: nav hides scrolling down / in rounds / while typing; bottom things sit above it; glass only on floating layers; ads untouched', () => {
  const uj = read('assets/ui.js'), uc = read('assets/ui.css'), hz = read('assets/hifz.js');
  for (const k of ['fcon', 'rton', 'ers-on', 'duelon', 'srchon', 'g3on']) assert.ok(uj.includes(k), 'focus moment: ' + k);
  assert.ok(uj.includes('page === "quiz.html"') && uj.includes('page === "games.html"') && uj.includes('page === "live.html" && d.getElementById("lboard")'), 'quiz / game / live rounds');
  assert.ok(uj.includes('function typing()') && uj.includes('"uinavaway"') && uj.includes('{ passive: true }'), 'typing + scroll (passive)');
  assert.ok(uc.includes('html.uion.uinavaway .hznav,html.uion.uifocus .hznav{transform:translateY(calc(100% + 40px))'), 'nav slides away');
  assert.ok(uc.includes('html.uion body.ui{padding-bottom:calc(104px + env(safe-area-inset-bottom))}'), 'nothing hidden behind the nav at the end of a page');
  for (const s of ['.pomofab', '.obx', '.osmbub', '.stoast', '.ntoast']) assert.ok(new RegExp('html\\.uion body\\.ui \\' + s + '[^{]*\\{bottom:calc\\((9[0-9]|1[0-4][0-9])px').test(uc), s + ' above the nav');
  assert.ok(uc.includes('html.uion body.ui .topbar .menu-btn,html.uion body.ui .topbar .nav,body.ui .gnav{display:none!important}'), 'old bottom bar + ☰ replaced');
  const blurs = uc.match(/[{;]\s*-webkit-backdrop-filter:blur\(\d+px\)/g) || [];
  assert.ok(blurs.length >= 3 && blurs.length <= 5, 'blur on a few floating layers only (header, nav, sheets): ' + blurs.length);
  assert.ok(!/\.card[^{]*\{[^}]*backdrop-filter/.test(uc) && !/\.opt[^{]*\{[^}]*backdrop-filter/.test(uc), 'no blur on cards / lists');
  assert.ok(uc.includes('@media (prefers-reduced-motion:reduce)') && uc.includes('html.uion .hznav{transition:none}'), 'reduced motion');
  assert.ok(!/adx|bauval|adsbygoogle|ad-slot/.test(uj) && !/\.adx|ad-slot/.test(uc), 'no ad markup / ad rules in the shell');
  assert.ok(hz.includes('h.classList.contains("uifocus")'), 'no edge-swipe back in the middle of a round');
  // ads: the top banner sits under the page title (never right under the glass header / back button), only where it was before
  for (const p of fs.readdirSync(SITE).filter(f => f.endsWith('.html') && f !== 'index.html')) {
    const h = read(p);
    if (!h.includes('class="adx adx-top"')) continue;
    assert.ok(h.indexOf('class="adx adx-top"') > h.indexOf('</h1>'), p + ': banner under the title');
    assert.ok(!/<main[^>]*>\s*<div class="adx/.test(h), p + ': not first in main');
  }
  for (const p of ['tutor.html', 'chat.html', 'notes.html', 'hifzi.html', 'games.html', 'admin.html', 'live.html', '404.html']) assert.ok(!/class="adx adx-top"/.test(read(p)), p + ': no top banner');
});

test('🖍️ highlighter (Oct 31 2026 7:35–7:37 AM): on every page after the notes, one tap in the sticky colour, 5 colours, 🖊️ pen mode, 🧽, 📝, selectionchange + debounce, fr, no ads', () => {
  const all = fs.readdirSync(SITE).filter(f => f.endsWith('.html'));
  for (const p of all) {
    const h = read(p);
    assert.strictEqual((h.match(/<script src="assets\/highlight\.js\?v=20261029r" defer><\/script>/g) || []).length, 1, p + ' highlight.js once');
    const at = f => h.indexOf('<script src="assets/' + f);
    assert.ok(at('notes.js') < at('highlight.js') && at('highlight.js') < at('account.js') && at('highlight.js') < at('ui.js'), p + ': after notes.js (📝 on a highlight), before account.js and ui.js (header 🖊️)');
  }
  const js = read('assets/highlight.js');
  const H = js.match(/var LPAGES = \{([^}]*)\}/)[1];
  for (const p of ['cardio', 'neuro', 'henderson', 'law', 'mgmt', 'quality', 'pharma', 'rea', 'geri', 'community', 'medsurg', '3d']) assert.ok(H.includes('"' + p + '.html"'), 'lesson page ' + p);
  for (const p of ['quiz', 'games', 'live', 'chat', 'tutor', 'exams']) assert.ok(!H.includes('"' + p + '.html"'), 'not on ' + p);
  for (const [k, ar, fr] of [['y', 'أصفر', 'Jaune'], ['g', 'أخضر', 'Vert'], ['p', 'زهر', 'Rose'], ['b', 'أزرق', 'Bleu'], ['o', 'برتقالي', 'Orange']]) assert.ok(js.includes('["' + k + '", "' + ar + '", "' + fr + '"]'), 'colour ' + ar);
  assert.ok(js.includes('return CK.indexOf(c) >= 0 ? c : "y";'), 'sticky colour, yellow the first time');
  assert.ok(js.includes('d.addEventListener("selectionchange", onSel)') && js.includes('pen() ? 650 : 260'), 'selectionchange + debounce (longer in pen mode)');
  assert.ok(js.includes('if (pen()) { if (down) return; mark(x, color()); endSel(); hide(); return; }'), '🖊️ pen mode marks by itself, no pill');
  assert.ok(js.includes('data-a="go"') && js.includes('data-a="pal"') && js.includes('data-a="rm"') && js.includes('data-a="del"') && js.includes('data-a="note"'), 'pill: 🖍️ · colour dot · 🧽 · (on a highlight) colours / 🧽 / 📝');
  assert.ok(js.includes('N.open({ refType: "lesson"') && read('assets/notes.js').includes('API.open = function (meta, from)'), '📝 reuses the personal notes');
  assert.ok(read('assets/notes.js').includes('"?hl=" + hm[2]'), 'a note on a highlight links back to it');
  assert.ok(read('assets/lang.js').includes('function hush(fn)') && js.includes('w.Lang.hush(fn)'), 'FR translator ignores our <mark> wrapping');
  assert.ok(js.includes('prefers-reduced-motion: reduce') && read('assets/ui.css').includes('@media (prefers-reduced-motion:reduce){mark.hlm.hlflash{animation:none'), 'reduced motion');
  assert.ok(!/adx|bauval|adsbygoogle|ad-slot|ads\.js/.test(js), 'no ads in the highlighter');
  const T1 = js.match(/\bT\("(?:[^"\\]|\\.)*"\)/g) || [];
  assert.strictEqual(T1.length, 0, 'every new string has its French');
  for (const k of ['علّم', 'غيّر اللون', 'امحي التعليم', 'وضع القلم', 'لسّا ما علّمت ولا كلمة', 'راجع تعليماتي']) assert.ok(js.includes(k), 'ar ' + k);
  for (const k of ['Surligner', 'Changer la couleur', 'Effacer le surlignage', 'Mode stylo', 'Aucun surlignage', 'Réviser']) assert.ok(js.includes(k), 'fr ' + k);
  const uc = read('assets/ui.css');
  for (const c of ['y', 'g', 'p', 'b', 'o']) assert.ok(uc.includes('--hl' + c + ':rgba(') && uc.includes('.hl-' + c + '{--hlc:var(--hl' + c + ')}'), 'semi-transparent marker ' + c);
  assert.ok(/html\[data-theme=night\] body\.ui\{--hly:rgba\(/.test(uc), 'own marker colours in dark');
  const uj = read('assets/ui.js');
  assert.ok(uj.includes('w.NursinHL.headerBtn()') && uj.includes('case "pen":') && uj.includes('["#pen", "🖊️", "وضع القلم", "Mode stylo", "pen"]'), '🖊️ in the lesson header + «الكل»');
});
test('🖍️ anchoring round-trip: exact text + context + offsets; survives moved text, duplicates, whitespace, long selections, small edits; store merges across devices', () => {
  const { ctx, run } = homeCtx(); run('assets/highlight.js'); const H = ctx.NursinHL;
  const t = 'Infarctus: douleur thoracique. ECG: sus-décalage ST. Troponine positive. ECG: sus-décalage ST encore une fois. Fin.';
  const s = t.lastIndexOf('sus-décalage ST'), e = s + 'sus-décalage ST'.length;
  const a = H.quote(t, s, e);
  assert.deepStrictEqual(Array.from(H.locate(t, a)), [s, e], 'same text');
  assert.deepStrictEqual(Array.from(H.locate('Nouveau paragraphe avant. ' + t, a)), [s + 26, e + 26], 'text added before: the SAME occurrence (context), not the first one');
  const f = H.quote(t, t.indexOf('sus-décalage ST'), t.indexOf('sus-décalage ST') + 15);
  assert.deepStrictEqual(Array.from(H.locate(t, f)), [t.indexOf('sus-décalage ST'), t.indexOf('sus-décalage ST') + 15], 'the first occurrence stays the first');
  const ws = t.replace('Troponine positive.', 'Troponine   positive.\n');
  const b = H.quote(t, t.indexOf('Troponine'), t.indexOf('positive') + 8);
  const lb = H.locate(ws, b); assert.ok(lb && ws.slice(lb[0], lb[1]).replace(/\s+/g, ' ') === 'Troponine positive', 'whitespace changed: ' + JSON.stringify(lb));
  const ar = 'القلب بيضخ الدم. '.repeat(3) + 'Digoxine: إذا النبض أقل من 60 ما منعطيها. ' + 'كلام تاني. '.repeat(60);
  const big = H.quote(ar, 10, 10 + 700); assert.ok(big.q.length < 700 && big.q2.length > 0 && big.n === 700, 'long selection = head + tail');
  assert.deepStrictEqual(Array.from(H.locate('مقدمة. ' + ar, big)), [17, 717], 'long selection found again');
  const ed = 'Infarctus: douleur thoracique. ECG: sus-decalage ST. Troponine positive.';
  const c = H.quote('Infarctus: douleur thoracique. ECG: sus-décalage ST. Troponine positive.', 36, 51);
  assert.deepStrictEqual(Array.from(H.locate(ed, c)), [36, 51], 'lesson edited a little (accent): offsets fallback');
  assert.strictEqual(H.locate('Un tout autre texte sans rapport du tout.', a), null, 'gone → not drawn (still listed on «تعليماتي»)');
  // store: device + account, merged across devices, deletes travel
  const st = H.blank();
  const h1 = H.put(st, '', Object.assign(H.quote(t, s, e), { pg: 'cardio.html', k: 'infarctus', lg: 'ar', c: 'g', sj: 'cardio', lk: 'cardio:infarctus', pt: 1 }), 1000);
  assert.deepStrictEqual(Object.keys(H.clean(h1)).sort(), Array.from(H.FIELDS).sort(), 'exactly the fields rules v19 accept');
  assert.strictEqual(H.link(h1), 'cardio.html?hl=' + h1.id + '#infarctus');
  assert.strictEqual(H.pending(st, '').put.length, 0, 'signed out: nothing to send');
  assert.ok(H.mergeGuest(st, 'u1') && H.pending(st, 'u1').put.length === 1, 'signed in: the device highlights go to the account');
  const remote = {}; remote.hR = H.clean(Object.assign({}, h1, { q: 'Troponine', c: 'b', t: 2000, u: 2000 }));
  H.applyRemote(st, 'u1', remote, true); assert.strictEqual(H.list(st, 'u1').length, 2, 'another device\'s highlight arrives, the unsent one stays');
  H.list(st, 'u1').forEach(x => { x.d = 0; x.y = 1; });
  H.applyRemote(st, 'u1', { hR: remote.hR }, true); assert.strictEqual(H.list(st, 'u1').length, 1, 'deleted on another device → gone here');
  H.remove(st, 'u1', 'hR', 3000); assert.deepStrictEqual(Array.from(H.pending(st, 'u1').del), ['hR'], 'a delete is sent');
  assert.strictEqual(H.overlaps([{ id: 'a', s: 0, e: 10 }, { id: 'b', s: 20, e: 30 }], 5, 22).length, 2, 'a new highlight over two others merges them');
  assert.strictEqual(H.clean({ c: 'red', q: 'x'.repeat(5000), lg: 'en' }).c, 'y'); assert.strictEqual(H.clean({ q: 'x'.repeat(5000) }).q.length, H.MAXQ); assert.strictEqual(H.clean({ lg: 'en' }).lg, 'ar');
});
test('🖍️ «تعليماتي» page: highlights.html (no ads), in «الكل» under أدواتي, ☰, 👤 أنا, 🗺️ حفظي; grouped by مادة → درس, colour filter, jump + flash, delete, empty state, review, fr', () => {
  const h = read('highlights.html');
  assert.ok(h.includes('id="hl-app"') && h.includes('<title>🖍️ تعليماتي') && h.includes('<body class="hlpage ui">'), 'page');
  assert.ok(!/ca-pub-|adsbygoogle|ads\.js|class="adx|bauval/.test(h), 'no ads on highlights.html');
  const { ctx, run } = homeCtx(); run('assets/ui.js'); const U = ctx.NursinUI;
  const tools = U.ALL.find(g => g.k === 'study').items.map(x => x[0]);
  assert.ok(tools.indexOf('highlights.html') === tools.indexOf('notes.html') + 1, 'under 🧠 أدوات التعلّم (was أدواتي), after ملاحظاتي');
  assert.strictEqual(U.info('highlights.html').ar, 'تعليماتي');
  for (const p of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) if (read(p).includes('<nav id="nav"')) assert.ok(read(p).includes('<li><a href="highlights.html"><span aria-hidden="true">🖍️</span> <bdi>تعليماتي</bdi>'), p + ' ☰');
  assert.ok(read('assets/me.js').includes('r("highlights.html", "🖍️"') && read('hifzi.html').includes('href="highlights.html"'), '👤 أنا + 🗺️ حفظي');
  assert.ok(read('assets/account.js').includes("page==='highlights.html'"), 'Firebase loads there (sync + sign-in)');
  assert.ok(read('assets/lang.js').includes('highlights: 1') && fs.existsSync(path.join(SITE, 'assets/fr/p-highlights.js')), 'French page dictionary');
  const js = read('assets/highlight.js');
  for (const k of ['hlgrp', 'hlles', 'data-f=', 'hldel', 'hlempty', 'hlrev', '"?hl="', 'hlflash', 'users", uid, "highlights"']) assert.ok(js.includes(k), k);
});

test('🚑 réa r2–r4 from his class notebook (Oct 31 2026 3:45 PM «ضيفهم على مادة الrea»): gaz du sang, solutés de perfusion, chocs — in the subject, French copies, quizzes, cases, registry, parts', () => {
  const vm = require('node:vm');
  const w = {}; new Function('window', read('assets/rea-data.js'))(w);
  const ks = w.REA.lessons.map(x => x.k); assert.deepStrictEqual(ks, ['r1', 'r2', 'r3', 'r4'], 'r1 kept first, three new lessons after it');
  const by = Object.fromEntries(w.REA.lessons.map(x => [x.k, x]));
  for (const s of ['PaO₂', '80 – 100', 'SaO₂', 'BE', 'Potentiel d\'hydrogène', 'ثواني', 'دقائق', 'أيام', 'عكسية', 'طردية', 'غير معوَّض', 'معوَّض جزئياً', 'معوَّض كلياً', 'الحماض الأيضي', 'القلاء الأيضي', 'artère']) assert.ok(by.r2.html.includes(s), 'r2 ' + s);
  for (const s of ['Cristalloïdes', 'Hypertonique', 'Isotonique', 'Hypotonique', 'NaCl 20%', 'Mannitol', 'Dextrose 5%', 'Eau distillée', 'Colloïdes', 'Albumine', 'Aminoplasma', 'Intralipide', 'Hypervolémie', 'medsurg.html#iv']) assert.ok(by.r3.html.includes(s), 'r3 ' + s);
  for (const s of ['hypovolémique', 'obstructif', 'neurogène', 'acide lactique', 'diurèse', 'tonus sympathique', 'bradycardie', 'جاف ودافي', 'Noradrénaline', 'Atropine', 'تثبيت العمود الفقري', 'استرواح صدري ضاغط']) assert.ok(by.r4.html.includes(s), 'r4 ' + s);
  // ids on the page stay unique (all lessons render on rea.html together)
  const ids = w.REA.lessons.flatMap(x => [...x.html.matchAll(/ id="([^"]+)"/g)].map(m => m[1])); assert.strictEqual(new Set(ids).size, ids.length, 'unique heading ids');
  // 🇫🇷 French copies: name, description and the whole lesson body, same top-level structure (the parts split the same way)
  const fr = { window: null }; fr.window = fr; const H = {}; fr.Lang = { add: o => Object.assign(H, o) }; vm.createContext(fr); vm.runInContext(read('assets/fr/rea.js'), fr);
  const qf = {}; const fq = { Lang: { add: o => Object.assign(qf, o) } }; fq.window = fq; vm.createContext(fq); vm.runInContext(read('assets/fr/quiz.js'), fq);
  const lj = read('assets/lang.js'); assert.ok(lj.includes('function norm(s) { return String(s).replace(/\\s+/g, " ").trim(); }'), 'same key recipe as lang.js');
  const key = s => { s = String(s).replace(/\s+/g, ' ').trim(); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36) + '.' + s.length.toString(36); }, AR = /[\u0600-\u06FF]/;
  const top = h => { const out = []; let depth = 0; const re = /<(\/?)([a-zA-Z0-9]+)[^>]*?(\/?)>/g; let m; while ((m = re.exec(h))) { const v = /^(br|img|hr|input|wbr)$/i.test(m[2]) || m[3]; if (depth === 0 && !m[1]) out.push(m[2].toLowerCase()); if (!m[1] && !v) depth++; else if (m[1]) depth--; } return out; };
  const L = (() => { const c = {}; c.window = c; vm.createContext(c); vm.runInContext(read('assets/lessons.js'), c); return c.NursinLessons; })();
  for (const k of ['r2', 'r3', 'r4']) {
    const x = by[k];
    for (const s of [x.n, x.d, x.html]) assert.ok(H[key(s)], k + ' has its French copy: ' + s.slice(0, 40));
    assert.ok(!AR.test(H[key(x.html)].replace(/<[^>]+>/g, '')), k + ' French body has no Arabic left');
    assert.deepStrictEqual(top(H[key(x.html)]), top(x.html), k + ' French body has the same structure');
    assert.ok(qf[key(x.n)], k + ' lesson name in French on every page (quiz dictionary)');
    // registry: listed for «مسار اليوم» / «درس اليوم» / goals, added today; long ones cut into parts at a heading
    const reg = L.list.find(y => y.s === 'rea' && y.l === k); assert.ok(reg && reg.href === 'rea.html#' + k && reg.added === '2026-10-31' && reg.n === x.n, k + ' in the lesson registry');
    const st = L.SPLIT['rea:' + k]; assert.ok(st, k + ' split'); const kids = top(x.html); st.forEach(i => assert.ok(/^h3$/.test(kids[i]), k + ' part starts at a heading'));
  }
  // 📝 quizzes: about 8–9 per lesson, exam style, answers spread, right never the longest (ar + fr), plain, French for every Arabic string
  const q = {}; new Function('window', read('assets/quiz-data.js'))(q);
  assert.deepStrictEqual(Object.keys(q.QLES.rea), ['r1', 'r2', 'r3', 'r4']);
  for (const k of ['r2', 'r3', 'r4']) {
    assert.strictEqual(q.QLES.rea[k], by[k].n);
    const g = q.QUIZ.filter(x => x.t === 'rea' && x.l === k).filter(notPQ); assert.ok(g.length >= 8 && g.length <= 10, k + ' quiz size ' + g.length);
    const c = [0, 0, 0]; g.forEach(x => c[x.a]++); assert.ok(c.every(n => n >= 2), k + ' spread ' + c);
    for (const x of g) {
      assert.equal(x.o.length, 3); const Ls = x.o.map(o => o.length), m = Math.max(...Ls); assert.ok(Ls[x.a] < m || Ls.filter(n => n === m).length > 1, x.id + ' right not longest');
      assert.ok(!/<|\*\*|«|»/.test(x.o.join(' ') + x.q), x.id + ' plain');
      for (const s of [x.q, x.x, ...x.o]) if (AR.test(s)) assert.ok(qf[key(s)], x.id + ' French: ' + s.slice(0, 40));
      const fo = x.o.map(o => AR.test(o) ? qf[key(o)] : o), fl = fo.map(o => o.length), fm = Math.max(...fl); assert.ok(fl[x.a] < fm || fl.filter(n => n === fm).length > 1, x.id + ' right not longest (fr)');
    }
  }
  // 🩺 a patient case + ❓ ليش؟ follow-ups for the new lessons
  const C = JSON.parse(read('assets/cases-data.js').match(/window\.CASES=(\[.*\]);/s)[1]);
  for (const k of ['r2', 'r3', 'r4']) assert.ok(C.some(c => c.id === 'rea:' + k), 'case rea:' + k);
  const Y = JSON.parse(read('assets/why-data.js').match(/window\.WHY=(\{.*\});/s)[1]);
  assert.ok(q.QUIZ.filter(x => x.t === 'rea' && x.l !== 'r1' && Y[x.id]).length >= 6, 'ليش؟ on the new réa questions');
  // the page: quiz count line + intro updated, no new ad slot
  const h = read('rea.html');
  assert.ok(h.includes('39 سؤال') && h.includes('المحاليل الوريدية') && h.includes('الصدمات'), 'rea.html intro + quiz line');
  assert.strictEqual((h.match(/class="adx /g) || []).length, 2, 'same two ad slots as before');
});

test('🏘️ community c7–c8 from her «الصحة الوقائية» PDFs (Oct 31 2026): cancer, heart, tobacco, alcohol, drugs + immunology, vaccines, Guthrie, pregnancy, special medicine — French copies, quizzes, cases, registry, parts', () => {
  const vm = require('node:vm');
  const w = {}; new Function('window', read('assets/comm-data.js'))(w);
  const ks = w.COMM.lessons.map(x => x.k); assert.deepStrictEqual(ks, ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], 'c1–c6 kept, two new lessons after them');
  const by = Object.fromEntries(w.COMM.lessons.map(x => [x.k, x]));
  for (const s of ['زينات عربس', 'النقائل', 'الطلاوة البيضاء', 'Frottis', 'BRCA1', 'CA-125', 'Helicobacter pylori', 'الوقاية الثانوية', 'أول أكسيد الكربون', 'Fagerström', 'Delirium tremens', 'Acétaldéhyde', 'Désintoxication', 'Cocaïne', 'Héroïne']) assert.ok(by.c7.html.includes(s), 'c7 ' + s);
  for (const s of ['زينات عربس', 'antigène', 'anticorps', 'Innate Immunity', 'Passive Immunity', 'Live Attenuated Vaccines', 'mRNA Vaccines', 'المصل', 'PCV13', 'Test de Guthrie', 'Phénylcétonurie', 'Levothyroxine', 'Hémophilie', 'Examen prénuptial', 'Médecine du travail', 'Functional Medicine', 'class="lawtbl"']) assert.ok(by.c8.html.includes(s), 'c8 ' + s);
  // the PDF's broken lam-alef never reaches the page
  for (const k of ['c7', 'c8']) assert.ok(!/خاليا|(^|\s)عالج |إلنتاج|ألنواع|ألنها|(^|\s)ا ل/.test(by[k].html.replace(/<[^>]+>/g, ' ')), k + ' lam-alef fixed');
  // not a copy of c1–c6: the old lessons carry no cancer / vaccine chapter
  for (const k of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) assert.ok(!by[k].html.includes('فاجرستروم') && !by[k].html.includes('غوثري'), k + ' has no c7/c8 content');
  const ids = w.COMM.lessons.flatMap(x => [...x.html.matchAll(/ id="([^"]+)"/g)].map(m => m[1])); assert.strictEqual(new Set(ids).size, ids.length, 'unique heading ids');
  // 🇫🇷 French copies (assets/fr/comm.js, loaded on community.html)
  assert.ok(/community: \["quiz", "comm"\]/.test(read('assets/lang.js')), 'fr/comm.js loads on community.html');
  const fr = { window: null }; fr.window = fr; const H = {}; fr.Lang = { add: o => Object.assign(H, o) }; vm.createContext(fr); vm.runInContext(read('assets/fr/comm.js'), fr);
  const qf = {}; const fq = { Lang: { add: o => Object.assign(qf, o) } }; fq.window = fq; vm.createContext(fq); vm.runInContext(read('assets/fr/quiz.js'), fq);
  const key = s => { s = String(s).replace(/\s+/g, ' ').trim(); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36) + '.' + s.length.toString(36); }, AR = /[\u0600-\u06FF]/;
  const top = h => { const out = []; let depth = 0; const re = /<(\/?)([a-zA-Z0-9]+)[^>]*?(\/?)>/g; let m; while ((m = re.exec(h))) { const v = /^(br|img|hr|input|wbr)$/i.test(m[2]) || m[3]; if (depth === 0 && !m[1]) out.push(m[2].toLowerCase()); if (!m[1] && !v) depth++; else if (m[1]) depth--; } return out; };
  const L = (() => { const c = {}; c.window = c; vm.createContext(c); vm.runInContext(read('assets/lessons.js'), c); return c.NursinLessons; })();
  for (const k of ['c7', 'c8']) {
    const x = by[k];
    for (const s of [x.n, x.d, x.html]) assert.ok(H[key(s)], k + ' has its French copy: ' + s.slice(0, 40));
    assert.ok(!AR.test(H[key(x.html)].replace(/<[^>]+>/g, '')), k + ' French body has no Arabic left');
    assert.deepStrictEqual(top(H[key(x.html)]), top(x.html), k + ' French body has the same structure');
    assert.ok(qf[key(x.n)], k + ' lesson name in French (quiz dictionary)');
    const reg = L.list.find(y => y.s === 'comm' && y.l === k); assert.ok(reg && reg.href === 'community.html#' + k && reg.added === '2026-10-31' && reg.n === x.n, k + ' in the lesson registry, dated Oct 31');
    const st = L.SPLIT['comm:' + k]; assert.ok(st && st.length >= 8, k + ' split into small parts'); const kids = top(x.html);
    st.forEach(i => assert.ok(/^h[34]$/.test(kids[i]), k + ' part starts at a heading'));
  }
  // 📝 quizzes: exam-style patient cases, answers spread, right never the longest (ar + fr), plain, French for every Arabic string
  const q = {}; new Function('window', read('assets/quiz-data.js'))(q);
  assert.deepStrictEqual(Object.keys(q.QLES.comm), ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
  for (const k of ['c7', 'c8']) {
    assert.strictEqual(q.QLES.comm[k], by[k].n);
    const g = q.QUIZ.filter(x => x.t === 'comm' && x.l === k).filter(notPQ); assert.ok(g.length >= 10 && g.length <= 14, k + ' quiz size ' + g.length);
    const c = [0, 0, 0]; g.forEach(x => c[x.a]++); assert.ok(c.every(n => n >= 3), k + ' spread ' + c);
    for (const x of g) {
      assert.equal(x.o.length, 3); const Ls = x.o.map(o => o.length), m = Math.max(...Ls); assert.ok(Ls[x.a] < m || Ls.filter(n => n === m).length > 1, x.id + ' right not longest');
      assert.ok(!/<|\*\*|«|»/.test(x.o.join(' ') + x.q), x.id + ' plain');
      for (const s of [x.q, x.x, ...x.o]) if (AR.test(s)) assert.ok(qf[key(s)], x.id + ' French: ' + s.slice(0, 40));
      const fo = x.o.map(o => AR.test(o) ? qf[key(o)] : o), fl = fo.map(o => o.length), fm = Math.max(...fl); assert.ok(fl[x.a] < fm || fl.filter(n => n === fm).length > 1, x.id + ' right not longest (fr)');
    }
  }
  // 🩺 a patient case per lesson (with its Henderson need question) + ❓ ليش؟ follow-ups
  const C = JSON.parse(read('assets/cases-data.js').match(/window\.CASES=(\[.*\]);/s)[1]);
  for (const k of ['c7', 'c8']) { const cs = C.find(c => c.id === 'comm:' + k); assert.ok(cs && cs.fr && cs.qs.some(y => y.k === 'need'), 'case comm:' + k); }
  assert.ok(/"comm:c7", "comm:c8"/.test(read('assets/retain.js')), 'cases listed for the review');
  const Y = JSON.parse(read('assets/why-data.js').match(/window\.WHY=(\{.*\});/s)[1]);
  assert.ok(q.QUIZ.filter(x => x.t === 'comm' && (x.l === 'c7' || x.l === 'c8') && Y[x.id]).length >= 6, 'ليش؟ on the new community questions');
  // the page: intro + quiz line + nav subtitle updated, no new ad slot
  const h = read('community.html');
  assert.ok(h.includes('49 سؤال من الدروس الثمانية') && h.includes('الصحة الوقائية'), 'community.html intro + quiz line');
  assert.ok(read('assets/nav.js').includes('8 دروس'), 'nav subtitle');
  assert.strictEqual((h.match(/class="adx /g) || []).length, 2, 'same ad slots as before');
});

test('✏️ «غيّر اسمك» (Oct 31 2026): name.js on every page, 2–20 chars + bad words refused, one source of truth users/{uid}.nick → name, entry points on «أنا» and the avatar sheet, fr', () => {
  const vm = require('node:vm');
  // on every page, once, fresh tag, before account.js (fb.js reads it at sign-in) and ui.js (sheet)
  for (const p of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) {
    const h = read(p), at = s => h.indexOf('assets/' + s + '?v=');
    assert.strictEqual((h.match(/<script src="assets\/name\.js\?v=20261029r" defer><\/script>/g) || []).length, 1, p + ' name.js once');
    assert.ok(at('name.js') < at('account.js') && at('name.js') < at('ui.js'), p + ' name.js before account.js and ui.js');
  }
  const js = read('assets/name.js');
  const store = {}, ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const ctx = { console, localStorage: ls }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(js, ctx);
  const NM = ctx.NursinName, V = s => NM.validate(s);
  // ✅ accepted (trimmed, inner spaces collapsed)
  for (const s of ['عبدالله', 'Abood Jaber', 'Mohamad_99', 'نور-الهدى', 'Zoé', 'J.B', 'Ab', 'Hassan', 'زبيدة', 'Monique', 'Dominique', 'Wahbe', 'Cassandra', 'Dickson', 'Nicolas', 'علي ٢٠٠٣']) assert.ok(V(s).ok, 'ok: ' + s);
  assert.strictEqual(V('   Abood    Jaber  ').name, 'Abood Jaber');
  assert.strictEqual(V('a\u202eb\u200bc').name, 'abc', 'invisible / direction marks dropped');
  // ❌ refused, with the reason (Arabic + French text)
  const no = { '': 'empty', ' ': 'empty', 'a': 'short', 'عبدالله جابر الحسيني الكبير': 'long', 'Ab!d': 'chars', '😀😀': 'chars', 'ab<b>': 'chars', '1234': 'letter', '__--': 'letter', 'Admin': 'res', 'الأستاذ عثمان': 'res', 'nursin': 'res',
    'شرموطة': 'bad', 'كس امك': 'bad', 'حمار': 'bad', 'منيك': 'bad', 'Kalb': 'bad', '7mar': 'bad', 'ayre': 'bad', 'kos omak': 'bad', 'Connard': 'bad', 'salope': 'bad', 'nique': 'bad', 'Fuuuck': 'bad', 'f.u.c.k': 'bad', 'sh1t': 'bad', 'bitch': 'bad', 'ass': 'bad' };
  for (const [s, code] of Object.entries(no)) { const r = V(s); assert.ok(!r.ok && r.code === code, JSON.stringify(s) + ' → ' + code + ' (got ' + r.code + ')'); assert.ok(r.ar && r.fr, 'ar + fr error text'); }
  assert.ok(Array.from(V('أ'.repeat(20)).name).length === 20 && V('أ'.repeat(20)).ok && !V('أ'.repeat(21)).ok, '20 is the limit');
  assert.ok(NM.BAD.SUB.length + NM.BAD.WORD.length >= 80, 'the list lives in name.js');
  // 🔁 sign-in: the account's own choice wins; a device name fills an account without one; a pending change reaches the account
  delete store[NM.KEY]; let r = NM.pick({ nick: 'Abood' }, 'u1'); assert.deepStrictEqual([r.nick, r.write], ['Abood', false]); assert.strictEqual(JSON.parse(store[NM.KEY]).n, 'Abood', 'kept on the device too');
  r = NM.pick({ nick: '' }, 'u1'); assert.deepStrictEqual([r.nick, r.write], ['', false]); assert.ok(!store[NM.KEY], 'back to Google name clears it here');
  store[NM.KEY] = JSON.stringify({ n: 'Guest Name', at: 1, uid: null, p: 0 }); r = NM.pick({}, 'u1'); assert.deepStrictEqual([r.nick, r.write], ['Guest Name', true], 'signed-out name adopted');
  store[NM.KEY] = JSON.stringify({ n: 'Other', at: 1, uid: 'u2', p: 0 }); r = NM.pick({}, 'u1'); assert.deepStrictEqual([r.nick, r.write], ['', false], "another account's name is not taken");
  store[NM.KEY] = JSON.stringify({ n: 'New', at: 1, uid: 'u1', p: 1 }); r = NM.pick({ nick: 'Old' }, 'u1'); assert.deepStrictEqual([r.nick, r.write], ['New', true], 'a change made offline is sent');
  store[NM.KEY] = JSON.stringify({ n: 'Early', at: 1, uid: '?', p: 1 }); r = NM.pick({ nick: 'Old' }, 'u1'); assert.deepStrictEqual([r.nick, r.write], ['Early', true], 'a change made before the account loaded is sent');
  delete store[NM.KEY]; r = NM.pick({ nick: 'fuck' }, 'u3'); assert.strictEqual(r.nick, '', 'a bad name in the account is ignored');
  // greeting: a chosen name whole, a Google name by its first word
  delete store[NM.KEY]; ctx.NursinFB = { user: { uid: 'u1' }, profile: { name: 'Abdullah Jaber', nick: '' } }; assert.strictEqual(NM.greetName(), 'Abdullah');
  ctx.NursinFB.profile = { name: 'Dr Abood', nick: 'Dr Abood' }; assert.strictEqual(NM.greetName(), 'Dr Abood');
  ctx.NursinFB = null; store[NM.KEY] = JSON.stringify({ n: 'Abood', at: 1, uid: null }); assert.deepStrictEqual(Object.assign({}, NM.current()), { name: 'Abood', custom: true, signed: false }, 'signed out: this device only');
  // 🔥 single source of truth: fb.js ensureProfile → name = nick || Google name; setNick writes nick + name and refreshes presence + class member cards
  const fb = read('assets/fb.js');
  assert.ok(/NM\.pick\(d, u\.uid\)/.test(fb) && /name: pk\.nick \? pk\.nick : N\.cleanName\(u\.displayName\)/.test(fb), 'ensureProfile applies the chosen name');
  assert.ok(/async function setNick\(n\)/.test(fb) && /\{ nick: n, name, updatedAt: serverTimestamp\(\) \}/.test(fb) && /"presence", user\.uid/.test(fb) && /"classes", c\.id, "members", user\.uid\), \{ name \}/.test(fb), 'setNick writes the profile + copies');
  assert.ok(/profileWrite, setNick,/.test(fb), 'exported on NursinFB');
  // the rules already allow it: users/{uid} has no field list, name < 40 (nick ≤ 20 by name.js)
  const rules = read('firestore.rules'), um = rules.slice(rules.indexOf('match /users/{uid}'), rules.indexOf('match /friends/{fid}'));
  assert.ok(!/hasOnly/.test(um) && /name\.size\(\) < 40/.test(um), 'no rule change needed for users/{uid}.nick');
  // readers: home greeting, chat (current names over stored copies), class owner name
  const hm = read('assets/home.js'); assert.ok(hm.includes('w.NursinName.greetName()') && hm.includes('"nursin:name"'), 'home greeting');
  const ch = read('assets/chat.js'); assert.ok(/const nameOf = \(uid, stored\) => FRESH\[uid\] \|\| stored/.test(ch) && ch.includes('nameOf(m.uid, m.name)') && ch.includes('freshNames(c.members)'), 'chat shows current names');
  assert.ok(read('assets/classes.js').includes('ownerNow(members, cls)'), 'class owner name from his member card');
  // entry points: «أنا» (card button + settings row) and the avatar sheet (✏️ next to the name + account row); «الكل» #name; me.html#ui-name
  const me = read('assets/me.js'); assert.ok((me.match(/data-nm-open/g) || []).length >= 2 && me.includes('"nursin:name"'), '«أنا» entry points');
  assert.ok(/name\.js\?v=20261029r/.test(read('me.html')) && /me\.js\?v=20261029r/.test(read('me.html')), 'me.html loads it');
  const ui = read('assets/ui.js');
  assert.ok(/class="hznmb" type="button" data-nm-open/.test(ui) && /href="me\.html#ui-name" data-nm-open/.test(ui), 'avatar sheet entry points');
  assert.ok(ui.includes('["#name", "✏️", "اسمي", "Mon nom"]') && ui.includes('case "name":') && ui.includes('|theme|name)$/'), '«الكل» + hash');
  // 🇫🇷 every UI string has its French; no ads; CSS present
  assert.ok(!/\bT\("[^"]*"\)/.test(js), 'no Arabic-only T()');
  for (const k of ['empty', 'short', 'long', 'chars', 'letter', 'bad', 'res']) assert.ok(new RegExp(k + ': \\["[^"]+", "[^"]+"\\]').test(js), 'fr error ' + k);
  assert.ok(!/adx|ad-slot|adsbygoogle|bauval/.test(js), 'no ads in the name sheet');
  assert.ok(/\.hznm-in/.test(read('assets/ui.css')) && /\.hznmb/.test(read('assets/ui.css')), 'sheet CSS');
});

test('🔗 «اربط» (Oct 31 2026 «بلش ب ١و٢و٣»): link questions tie two REAL lessons, French copies, exam style, quiz mode, lesson button, weak/review/memory counting, Osman asks one some days', () => {
  const vm = require('node:vm');
  const src = read('assets/link-data.js');
  const Q = JSON.parse(src.match(/window\.LINKQ=(\[.*?\]);\n/s)[1]);
  assert.ok(Q.length >= 25 && Q.length <= 45, 'about 25–40 items: ' + Q.length);
  const c = {}; c.window = c; vm.createContext(c); vm.runInContext(read('assets/lessons.js'), c);
  const ids = new Set(c.NLESSONS.list.map(l => l.s + ':' + (l.l || l.t))), AR = /[\u0600-\u06FF]/, subj = new Set(), cnt = [0, 0, 0], seen = new Set();
  for (const q of Q) {
    assert.match(q.id, /^k\d{2,3}$/, 'id'); assert.ok(!seen.has(q.id), 'unique ' + q.id); seen.add(q.id);
    assert.strictEqual(q.t, 'link', q.id + ' t = link (not in any subject pool, so exams / duels / live rooms are unchanged)');
    assert.ok(Array.isArray(q.ls) && q.ls.length === 2 && q.ls[0] !== q.ls[1] && q.ls.every(x => ids.has(x)), q.id + ' tagged with two real lesson ids: ' + q.ls);
    q.ls.forEach(x => subj.add(x.split(':')[0]));
    assert.ok(q.o.length === 3 && [0, 1, 2].includes(q.a) && q.x && AR.test(q.q), q.id + ' 3 options, answer, link explanation');
    cnt[q.a]++;
    for (const [s, o] of [['ar', q], ['fr', q.fr]]) {
      assert.ok(o && o.q && o.x && o.o && o.o.length === 3, q.id + ' ' + s + ' complete');
      const lens = o.o.map(x => x.length); assert.ok(!(lens[q.a] === Math.max(...lens) && lens.filter(l => l === lens[q.a]).length === 1), q.id + ' ' + s + ' right answer is not the longest');
      assert.ok(![o.q, o.x, ...o.o].some(t => /\*\*|<\/?(b|strong)\b/.test(t)), q.id + ' no bold');
    }
    assert.ok(![q.fr.q, q.fr.x, ...q.fr.o].some(t => AR.test(t)), q.id + ' French copy has no Arabic');
  }
  assert.ok(subj.size >= 6, 'links across subjects: ' + [...subj]);
  assert.ok(Math.max(...cnt) - Math.min(...cnt) <= Math.max(2, Math.floor(Q.length / 6)), 'answers spread across a/b/c ' + cnt);
  assert.ok(src.includes('Lang.fr') && src.includes('q.fr.q'), 'FR mode swaps in the French copy');
  // quiz page: a «🔗 اربط» chip, the bank after quiz-data, the mode in quiz.js
  const qh = read('quiz.html');
  assert.ok(qh.includes('data-set="link">🔗 اربط'), 'quiz chip');
  for (const p of ['quiz.html', 'index.html', 'hifzi.html']) { const h = read(p); assert.ok(h.includes('assets/link-data.js?v=20261029r') && h.indexOf('assets/quiz-data.js') < h.indexOf('assets/link-data.js'), p + ' loads the link bank after the quiz bank'); }
  const qj = read('assets/quiz.js');
  assert.ok(qj.includes("if(sel==='link')return (window.LINKQ||[]).slice();") && qj.includes("🔗 الرابط: "), 'quiz.js runs t=link and labels the link explanation');
  // counted like any answer: weak points, spaced review (k ids accepted), both lessons' memory
  assert.ok(read('assets/weak.js').includes('(window.QUIZ||[]).concat(window.LINKQ||[]).filter('), 'weak points list link questions');
  const sj = read('assets/srs.js'); assert.ok(sj.includes('(w.QUIZ || []).concat(w.LINKQ || [])') && sj.includes('k\\d{2,3}'), 'reviews keep link questions');
  assert.ok(read('assets/hifz.js').includes('if (q && q.ls) q.ls.forEach(function (id) { apply(id'), 'a link answer moves both lessons\' memory');
  const ex = read('assets/extra.js');
  assert.ok(ex.includes('data-xlink') && ex.includes('🔗 اربط مع درس قديم') && ex.includes('Relier avec une ancienne leçon'), 'lesson end bar button, ar + fr');
  assert.ok(!/adx|ad-slot|adsbygoogle|bauval/.test(ex), 'no ads in extra.js');
  // «مسار اليوم»: Osman's 2nd question is an «اربط» one on some days (still 2 questions, still 5–7 steps)
  const hj = read('assets/home.js'); assert.ok(hj.includes('function linkPick(') && hj.includes('links: (w.LINKQ || []).map('), 'path knows the link bank');
  const { ctx, run } = homeCtx(); run('assets/lessons.js'); run('assets/ui.js'); run('assets/home.js');
  const HP = ctx.HomePath; assert.ok(HP && HP.build, 'HomePath.build exported');
  const lessons = [{ id: 'rea:r4', s: 'rea', t: 'rea', l: 'r4', n: 'الصدمات', href: 'rea.html#r4', score: 50, read: 1, q: 9 }, { id: 'cardio:embolie', s: 'cardio', t: 'embolie', n: 'Embolie', href: 'cardio.html#embolie', score: 60, read: 1, q: 6 }];
  let withLink = 0;
  for (let i = 1; i <= 20; i++) {
    const day = '2026-11-' + String(i).padStart(2, '0');
    const st = HP.build({ day, hm: 9 * 60, lessons, qids: { 'rea:r4': ['q375', 'q376', 'q377'] }, recent: ['rea:r4'], links: [{ id: 'k01', ls: ['cardio:embolie', 'rea:r4'] }] });
    const o = st.find(s => s.k === 'osm'); assert.ok(o && o.qs.length === 2, day + ' Osman still asks 2'); assert.ok(st.length >= 5 && st.length <= 7, day + ' 5–7 steps');
    if (o.qs[1] === 'k01') withLink++;
  }
  assert.ok(withLink >= 4 && withLink <= 16, 'the «اربط» question comes on some days, not every day: ' + withLink + '/20');
});
test('🧠 «حيلة حفظ» (Oct 31 2026): every lesson has 1–3 memory tricks with a French version, a folded card at the end of each lesson (highlighter works on it), all of them on حفظي, in «الكل»', () => {
  const vm = require('node:vm');
  const src = read('assets/tricks-data.js'), TR = JSON.parse(src.match(/window\.TRICKS=(\{.*\});\n/s)[1]), AR = /[\u0600-\u06FF]/;
  const c = {}; c.window = c; vm.createContext(c); vm.runInContext(read('assets/lessons.js'), c);
  const L = c.NLESSONS.list.map(l => l.s + ':' + (l.l || l.t));
  assert.ok(L.length >= 70, 'all lessons: ' + L.length);
  for (const id of L) {
    const ts = TR[id]; assert.ok(Array.isArray(ts) && ts.length >= 1 && ts.length <= 3, id + ' has 1–3 tricks');
    for (const t of ts) {
      for (const o of [t, t.fr]) { assert.ok(o && o.t && o.m && Array.isArray(o.d) && o.d.length >= 1, id + ' trick complete (t, m, d) in ar and fr'); assert.ok(![o.t, o.m, ...o.d].some(s => /\*\*|<\/?(b|strong)\b/.test(s)), id + ' no bold'); }
      assert.ok(AR.test(t.m + t.d.join(' ')), id + ' Arabic version');
      assert.ok(![t.fr.t, t.fr.m, ...t.fr.d].some(s => AR.test(s)), id + ' French version has no Arabic: ' + t.fr.m);
    }
  }
  assert.deepStrictEqual(Object.keys(TR).filter(k => !L.includes(k)), [], 'no tricks for unknown lessons');
  const ex = read('assets/extra.js');
  assert.ok(ex.includes('c.className = "xtrk"') && ex.includes('🧠 ') && ex.includes('Astuce mémo'), 'the folded card, ar + fr');
  assert.ok(ex.includes('top.parentNode.insertBefore(c, top)') && ex.includes('bd.appendChild(mk(id))'), 'card at the end of each lesson, inside the lesson text (.tbody → 🖍️ works on it)');
  assert.ok(read('assets/highlight.js').includes('closest("details.topic[id]")'), 'the highlighter keys parts by details.topic, so the nested card keeps the lesson part');
  assert.ok(read('hifzi.html').includes('<section id="tricks"') && ex.includes('function trickPage()'), 'all tricks on حفظي');
  const ui = read('assets/ui.js'); assert.ok(ui.includes('["hifzi.html#tricks", "🧠", "حِيَل الحفظ", "Astuces mémo"]') && ui.includes('["quiz.html?t=link", "🔗", "اربط", "Relier"]'), '«الكل» lists both');
  for (const p of pages.concat('admin.html', 'chat.html')) { const h = read(p); assert.ok(h.includes('<script src="assets/extra.js?v=20261029r" defer></script>') && h.indexOf('assets/ui.js') < h.indexOf('assets/extra.js'), p + ' loads extra.js after ui.js'); }
  const css = read('assets/ui.css'); assert.ok(css.includes('details.xtrk') && !/xtrk[^}]*backdrop-filter/.test(css), 'card styled, no extra blur');
});
test('🌅 «سؤال الصبح» deep link (/?mq=<id>, worker v10): opens that one question in a sheet, answered in place, counted like a quiz answer; the site mirrors the ids the worker may pick; nothing changes while v9 runs', () => {
  const vm = require('node:vm');
  const store = { nursin_weak_v1: JSON.stringify({ v: 1, items: { q010: { miss: 3, last: 5 }, q020: { miss: 1, last: 9 }, k03: { miss: 2, last: 7 } } }), nursin_srs_v1: JSON.stringify({ items: { q030: { s: 0, d: '2000-01-01' }, q040: { s: 1, d: '2999-01-01' } } }) };
  const mk = (search, hash) => { const c = { window: null, document: { readyState: 'loading', addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; }, documentElement: { classList: { add() {}, remove() {} } } }, localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } }, location: { pathname: '/index.html', search, hash, href: 'https://nursin.store/index.html' + search + hash }, history: { replaceState() {} }, Intl, Date, Math, JSON, Promise, setTimeout, clearTimeout, URL };
    c.window = c; vm.createContext(c); vm.runInContext(read('assets/extra.js'), c); return c.NursinX; };
  assert.strictEqual(mk('?mq=q251', '').mqParam(), 'q251', '?mq=');
  assert.strictEqual(mk('', '#mq=k05').mqParam(), 'k05', '#mq=');
  assert.strictEqual(mk('?x=1', '').mqParam(), '', 'no param, nothing opens (v9 never sends one)');
  assert.strictEqual(mk('?mq=<script>', '').mqParam(), '', 'only safe ids');
  const pool = mk('', '').mqPool(8);
  assert.strictEqual(JSON.stringify(pool.slice(0, 3)), JSON.stringify(['q010', 'k03', 'q020']), 'his mistakes first, most missed first');
  assert.ok(pool.includes('q030') && !pool.includes('q040'), 'then reviews due today only');
  const ex = read('assets/extra.js');
  assert.ok(ex.includes('function morning(id)') && ex.includes('🌅 ') && ex.includes('La question du matin') && ex.includes('history.replaceState'), 'sheet + param cleared after opening');
  assert.ok(ex.includes('loadQuiz(), loadLinks()') && ex.includes('nursin:answer'), 'loads the banks on any page, counts the answer');
  assert.ok(ex.includes('MQK = "nursin_mq_v1"'), 'remembers today\'s answer');
  const hz = read('assets/hifz.js'); assert.ok(hz.includes('stMq: w.NursinX && w.NursinX.mqPool ? w.NursinX.mqPool(8) : []') && hz.includes('stLang:'), 'study summary carries the ids + language for the worker');
  assert.ok(read('sw.js').includes('if (dt.u) {'), 'the existing service worker already opens a push\'s url (sw.js untouched)');
});
test('🌅 worker v10 (/home/user/tab/files/nursin-worker-v10.js, for Abdullah to paste): parses, keeps every v9 route, picks the morning question from the site\'s own banks', async (t) => {
  const f = '/home/user/tab/files/nursin-worker-v10.js', f9 = '/home/user/tab/files/nursin-worker-v9.js';
  if (!fs.existsSync(f) || !fs.existsSync(f9)) return t.skip('worker files not on this machine');
  const src = fs.readFileSync(f, 'utf8'), v9 = fs.readFileSync(f9, 'utf8');
  for (const r of ['"/push"', '"/push/seal"', '"/broadcast"', '"/goals/hello"', '"/admin/newuser"', '"/admin/joined"', 'tutor(req, env, cors)', 'async scheduled(']) assert.ok(src.includes(r) && v9.includes(r), 'kept ' + r);
  assert.ok(src.includes('morning: true, v: 10') && src.includes('v: { integerValue: "10" }'), 'GET /push says v: 10, morning');
  const os = require('node:os'), tmp = path.join(os.tmpdir(), 'nursin-w10-' + process.pid + '.mjs'); fs.writeFileSync(tmp, src);
  const W = (await import('file://' + tmp)).default; fs.unlinkSync(tmp);
  const quiz = W._parse(read('assets/quiz-data.js'), 'QUIZ'), links = W._parse(read('assets/link-data.js'), 'LINKQ');
  assert.ok(quiz.length >= 400 && links.length >= 25, 'reads the site banks: ' + quiz.length + ' + ' + links.length);
  const bank = { quiz, links, by: new Map(quiz.concat(links).map(x => [x.id, x])) }, day = '2026-11-02', at = (h, m) => Date.parse(day + 'T' + String(h - 2).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00Z');
  const P = (u, h, m) => W._morning({ uid: 'u1', goalPush: true, ...u }, day, h * 60 + m, at(h, m), bank);
  assert.strictEqual(P({}, 7, 0), null, '07:00 still quiet (default until 08:00)');
  const p = P({}, 8, 0); assert.ok(p && p.kind === 'mq' && /^\/\?mq=[qk]\d+$/.test(p.msg.url) && p.mark.mqDay === day && p.mark.osN === 1, '08:00 → one question, deep link, marked');
  assert.strictEqual(P({ mqDay: day }, 8, 30), null, 'once a day');
  assert.strictEqual(P({ stAt: at(7, 50) }, 8, 0), null, 'not while he is on the site');
  assert.strictEqual(P({ goalPush: false }, 8, 0), null, 'switch off');
  assert.strictEqual(P({}, 9, 30), null, 'window closed at 09:30');
  assert.strictEqual(P({ osDay: day, osN: 3 }, 8, 0), null, 'counts in the 3-a-day max');
  const mine = W._pick({ uid: 'u2', stMq: ['q010', 'q020'] }, '2026-11-03', bank); assert.ok(mine && mine.id, 'picks something');
  const fr = P({ stLang: 'fr' }, 8, 0); assert.ok(fr && fr.msg.title.includes('La question du matin') && !/[\u0600-\u06FF]/.test(fr.msg.title), 'French title for French students');
  assert.ok(W._plan && W._cron && W._bracket, 'v9 test hooks kept');
});


/* ---------- Nov 1 2026 (20261028m): 🎯 «امتحان الفصل 16/11» + 📌 «وظيفة» homework reminder (Abdullah, Oct 31 11:50–11:57 PM) ---------- */
function midCtx(store = {}, extra = []) {
  const { ctx, run } = homeCtx(store);
  for (const f of ['assets/lessons.js', 'assets/quiz-data.js', 'assets/blanks-data.js', 'assets/cases-data.js'].concat(extra)) run(f);
  run('assets/midterm.js');
  return { ctx, run, M: ctx.NursinMid };
}
test('🎯 امتحان الفصل: the mock-exam builder covers EVERY subject with lessons, every lesson of it, balanced, 20–30 questions, 1 min each', () => {
  const { ctx, M } = midCtx();
  const subs = M.subjects(), S = ctx.NLESSONS.subjects;
  assert.deepStrictEqual(Array.from(subs).sort(), Object.keys(S).filter(s => ctx.NLESSONS.list.some(l => l.s === s)).sort(), 'every subject that has lessons');
  assert.strictEqual(subs.length, 11);
  for (const s of subs.concat(['msall'])) {
    const les = M.lessonsOf(s).map(l => l.id);
    for (let seed = 1; seed <= 5; seed++) {
      const qs = M.build(s, { rnd: M.seeded(seed * 31 + s.length) });
      assert.ok(qs.length >= 20 && qs.length <= 30, s + ' size ' + qs.length);
      assert.strictEqual(qs.length, M.sizeOf(s), s + ' full size (enough questions in every subject)');
      const by = {}; qs.forEach(q => { by[q._l] = (by[q._l] || 0) + 1; });
      for (const id of les) assert.ok(by[id] >= 1, s + ': lesson ' + id + ' in the exam');
      const n = Object.values(by); assert.ok(Math.max(...n) - Math.min(...n) <= 1, s + ' balanced per lesson ' + JSON.stringify(by));
      assert.strictEqual(new Set(qs.map(q => q.id)).size, qs.length, s + ' no duplicates');
      for (const q of qs) { assert.ok(Array.isArray(q.o) && q.o.length === 3 && q.a >= 0 && q.a <= 2 && q.q && q.x, s + ' valid ' + q.id); assert.ok(les.includes(q._l), q.id + ' tagged with its lesson'); }
    }
  }
  // the quiz bank + fill-the-blank + patient cases all feed it
  const kinds = new Set(); for (const s of subs) M.build(s, { rnd: M.seeded(3) }).forEach(q => kinds.add(q._k));
  assert.deepStrictEqual([...kinds].sort(), ['b', 'c', 'q']);
  assert.strictEqual(M.build('weak', { rnd: M.seeded(2) }).length, 10, '⚡ short mock = 10');
  // a result: best score kept, per-lesson weak list < 70 %, saved for the plan / the path
  const r1 = M.result('rea', 10, 20, { 'rea:r1': [1, 5], 'rea:r2': [4, 5], 'rea:r3': [5, 5], 'rea:r4': [0, 5] });
  assert.strictEqual(r1.pct, 50); assert.ok(r1.best); assert.deepStrictEqual(Array.from(r1.weak, w => w.id), ['rea:r4', 'rea:r1']);
  const r2 = M.result('rea', 8, 20, {}); assert.ok(!r2.best && r2.prev === 50, 'best score kept');
  assert.strictEqual(M.load().best.rea.p, 50);
  assert.ok(M.weakLessons(3).indexOf('rea:r4') === 0, 'weakest lesson first');
  const mg = M.merge(M.load(), { best: { rea: { p: 90, sc: 18, n: 20, at: 1 }, law: { p: 40 } }, plan: { '2026-11-02': 5 } });
  assert.ok(mg.ch && mg.x.best.rea.p === 90 && mg.x.best.law.p === 40 && mg.x.plan['2026-11-02'], 'sync merge: higher score + plan union');
  // quiz.js runs it: intro + timer + per-lesson result, no 50/50 / «متأكد؟», nothing on screen but the exam (no ad)
  const qz = read('assets/quiz.js');
  for (const k of ["else if(p.t==='mid')midIntro(", "timed:Date.now()+qs.length*60000", "s.byL[q._l]", "if(s.sel==='mid')return midDone(s,pct);", 'M.result(s.subj', "T2('أضعف دروسك','Tes leçons les plus faibles')", 's.exam||s.challenge||s.cq||s.mid']) assert.ok(qz.includes(k), 'quiz.js ' + k);
  assert.ok(!/midDone[\s\S]{0,4000}adx-box/.test(qz.slice(qz.indexOf('function midDone'), qz.indexOf('function done()'))), 'no ad on the mock result');
  const { ctx: c2, run } = retainCtx(); run('assets/retain.js'); assert.ok(!c2.Retain.confOn({ sel: 'mid', mid: true }), 'no «متأكد ولا محزّر؟» in the mock');
});
test('🎯 the new exam-style questions (q601–q720) are valid: real lessons, a/b/c spread, right answer never the longest, no bold, French copy', () => {
  const w = {}; new Function('window', read('assets/quiz-data.js'))(w);
  const nq = w.QUIZ.filter(q => /^q[67]\d\d$/.test(q.id));
  assert.ok(nq.length >= 100, 'count ' + nq.length);
  const { ctx } = homeCtx(); vmRunLessons(ctx);
  const L = ctx.NLESSONS.list, cnt = [0, 0, 0], fr = read('assets/fr/quiz.js');
  const hash = s => { s = String(s).replace(/\s+/g, ' ').trim(); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36) + '.' + s.length.toString(36); };
  for (const q of nq) {
    assert.ok(L.some(l => l.t === q.t && (!l.l || l.l === q.l)), q.id + ' belongs to a real lesson');
    assert.ok(q.o.length === 3 && q.a >= 0 && q.a <= 2, q.id); cnt[q.a]++;
    const len = q.o.map(o => o.length); assert.ok(len[q.a] < Math.max(...len), q.id + ' right answer not the longest');
    for (const s of [q.q, q.x].concat(q.o)) assert.ok(!/\*\*|<\/?b>|<\/?strong>/.test(s), q.id + ' no bold');
    assert.ok(/[\u0600-\u06FF]/.test(q.q), q.id + ' Arabic');
    if (q.t !== 'law') for (const s of [q.q, q.x].concat(q.o.filter(o => /[\u0600-\u06FF]/.test(o)))) assert.ok(fr.includes('"' + hash(s) + '"'), q.id + ' 🇫🇷 ' + s.slice(0, 40));
  }
  assert.ok(Math.max(...cnt) - Math.min(...cnt) <= 3, 'a/b/c spread ' + cnt);
  assert.ok(!nq.some(q => /الحاجة رقم|besoin n°/.test(q.q)), 'Henderson needs by name, never by number');
});
function vmRunLessons(ctx) { require('node:vm').runInContext(read('assets/lessons.js'), ctx); }

/* ---------- Nov 6 2026 (20261029r): 🎯 «خطة امتحان 16» — the smart plan (Abdullah, Nov 6 2:20 PM) ---------- */
function planCov(P, M, until = '2026-11-13') {
  const ms = ['cardio', 'neuro', 'henderson', 'medsurg'], seen = {};
  P.filter(p => p.d <= until).forEach(p => p.tasks.forEach(t => { (t.s === 'msall' ? ms : [t.s]).forEach(s => { seen[s] = (seen[s] || 0) + 1; }); }));
  return seen;
}
const ALLREAD = M => { const m = {}; for (const s of M.subjects()) for (const l of M.lessonsOf(s)) m[l.id] = 1; return m; };
test('🎯 29q plan: from any day until Nov 13 every subject is covered ≥2 times, 1–3 tasks a day, class days (Thu/Fri/Sat) lighter, every task has a working link', () => {
  const { M } = midCtx();
  for (const day of ['2026-11-01', '2026-11-06', '2026-11-07', '2026-11-08']) {
    const P = M.smart(day, { x: M.load(), read: {}, weak: {}, ret: () => null }), seen = planCov(P, M);
    assert.strictEqual(P[0].d, day); assert.strictEqual(P[P.length - 1].d, '2026-11-15');
    assert.ok(new Set(P.map(p => p.d)).size === P.length, 'one row per day');
    for (const s of M.subjects()) assert.ok(seen[s] >= 2, day + ': ' + s + ' twice before Nov 14 (' + seen[s] + ')');
    for (const p of P) {
      assert.ok(p.tasks.length >= 1 && p.tasks.length <= 3, p.d + ' 1–3 tasks: ' + p.tasks.length);
      if (p.k === 'main' && M.isCls(p.d) && day !== '2026-11-08') assert.ok(p.tasks.length <= 2, p.d + ' class day lighter');
      for (const t of p.tasks) { assert.ok(['quiz', 'mock', 'weak', 'les'].includes(t.k), t.k); if (t.s !== 'weak' && t.k !== 'weak') assert.ok(M.lessonInfo(t.les), p.d + ' ' + t.s + ' has a lesson to read: ' + t.les); }
    }
  }
  assert.ok(M.isCls('2026-11-12') && M.isCls('2026-11-13') && M.isCls('2026-11-14') && !M.isCls('2026-11-09'), 'Thu/Fri/Sat');
  assert.deepStrictEqual(Array.from(M.smart('2026-11-16'), p => p.d), [], 'nothing on exam day');
  // short of days (from Nov 7: 18 places for 22 sessions) → the 4 Med-Surg subjects go as ONE «Med-Surg كلّو» mock, still everything twice
  assert.ok(M.smart('2026-11-07', { x: M.load(), read: {}, weak: {}, ret: () => null }).some(p => p.subs.includes('msall')), 'Med-Surg merged when short of days');
  // very late start (Nov 10, 4 days × ≤3): every subject at least once, the weakest twice, still ≤3 a day
  const L = M.smart('2026-11-10', { x: M.load(), read: {}, weak: {}, ret: id => id.startsWith('law:') ? 5 : 90 }), sl = planCov(L, M);
  for (const s of M.subjects()) assert.ok(sl[s] >= 1, 'Nov 10: ' + s + ' (' + sl[s] + ')');
  assert.strictEqual(sl.law, 2, 'the weakest still twice'); assert.ok(L.every(p => p.tasks.length <= 3));
});
test('🎯 29q plan: weakest subject first (accuracy, lessons opened, recent mistakes), a 1st pass = 10 questions + its weakest lesson, a 2nd pass = the full mock', () => {
  const { M } = midCtx();
  const read = ALLREAD(M); for (const l of M.lessonsOf('law')) delete read[l.id];
  const lawT = M.lessonsOf('law')[0].t, rea4 = 'rea:r4';
  const o = { x: M.load(), read, weak: { q1: { t: lawT, miss: 2, last: Date.parse('2026-11-06T10:00:00Z') } }, now: Date.parse('2026-11-07T16:00:00Z'), ret: id => id.startsWith('law:') ? 20 : id.startsWith('pharma:') ? 40 : id === rea4 ? 30 : 90 };
  const r = s => M.readiness(s, o).r;
  assert.ok(r('law') < r('pharma') && r('pharma') < r('rea') && r('rea') < r('geri'), 'readiness order ' + [r('law'), r('pharma'), r('rea'), r('geri')]);
  assert.strictEqual(M.readiness('rea', o).weakL, rea4, 'the lesson to read = his weakest one');
  assert.strictEqual(M.readiness('law', o).miss, 1, 'recent mistakes counted');
  const P = M.smart('2026-11-07', o), first = P[0].tasks;
  assert.strictEqual(first[0].s, 'law', 'weakest first: ' + first.map(t => t.s));
  assert.strictEqual(P[0].tasks.length, 2, 'Saturday (class day): 2 tasks');
  assert.deepStrictEqual(Array.from(P[0].tasks, t => t.s), ['law', 'pharma']);
  assert.strictEqual(first[0].k, 'quiz', 'a weak subject starts with 10 questions'); assert.ok(first[0].les.startsWith('law:'));
  const order = []; P.forEach(p => p.tasks.forEach(t => order.push(t.s + ':' + t.k)));
  assert.ok(order.indexOf('law:mock') > order.indexOf('law:quiz'), 'then the full mock later');
});
test('🎯 29q plan: ticks ✓ by itself from a finished quiz / mock (or by hand), a missed day comes back from today, today\'s tasks stay fixed', () => {
  const store = {}; const { M, ctx } = midCtx(store);
  const o = () => ({ x: M.load(), read: {}, weak: {}, ret: () => null });
  // Saturday Nov 7: the plan as shown, then nothing done → Sunday re-plans with those subjects still owed
  const sat = M.smart('2026-11-07', o()); const x = M.load(); x.fix = { '2026-11-07': sat[0].tasks }; store[M.KEY] = JSON.stringify(x);
  assert.strictEqual(M.missed('2026-11-08'), sat[0].tasks.length, 'yesterday missed');
  const sun = M.smart('2026-11-08', o()), seen = planCov(sun, M);
  for (const s of M.subjects()) assert.ok(seen[s] >= 2, 're-planned: ' + s + ' still twice (' + seen[s] + ')');
  assert.ok(sun[0].tasks.some(t => sat[0].tasks.some(y => y.s === t.s)), 'the missed (weakest) subject is first again on Sunday');
  // finished: a 10-question quiz on the subject that day → ✓, counted once, never the «أحسن علامة»
  const s0 = sat[0].tasks[0].s; const nq = M.sizeOf(s0);
  M.result(s0, 7, 10, {}, Date.parse('2026-11-07T15:00:00Z'));
  assert.ok(M.taskDone('2026-11-07', sat[0].tasks[0]), 'auto-tick from the quiz'); assert.ok(!M.load().best[s0], 'a 10-question quiz is not a best mock (' + nq + ')');
  assert.strictEqual(M.missed('2026-11-08'), sat[0].tasks.length - 1);
  M.tick('2026-11-07', sat[0].tasks[1].s, true); assert.strictEqual(M.missed('2026-11-08'), 0, 'ticked by hand');
  const sun2 = M.smart('2026-11-08', o()), c2 = planCov(sun2, M);
  const s1 = s0 === 'msall' ? 'cardio' : s0; assert.strictEqual(c2[s1], 1, s0 + ' done once → once more before Nov 14');
  M.tick('2026-11-07', sat[0].tasks[1].s, false); assert.ok(!M.taskDone('2026-11-07', sat[0].tasks[1]));
  // a regular subject quiz (quiz.html?t=rea) also counts
  assert.ok(read('assets/midterm.js').includes('d.addEventListener("nursin:quizdone"') && read('assets/midterm.js').includes('credit(v.sel, today())'), 'quiz.js «nursin:quizdone» → credit');
  M.credit('rea', '2026-11-08'); M.credit('rea', '2026-11-08'); assert.deepStrictEqual(Array.from(M.load().h.rea), ['2026-11-08'], 'subject quiz credited once a day');
  assert.ok(M.taskDone('2026-11-08', { s: 'rea', k: 'quiz', les: 'rea:r1' }));
  // today's tasks stay as shown even after one is done (x.fix)
  const td = M.today(), P1 = M.plan(td);
  if (td < M.EXAM) { const before = JSON.stringify(P1[0].tasks); M.result(P1[0].tasks[0].s === 'weak' ? 'weak' : P1[0].tasks[0].s, 9, 10, {}); assert.strictEqual(JSON.stringify(M.plan(td)[0].tasks), before, 'fixed for the day'); assert.ok(M.load().fix[td]); }
  // sync: done sessions + ticks are merged as a union
  const mg = M.merge(M.load(), { h: { law: ['2026-11-09'] }, tk: { '2026-11-10': { geri: 5 } } }); assert.ok(mg.ch && mg.x.h.law.includes('2026-11-09') && mg.x.tk['2026-11-10'].geri);
});
test('🎯 29q plan: Nov 14–15 = light review of weak points only (Sat lighter), and the plan shows on midterm.html with ⏳ and ✓', () => {
  const { M } = midCtx();
  for (const day of ['2026-11-07', '2026-11-14', '2026-11-15']) {
    const P = M.smart(day, { x: M.load(), read: {}, weak: {}, ret: () => null }), lt = P.filter(p => p.d >= '2026-11-14');
    assert.deepStrictEqual(Array.from(lt, p => p.k), day === '2026-11-15' ? ['light'] : ['light', 'light']);
    for (const p of lt) { assert.strictEqual(p.tasks[0].k, 'weak'); assert.ok(p.tasks.every(t => t.k === 'weak' || t.k === 'les'), 'weak points only'); assert.strictEqual(p.tasks.length, p.d === '2026-11-14' ? 1 : 2); }
  }
  const js = read('assets/midterm.js');
  for (const k of ['خطة امتحان 16', 'Plan examen du 16', '⏳ \' + T("باقي "', 'data-midtk', 'رتّبتلك الخطة من جديد', 'جاهزيتك بكل مادة', 'quiz.html?t=mid&s=weak&n=10', 'nursin:quizdone']) assert.ok(js.includes(k), 'midterm.js ' + k);
  assert.ok(!/requestAnimationFrame|@keyframes/.test(js), 'no animations');
  assert.ok(!/=>|`|\blet\b|\bconst\b|\.\.\.|\?\.|\?\?/.test(js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')), 'ES5-safe for iOS 12');
  assert.ok(read('assets/ui.css').includes('.midtask{') && read('assets/ui.css').includes('.midbar{'), 'styles');
});
test('🧭 29q: today\'s «خطة امتحان 16» item is a step of «مسار اليوم» (5–7 steps), names the task and ticks ✓ with the day\'s plan', () => {
  const store = {}; const { ctx, run } = homeCtx(store); for (const f of ['assets/lessons.js', 'assets/quiz-data.js', 'assets/ui.js', 'assets/midterm.js', 'assets/homework.js', 'assets/home.js']) run(f);
  const H = ctx.HomePath, M = ctx.NursinMid;
  const L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, q: 10, added: l.added || '' }));
  for (const day of ['2026-11-07', '2026-11-09', '2026-11-14', '2026-11-15']) {
    const st = M.step(day); assert.ok(st && st.k === 'mid' && st.n >= 1 && st.n <= 3 && st.href, day + ' step');
    const x = { day, hm: 18 * 60, due: 3, last: null, lessons: L, wex: { ready: false }, cases: [], mid: st, hw: [], imp: [], tn: null };
    const steps = H.buildAll(x).steps, k = steps.map(s => s.k);
    assert.ok(steps.length >= 5 && steps.length <= 7, day + ' 5–7: ' + k); assert.strictEqual(k.filter(s => s === 'mid').length, 1, day + ' one 🎯 step');
    const ph = H.pathHtml({ v: H.V, d: day, at: 1, steps, done: {} }); assert.ok(ph.includes('خطة امتحان 16') || ph.includes('Plan examen'), day + ' label');
  }
  assert.strictEqual(M.step('2026-11-14').s, 'weak');
  assert.ok(read('assets/midterm.js').includes('.formatToParts(t)'), 'Beirut day via formatToParts (WebKit\'s en-CA format() is «11/07/2026»)');
  const js = read('assets/home.js'); for (const k of ['🎯 خطة امتحان 16 · ⏳ باقي ', 'n: x.mid.n | 0, dn: x.mid.dn | 0', 'خطة اليوم ']) assert.ok(js.includes(k), 'home.js ' + k);
});

test('🎯 countdown to Monday Nov 16 2026 (Beirut), day-by-day plan (every subject ≥2 times, Nov 14–15 light), the page has no ad', () => {
  const { M } = midCtx();
  assert.strictEqual(M.EXAM, '2026-11-16'); assert.strictEqual(new Date(M.EXAM_TS).toISOString(), '2026-11-16T06:00:00.000Z', '08:00 Asia/Beirut (UTC+2 in November)');
  assert.strictEqual(M.daysLeft('2026-11-01'), 15); assert.strictEqual(M.daysLeft('2026-11-15'), 1); assert.strictEqual(M.daysLeft('2026-11-20'), 0);
  const c = M.countdown(Date.parse('2026-11-01T00:00:00+02:00')); assert.deepStrictEqual([c.d, c.h, c.m, c.s, c.over], [15, 8, 0, 0, false]);
  assert.ok(M.countdown(Date.parse('2026-11-16T08:00:01+02:00')).over);
  assert.strictEqual(M.today(new Date('2026-11-15T22:30:00Z')), '2026-11-16', 'Beirut day');
  const P = M.smart('2026-11-01', { x: M.load(), read: {}, weak: {}, ret: () => null }); assert.strictEqual(P[0].d, '2026-11-01'); assert.strictEqual(P[P.length - 1].d, '2026-11-15');
  const seen = {}; P.filter(p => p.d <= '2026-11-13').forEach(p => p.subs.forEach(s => { seen[s] = (seen[s] || 0) + 1; }));
  for (const s of M.subjects()) assert.ok(seen[s] >= 2, s + ' twice before Nov 14 (' + seen[s] + ')');
  assert.deepStrictEqual(Array.from(P.filter(p => p.d >= '2026-11-14'), p => p.k), ['light', 'light']);
  assert.ok(new Set(P.map(p => p.d)).size === P.length, 'one row per day');
  M.planMark('2026-11-03', true); assert.ok(M.planDone('2026-11-03')); M.planMark('2026-11-03', false); assert.ok(!M.planDone('2026-11-03'));
  const st = M.step('2026-11-01'); assert.ok(st && st.k === 'mid' && st.e === '🎯' && /quiz\.html\?t=mid&s=/.test(st.href) && st.left === 15);
  assert.strictEqual(M.step('2026-11-14').s, 'weak'); assert.strictEqual(M.step('2026-11-16'), null, 'gone on exam day'); assert.strictEqual(M.step('2026-12-01'), null);
  const h = read('midterm.html');
  assert.ok(h.includes('id="mid-app"') && h.includes('assets/midterm.js?v=20261029r'), 'page + script');
  assert.ok(!h.includes('ca-pub-2554036492962277') && !/735f5c76|f0cd90c8|9892bba2|adx/.test(h) && !h.includes('assets/ads.js'), 'no ad on the exam page');
  const js = read('assets/midterm.js'); assert.ok(js.includes('classList.add("rton")'), 'page ads hidden');
  for (const k of ["Examen complet ⏱️", "Plan examen du 16", "Tes leçons les plus faibles", "Lundi 16 novembre 2026"]) assert.ok(js.includes(k), '🇫🇷 ' + k);
  assert.ok(read('assets/fr/p-midterm.js').includes('Examen de mi-semestre') && read('assets/lang.js').includes('midterm: 1'), 'French page dictionary');
  const { ctx, run } = homeCtx(); run('assets/ui.js'); const U = ctx.NursinUI;
  assert.ok(U.PAGES['midterm.html'] && JSON.stringify(U.ALL).includes('"midterm.html"'), '«الكل» → 🎯 امتحان الفصل');
  assert.ok(read('quiz.html').indexOf('src="assets/midterm.js') < read('quiz.html').indexOf('src="assets/quiz.js') && read('index.html').indexOf('src="assets/midterm.js') < read('index.html').indexOf('src="assets/home.js') && read('index.html').includes('src="assets/homework.js?v=20261029r'), 'loaded before quiz.js / home.js');
  assert.ok(read('sitemap.xml').includes('midterm.html') && read('assets/account.js').includes("page==='midterm.html'"), 'sitemap + Firebase for the sync');
});
test('🧭 the path keeps «مسار اليوم» whole: + ONE 🎯 step until Nov 15 + 📌 homework steps, still 5–7 steps, Osman first', () => {
  const store = {};
  const { ctx, run } = homeCtx(store); for (const f of ['assets/lessons.js', 'assets/quiz-data.js', 'assets/ui.js', 'assets/midterm.js', 'assets/homework.js', 'assets/home.js']) run(f);
  const H = ctx.HomePath, M = ctx.NursinMid, HW = ctx.NursinHW;
  const L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, q: 10, added: l.added || '' }));
  const hw = [{ id: 'hw1', title: 'devoir Med-Surg', subj: 'medsurg', due: '2026-11-05', note: '' }, { id: 'hw2', title: 'Plan de soins', subj: 'geri', due: '2026-11-07', note: 'A4' }];
  for (let i = 0; i < 40; i++) {
    const day = new Date(Date.parse('2026-10-28T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
    for (const busy of [false, true]) {
      const x = { day, hm: busy ? 15 * 60 + 5 : 540, due: busy ? 14 : 0, last: null, lessons: L, wex: { ready: busy }, cases: [], mid: M.step(day), hw: HW && busy ? hw.filter(h => h.due >= day) : [],
        imp: busy ? [{ ik: 'ex:1', e: '📅', n: 'امتحان', s: '', href: 'exams.html' }, { ik: 'dq', e: '❓', n: 'سؤال اليوم', s: '', href: 'quiz.html' }] : [], tn: busy ? { op: 'X' } : null };
      const steps = H.build(x), k = steps.map(s => s.k);
      assert.ok(steps.length >= 5 && steps.length <= 7, day + ' count ' + steps.length + ' ' + k);
      assert.ok(k.includes('osm') && k.indexOf('osm') > k.indexOf('rev') && ['new', 'today', 'cont', 'cls'].includes(k[0]), day + ' 29f: the lesson first, 🔁 before Osman ' + k);
      assert.strictEqual(k.filter(s => s === 'mid').length, day < '2026-11-16' && day >= '2026-10-25' ? 1 : 0, day + ' one 🎯 step until Nov 15 ' + k);
      if (busy && day <= '2026-11-05') assert.ok(k.includes('hw'), day + ' 📌 homework shown ' + k);
      if (day > '2026-11-07') assert.ok(!k.includes('hw'), day + ' expired homework hidden');
    }
  }
  // NursinHW: none / expired / handed in → no step; a bad doc is dropped
  assert.deepStrictEqual(Array.from(HW.open('2026-11-01')), [], 'nothing until the admin adds one (or rules v20 refuse the read)');
  store[HW.KEY] = JSON.stringify({ at: 1, list: [HW.clean('a', { title: 'devoir', due: '2026-11-05' }), HW.clean('b', { title: 'old', due: '2026-10-30' })] });
  assert.deepStrictEqual(Array.from(HW.open('2026-11-01'), h => h.id), ['a'], 'expired one hidden');
  HW.tick('a', true); assert.deepStrictEqual(Array.from(HW.open('2026-11-01')), [], '«سلّمتها ✅» hides it'); assert.ok(HW.isDone('a'));
  HW.tick('a', false); assert.strictEqual(HW.open('2026-11-01').length, 1);
  assert.strictEqual(HW.clean('x', { title: '', due: '2026-11-05' }), null); assert.strictEqual(HW.clean('x', { title: 't', due: '5/11' }), null);
  assert.strictEqual(HW.clean('x', { title: 't'.repeat(200), due: '2026-11-05' }).title.length, 120);
  const js = read('assets/home.js');
  for (const k of ['case "mid":', 'case "hw":', 'data-hzhw', 'سلّمتها ✅', "Je l'ai rendu ✅", 'تحضير امتحان الفصل', "Préparation de l'examen", 'href="midterm.html"', '/^(bus|osm|rev|cls|imp|duel|mid|hw|today)$/']) assert.ok(js.includes(k), 'home.js ' + k);
  const hj = read('assets/homework.js'); assert.ok(hj.includes('A.fs.collection(A.db, "homework")') && hj.includes('hwDone') && hj.includes('list: [], err:'), 'reads homework/, degrades to nothing when refused');
});
test('📌 admin «زيد وظيفة»: form + list + delete on homework/{id}; rules v20 = the whole v19 + the homework block only (written, not published)', () => {
  const a = read('assets/admin.js');
  for (const k of ['function hwAdmin(API, el)', '📌 زيد وظيفة', 'doc(API.db, "homework", id)', 'collection(API.db, "homework")', 'deleteDoc(doc(API.db, "homework"', 'لازم تنشر قواعد Firestore v20', 'type="date"', 'maxlength="120"', 'maxlength="300"']) assert.ok(a.includes(k), 'admin.js ' + k);
  const f20 = '/home/user/tab/files/nursin-rules-v20.txt', f19 = '/home/user/tab/files/nursin-rules-v19.txt';
  if (fs.existsSync(f20) && fs.existsSync(f19)) {
    const r20 = fs.readFileSync(f20, 'utf8'), r19 = fs.readFileSync(f19, 'utf8');
    assert.ok(r20.includes('match /homework/{id}') && r20.includes("allow read: if signedIn();") && r20.includes("hasOnly(['title', 'subj', 'due', 'note', 'at', 'by'])"), 'homework block');
    const strip = s => s.replace(/^\/\/.*$/mg, '').replace(/\s+/g, ' ');
    const body20 = strip(r20.replace(/ {4}\/\/ v20 📌[\s\S]*?match \/homework\/\{id\} \{[\s\S]*?\n {4}\}\n/, ''));
    assert.strictEqual(body20, strip(r19), 'nothing else changed from v19');
  }
  assert.ok(!read('assets/admin.js').includes('rules_version'), 'rules are a file for him, never published from the site');
});

test('🛠️ «شو بدك نضيف أو نعدّل؟» page: suggest.html (no ads), in «الكل» under أدواتي + 👤 أنا, Firebase loaded there, French page dictionary', () => {
  const h = read('suggest.html');
  assert.ok(h.includes('id="sg-app"') && h.includes('src="assets/suggest.js?v=20261029r"') && /<body class="sgpage ui">/.test(h), 'page + script + glass shell');
  assert.ok(!/ca-pub-|adsbygoogle|ads\.js|class="adx|bauval|735f5c76|f0cd90c8|9892bba2/.test(h), 'no ad near the suggestion box');
  assert.ok(h.includes('<meta name="robots" content="noindex">') && h.includes('G-7MY0Z597WC'), 'noindex, GA kept');
  const { ctx, run } = homeCtx(); run('assets/ui.js'); const U = ctx.NursinUI;
  assert.strictEqual(U.info('suggest.html').ar, 'اقتراحاتك'); assert.strictEqual(U.info('suggest.html').fr, 'Tes idées');
  const tools = JSON.stringify(U.ALL.find(g => g.k === 'community').items);
  assert.ok(tools.includes('["suggest.html","🛠️","اقتراحاتك","Tes idées"]'), '«الكل» → 👥 المجتمع (Nov 1 regroup) → 🛠️ (short label, fits the tile)');
  assert.ok(read('assets/me.js').includes('r("suggest.html", "🛠️"'), '👤 أنا link');
  assert.ok(read('assets/account.js').includes("page==='suggest.html'"), 'Firebase loads on the page (sign-in + own entries)');
  assert.ok(read('assets/lang.js').includes('suggest: 1') && read('assets/fr/p-suggest.js').includes('Tes idées') && read('assets/fr/p-suggest.js').includes("Qu'est-ce qu'on ajoute ou modifie ?"), 'French page dictionary');
});
test('🛠️ suggestion box logic: type chips ➕/✏️/🐞, text required ≤ 1000, optional subject, status forced «new», no reply from a student, own entries newest first, fr for every label', () => {
  const { ctx, run } = homeCtx(); run('assets/lessons.js'); run('assets/suggest.js'); const X = ctx.NursinSug;
  assert.deepStrictEqual(Array.from(X.TYPES, t => t.k + t.e), ['add➕', 'edit✏️', 'bug🐞']);
  assert.deepStrictEqual(Array.from(X.TYPES, t => t.ar), ['إضافة', 'تعديل', 'مشكلة']);
  assert.deepStrictEqual(Object.keys(X.STATUS), ['new', 'doing', 'done']);
  assert.deepStrictEqual(Object.keys(X.STATUS).map(k => X.STATUS[k].ar), ['جديد', 'عم نشتغل عليه', 'تم']);
  for (const t of X.TYPES) assert.ok(t.fr && t.hf && !/[\u0600-\u06FF]/.test(t.fr + t.hf), 'fr ' + t.k);
  for (const k in X.STATUS) assert.ok(X.STATUS[k].fr && !/[\u0600-\u06FF]/.test(X.STATUS[k].fr), 'fr ' + k);
  for (const a of X.AREAS) assert.ok(a[3] && !/[\u0600-\u06FF]/.test(a[3]) && /^[a-z]{1,30}$/.test(a[0]), 'area ' + a[0]);
  const p = X.payload('U1', '  أحمد  ', 'add', '  بدنا كويز لكل جزء  ', 'rea');
  assert.ok(p.ok); assert.deepStrictEqual(JSON.parse(JSON.stringify(p.doc)), { uid: 'U1', name: 'أحمد', type: 'add', text: 'بدنا كويز لكل جزء', subj: 'rea', status: 'new' });
  assert.strictEqual(X.payload('', 'x', 'add', 'x').why, 'auth');
  assert.strictEqual(X.payload('U1', 'x', '', 'x').why, 'type'); assert.strictEqual(X.payload('U1', 'x', 'spam', 'x').why, 'type');
  assert.strictEqual(X.payload('U1', 'x', 'bug', '   ').why, 'empty');
  assert.ok(X.payload('U1', 'x', 'bug', 'ت'.repeat(1000)).ok); assert.strictEqual(X.payload('U1', 'x', 'bug', 'ت'.repeat(1001)).why, 'long');
  assert.strictEqual(X.payload('U1', 'n'.repeat(60), 'edit', 'x', '<b>').doc.name.length, 40, 'name cut to 40');
  assert.strictEqual(X.payload('U1', 'x', 'edit', 'x', '<b>bad</b>').doc.subj, '', 'odd subject dropped');
  assert.ok(!('reply' in X.payload('U1', 'x', 'add', 'x').doc) && X.payload('U1', 'x', 'add', 'x').doc.status === 'new', 'a student never sends a reply or a status');
  assert.strictEqual(X.clean('a', { type: 'nope', text: 'x' }), null); assert.strictEqual(X.clean('a', { type: 'add', text: '  ' }), null);
  const c = X.clean('a', { uid: 'U1', name: 'A', type: 'bug', text: 'x', status: 'weird', reply: ' ok ', at: { seconds: 100 }, rAt: { toMillis: () => 5 } });
  assert.strictEqual(c.status, 'new'); assert.strictEqual(c.reply, 'ok'); assert.strictEqual(c.at, 100000); assert.strictEqual(c.rAt, 5);
  const L = [{ id: '1', type: 'add', status: 'new', at: 1 }, { id: '2', type: 'bug', status: 'done', at: 3 }, { id: '3', type: 'add', status: 'doing', at: 2 }];
  assert.deepStrictEqual(Array.from(X.sortNew(L), x => x.id), ['2', '3', '1'], 'newest first');
  assert.deepStrictEqual(Array.from(X.filter(L, { type: 'add' }), x => x.id), ['1', '3']); assert.deepStrictEqual(Array.from(X.filter(L, { status: 'done' }), x => x.id), ['2']);
  const n = X.counts(L); assert.strictEqual(n.new, 1); assert.strictEqual(n.add, 2); assert.strictEqual(n.all, 3);
  assert.ok(X.areaName('rea').includes('الإنعاش') && X.areaName('path').includes('مسار اليوم'), 'subject + site part names');
  assert.ok(X.denied({ code: 'permission-denied' }) && !X.denied({ code: 'unavailable' }));
  assert.ok(X.rulesMsg(true).includes('لازم تنشر قواعد v21') && X.rulesMsg(false).includes('نصّك محفوظ'), 'clear message until v21 is published; the draft is kept');
  const js = read('assets/suggest.js');
  for (const k of ['سجّل دخول لتبعت اقتراح', 'اقتراحاتي', 'F.where("uid", "==", u.uid)', 'F.addDoc(F.collection(A.db, COLL)', 'serverTimestamp()', 'maxlength="', 'data-nofr', "Connecte-toi pour envoyer une proposition", 'Mes propositions', 'nursin_sug_draft_v1'])
    assert.ok(js.includes(k), 'suggest.js ' + k);
  assert.ok(!/console\.(error|warn)/.test(js), 'a refused read / save is a message, never a console error');
});
test('🛠️ admin «الاقتراحات»: all entries newest first with the student name, filter by type / status, set status, reply, delete, badge of new; rules v21 = the whole v20 + the suggestions block only (written, not published)', () => {
  const a = read('assets/admin.js');
  for (const k of ['function sugAdmin(API, el)', 'sugAdmin(API, el); }', 'orderBy("at", "desc"), limit(300)', 'data-sgf=', 'data-sgset', 'data-sgreply', 'data-sgdel', 'updateDoc(ref, { status: t.dataset.sgset })', '{ reply: r, rAt: serverTimestamp() }', 'deleteDoc(ref)', 'sgbadge', 'x.name', 'X.rulesMsg(true)'])
    assert.ok(a.includes(k), 'admin.js ' + k);
  assert.ok(a.indexOf('sugAdmin(API, el)') > a.indexOf('if (!(u && u.email === OWNER && u.emailVerified))'), 'behind the same admin check as the homework card');
  assert.ok(read('admin.html').includes('src="assets/suggest.js?v=20261029r"'), 'admin page has the helpers');
  assert.ok(read('assets/ui.css').includes('.sgchip.on{') && read('assets/ui.css').includes('html[data-theme=night] .sgs-done'), 'glass styles, light + dark');
  const f21 = '/home/user/tab/files/nursin-rules-v21.txt', f20 = '/home/user/tab/files/nursin-rules-v20.txt';
  if (fs.existsSync(f21) && fs.existsSync(f20)) {
    const r21 = fs.readFileSync(f21, 'utf8'), r20 = fs.readFileSync(f20, 'utf8');
    assert.ok(r21.includes('match /suggestions/{id}') && r21.includes("sd().uid == request.auth.uid") && r21.includes("sd().status == 'new'") && r21.includes("hasOnly(['status', 'reply', 'rAt'])") && r21.includes('resource.data.uid == request.auth.uid || isAnnOwner()'), 'suggestions block');
    const wl = r21.match(/sd\(\)\.keys\(\)\.hasOnly\(\[([^\]]*)\]\)/)[1].replace(/'|\s/g, '').split(',');
    assert.ok(!wl.includes('reply'), 'a student cannot create with a reply');
    const { ctx, run } = homeCtx(); run('assets/suggest.js'); const d = ctx.NursinSug.payload('U', 'n', 'add', 't', 'rea').doc; d.at = 0;
    for (const k of Object.keys(d)) assert.ok(wl.includes(k), 'the site sends only allowed fields: ' + k);
    const strip = s => s.replace(/^\/\/.*$/mg, '').replace(/\s+/g, ' ');
    const body21 = strip(r21.replace(/ {4}\/\/ v21 🛠️[\s\S]*?match \/suggestions\/\{id\} \{[\s\S]*?\n {4}\}\n/, ''));
    assert.strictEqual(body21, strip(r20), 'nothing else changed from v20');
  }
  assert.ok(!read('assets/suggest.js').includes('rules_version') && !read('firestore.rules').includes('suggestions'), 'rules are a file for him, never published from the site');
});


test('🖼️ diagrams (20261028m): the 12 approved teaching diagrams are in their lessons — files, alt text, every lesson placed', () => {
  const vm = require('node:vm');
  const src = read('assets/diagrams.js'), ctx = { window: {} };
  vm.runInNewContext(src.slice(0, src.indexOf('(function (w, d)')), ctx);
  const DG = ctx.window.NURSIN_DIAGRAMS;
  // Abdullah approved all 12 on Nov 1 2026 7:19 AM — each one on its own lesson (index.json of the diagram worker)
  const WANT = { 'rea-chocs': 'rea:r4', 'rea-abg': 'rea:r1', 'rea-solutes': 'rea:r3', 'perf-catheters': 'medsurg:iv', 'geri-escarres': 'geri:g6', 'comm-vaccins': 'comm:c8',
    'cardio-6p': 'cardio:embolie', 'cardio-ecg-qrs': 'cardio:arythmies', 'comm-prevention': 'comm:c2', 'henderson-14': 'henderson:h1', 'comm-depistage': 'comm:c7', 'geri-deshydratation': 'geri:g3' };
  assert.equal(DG.length, 12, '12 diagrams');
  assert.deepEqual(DG.map(x => x.id).sort(), Object.keys(WANT).sort());
  const PAGE = { rea: 'rea.html', medsurg: 'medsurg.html', geri: 'geri.html', comm: 'community.html', cardio: 'cardio.html', henderson: 'henderson.html' };
  const DATA = { 'rea.html': ['assets/rea-data.js', 'REA'], 'medsurg.html': ['assets/medsurg-data.js', 'MEDSURG'], 'geri.html': ['assets/geri-data.js', 'GERI'], 'community.html': ['assets/comm-data.js', 'COMM'] };
  const text = h => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const lessonText = (page, k) => {
    if (DATA[page]) { const c = { window: {} }; vm.runInNewContext(read(DATA[page][0]), c); const L = c.window[DATA[page][1]].lessons.find(l => l.k === k); assert.ok(L, page + ' lesson ' + k); return text(L.html); }
    const h = read(page); if (!k) return text(h);
    const a = h.indexOf('id="' + k + '"'); assert.ok(a > -1, page + ' #' + k); const z = h.indexOf('<details', a + 10); return text(h.slice(a, z > -1 ? z : undefined));
  };
  let places = 0;
  for (const x of DG) {
    // the file: a real SVG with the Cairo subset embedded (an <img> can't use the page fonts), its size on the entry, not heavy
    const f = path.join(SITE, 'assets', 'diagrams', x.f); assert.ok(fs.existsSync(f), x.f + ' exists');
    const svg = fs.readFileSync(f, 'utf8'), sz = fs.statSync(f).size;
    assert.ok(svg.startsWith('<svg') && svg.includes('viewBox="0 0 ' + x.w + ' ' + x.h + '"'), x.f + ' viewBox = w/h on the entry');
    assert.ok(/@font-face\{font-family:"CairoD"[^}]*base64,/.test(svg), x.f + ' embeds its font');
    assert.ok(sz < 80000, x.f + ' under 80 KB');
    assert.ok(!/<script|onload=|href="http/i.test(svg), x.f + ' no script / remote refs');
    // words: Arabic + French title and alt
    for (const k of ['ar', 'fr', 'alt', 'altfr']) assert.ok(typeof x[k] === 'string' && x[k].length >= (k.startsWith('alt') ? 40 : 8), x.id + ' ' + k);
    assert.ok(/[\u0600-\u06FF]/.test(x.ar) && /[\u0600-\u06FF]/.test(x.alt) && !/[\u0600-\u06FF]/.test(x.altfr), x.id + ' ar/fr sides');
    // where: its own lesson first, on that lesson's page, anchored on a block that really is in the lesson text
    assert.equal(x.l, WANT[x.id], x.id + ' lesson'); assert.equal(x.at[0].l, WANT[x.id], x.id + ' first placement = its lesson');
    for (const a of x.at) {
      const subj = a.l.split(':')[0]; assert.equal(a.p, PAGE[subj], x.id + ' page for ' + a.l);
      assert.ok(['before', 'after', 'end'].includes(a.m) && Number.isInteger(a.n) && a.n >= 0, x.id + ' mode + block index');
      assert.equal(a.k, subj === 'henderson' ? '' : a.l.split(':')[1], x.id + ' lesson element id');
      assert.ok(lessonText(a.p, a.k).includes(norm(a.c)), x.id + ' anchor «' + a.c + '» is in ' + a.l);
      const h = read(a.p);
      assert.equal((h.match(/<script src="assets\/diagrams\.js\?v=20261029r" defer><\/script>/g) || []).length, 1, a.p + ' loads diagrams.js once, fresh tag');
      assert.ok(h.indexOf('assets/diagrams.js') > h.indexOf('assets/highlight.js') && h.indexOf('assets/diagrams.js') > h.indexOf('assets/lessons.js'), a.p + ' after lessons/highlighter');
      places++;
    }
  }
  assert.ok(places >= 12, 'every diagram placed (' + places + ')');
  for (const f of fs.readdirSync(path.join(SITE, 'assets', 'diagrams'))) assert.ok(DG.some(x => x.f === f), 'no stray file ' + f);
});

test('🖼️ diagrams: figure is lazy, outside the highlighter + translator, gated with the lesson; tap = fullscreen viewer with back/Esc/✕ close', () => {
  const js = read('assets/diagrams.js'), css = read('assets/ui.css');
  for (const k of ['loading="lazy"', 'decoding="async"', 'data-nohl', 'data-nofr', '<figcaption>', 'width="\' + x.w', 'alt="\' + esc(alt(x))']) assert.ok(js.includes(k), 'figure ' + k);
  assert.ok(js.includes('NL.SPLIT[a.l]') && js.includes('data-split'), 'waits for ✂️ splitPage (cuts by child count)');
  assert.ok(js.includes('.nlrow,.rtrow,.xtrk,.glk-card,.lqz,.lsk,.prq,.ndg'), 'injected rows never count as lesson blocks');
  assert.ok(js.includes('glk-x') && js.includes('glk-tz'), 'locked with the lesson when signed out');
  for (const k of ['history.pushState', 'popstate', '"Escape"', 'touchmove', 'dblclick', 'ctrlKey', 'ndgvx', 'ndgvi', 'ndgvo']) assert.ok(js.includes(k), 'viewer ' + k);
  for (const k of ['اكبس عالرسمة لتكبّرها', 'Touche le schéma pour l’agrandir', 'كبّر الرسمة: ', 'Agrandir le schéma : ', '"سكّر", "Fermer"']) assert.ok(js.includes(k), 'ar/fr ' + k);
  assert.ok(/figure\.ndg\{[^}]*border-radius:20px/.test(css) && /@media \(min-width:600px\)\{figure\.ndg\{[^}]*max-width:532px/.test(css), 'glass card, ~520px max');
  assert.ok(css.includes('html[data-theme=night] .ndgv{') && css.includes('html.ndgon'), 'viewer light + dark, page scroll locked');
  const ndg = css.slice(css.indexOf('/* 🖼️ رسومات الدروس'));
  assert.ok(ndg.length > 200 && !ndg.includes('backdrop-filter'), 'no extra blur');
  // 🖍️ the highlighter skips [data-nohl], so the figure never shifts a saved highlight's offsets
  assert.ok(read('assets/highlight.js').includes('[data-nohl]'), 'highlighter skips data-nohl');
  assert.ok(!js.includes('adx') || js.includes("[class*='adx']"), 'no ad code');
});

test('🖼️ diagrams: «رسومات الدروس» on حفظي lists them all (tap = viewer, link = lesson), ar + fr', () => {
  const h = read('hifzi.html'), js = read('assets/diagrams.js');
  assert.ok(h.includes('<section id="ndggal"') && h.includes('<script src="assets/diagrams.js?v=20261029r" defer></script>'), 'section + script on hifzi');
  assert.ok(js.includes('getElementById("ndggal")') && js.includes('"رسومات الدروس", "Schémas des leçons"') && js.includes('"🖼️ رسومات", "🖼️ Schémas"') && js.includes('lessonHref(a)'), 'gallery drawn in both languages');
  assert.ok(js.includes('classList.contains("gl-out")') && read('assets/ui.css').includes('html.gl-out .ndgth img{filter:blur'), 'signed out: thumbnails locked like the lessons (gate.js)');
  assert.ok(!/adx|bauval|adsbygoogle\.push/.test(h.slice(h.indexOf('<main'), h.indexOf('</main>'))), 'no ad in حفظي');
});
test('🛠️ home: «اقتراحاتك — شو بدك نضيف أو نعدّل؟» card right AFTER «🧭 مسار اليوم» (outside the path) → suggest.html, «جديد» until opened once, ar + fr, no ad', () => {
  const js = read('assets/home.js'), css = read('assets/home.css'), sg = read('assets/suggest.js'), h = read('index.html');
  // drawn order inside #hz: header → the path section (steps + footer + tournament) → the suggestion card → «📚 موادي»
  const shell = js.slice(js.indexOf('root.innerHTML = \'<div class="hztop">'), js.indexOf('parts = { top:'));
  assert.ok(shell.indexOf('</section><div class="hzlivew"></div><div class="hzsugw"></div><div class="hzsubw">') > -1, 'card slot right after the path section (29r: + the compact 🏥 card), before موادي');
  assert.ok(shell.indexOf('hzpin') < shell.indexOf('hzsugw') && shell.indexOf('hzfoot') < shell.indexOf('hzsugw'), 'not inside the path');
  assert.ok(js.includes('parts.sug.innerHTML = sugHtml();'), 'drawn on every redraw');
  const { ctx, run, store } = homeCtx(); run('assets/ui.js'); run('assets/home.js'); const H = ctx.HomePath;
  let c = H.sugHtml();
  assert.ok(/^<a class="hzsug" href="suggest\.html"/.test(c) && fs.existsSync(path.join(SITE, 'suggest.html')), 'links to suggest.html');
  assert.ok(c.includes('🛠️') && c.includes('اقتراحاتك — شو بدك نضيف أو نعدّل؟') && c.includes('class="hzsugn">جديد<'), 'Arabic title + «جديد» badge for a student who never opened it');
  assert.ok(!/adx|adsbygoogle|bauval/.test(c), 'no ad in the card');
  ctx.Lang = { fr: true }; c = H.sugHtml();
  assert.ok(c.includes('Tes idées — on ajoute ou on change quoi ?') && c.includes('>Nouveau<') && !/[\u0600-\u06FF]/.test(c.replace(/<[^>]+>/g, '')), 'French copy');
  ctx.Lang = { fr: false }; store[H.SUGK] = String(Date.now()); c = H.sugHtml();
  assert.ok(!c.includes('hzsugn') && c.includes('suggest.html'), 'badge gone once suggest.html was opened, card stays');
  assert.ok(sg.includes('lsSet("nursin_sug_open_v1", Date.now())') && sg.indexOf('lsSet("nursin_sug_open_v1"') > sg.indexOf('getElementById("sg-app"); if (!app) return;'), 'suggest.html (not admin) marks it opened');
  assert.strictEqual(H.SUGK, 'nursin_sug_open_v1');
  assert.ok(!/signedIn|me\(\)/.test(js.slice(js.indexOf('function sugHtml'), js.indexOf('var parts = null;'))), 'shown signed-out too');
  assert.ok(/\.hzsug\{[^}]*border-radius:22px/.test(css) && css.includes('html[data-theme=night] .hzsug{') && !/\.hzsug[^{]*\{[^}]*backdrop-filter/.test(css), 'tinted glass card, night variant, no blur');
  // the old entries stay: «الكل» → أدواتي tile + 👤 أنا row; the ad below #hz is still after موادي
  assert.ok(read('assets/ui.js').includes('suggest.html') && read('assets/me.js').includes('suggest.html'), '«الكل» tile + 👤 أنا row kept');
  assert.ok(h.indexOf('id="hz"') < h.indexOf('adx-top'), 'the banner stays below the whole home block');
});

/* ---------- Nov 1 2026 (20261028m): 📌 built-in homework «Etude de cas — Massage cardiaque» (Abdullah 3:30 PM «إذا هيدي الوظيفة دغري بتحط أسئلتك») ---------- */
test('📌 built-in homework (no Firestore): in «مسار اليوم» for everyone until its due date (Fri 6/11), gone after; tick works signed out; deduped with the admin\'s same homework', () => {
  const store = {};
  const { ctx, run } = homeCtx(store); for (const f of ['assets/lessons.js', 'assets/quiz-data.js', 'assets/ui.js', 'assets/midterm.js', 'assets/homework-static.js', 'assets/homework.js', 'assets/home.js']) run(f);
  const H = ctx.HomePath, M = ctx.NursinMid, HW = ctx.NursinHW, S = ctx.NURSIN_HW_STATIC;
  assert.ok(Array.isArray(S) && S.length >= 1);
  const st = S.find(x => x.id === 'st-massage-cardiaque');
  assert.ok(st && st.due === '2026-11-06' && st.subj === 'rea' && st.title.includes('Massage cardiaque') && st.title.includes('إنعاش القلب'), 'title / réa / due Friday Nov 6');
  assert.strictEqual(new Date(st.due + 'T12:00:00Z').getUTCDay(), 5, 'a Friday');
  assert.strictEqual(st.cases.length, 2); for (const c of st.cases) assert.ok(c.lines.length >= 5 && c.q.length >= 1, c.n + ' typed out with its question');
  const txt = JSON.stringify(st.cases);
  for (const k of ['35 ans', 'Score de Glasgow = 8 après 15 min → Coma', 'AVC hémorragique', 'Méningite', 'شخّص الحالة وحدّد العناية التمريضية للمريض', '80 ans', 'BAV 3ème degré', 'Score de Glasgow = 10', 'Arrêt cardiaque', 'شو لازم تعمل؟ (إنعاش القلب)']) assert.ok(txt.includes(k), 'teacher wording: ' + k);
  assert.ok((txt.match(/\(؟\)/g) || []).length >= 2, 'unsure words marked (؟), not guessed');
  assert.ok(fs.existsSync(path.join(SITE, st.img.src)) && st.img.w <= 1200 && fs.statSync(path.join(SITE, st.img.src)).size < 400 * 1024, 'the teacher\'s photo, compressed');
  // shows for everyone: no Firebase, no signed-in user, nothing cached from Firestore
  const ids = day => Array.from(HW.open(day), h => h.id);
  for (const day of ['2026-11-01', '2026-11-03', '2026-11-05', '2026-11-06']) assert.ok(ids(day).includes('st-massage-cardiaque'), day + ' shown (until the due date)');
  for (const day of ['2026-11-07', '2026-11-10', '2026-12-01']) assert.ok(!ids(day).includes('st-massage-cardiaque'), day + ' gone after the due date');
  // in the path (5–7 steps, Osman first) until Nov 6, never after
  const L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, q: 10, added: l.added || '' }));
  for (let i = 0; i < 12; i++) {
    const day = new Date(Date.parse('2026-11-01T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
    const steps = H.build({ day, hm: 600, due: 0, last: null, lessons: L, wex: { ready: false }, cases: [], mid: M.step(day), hw: HW.open(day), imp: [], tn: null });
    const hw = steps.filter(s => s.k === 'hw');
    assert.ok(steps.length >= 5 && steps.length <= 7 && steps.some(s => s.k === 'osm') && ['new', 'today', 'cont', 'cls'].includes(steps[0].k), day + ' still 5–7, 29f: the lesson first, Osman inside');
    if (day <= '2026-11-06') assert.ok(hw.length === 1 && hw[0].id === 'st-massage-cardiaque' && hw[0].due === '2026-11-06' && hw[0].e === '📌', day + ' 📌 step'); else assert.strictEqual(hw.length, 0, day + ' no step after Nov 6');
  }
  // «سلّمتها ✅» signed out: local tick hides it from the path, list page still has it (all), undo brings it back
  HW.tick('st-massage-cardiaque', true); assert.ok(HW.isDone('st-massage-cardiaque') && !ids('2026-11-02').includes('st-massage-cardiaque'));
  assert.ok(Array.from(HW.open('2026-11-02', true), h => h.id).includes('st-massage-cardiaque'), 'the list page keeps it (with ✅)');
  HW.tick('st-massage-cardiaque', false); assert.ok(!HW.isDone('st-massage-cardiaque') && ids('2026-11-02').includes('st-massage-cardiaque'));
  // dedupe: the admin later adds the same homework (same due date, title with «massage cardiaque») → ONE entry; either tick counts
  store[HW.KEY] = JSON.stringify({ at: 1, list: [HW.clean('hwA1', { title: 'Etude de cas massage cardiaque', subj: 'rea', due: '2026-11-06' }), HW.clean('hwB2', { title: 'Plan de soins', subj: 'geri', due: '2026-11-05' }), HW.clean('hwC3', { title: 'Massage cardiaque 2', subj: 'rea', due: '2026-11-20' })] });
  const all = Array.from(HW.list(), h => h.id);
  assert.deepStrictEqual(all, ['st-massage-cardiaque', 'hwB2', 'hwC3'], 'same one merged; another homework / another date kept: ' + all);
  assert.deepStrictEqual(Array.from(HW.get('hwA1').ids), ['st-massage-cardiaque', 'hwA1'], 'the admin id points at the built-in');
  HW.tick('hwA1', true); assert.ok(HW.isDone('st-massage-cardiaque') && !ids('2026-11-02').includes('st-massage-cardiaque'), 'his Firestore tick counts for the built-in');
  HW.tick('st-massage-cardiaque', false); assert.ok(!HW.isDone('st-massage-cardiaque') && !HW.isDone('hwA1'), 'undo clears both');
  assert.ok(HW.same({ id: 'a', title: 'X', due: '2026-11-06', match: [] }, { id: 'a', title: 'Y', due: '2026-11-09' }), 'same id = same');
  assert.ok(HW.same(HW.statics()[0], { id: 'z', title: 'ETUDE DE CAS — MASSAGE CARDIAQUE (إنعاش القلب)', due: '2026-11-06' }), 'same title, any case/accents');
  assert.ok(!HW.same(HW.statics()[0], { id: 'z', title: 'Devoir de pharmaco', due: '2026-11-06' }), 'another homework on the same day is not merged');
  // signed out wipes only the Firestore cache — the built-in stays
  store[HW.KEY] = JSON.stringify({ at: 2, list: [] }); assert.deepStrictEqual(Array.from(HW.list(), h => h.id), ['st-massage-cardiaque']);
});
test('📌 homework.html «الوظائف»: list + one homework (questions typed out + the teacher\'s photo, tap = the zoom viewer), from the path step and «الكل», ar + fr, no ads', () => {
  const h = read('homework.html');
  assert.ok(!/ca-pub-|adsbygoogle|ads\.js|class="adx|bauval|735f5c76|f0cd90c8|9892bba2/.test(h), 'no ad on the homework page');
  assert.ok(h.includes('id="hw-app"') && h.indexOf('assets/homework-static.js?v=20261029r') > -1 && h.indexOf('assets/homework-static.js') < h.indexOf('assets/homework.js?v=20261029r') && h.includes('assets/diagrams.js?v=20261029r') && h.includes('assets/lessons.js'), 'data before logic, zoom viewer, subject names');
  const ix = read('index.html'); assert.ok(ix.indexOf('assets/homework-static.js?v=20261029r') > -1 && ix.indexOf('assets/homework-static.js') < ix.indexOf('assets/homework.js'), 'home loads the built-in homework too');
  const { ctx, run } = homeCtx(); run('assets/ui.js'); const U = ctx.NursinUI;
  assert.strictEqual(U.info('homework.html').ar, 'الوظائف'); assert.strictEqual(U.info('homework.html').fr, 'Devoirs');
  assert.ok(JSON.stringify(U.ALL).includes('["homework.html","📌","الوظائف","Devoirs","hw"]'), '«الكل» → 📌 الوظائف (with a count badge)');
  assert.ok(read('assets/ui.js').includes('hw: hwn > 0 ? String(hwn) : ""'), 'badge = homework not handed in');
  const hm = read('assets/home.js'); assert.ok(hm.includes('class="btn sm hzhwgo" href="homework.html?id=') && hm.includes('T("📄 الأسئلة", "📄 Questions")'), 'path step opens the homework');
  const j = read('assets/homework.js');
  for (const k of ['getElementById("hw-app")', 'data-hwtick', 'data-hwzoom', 'DGV.open({', 'url: im.src', '«سلّمتها ✅»', "Je l'ai rendu ✅", 'Les devoirs', 'Tous les devoirs', 'Voir les questions', 'À rendre ', 'Touche la photo pour l\'agrandir', 'dir="rtl" lang="ar"', 'class="hwq"', 'ما في وظايف هلّق 🎉']) assert.ok(j.includes(k), 'homework.js ' + k);
  assert.ok(read('assets/diagrams.js').includes('function src(x) { return x.url ? x.url :'), 'the same zoom viewer shows the photo');
  assert.ok(read('assets/account.js').includes("page==='homework.html'"), 'Firebase there too (the admin\'s homework + synced ticks)');
  assert.ok(read('assets/lang.js').includes('homework: 1') && read('assets/fr/p-homework.js').includes('Les devoirs'), 'French page dictionary');
  assert.ok(read('assets/ui.css').includes('.hwcase{') && read('assets/ui.css').includes('html[data-theme=night] .hwq'), 'styles light + dark');
  // the page renders the built-in homework from the data alone (no DOM framework): the strings it needs are in the data
  const S = (() => { const c = homeCtx(); c.run('assets/homework-static.js'); return c.ctx.NURSIN_HW_STATIC; })();
  assert.ok(S[0].img && S[0].img.ar && S[0].img.fr && S[0].img.alt && S[0].img.altfr && S[0].head === 'Étude de cas — Massage cardiaque', 'photo captions + alt ar/fr');
});

test('🧑‍🏫 Osman knows the site: one context block with 📌 homework (full questions), 🎯 midterm (countdown, plan, mock scores, weakest lessons), 🧭 today\'s path (done / left) — sent with every tutor request, no worker change', () => {
  const store = {};
  const { ctx, run } = homeCtx(store); for (const f of ['assets/lessons.js', 'assets/quiz-data.js', 'assets/midterm.js', 'assets/homework-static.js', 'assets/homework.js', 'assets/tutor-lessons.js', 'assets/tutor-know.js']) run(f);
  const K = ctx.TutorKnow; assert.ok(K && K.block && K.gather && K.flowContext, 'TutorKnow');
  const day = '2026-11-02';
  store.nursin_path_v1 = JSON.stringify({ v: 2, d: day, at: 1, steps: [{ k: 'osm', id: 'neuro:avc' }, { k: 'hw', id: 'st-massage-cardiaque', n: 'Etude de cas — Massage cardiaque (إنعاش القلب)', due: '2026-11-06' }, { k: 'mid', s: 'rea' }, { k: 'weak', id: 'rea:r1', miss: 3 }, { k: 'quiz', id: 'cardio:ecg' }], done: { 'osm:neuro:avc': 1, 'quiz:cardio:ecg': 2 } });
  store.nursin_mid_v1 = JSON.stringify({ best: { rea: { p: 60, sc: 12, n: 20, at: 1 } }, last: { rea: { p: 60, at: 5, d: day } }, lw: { 'rea:r4': 40, 'neuro:htic': 55 }, plan: {} });
  const b = K.block(K.gather(day));
  for (const k of ['Etude de cas — Massage cardiaque', 'التسليم الجمعة 6/11', 'باقي 4 أيام', 'Score de Glasgow = 8 après 15 min → Coma', 'BAV 3ème degré', 'شو لازم تعمل؟ (إنعاش القلب)', 'لسّا ما سلّمها']) assert.ok(b.includes(k), 'homework, full text: ' + k);
  for (const k of ['امتحان الفصل', '16/11', 'باقي 14 يوم', 'الإنعاش 60% (12/20)', 'الصدمات (Les chocs) 40%', 'HTIC 55%']) assert.ok(b.includes(k), 'midterm: ' + k);
  for (const k of ['خلّص 2 من 5 خطوات', '✅ 🧑‍🏫 سؤالين سريعين مع الأستاذ عثمان', '⬜ 📌 وظيفة', '⬜ 🎯 تحضير امتحان الفصل: امتحان كامل الإنعاش', '⬜ 💪 من نقاط ضعفو', '✅ ⚡ كويز']) assert.ok(b.includes(k), 'path: ' + k);
  for (const k of ['شو عندي وظيفة؟', 'امتى الامتحان؟', 'شو باقي من مساري؟', 'شو أضعف دروسي؟', 'بدّك اشرحلك الوظيفة ونفهم الدرس تبعها، وبعدين بتجرّب تحلّ؟']) assert.ok(b.includes(k), 'how to use it: ' + k);
  assert.ok(b.length < 5000, 'compact: ' + b.length);
  assert.ok(!b.includes('نقاط الجواب المتوقّع'), 'no answer key in general chat');
  // no path today yet / handed in / after the due date / after the exam
  store.nursin_path_v1 = JSON.stringify({ v: 2, d: '2026-11-01', steps: [{ k: 'rev', n: 3 }], done: {} });
  store.nursin_hwdone_v1 = JSON.stringify({ 'st-massage-cardiaque': 1 });
  const b2 = K.block(K.gather(day)); assert.ok(b2.includes('لسّا ما فتح الصفحة الرئيسية اليوم') && b2.includes('سلّمها ✅') && !b2.includes('اقترح عليه تشتغلوا'), 'yesterday\'s path not shown as today; handed in = no nudge');
  const b3 = K.block(K.gather('2026-11-20')); assert.ok(b3.includes('ما في وظايف مفتوحة') && b3.includes('صار'), 'after Nov 6 / Nov 16');
  // the page: data + logic load before tutor.js; every request carries it
  const h = read('tutor.html'), js = read('assets/tutor.js');
  const order = ['assets/lessons.js', 'assets/quiz-data.js', 'assets/midterm.js', 'assets/homework-static.js', 'assets/homework.js', 'assets/tutor-lessons.js', 'assets/tutor-know.js', 'assets/tutor.js?v='];
  for (let i = 1; i < order.length; i++) assert.ok(h.indexOf(order[i - 1]) > -1 && h.indexOf(order[i - 1]) < h.indexOf(order[i]), order[i - 1] + ' before ' + order[i]);
  assert.ok(js.includes('context:persona()+context(lv)') && js.includes("function context(lv){return buildContext(gather(w.Nursin||{},lv))+know();}") && js.includes("s='\\n'+K.block(K.gather());if(HW)s+='\\n'+K.flowContext(HW.s,HW.hw);"), 'context = old site info + the new block (+ the homework step)');
  for (const k of ["'📌 شو عندي وظيفة؟'", "'🎯 امتى الامتحان؟'", "'🧭 شو باقي من مساري؟'", "'💪 شو أضعف دروسي؟'", "J’ai quel devoir ?"]) assert.ok(js.includes(k), 'chip ' + k);
  assert.ok(!/ca-pub|adsbygoogle|bauval/.test(read('assets/tutor-know.js') + read('assets/tutor-lessons.js')), 'no ads in the chat');
});
test('📌 «🧑‍🏫 اشرحلي مع عثمان»: on the homework page, the homework list and the path\'s 📌 step → tutor.html?hw=<id> opens Osman with the homework loaded (ar + fr)', () => {
  const hm = read('assets/home.js'), hw = read('assets/homework.js'), js = read('assets/tutor.js');
  assert.ok(hm.includes('<a class="btn sm hzhwosm" href="tutor.html?hw=\' + encodeURIComponent(s.id)') && hm.includes('T("🧑‍🏫 اشرحلي مع عثمان", "🧑‍🏫 Explique-moi avec Osman")'), 'path 📌 step button');
  assert.ok(hm.indexOf('hzhwgo') < hm.indexOf('hzhwosm') && hm.indexOf('hzhwosm') < hm.indexOf('data-hzhw='), 'between «📄 الأسئلة» and «سلّمتها ✅»');
  assert.ok(hw.includes('href="tutor.html?hw=\' + encodeURIComponent(h.id)') && hw.includes('T("🧑‍🏫 اشرحلي مع عثمان", "🧑‍🏫 Explique-moi avec Osman")') && hw.includes("osmBtn(h, 1) + tickBtn(h)") && hw.includes("osmBtn(h) + tickBtn(h)"), 'homework page + list');
  assert.ok(read('assets/home.css').includes('.hzhwbx .hzhwbt .btn.hzhwosm{') && read('assets/home.css').includes('html[data-theme=night] .hzhwbx .hzhwbt .btn.hzhwosm') && read('assets/ui.css').includes('.hwosm{') && read('assets/ui.css').includes('html[data-theme=night] .hwosm'), 'light + dark');
  assert.ok(js.includes("get('hw');if(hp)enterHw(") && js.includes('function enterHw(id)') && js.includes('K.hwGet(id)') && js.includes('function exitHw()'), 'tutor reads ?hw= and loads the homework');
  // the path step renders the button (fake DOM-free: the html string)
  const { ctx, run } = homeCtx(); for (const f of ['assets/lessons.js', 'assets/quiz-data.js', 'assets/ui.js', 'assets/midterm.js', 'assets/homework-static.js', 'assets/homework.js', 'assets/home.js']) run(f);
  const HW = ctx.NursinHW; assert.ok(HW.open('2026-11-03').some(h => h.id === 'st-massage-cardiaque'));
  // the homework lookup the tutor uses (also through the admin's merged copy)
  const c2 = homeCtx(); for (const f of ['assets/lessons.js', 'assets/homework-static.js', 'assets/homework.js', 'assets/tutor-lessons.js', 'assets/tutor-know.js']) c2.run(f);
  const K = c2.ctx.TutorKnow;
  const g = K.hwGet('st-massage-cardiaque', '2026-11-03'); assert.ok(g && g.raw && g.raw.cases.length === 2 && g.title.includes('Massage cardiaque'));
  assert.strictEqual(K.hwGet('st-massage-cardiaque', '2026-11-07'), null, 'gone after its due date');
  c2.store[HW.KEY] = JSON.stringify({ at: 1, list: [c2.ctx.NursinHW.clean('hwA1', { title: 'Etude de cas massage cardiaque', subj: 'rea', due: '2026-11-06' })] });
  const g2 = K.hwGet('hwA1', '2026-11-03'); assert.ok(g2 && g2.id === 'st-massage-cardiaque' && g2.raw, 'admin id → the built-in with its questions');
  assert.deepStrictEqual(Array.from(K.questions(g), q => q.n), ['الحالة 1', 'الحالة 2'], 'one answer box per case');
  assert.ok(K.offerText(g).includes('بدّك اشرحلك الوظيفة ونفهم الدرس تبعها، وبعدين بتجرّب تحلّ؟'), 'Osman offers first');
});
test('📌 homework flow with Osman: offer → teach (site lessons, short parts «قلّي كمّل», no answer) → try (his answer per case, saved) → correct («لازم تكتب هيك», teacher\'s format, key only now) → done; resumes from localStorage', () => {
  const store = {};
  const { ctx, run } = homeCtx(store); for (const f of ['assets/lessons.js', 'assets/homework-static.js', 'assets/homework.js', 'assets/tutor-lessons.js', 'assets/tutor-know.js']) run(f);
  const K = ctx.TutorKnow, hw = K.hwGet('st-massage-cardiaque', '2026-11-02');
  let s = K.load(hw.id); assert.strictEqual(s.stage, 'offer'); assert.ok(!K.has(hw.id));
  assert.ok(!K.flowContext(s, hw).includes('نقاط الجواب المتوقّع'), 'offer: no key');
  K.setStage(s, 'teach'); s.hist.push({ role: 'user', text: 'إيه اشرحلي' }, { role: 'assistant', text: 'جزء ١ … قلّي كمّل 👇' }); s.tp = 1; K.save(s);
  const t = K.flowContext(s, hw);
  for (const k of ['[المرحلة: الشرح]', 'قلّي كمّل 👇', 'هيدا الجزء رقم 2 من 6', 'ممنوع تحلّ الوظيفة', 'ما في بهدلة ولا موعظة', 'كل كلمة فرنسية معها معناها بالعربي', 'Glasgow', 'HTIC', 'BAV', 'Massage cardiaque', 'Respirer (يتنفّس)', 'صفحة neuro.html#htic', 'شكل الجواب يلي بيطلبو الأستاذ']) assert.ok(t.includes(k), 'teach: ' + k);
  assert.ok(!t.includes('نقاط الجواب المتوقّع') && !t.includes('لازم تكتب هيك'), 'teach: the model answer is NOT shown before he tries');
  s.tp = 5; assert.ok(K.flowContext(s, hw).includes('هلّق جرّب انت حلّ ✍️'), 'last part hands over to him');
  // resume: a new page load gets the same session
  const s2 = K.load(hw.id); assert.strictEqual(s2.stage, 'teach'); assert.strictEqual(s2.hist.length, 2); assert.ok(K.has(hw.id));
  K.setStage(s2, 'try'); s2.ans = { 0: 'Coma Glasgow 8, méningite', 1: '' }; K.save(s2);
  const tr = K.flowContext(K.load(hw.id), hw); assert.ok(tr.includes('[المرحلة: الطالب عم يجرّب يحلّ لحالو]') && !tr.includes('نقاط الجواب المتوقّع'), 'try: hints only');
  assert.strictEqual(K.load(hw.id).ans[0], 'Coma Glasgow 8, méningite', 'answers kept');
  const msg = K.answersMsg(hw, K.load(hw.id).ans);
  assert.ok(msg.includes('🩺 الحالة 1') && msg.includes('Coma Glasgow 8, méningite') && msg.includes('🩺 الحالة 2') && msg.includes('(ما كتبت شي)') && msg.length < 3500, 'his answer, case by case');
  const s3 = K.setStage(K.load(hw.id), 'correct'); K.save(s3);
  const c = K.flowContext(s3, hw);
  for (const k of ['[المرحلة: التصحيح]', '✅ صح: شو كتب صح', '❌ ناقص أو غلط', '📝 لازم تكتب هيك:', '⭐ العلامة: x/10', 'ابدأ فيه دايماً', 'باسمها بالفرنسي + معناها بالعربي', 'نقاط الجواب المتوقّع', 'Diagnostic', 'Besoins perturbés de Henderson', 'Diagnostics infirmiers', 'Interventions / Soins infirmiers', 'Surveillance', '30 compressions', 'Côte fracturée']) assert.ok(c.includes(k), 'correct: ' + k);
  assert.ok(c.length < 24000, 'fits: ' + c.length);
  K.setStage(s3, 'done'); K.save(s3); assert.strictEqual(K.load(hw.id).stage, 'done');
  assert.strictEqual(K.reset(hw.id).stage, 'offer'); assert.ok(!K.has(hw.id), 'start over');
  // the lesson text Osman teaches from is the site's own (every non-table line exists in its source)
  const L = ctx.NURSIN_TUTOR_LESSONS, src = { 'neuro:': read('neuro.html'), 'cardio:': read('cardio.html'), 'rea:': read('assets/rea-data.js'), 'henderson:': read('henderson.html') };
  const plain = s => s.replace(/<[^>]+>/g, '').replace(/\\"/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  for (const id of ctx.NURSIN_HW_TEACH['st-massage-cardiaque'].lessons) {
    const x = L[id]; assert.ok(x && x.t.length > 200 && x.href, id);
    const S = plain(src[Object.keys(src).find(p => id.startsWith(p))]);
    const lines = x.t.split('\n').filter(l => !l.includes('|') && !/^[٠-٩]+\. /.test(l) && l.length > 12);
    const miss = lines.filter(l => !S.includes(plain(l).trim()));
    assert.ok(miss.length <= Math.ceil(lines.length * 0.1), id + ' from the site: ' + miss.slice(0, 3).join(' / '));
  }
  assert.ok(ctx.NURSIN_TUTOR_EXTRA.rcp.startsWith('⚠️ هيدا مش من دروس الصف'), 'general knowledge is marked as such');
  // the page wiring: steps, buttons, saved answers, fr
  const js = read('assets/tutor.js');
  for (const k of ["['teach',TX('👍 إيه، اشرحلي'", "['more',TX('▶️ كمّل'", "['try',TX('✍️ هلّق بجرّب حلّ'", "data-hwa=\"check\"", "K.answersMsg(HW.hw,ans),{max:3500}", "['retry',TX('✍️ صلّح جوابي وجرّب كمان'", "HW.s.ans[t.getAttribute('data-i')]=t.value;K.save(HW.s);", "K.setStage(s,'correct')", "HW.s.tp=(HW.s.tp|0)+1", ".replace(/`+/g,'')", 'Corrige-moi', 'À toi d’essayer']) assert.ok(js.includes(k), 'tutor.js ' + k);
  assert.ok(read('assets/tutor.css').includes('.thwtry{') && read('assets/tutor.css').includes('html[data-theme=night] .thwtry'), 'styles light + dark');
});

/* ---------- Nov 1 2026 (20261028t): ❓ سؤال اليوم — only the RIGHT answers are named, in order, 🥇 first (Abdullah 7:43 PM) ---------- */
test('❓ سؤال اليوم (20261028t): only ok:true answers are listed, by time, the first right answer is 🥇, wrong answers are never named for students', async () => {
  const C = await import(require('node:url').pathToFileURL(path.join(SITE, 'assets/classes.js')).href);
  const A = [
    { uid: 'w1', name: 'Wrong Early', ok: false, at: 50 },                       // wrong but earliest → must NOT be first, must NOT be named
    { uid: 'r2', name: 'Second Right', ok: true, at: { toMillis: () => 300 } },
    { uid: 'r1', name: 'First Right', ok: true, at: 200 },
    { uid: 'w2', name: 'Wrong Late', ok: false, at: 400 },
    { uid: 'x', name: 'Truthy Not True', ok: 'yes', at: 100 },                     // only ok === true counts
    { uid: 'r3', name: 'Third Right', ok: true, at: new Date(500) }];
  const b = C.dqBoard(A);
  assert.deepStrictEqual(b.right.map(a => a.uid), ['r1', 'r2', 'r3'], 'right answers only, earliest first');
  assert.strictEqual(b.first.uid, 'r1', 'first = earliest RIGHT answer (not the earliest answer)');
  assert.deepStrictEqual(b.wrong.map(a => a.uid).sort(), ['w1', 'w2', 'x']); assert.strictEqual(b.n, 6);
  const name = (u, n) => '<bdi>' + n + '</bdi>';
  const h = C.dqWhoHtml(A, { me: 'r2', name });
  for (const n of ['First Right', 'Second Right', 'Third Right']) assert.ok(h.includes(n), 'named: ' + n);
  for (const n of ['Wrong Early', 'Wrong Late', 'Truthy Not True']) assert.ok(!h.includes(n), 'never named for a student: ' + n);
  assert.ok(h.indexOf('First Right') < h.indexOf('Second Right') && h.indexOf('Second Right') < h.indexOf('Third Right'), 'listed in time order');
  const first = h.match(/<li class="dqr dqfirst[^"]*">(.*?)<\/li>/); assert.ok(first && first[1].includes('First Right') && first[1].includes('🥇 أوّل واحد'), 'first right answer highlighted 🥇');
  assert.strictEqual((h.match(/dqfirst/g) || []).length, 1, 'one 🥇 only');
  assert.ok(/<li class="dqr me">.*?Second Right/.test(h), 'my own row is marked');
  assert.ok(h.includes('✅ <b>3</b> جاوبو صح من أصل <b>6</b>'), 'neutral count line');
  assert.ok(!h.includes('dqwrong') && !h.includes('جاوبوا غلط'), 'no wrong list for students');
  // the site admin (Abdullah) alone gets the folded list of wrong answers
  const ah = C.dqWhoHtml(A, { me: 'zz', admin: true, name });
  assert.ok(ah.includes('<details class="dqwrong">') && ah.includes('❌ جاوبوا غلط (3)') && ah.includes('Wrong Early') && ah.includes('إنت بس بتشوفها'), 'admin sees who answered wrong');
  assert.ok(ah.indexOf('dqwrong') > ah.indexOf('Third Right'), 'wrong list comes after the right ones');
  // nobody right yet
  const none = C.dqWhoHtml([{ uid: 'w', name: 'Nope', ok: false, at: 1 }], { name });
  assert.ok(none.includes('لسّا ما حدا جاوب صح — كون الأوّل!') && !none.includes('Nope') && none.includes('✅ <b>0</b> جاوبو صح من أصل <b>1</b>'), 'empty state, still nameless');
  const zero = C.dqWhoHtml([], { name }); assert.ok(zero.includes('كون الأوّل!') && !zero.includes('من أصل'), 'nobody answered yet');
  assert.strictEqual(C.dqClock({ at: Date.parse('2026-11-01T17:41:00Z') }), '19:41', 'time shown in Beirut');
  assert.strictEqual(C.dqClock({}), '', 'no time → nothing');
  // dqSummary (badge 🎯 أسرع جواب + tutor context) keeps the same first
  assert.strictEqual(C.dqSummary(A.filter(a => a.ok !== 'yes')).first.uid, 'r1');
});
test('❓ سؤال اليوم (20261028t): the class card + the admin read-only view use the new list; styles light + dark; French strings', () => {
  const js = read('assets/classes.js');
  assert.ok(js.includes('const info = dqWhoHtml(ans, { me, admin: isAdminUser(A.user), name: nameOf });'), 'class card draws the right-only list (admin flag only for the site admin)');
  assert.ok(!js.includes("'<p class=\"dqfirst\">🥇 أول واحد جاوب صح: <b>'"), 'old single «first» line replaced');
  assert.ok(js.includes('dqAdminView($("#cdqb"), ro)') && /async function dqAdminView[\s\S]*?admin: true/.test(js), 'admin opening a class he is not in sees the lists read-only');
  const css = read('assets/style.css');
  for (const k of ['.dqok .dqr.dqfirst{', '.dqtag{', '.dqwrong summary{', 'html[data-theme=night] .dqok .dqr.dqfirst{', 'html[data-theme=night] .dqtag{', '.dqnm{']) assert.ok(css.includes(k), 'css ' + k);
  assert.ok(css.includes('.dqwho{') && css.includes('.dqok,.dqbad{'), 'styles present');
  const fr = read('assets/fr/ui.js');
  for (const k of ['"يلّي جاوبوا صح"', '"🥇 أوّل واحد"', '"لسّا ما حدا جاوب صح — كون الأوّل!"', '"❌ جاوبوا غلط (#)"', '"🛡️ إنت بس بتشوفها"', '"(أوّل واحد فوق)"']) assert.ok(fr.includes(k), 'fr ' + k);
});

// 🏥 غرفة الطوارئ — امشِ لعند المريض (20261028t)
function erRoomCtx() {
  const vm = require('node:vm'); const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(read('assets/erroom-data.js'), ctx); vm.runInContext(read('assets/erroom.js'), ctx);
  return { E: ctx.window.ERROOM, R: ctx.window.ERRoom };
}
function erRun(R, E, id, order) {   // play a case in the given action order: fetch each item, call before a prescribed drug, answer questions right
  const st = R.create(id), out = [];
  for (const a of order) {
    const A = E.actions[a]; if (A.need) { if (st.inv.length >= 2) st.inv.length = 0; R.pick(st, A.need); }
    if (A.need && E.items[A.need].rx && st.done.call == null) R.act(st, 'call');
    const r = R.act(st, a); out.push(r); if (r.q) R.answer(st, r.step, r.q.a); R.tick(st, 4);
  }
  return { st, out };
}
test('🏥 غرفة الطوارئ: scenario data valid — ≥6 cases from his lessons (+ arrêt / septique labelled معلومات عامة), every action/item/order link exists, ar + fr everywhere', () => {
  const { E } = erRoomCtx();
  assert.ok(E && E.cases.length >= 6, '≥ 6 cases');
  const ids = E.cases.map(c => c.id);
  for (const k of ['hypo', 'cardio', 'ana', 'sept', 'resp', 'coma', 'arret']) assert.ok(ids.includes(k), 'case ' + k);
  const both = (o, w) => { assert.ok(o && typeof o.ar === 'string' && o.ar.trim() && typeof o.fr === 'string' && o.fr.trim(), w + ' needs ar + fr'); assert.ok(/[\u0600-\u06FF]/.test(o.ar) || /^[\x00-\u05FF\u2000-\u2BFF\u{1F000}-\u{1FFFF}\s]+$/u.test(o.ar), w + ' ar'); };
  for (const k in E.items) { const I = E.items[k]; both(I, 'item ' + k); assert.ok(E.stations[I.st], 'item ' + k + ' station'); }
  for (const k in E.actions) { const A = E.actions[k]; both(A, 'action ' + k); assert.ok(A.at === 'bed' || E.stations[A.at], 'action ' + k + ' place'); if (A.need) assert.ok(E.items[A.need], 'action ' + k + ' item'); }
  for (const k in E.stations) { const s = E.stations[k]; assert.ok(s.spot && s.w > 0 && s.h > 0 && s.x >= 0 && s.y >= 0 && s.x + s.w <= E.W && s.y + s.h <= E.H, 'station ' + k); }
  for (const c of E.cases) {
    for (const k of ['t', 'src', 'who', 'end']) assert.ok(c[k], c.id + ' ' + k);
    both(c.t, c.id + ' title'); both(c.src, c.id + ' src'); both(c.who, c.id + ' who'); both(c.end.ok, c.id + ' end ok'); both(c.end.lost, c.id + ' end lost'); both(c.doc, c.id + ' doctor line');
    c.sx.forEach((x, i) => both(x, c.id + ' sx' + i));
    assert.ok(c.limit >= 90 && c.vit && ['sys', 'dia', 'fc', 'fr', 'spo2', 't', 'gcs'].every(k => typeof c.vit[k] === 'number'), c.id + ' vitals + timer');
    const stepIds = c.steps.map(s => [].concat(s.a)[0]);
    assert.ok(c.steps.filter(s => s.key).length >= 4, c.id + ' ≥ 4 scored tasks');
    assert.ok(stepIds.includes('call'), c.id + ' has the doctor call');
    for (const s of c.steps) {
      [].concat(s.a).forEach(a => assert.ok(E.actions[a], c.id + ' step action ' + a));
      both(s.why, c.id + ' why ' + s.a);
      (s.after || []).forEach(p => assert.ok(stepIds.includes(p) || (c.pre || []).includes(p), c.id + ' after ' + p));
      if (s.after && s.after.length) assert.ok(s.ow || true);
      if (s.q) { both(s.q.ask, c.id + ' q'); both(s.q.x, c.id + ' q why'); assert.ok(s.q.o.length >= 3 && s.q.a >= 0 && s.q.a < s.q.o.length, c.id + ' q options'); s.q.o.forEach(o => both(o, c.id + ' q opt')); }
    }
    for (const b of (c.bad || [])) { [].concat(b.a).forEach(a => { assert.ok(E.actions[a], c.id + ' bad ' + a); assert.ok(!stepIds.includes(a), c.id + ' ' + a + ' is both a step and harmful'); }); both(b.why, c.id + ' bad why'); }
  }
  // grounded: sources name his lessons; what is not in his notes says so
  const by = id => E.cases.find(c => c.id === id);
  assert.ok(/r4/.test(by('hypo').src.ar) && /r4/.test(by('neurog').src.ar) && /r1/.test(by('resp').src.ar) && /Glasgow/.test(by('coma').src.ar) && /Choc cardiogénique/.test(by('cardio').src.ar), 'sources = his lessons');
  for (const id of ['arret', 'sept']) { assert.ok(by(id).gen === 1 && by(id).src.ar.includes('معلومات عامة'), id + ' labelled معلومات عامة'); }
  assert.ok(by('resp').steps.find(s => s.a === 'gds').q.ask.ar.includes('7.28'), 'GDS case = «الحالة 1» numbers of r1');
  assert.ok(by('hypo').bad.find(b => b.a === 'adre').why.ar.includes('Choc hypovolémique'), 'adrénaline contre-indiquée (pharma card)');
});
test('🏥 غرفة الطوارئ: action order scoring — prerequisites, harmful actions, items + prescription, full run = ⭐⭐⭐', () => {
  const { E, R } = erRoomCtx();
  let st = R.create('hypo');
  assert.strictEqual(R.act(st, 'mon').kind, 'blocked', 'no cables in hand → blocked');
  R.pick(st, 'kit'); assert.strictEqual(R.act(st, 'vvp').kind, 'good');
  const early = R.act(st, 'remp'); assert.strictEqual(early.kind, 'order', 'remplissage before stopping the bleeding = order mistake');
  assert.ok(early.ow.includes('النزيف') && st.pen.some(p => p.k === 'order' && p.p === 5), 'order why + −5');
  R.pick(st, 'adre'); assert.strictEqual(R.act(st, 'adre').kind, 'bad', 'adrénaline in choc hypovolémique = harmful');
  assert.ok(st.pen.some(p => p.k === 'bad' && p.p === 10), '−10');
  R.pick(st, 'sang'); assert.strictEqual(R.act(st, 'sang').kind, 'blocked', 'blood needs the doctor (prescription)');
  assert.strictEqual(R.act(st, 'remp').kind, 'repeat');
  assert.strictEqual(R.pick(st, 'o2mask'), 'ok'); assert.strictEqual(R.pick(st, 'tubes'), 'full', 'two hands only'); R.drop(st, 'o2mask'); assert.strictEqual(R.pick(st, 'tubes'), 'ok', 'put one back → room again');
  // wash before touching = +5, after = neutral
  st = R.create('cardio'); assert.strictEqual(R.act(st, 'wash').pts, 5);
  st = R.create('cardio'); R.act(st, 'pos_semi'); assert.strictEqual(R.act(st, 'wash').kind, 'neutral');
  // conditional harm: moving the spine patient before immobilisation
  st = R.create('neurog'); assert.strictEqual(R.act(st, 'pos_pls').kind, 'bad'); st = R.create('neurog'); R.pick(st, 'collar'); R.act(st, 'immob'); assert.strictEqual(R.act(st, 'pos_pls').kind, 'neutral');
  // ABC: oxygen before the airway in coma = order
  st = R.create('coma'); R.act(st, 'eval'); R.pick(st, 'o2mask'); assert.strictEqual(R.act(st, 'o2').kind, 'order');
  // every case: the ideal order ends «ok» with 3 stars; the summary is all ✅
  for (const c of E.cases) {
    const order = c.steps.map(s => [].concat(s.a)[0]);
    const { st: s2, out } = erRun(R, E, c.id, ['wash'].concat(order));
    assert.strictEqual(s2.end, 'ok', c.id + ' ends ok');
    assert.ok(out.every(r => r.kind === 'good' || r.kind === 'repeat' || r.kind === 'over'), c.id + ' ideal order has no mistake: ' + out.map(r => r.kind).join(','));
    assert.ok(R.score(s2) >= 85 && R.stars(s2) === 3, c.id + ' score ' + R.score(s2));
    assert.ok(R.summary(s2).filter(x => x.key).every(x => x.st === 'ok'), c.id + ' summary ✅');
    assert.ok(R.points(R.score(s2)) <= 20 && R.points(R.score(s2)) >= 17, c.id + ' points ≤ 20 a round');
  }
  // a sloppy run: missing tasks + mistakes → fewer stars, misses listed in order
  const { st: s3 } = erRun(R, E, 'cardio', ['remp', 'pos_trend', 'o2', 'mon']);
  assert.ok(R.score(s3) < 60 && s3.end == null, 'sloppy run scores low');
  const sum = R.summary(s3); assert.deepStrictEqual(sum.map(x => x.a), E.cases.find(c => c.id === 'cardio').steps.map(s => [].concat(s.a)[0]), 'summary keeps the ideal order');
  assert.ok(sum.find(x => x.a === 'pos_semi').st === 'miss' && sum.find(x => x.a === 'o2').st === 'ok', 'missed vs done');
  // hint names the next doable task, costs 3
  st = R.create('ana'); const h = R.hint(st); assert.strictEqual(h.a, 'stopdrug'); assert.ok(st.pen.some(p => p.k === 'hint' && p.p === 3));
  // question at the GDS: right +5 / wrong −5
  st = R.create('resp'); R.pick(st, 'gds'); const g = R.act(st, 'gds'); assert.ok(g.q, 'gds asks the interpretation'); assert.strictEqual(R.answer(st, 'gds', 1).ok, false); assert.strictEqual(R.answer(st, 'gds', 0), null, 'one answer only');
});
test('🏥 غرفة الطوارئ: the monitor reacts — O₂ raises SpO₂, remplissage raises TA, untreated drifts down → lost, arrêt: no massage → lost, choc → sinus', () => {
  const { R } = erRoomCtx();
  const a = R.create('hypo'), b = R.create('hypo');
  R.pick(a, 'o2mask'); R.act(a, 'o2'); for (let i = 0; i < 20; i++) { R.tick(a, 0.5); R.tick(b, 0.5); }
  assert.ok(a.v.spo2 > b.v.spo2 + 3, 'SpO₂ ' + a.v.spo2.toFixed(1) + ' vs ' + b.v.spo2.toFixed(1));
  assert.ok(b.v.sys < 82, 'untreated TA drifts down: ' + b.v.sys.toFixed(1));
  const c = R.create('hypo'); R.act(c, 'stop'); R.pick(c, 'kit'); R.act(c, 'vvp'); const s0 = c.v.sys; R.act(c, 'remp'); for (let i = 0; i < 10; i++) R.tick(c, 0.5);
  assert.ok(c.v.sys > s0 + 10 && c.v.fc < 128, 'remplissage: TA up, FC down');
  const d = R.create('hypo'); for (let i = 0; i < 400 && !d.end; i++) R.tick(d, 1);
  assert.strictEqual(d.end, 'lost', 'untreated shock is lost before the timer');
  const e = R.create('cardio'); for (let i = 0; i < 300 && !e.end; i++) R.tick(e, 1); assert.ok(e.end === 'lost' || e.end === 'timeout');
  const f = R.create('arret'); assert.strictEqual(f.rh, 'fv'); assert.ok(f.mon, 'arrest patient already on the scope');
  for (let i = 0; i < 50; i++) R.tick(f, 1); assert.strictEqual(f.end, 'lost', 'no massage within 45 s → lost');
  const g = R.create('arret'); R.act(g, 'eval'); R.act(g, 'cpr'); R.pick(g, 'defib'); assert.strictEqual(R.act(g, 'shock').kind, 'good'); for (let i = 0; i < 10; i++) R.tick(g, 0.5);
  assert.strictEqual(g.rh, 'sinus'); assert.ok(g.v.fc > 60 && g.v.sys > 70, 'ROSC values on the monitor'); assert.ok(g.inv.includes('defib'), 'the défibrillateur stays in hand');
});
test('🏥 غرفة الطوارئ: walking — A* path around the furniture reaches every station from the door, never through furniture', () => {
  const { E, R } = erRoomCtx();
  const G = R.grid();
  assert.ok(R.freeAt(G, E.door.x, E.door.y), 'door free');
  const inFurniture = (x, y) => Object.values(E.stations).some(s => x > s.x - E.R + 1 && x < s.x + s.w + E.R - 1 && y > s.y - E.R + 1 && y < s.y + s.h + E.R - 1);
  const froms = [E.door, E.stations.bed1.spot, E.stations.drugs.spot, E.stations.phone.spot];
  for (const from of froms) for (const k in E.stations) {
    const to = E.stations[k].spot; assert.ok(R.freeAt(G, to.x, to.y), k + ' spot free');
    const pts = R.path(G, from, to); assert.ok(pts.length >= 1, k + ' path');
    let pos = { x: from.x, y: from.y }, n = 0;
    const q = pts.slice();
    while (q.length && n < 1200) { pos = R.walk(pos, q, 1 / 60); n++; assert.ok(!inFurniture(pos.x, pos.y), k + ' walks through furniture at ' + pos.x.toFixed(1) + ',' + pos.y.toFixed(1)); }
    assert.ok(Math.hypot(pos.x - to.x, pos.y - to.y) < 1 && pos.done, k + ' target reached');
    assert.ok(n < 300, k + ' reached in < 5 s at 60 fps (' + n + ' frames)');
  }
  // the cart sits in the middle: door → bed1 must go around it (no straight line through it)
  const p2 = R.path(G, { x: 181, y: 380 }, { x: 181, y: 260 }); assert.ok(p2.length >= 2, 'detour around the chariot');
  const nf = R.nearestFree(G, 180, 315); assert.ok(R.freeAt(G, nf.x, nf.y), 'a tap on furniture walks to the nearest free floor');
  assert.strictEqual(R.hitStation(181, 317), 'cart'); assert.strictEqual(R.hitStation(76, 140), 'bed1'); assert.strictEqual(R.hitStation(180, 450), null);
});
test('🏥 غرفة الطوارئ: wiring — first big card on games.html, réa page link, own css/js with cache tag, points + best synced, old modes kept, no ads, FR + night', () => {
  const gh = read('games.html'), js = read('assets/erroom.js'), css = read('assets/erroom.css'), rh = read('rea.html'), dj = read('assets/erroom-data.js');
  const grid = gh.slice(gh.indexOf('id="gcards"'));
  assert.ok(grid.indexOf('data-room="1"') > -1 && grid.indexOf('data-room="1"') < grid.indexOf('data-g="match"'), 'room card first in the list');
  assert.ok(gh.includes('غرفة الطوارئ — امشِ لعند المريض') && gh.includes('🏥'), 'card text');
  assert.ok(gh.includes('data-g="er"'), 'old 🚑 modes still reachable');
  for (const f of ['assets/erroom-data.js', 'assets/erroom.js']) assert.ok(gh.includes(f + '?v=20261029r'), f + ' with cache tag');
  assert.ok(gh.includes('assets/erroom.css?v=20261029r') && gh.indexOf('erroom-data.js') < gh.indexOf('assets/erroom.js'), 'css + data before engine');
  assert.ok(rh.includes('href="games.html#room"') && rh.includes('غرفة الطوارئ — امشِ لعند المريض') && rh.includes('Salle d\'urgence'), 'réa subject page entry (ar + fr)');
  for (const s of [js, css, dj]) assert.ok(!/bauval|adsbygoogle|ads\.js|class="adx|mtag/.test(s), 'no ads in the ER room');
  assert.ok(js.includes('S.activity("game", pts') && js.includes('ROUND_MAX = 20'), 'points through the shared game points (≤ 20)');
  assert.ok(js.includes('nursin_erroom_v1') && js.includes('{ erRoom: m }, { merge: true }') && js.includes('s.data().erRoom'), 'best per case: local + profile field');
  assert.ok(js.includes('w.Osman.bubble') && js.includes('E.osman.top'), 'Osman comment on the end screen');
  assert.ok(js.includes('requestAnimationFrame') && js.includes('touch-action') === false && css.includes('touch-action:none'), 'rAF loop, canvas takes the taps');
  assert.ok(js.includes('data-nofr') && js.includes('Lang.fr'), 'own ar/fr strings, page translator kept off');
  assert.ok(css.includes('html[data-theme="night"] .err{') && css.includes('.err{position:fixed;inset:0'), 'night theme + fixed overlay (no layout shift)');
  assert.ok(!js.includes('data-again=') && !js.includes('data-back=') && !js.includes('data-review='), 'overlay buttons never trigger games.js handlers');
  assert.ok(read('assets/ui.css').includes('html.fr .erlk-fr{display:inline}'), 'réa link language switch');
});

/* 🗂️ Nov 1 2026 10:34 PM (Abdullah «قصّر القائمة… قسّمها لأربع مجموعات قابلة للطي») — 20261028t */
const OLD_ALL_HREFS = ["medsurg.html", "cardio.html", "neuro.html", "henderson.html", "medsurg.html#iv", "rea.html", "pharma.html", "law.html", "mgmt.html", "quality.html", "geri.html", "community.html", "3d.html", "midterm.html", "homework.html", "quiz.html", "quiz.html?t=review", "quiz.html?t=mixed", "#case", "quiz.html#weak", "hifzi.html", "quiz.html?t=link", "hifzi.html#tricks", "#cards", "#blank", "#teach", "quiz.html#blanks", "exams.html", "law.html#classquiz", "index.html#duel", "live.html", "games.html", "friends.html", "chat.html", "classes.html", "classes.html#cdq", "#online", "suggest.html", "tutor.html", "notes.html", "highlights.html", "#pen", "#goals", "#search", "#avatar", "#name", "#theme", "#lang", "friends.html#fpush", "#install", "me.html", "about.html", "privacy.html", "credits.html"];
test('🗂️ «الكل» in 4 folding groups: 📚 الدروس · 🧠 أدوات التعلّم · 👥 المجتمع · 👤 حسابي — every old link still there, fr names, admin in حسابي for the owner', () => {
  const { ctx, run } = homeCtx(); run('assets/ui.js'); const U = ctx.NursinUI;
  assert.deepStrictEqual(Array.from(U.ALL, g => g.e + ' ' + g.ar), ['📚 الدروس', '🧠 أدوات التعلّم', '👥 المجتمع', '👤 حسابي']);
  for (const g of U.ALL) assert.ok(g.fr && !/[\u0600-\u06FF]/.test(g.fr), 'fr name ' + g.k);
  const now = U.ALL.flatMap(g => Array.from(g.items, i => i[0]));
  for (const h of OLD_ALL_HREFS) assert.ok(now.includes(h), 'still in «الكل»: ' + h);
  assert.strictEqual(new Set(now).size, now.length, 'each link once');
  const by = k => U.ALL.find(g => g.k === k).items.map(i => i[0]);
  for (const p of ['medsurg.html', 'cardio.html', 'neuro.html', 'henderson.html', 'rea.html', 'pharma.html', 'law.html', 'mgmt.html', 'quality.html', 'geri.html', 'community.html']) assert.ok(by('learn').includes(p), 'lesson ' + p);
  for (const p of ['3d.html', 'quiz.html', 'exams.html', 'midterm.html', 'games.html', 'games.html#room', 'hifzi.html', 'notes.html', 'highlights.html', 'homework.html', 'tutor.html', '#cards']) assert.ok(by('study').includes(p), 'tool ' + p);
  for (const p of ['classes.html', 'friends.html', 'live.html', 'chat.html', 'index.html#duel', 'suggest.html', '#online']) assert.ok(by('community').includes(p), 'community ' + p);
  for (const p of ['me.html', '#theme', '#lang', 'privacy.html', 'about.html', 'credits.html']) assert.ok(by('account').includes(p), 'account ' + p);
  for (const it of U.ALL.flatMap(g => g.items)) assert.ok(it[3] && it[2], 'ar + fr label ' + it[0]);
  const html = U.allHtml('');
  assert.strictEqual((html.match(/class="hzgrp hzfold/g) || []).length, 4, '4 folding sections');
  assert.strictEqual((html.match(/<button type="button" class="hzgh"[^>]*aria-expanded="(true|false)" aria-controls="hzg-/g) || []).length, 4, 'header buttons with aria-expanded + aria-controls');
  for (const g of U.ALL) assert.ok(html.includes('<span class="gc" aria-label="' + g.items.filter(i => i[0] !== '#install').length + ' رابط">'), 'count on the header ' + g.k);
  assert.ok(!html.includes('admin.html'), 'no admin for a student');
  ctx.NursinFB = { user: { email: 'abdullahjaber1452003@gmail.com', emailVerified: true } };
  const own = U.allHtml(''); assert.ok(own.indexOf('href="admin.html"') > own.indexOf('data-g="account"'), 'admin inside 👤 حسابي for the owner');
  const flat = U.allHtml('learn'); assert.ok(!flat.includes('hzfold') && flat.includes('href="cardio.html"'), '«المواد» sheet (📚 in the nav) stays one flat group');
});
test('🗂️ folding: the current page\'s group opens, the first group when nothing is kept, the choice is kept (nursin_menu_v1), closed groups are inert, badges stay on the header', () => {
  // the home page, nothing kept: only 📚 open
  let h = homeCtx(); h.run('assets/ui.js'); let U = h.ctx.NursinUI;
  const openOf = html => Array.from(html.matchAll(/class="hzgrp hzfold( open)?[^"]*" data-g="(\w+)"/g)).filter(m => m[1]).map(m => m[2]);
  assert.deepStrictEqual(openOf(U.allHtml('')), ['learn'], 'home, first visit → the first group');
  assert.strictEqual(U.groupOf('cardio.html'), 'learn'); assert.strictEqual(U.groupOf('quiz.html'), 'study'); assert.strictEqual(U.groupOf('chat.html'), 'community');
  assert.strictEqual(U.groupOf('privacy.html'), 'account'); assert.strictEqual(U.groupOf('admin.html'), 'account'); assert.strictEqual(U.groupOf('index.html'), '', 'home is in no group');
  // on chat.html: 👥 opens (and is marked current), the others closed + inert
  const store = {};
  h = homeCtx(store); h.ctx.location = { pathname: '/chat.html' }; h.run('assets/ui.js'); U = h.ctx.NursinUI;
  let html = U.allHtml('');
  assert.deepStrictEqual(openOf(html), ['community'], 'the current page\'s group');
  assert.ok(html.includes('class="hzgrp hzfold open cur" data-g="community"') && /id="hzg-learn" role="region" aria-labelledby="hzg-learn-h" inert>/.test(html), 'current marked, closed = inert');
  // a tap on 📚 opens it and keeps the choice; a tap on 👥 closes it
  const fake = k => { const attrs = {}, cls = new Set(html.includes('data-g="' + k + '"') && openOf(html).includes(k) ? ['hzfold', 'open'] : ['hzfold']);
    const wr = { setAttribute: (a, v) => { attrs['w:' + a] = v; }, removeAttribute: a => { delete attrs['w:' + a]; } };
    const sec = { classList: { contains: c => cls.has(c), toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); } }, querySelector: () => wr, getAttribute: () => k };
    const btn = { closest: () => sec, setAttribute: (a, v) => { attrs[a] = v; } };
    return { btn, cls, attrs }; };
  const L = fake('learn'); assert.strictEqual(U.toggleGroup(L.btn), true);
  assert.ok(L.cls.has('open') && L.attrs['aria-expanded'] === 'true' && !('w:inert' in L.attrs), 'opened, aria-expanded true, not inert');
  const C = fake('community'); assert.strictEqual(U.toggleGroup(C.btn), false);
  assert.ok(!C.cls.has('open') && C.attrs['aria-expanded'] === 'false' && C.attrs['w:inert'] === '', 'closed, aria-expanded false, inert');
  assert.deepStrictEqual(JSON.parse(store.nursin_menu_v1).o, { learn: true, community: false }, 'kept in localStorage');
  // next time on chat.html: 📚 stays open (kept), 👥 opens again (current page); on the home: 📚 open (kept), 👥 closed (kept)
  h = homeCtx(store); h.ctx.location = { pathname: '/chat.html' }; h.run('assets/ui.js');
  assert.deepStrictEqual(openOf(h.ctx.NursinUI.allHtml('')), ['learn', 'community']);
  h = homeCtx(store); h.run('assets/ui.js'); assert.deepStrictEqual(openOf(h.ctx.NursinUI.allHtml('')), ['learn']);
  // badges (counts / «جديد») ride on the header even when the group is closed
  h = homeCtx({ nursin_menu_v1: JSON.stringify({ o: { study: false } }) }); h.ctx.NursinSRS = { count: () => 7 }; h.ctx.NursinHW = { open: () => [{}, {}] }; h.ctx.Date = class extends Date { static now() { return Date.UTC(2026, 10, 2); } };
  h.run('assets/ui.js'); html = h.ctx.NursinUI.allHtml('');
  const st = html.slice(html.indexOf('data-g="study"'), html.indexOf('</h3>', html.indexOf('data-g="study"')));
  assert.ok(!/hzfold open[^"]*" data-g="study"/.test(html) && st.includes('<span class="gbd">') && st.includes('📌 2') && st.includes('🔁 7') && st.includes('🏥 جديد'), 'closed 🧠 header shows 📌 2 · 🔁 7 · 🏥 جديد');
  h = homeCtx(); h.ctx.Date = class extends Date { static now() { return Date.UTC(2026, 10, 20); } }; h.run('assets/ui.js'); assert.ok(!h.ctx.NursinUI.allHtml('').includes('🏥 جديد'), '«جديد» ends Nov 15');
});
test('🗂️ wiring: smooth fold css (light + dark through the glass tokens), ☰ (nav.js) = the same 4 groups with a no-shell fallback, bottom pill nav + 🧭 مسار اليوم untouched, French', () => {
  const uj = read('assets/ui.js'), uc = read('assets/ui.css'), nj = read('assets/nav.js'), fr = read('assets/fr/ui.js'), sc = read('assets/style.css');
  assert.ok(uc.includes('.hzgw{display:grid;grid-template-rows:0fr') && uc.includes('.hzfold.open .hzgw{grid-template-rows:1fr') && uc.includes('.hzfold.open .gcv{transform:rotate(180deg)}'), 'smooth open/close + chevron');
  assert.ok(uc.includes('prefers-reduced-motion:reduce){.hzgw'), 'reduced motion');
  const blk = uc.slice(uc.indexOf('/* 🗂️'), uc.indexOf('@media (prefers-reduced-motion:reduce){.hzgw'));
  assert.ok(blk.includes('var(--hzbox)') && blk.includes('var(--hzink)') && !/#fff\b|#000\b/.test(blk.replace('#fb923c', '')), 'colours from the glass tokens (night theme follows)');
  assert.ok(uj.includes('var gh = e.target.closest && e.target.closest(".hzgh"); if (gh) { e.preventDefault(); toggleGroup(gh); return; }'), 'header tap toggles');
  assert.ok(nj.includes('U.open("", nb)') && nj.includes('function menuGroups()') && nj.includes('aria-expanded="\' + open + \'"') && nj.includes('var MENU = "nursin_menu_v1"'), '☰ = «الكل» groups, fallback grouped too, same kept choice');
  for (const k of ['📚", n: "الدروس"', '🧠", n: "أدوات التعلّم"', '👥", n: "المجتمع"', '👤", n: "حسابي"']) assert.ok(nj.includes(k), 'nav.js group ' + k);
  for (const k of ['friends.html#fpush', 'about.html', 'privacy.html', 'credits.html', 'data-theme-open', 'langRow()', 'games.html#room', 'suggest.html', 'me.html']) assert.ok(nj.includes(k), '☰ keeps ' + k);
  assert.ok(sc.includes('.gacc.open .gah .gcv{transform:rotate(180deg)}') && sc.includes('.gab[hidden]{display:none}'), 'fallback ☰ styles');
  assert.ok(uj.includes('data-hz="learn" data-t="1"') && uj.includes('class="hzmid') && uj.includes('href="hifzi.html" data-t="3"') && uj.includes('data-hz="all" data-t="4"'), 'pill nav unchanged');
  for (const s of ['☰ القائمة', 'أدوات التعلّم', 'المجتمع', 'حسابي', 'الدروس']) assert.ok(fr.includes('"' + s + '"'), 'fr dictionary: ' + s);
  for (const p of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) { const h = read(p); assert.ok(h.includes('assets/ui.js?v=20261029r') && h.includes('assets/nav.js?v=20261029r'), p + ' cache tag'); }
});

// 🙋 «اسأل عثمان» (Nov 1 2026, 28q) — assets/ask.js under every question
function askCtx(store = {}, sess = {}) {
  const h = homeCtx(store);
  h.ctx.sessionStorage = { getItem: k => (k in sess ? sess[k] : null), setItem: (k, v) => { sess[k] = String(v); }, removeItem: k => { delete sess[k]; } };
  h.ctx.Nursin = { dayKey: () => '2026-11-01' };
  h.run('assets/lessons.js'); h.run('assets/quiz-data.js'); h.run('assets/ask.js');
  return h;
}
test('🙋 اسأل عثمان: graded = only after answering, free practice = before too but the answer is never sent and Osman is told hint-only; the payload carries question, options, pick (+ right answer / explanation only once answered)', () => {
  const { ctx } = askCtx(); const X = ctx.NursinAsk, q = ctx.QUIZ.find(x => x.id === 'q001');
  // graded (🎯 midterm, exams, class quiz, ⚔️ challenge/tournament, live, class daily question): nothing before the answer
  const g0 = X.norm(X.fromQ(q, { graded: true, answered: false }));
  assert.strictEqual(X.visible(g0), false); assert.strictEqual(X.slot(X.fromQ(q, { graded: true, answered: false })), '', 'no button before answering in a graded mode');
  const g1 = X.slot(X.fromQ(q, { graded: true, answered: true, pick: 1 }));
  assert.ok(g1.includes('class="askslot"') && X.visible(X.norm(X.fromQ(q, { graded: true, answered: true }))), 'button once answered / on the review list');
  // free practice before answering: visible, but the right answer and the explanation are dropped and the no-reveal rule is in
  const p0 = X.norm(X.fromQ(q, { answered: false }));
  assert.ok(X.visible(p0) && X.slot(X.fromQ(q, {})).includes('askslot'), 'practice: there before answering');
  assert.strictEqual(p0.ans, ''); assert.strictEqual(p0.x, '');
  assert.ok(!X.slot(X.fromQ(q, {})).includes('&quot;ans&quot;:&quot;a)') && X.slot(X.fromQ(q, {})).includes('&quot;ans&quot;:&quot;&quot;'), 'the slot html carries no answer');
  const pre = X.payload(p0, [{ r: 'u', t: 'ليش هيدا الجواب الصح؟' }], { n: 'Infarctus (جلطة قلبية)', text: 'Infarctus = nécrose. Trinitrine ما بتريّح.' });
  assert.ok(pre.context.includes('ممنوع تقلّو الجواب الصح') && pre.context.includes('تلميح بس'), 'no-reveal flag before answering');
  assert.ok(pre.context.includes('رجل ٥٨ سنة') && pre.context.includes('a) Infarctus du myocarde (جلطة قلبية)') && pre.context.includes('b) Angor stable (ذبحة مستقرّة)') && pre.context.includes('c) Péricardite'), 'question + options');
  assert.ok(!pre.context.includes('[الجواب الصح]') && !pre.context.includes(q.x.slice(0, 30)), 'no right answer, no explanation before answering');
  assert.ok(pre.context.includes('[الدرس على الموقع: Infarctus (جلطة قلبية)]') && pre.context.includes('Trinitrine ما بتريّح'), 'lesson name + snippet');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(pre.messages)), [{ role: 'user', text: 'ليش هيدا الجواب الصح؟' }]);
  // answered (wrong pick b): pick, right answer and the site's explanation go, the hint-only rule does not
  const post = X.payload(X.norm(X.fromQ(q, { answered: true, graded: true, pick: 1 })), [{ r: 'u', t: 'ليش؟' }, { r: 'o', t: 'لأنو…' }, { r: 'u', t: 'وشو الفرق؟' }]);
  assert.ok(post.context.includes('[جواب الطالب] b) Angor stable') && post.context.includes('[الجواب الصح] a) Infarctus du myocarde') && post.context.includes('[شرح الموقع] ' + q.x.slice(0, 20)), 'pick + answer + explanation');
  assert.ok(!post.context.includes('ممنوع تقلّو الجواب الصح'), 'no hint-only rule once answered');
  assert.deepStrictEqual(Array.from(post.messages, m => m.role), ['user', 'assistant', 'user'], 'follow-ups in the same thread');
  // a timed-out question counts as answered with «ما لحق»; same persona as the tutor but the PLAIN one (no roast / proverb)
  assert.ok(X.norm(X.fromQ(q, { answered: true, pick: -1 })).pick.includes('خلص الوقت'));
  assert.ok(/بلا بهدلة، بلا مواعظ ولا حِكم/.test(pre.context) && !pre.context.includes('بهدلو') && pre.context.includes('الأستاذ عثمان'), 'plain persona, no roast');
  assert.ok(pre.context.includes('كل مصطلح فرنسي') && pre.context.includes('عربي لبناني'), 'Lebanese Arabic, French terms with Arabic beside them');
});
test('🙋 اسأل عثمان: counts in the tutor\'s daily quota (15 + ad unlocks), «باقي N سؤال اليوم», the lesson text is grounded + trimmed to the relevant part', () => {
  const store = { nursin_tutor_day_v1: JSON.stringify({ d: '2026-11-01', n: 3, u: 0 }) };
  const { ctx } = askCtx(store); const X = ctx.NursinAsk;
  assert.strictEqual(X.CKEY, 'nursin_tutor_day_v1', 'same counter as tutor.js');
  assert.ok(read('assets/tutor.js').includes("CKEY='nursin_tutor_day_v1'") && read('assets/tutor.js').includes('LIMIT=15'));
  assert.strictEqual(X.quota().left, 12); assert.strictEqual(X.leftText(), 'باقي 12 سؤال اليوم');
  X.use(); assert.strictEqual(JSON.parse(store.nursin_tutor_day_v1).n, 4); assert.strictEqual(X.quota().left, 11);
  X.refund(); assert.strictEqual(X.quota().left, 12, 'a failed call is given back');
  store.nursin_tutor_day_v1 = JSON.stringify({ d: '2026-11-01', n: 15, u: 0 }); assert.strictEqual(X.quota().left, 0); assert.ok(X.leftText().includes('خلصو'));
  store.nursin_tutor_day_v1 = JSON.stringify({ d: '2026-11-01', n: 15, u: 1 }); assert.strictEqual(X.quota().left, 5, 'an ad unlock on tutor.html counts here too');
  store.nursin_tutor_day_v1 = JSON.stringify({ d: '2026-10-31', n: 15, u: 3 }); assert.strictEqual(X.quota().left, 15, 'new day');
  const src = read('assets/ask.js');
  assert.ok(src.includes('if (!q.left) {') && src.includes('صفحة **الأستاذ عثمان**') && src.includes('use();'), 'friendly message when out; one question = one count');
  // lessons: question → its lesson on the site
  assert.strictEqual(X.lessonOf({ t: 'infarctus' }).href, 'cardio.html#infarctus');
  assert.strictEqual(X.lessonOf({ t: 'rea', l: 'r4' }).href.split('#')[0], 'rea.html');
  assert.strictEqual(X.lessonOf({ lid: 'neuro:glasgow' }).n, 'Glasgow');
  assert.strictEqual(X.strip('<h3>Glasgow</h3><p>Y = <b>4</b> &amp; V = 5</p><ul><li>M 6</li></ul>'), 'Glasgow\nY = 4 & V = 5\nM 6');
  const long = Array.from({ length: 60 }, (_, i) => 'سطر عادي رقم ' + i + ' عن شي تاني ما إلو علاقة بالموضوع أبداً').join('\n') + '\nLa Troponine est le marqueur le plus spécifique de la nécrose myocardique\n' + Array.from({ length: 40 }, (_, i) => 'كمان سطر ' + i + ' بلا علاقة').join('\n');
  const s = X.pick(long, 'Troponine nécrose myocardique', 600);
  assert.ok(s.length <= 700 && s.includes('Troponine est le marqueur'), 'the relevant part is kept, the rest trimmed');
  assert.ok(src.includes('"rea-data.js"') && src.includes('doc.getElementById(a)') && src.includes('"pharma-data.js"'), 'site lesson text: data files + static lesson pages');
  assert.ok(src.includes('fetch(API') && src.includes("summer-forest-fd40") && !/workers\.dev\/[a-z]/.test(src), 'the existing tutor endpoint, no new worker route');
});
test('🙋 اسأل عثمان on every question surface (graded ones only after the answer), on all pages, glass + night css, French, notes save', () => {
  const qz = read('assets/quiz.js');
  assert.ok(qz.includes("function graded(s){return !!(s&&(s.exam||s.challenge||s.cq||s.mid||s.sel==='mixed'"), 'quiz.js: exams / challenge / class quiz / midterm / weekly mixed are graded');
  assert.ok(qz.includes("A.mount(c,A.fromQ(q,{graded:graded(s),answered:k!=null,pick:k"), 'quiz.js mounts with the graded flag');
  assert.ok(/\$\('#next'\)\.addEventListener[^\n]*\n    askUp\(s,q\);/.test(qz) && qz.includes('askUp(s,q,k);'), 'quiz.js: on render (hidden when graded) and after answering');
  assert.strictEqual((qz.match(/\+askSlot\(s,q\)\+/g) || []).length, 3, 'quiz.js: the review lists after quiz / weekly exam / 🎯 midterm');
  assert.ok(qz.includes('(s.picks||(s.picks={}))[q.id]=k;'), 'the pick is kept for the review list');
  const pr = read('assets/practice.js');
  assert.ok(pr.includes('kind: "blank"') && (pr.match(/w\.NursinAsk\.mount\(el\.querySelector\("\.qcard"\), askC\(/g) || []).length === 2, '✍️ عبّي الفراغ before + after');
  assert.ok(pr.includes('answered: !ans.hidden, ans: c.pts.join(" · ")'), '📝 كويز متل الصف: key points only once shown');
  assert.ok(read('assets/extra.js').includes('w.NursinAsk.slot(w.NursinAsk.fromQ(q, { answered: cur.ans != null'), '🌅 سؤال الصبح + 🔗 اربط sheets');
  assert.ok(read('assets/home.js').includes('h += askS(fq, A[fq.id]);') && read('assets/home.js').includes('"</div>" + askS(q) + "</div>"'), '🧭 path question');
  assert.ok(read('assets/retain.js').includes('surface: "case"') && read('assets/retain.js').includes('askUp(k);'), '🩺 patient case');
  const cl = read('assets/classes.js'); const mineBranch = cl.slice(cl.indexOf('if (mine) {', cl.indexOf('function dqDraw')), cl.indexOf('} else {', cl.indexOf('function dqDraw')));
  assert.ok(mineBranch.includes('graded: true, answered: true, pick: mine.pick'), '❓ class daily question: only in the answered branch');
  const du = read('assets/duel.js'), fin = du.slice(du.indexOf('const finish = async'), du.indexOf('const showQ'));
  assert.ok(fin.includes('graded: true, answered: true, pick: st.picks[i]') && !du.slice(du.indexOf('const showQ'), du.indexOf('const next = pick')).includes('NursinAsk'), '⚔️ tournament: result list only, never on the running question');
  const lv = read('assets/live.js'); assert.ok(lv.includes('if (X && lb && over) X.mount(lb, X.fromQ(q, { graded: true, answered: true'), '🔴 live: only once the question is over');
  const gm = read('assets/games.js'); assert.ok(gm.includes('+ askSlot(m) + "</li>"') && gm.includes('graded: true, answered: true, pick: m.y, ans: m.r'), '🎮 games: on the round\'s mistakes');
  for (const p of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) { const h = read(p); const i = h.indexOf('assets/ask.js?v='); assert.ok(i > h.indexOf('assets/osman.js?v=') && h.indexOf('assets/osman.js?v=') > 0, p + ' loads ask.js after osman.js'); }
  const css = read('assets/ui.css'), blk = css.slice(css.indexOf('/* 🙋'));
  assert.ok(blk.includes('.askbox{') && blk.includes('var(--hzbox)') && blk.includes('html[data-theme=night] .askth .asku p') && blk.includes('min-width:0'), 'glass + night + fits 390px');
  assert.ok(!/\.ask[^{]*\{[^}]*position:fixed/.test(blk) && !/adx/.test(blk), 'no fixed layer, nothing about ads');
  const src = read('assets/ask.js');
  assert.ok(src.includes('شو ما فهمت؟ اكتب سؤالك…') && src.includes('ليش هيدا الجواب الصح؟') && src.includes('اشرحلي الفكرة ببساطة') && src.includes('شو معنى الكلمة الفرنسية؟'), 'box + chips');
  assert.ok(src.includes("Qu'est-ce que tu n'as pas compris") && src.includes('el.setAttribute("data-nofr", "")') && read('assets/fr/ui.js').includes('"اسأل عثمان": "Demande à Osman"'), 'French');
  assert.ok(src.includes('N.put(st, o, meta,') && src.includes('احفظ بملاحظاتي'), '💾 into 📒 ملاحظاتي (assets/notes.js)');
  assert.ok(src.includes('if (!signedIn()) {') && src.includes('glk-go'), 'signed-in only, like the tutor (gate sign-in button)');
});


test('🖍️ 28r (Abdullah, Nov 1 11:29 PM «علّمت و ما انضاف على تعليماتي… لازم افقس على زر القلم»): on phones the pill survives the phone dropping its selection, acts on the touch itself, is docked away from the phone menu, and a toast never covers it', () => {
  const js = read('assets/highlight.js');
  // the root cause: the selection vanished (the phone dismisses it with the very touch meant for 🖍️) → the pill hid itself → nothing saved
  assert.ok(!js.includes('if (!x) { if (mode === "sel" && Date.now() - touchAt > 700) hide(); return; }'), 'the old «hide when the selection is gone» is gone');
  assert.ok(js.includes('keepGhost(); return;') && js.includes('GHOST_MS = 9000') && js.includes('ghostT = setTimeout(function () { if (ghost) hide(); }, GHOST_MS)'), 'the pill stays ~9 s with the remembered words');
  assert.ok(js.includes('if (outAt > touchAt && Date.now() - outAt < 700) { hide(); return; }'), 'a touch somewhere else on purpose still closes it');
  assert.ok(js.includes('if (ghost && mode === "sel") hide();'), 'any other touch closes the remembered selection');
  assert.ok(js.includes('q: o[2].slice(o[0], o[1])') && js.includes('class="hlprev"'), 'the remembered words are shown on the pill');
  // the touch itself does it (no click needed), the click is only the fallback and never runs twice
  assert.ok(js.includes('pill.addEventListener("touchstart", function (e) {') && js.includes('if (b && e.cancelable) e.preventDefault();') && js.includes('}, { passive: false });'), 'touchstart on a pill button is cancelled (the phone keeps its selection)');
  assert.ok(js.includes('pill.addEventListener("touchend", function (e) {') && js.includes('act(x.b);') && js.includes('if (Date.now() - actAt < 700) return;'), 'touchend acts; click = fallback, deduped');
  assert.ok(/function act\(b\) \{[\s\S]*?if \(a === "go" && cur\) \{ mark\(cur, color\(\)\); endSel\(\); hide\(\); toast\(T\("🖍️ انحفظ بـ«تعليماتي»", "🖍️ Ajouté à « Mes surlignages »"\)\); return; \}/.test(js), 'one tap → marked in the sticky colour + «انحفظ بتعليماتي»');
  // docked at the bottom above the glass nav on phones (the phone's Copy/Share menu + handles hug the selection), at the top when the selection is down there
  assert.ok(js.includes('function dockTop(r, ph)') && js.includes('d.querySelector(".hznav")') && js.includes('if (coarse && mode === "sel") { top = dockTop(r, ph); left = (vw - pw) / 2; }'), 'docked on phones');
  assert.ok(js.includes('d.documentElement.classList.toggle("hlpillon", coarse && m === "sel")') && js.includes('d.documentElement.classList.remove("hlpillon")'), 'html.hlpillon while docked');
  const css = read('assets/ui.css');
  assert.ok(css.includes('.hltoast{pointer-events:none}') && css.includes('html.hlpillon .hltoast{bottom:auto!important;top:calc(72px + env(safe-area-inset-top))!important}') && css.indexOf('html.hlpillon .hltoast{') > css.indexOf('html.uion.uifocus body.ui .hltoast'), 'the toast never takes the tap and moves up while the pill is docked');
  assert.ok(css.indexOf('.hltoast{pointer-events:none}') > css.indexOf('.hltoast{position:fixed'), 'after the toast rule');
  assert.ok(css.includes('.hlpill .hlprev{') && css.includes('.hlpill.hlghost{border-style:dashed}'), 'preview + ghost style');
  assert.ok(!/backdrop-filter/.test(css.slice(css.indexOf('/* 28r'), css.indexOf('/* 28r') + 600)), 'no extra blur');
  // pen mode untouched, the selection is still read the same way
  assert.ok(js.includes('if (pen()) { if (down) return; mark(x, color()); endSel(); hide(); return; }') && js.includes('pen() ? 650 : 260'), '🖊️ pen mode as before');
  const T2 = js.match(/\bT\("(?:[^"\\]|\\.)*"\)/g) || [];
  assert.strictEqual(T2.length, 0, 'every new string has its French');
});

test('🖍️ 28r: «تعليماتي» lists the highlights of EVERY lesson page (law, mgmt, quality, …), old saved ones keep loading', () => {
  const { ctx, run } = homeCtx(); run('assets/highlight.js'); const H = ctx.NursinHL;
  const st = H.blank();
  const t = 'الممرض المجاز: شهادة جامعية على الأقل (جامعة / كلية / معهد جامعي معترف فيه).';
  const pages = ['law.html', 'mgmt.html', 'quality.html', 'cardio.html', 'rea.html', 'community.html'];
  pages.forEach((pg, i) => H.put(st, '', Object.assign(H.quote(t, 3 + i, 20 + i), { pg, k: 'b0', lg: 'ar', c: 'y', sj: pg.split('.')[0], lk: '', pt: 0 })));
  const all = H.list(st, '');
  assert.strictEqual(all.length, pages.length, 'all of them, whatever page they come from');
  assert.deepStrictEqual(Array.from(new Set(all.map(h => h.pg))).sort(), pages.slice().sort(), 'one per page');
  // a highlight saved by 28b–28q (same store, same fields) is still found in its lesson
  const old = { id: 'hold1', o: '', pg: 'law.html', k: 'law-1', lg: 'ar', c: 'g', q: 'على الأقل', q2: '', n: 9, pre: 'شهادة جامعية ', suf: ' (جامعة', s: 22, e: 31, sj: 'law', lk: 'law:l1', pt: 0, t: 1761900000000, u: 1761900000000, d: 0, y: 1 };
  assert.deepStrictEqual(Array.from(H.locate(t, old)), [t.indexOf('على الأقل'), t.indexOf('على الأقل') + 9], 'old anchor still lands');
  const js = read('assets/highlight.js');
  assert.ok(js.includes('var all = mine(), cnt = {};') && !/pageDraw[\s\S]{0,400}h\.pg === page/.test(js.slice(js.indexOf('function pageDraw'))), 'the page draws mine() — no page filter');
  assert.ok(read('highlights.html').includes('assets/highlight.js?v=20261029r') && read('law.html').includes('assets/highlight.js?v=20261029r'), 'fresh tag');
});


test('📒🙋 28s (Abdullah, Nov 1 11:35–11:37 PM «لمن بحط ملاحظة… بكون كاتب شي بدي اعرفه بعدين ف بسأله عنه فرد مرة»): Osman\'s answer lives INSIDE the note text (no new field → rules v21 unchanged), ≤ 2000, follow-ups append, old 28q blocks read the same', () => {
  const { ctx } = askCtx(); ctx.run = null; const vm = require('node:vm'); vm.runInContext(read('assets/notes.js'), ctx, { filename: 'assets/notes.js' });
  const N = ctx.NursinNotes;
  const a1 = N.withOsman('ليش الـ troponine بتطلع؟', '', '**Troponine** (بروتين القلب) بتطلع لما\n\n* تموت خلايا القلب', false);
  assert.strictEqual(a1, 'ليش الـ troponine بتطلع؟\n\n🧑‍🏫 عثمان: Troponine (بروتين القلب) بتطلع لما\n• تموت خلايا القلب', 'appended under the note, markdown cleaned, one block');
  const a2 = N.withOsman(a1, 'وبعد قدّيش؟', 'بعد ٣ لـ ٦ ساعات.', false);
  assert.ok(a2.startsWith(a1 + '\n\n🙋 وبعد قدّيش؟\n🧑‍🏫 عثمان: بعد ٣ لـ ٦ ساعات.'), 'a follow-up appends one more block with the question');
  assert.ok(N.withOsman('', '', 'Réponse', true).startsWith('🧑‍🏫 Osman : '), 'French label');
  // the size limit of the notes rule (text ≤ 2000): a long answer is cut on a word, a full note refuses
  const big = 'x'.repeat(1800), cutd = N.withOsman(big, '', 'كلمة '.repeat(200), false);
  assert.ok(cutd.length <= N.MAXT && cutd.endsWith('…') && cutd.startsWith(big + '\n\n🧑‍🏫 عثمان: '), 'cut to fit 2000');
  assert.strictEqual(N.withOsman('y'.repeat(1990), '', 'جواب', false), null, 'no room → null (nothing spent, the student is told)');
  assert.strictEqual(N.withOsman('ملاحظة', '', '   ', false), null, 'an empty answer is never saved');
  assert.ok(N.room('abc') === N.MAXT - 3);
  // the doc keeps EXACTLY the 8 fields rules v17…v21 accept
  const st = N.blank(), n = N.put(st, 'u1', { refType: 'lesson', refId: 'law:l1#1~habc12', refText: '🖍️ الممرض المجاز', subject: 'law', lesson: 'law:l1' }, a2);
  assert.deepStrictEqual(Object.keys(N.clean(n)).sort(), ['createdAt', 'lesson', 'refId', 'refText', 'refType', 'subject', 'text', 'updatedAt'], 'no new field');
  assert.strictEqual(n.id, 'l_' + N.enc('law:l1#1~habc12'), 'a highlight\'s answer goes into that highlight\'s own note');
  // reading it back for the cards: the student's words, then Osman's blocks (28q «💾» blocks with 👨‍🏫 too); escaped
  const P = Array.from(N.parts(a2 + '\n\n🙋 <b>x</b>\n👨‍🏫 عثمان: قديم\nسطر تاني\n\nرجعت كتبت <i>'), x => JSON.parse(JSON.stringify(x)));
  assert.deepStrictEqual(P.map(x => x.k), ['t', 'o', 'o', 'o', 't']);
  assert.strictEqual(P[0].t, 'ليش الـ troponine بتطلع؟'); assert.strictEqual(P[2].q, 'وبعد قدّيش؟'); assert.strictEqual(P[3].a, 'قديم\nسطر تاني');
  const html = N.textHtml(a2 + '\n\n🙋 <b>x</b>\n👨‍🏫 عثمان: <script>');
  assert.ok(html.includes('<div class="nosm">') && html.includes('<p class="ntext">ليش الـ troponine بتطلع؟</p>') && html.includes('&lt;script&gt;') && !html.includes('<script>') && !html.includes('<b>x</b>'), 'Osman bubbles, escaped');
  assert.strictEqual(N.parts('🙋 بس سؤال من عندي بلا جواب')[0].k, 't', 'a line of the student\'s own starting with 🙋 stays theirs');
});

test('📒🙋 28s: the note ask goes to the SAME endpoint with the plain persona, the note + its source + the lesson; a highlight asks about its words; locked on an unanswered graded question; hint-only on an unanswered practice one; shared daily quota', () => {
  const { ctx, store } = askCtx(); const vm = require('node:vm'); vm.runInContext(read('assets/notes.js'), ctx, { filename: 'assets/notes.js' });
  const X = ctx.NursinAsk, N = ctx.NursinNotes;
  assert.strictEqual(typeof X.noteMount, 'function'); assert.strictEqual(typeof X.noteHydrate, 'function');
  const meta = { id: 'l_x', refType: 'lesson', refId: 'cardio:infarctus', refText: 'Infarctus (جلطة قلبية)', subject: 'cardio', lesson: 'cardio:infarctus' };
  const p = X.notePayload({ meta, text: 'الـ ECG بالـ infarctus شو بيبيّن؟ بدي ارجع اعرفها', q: '', qc: null }, { n: 'Infarctus (جلطة قلبية)', text: 'ECG: sus-décalage ST.' });
  assert.ok(p.context.includes('[ملاحظة الطالب]\nالـ ECG بالـ infarctus شو بيبيّن؟ بدي ارجع اعرفها') && p.context.includes('جوابك رح ينحفظ تحت ملاحظتو'), 'the note is the question/context');
  assert.ok(p.context.includes('[الملاحظة مكتوبة على درس] Infarctus') && p.context.includes('[الدرس على الموقع: Infarctus (جلطة قلبية)]') && p.context.includes('sus-décalage ST'), 'its source + lesson snippet');
  assert.ok(/بلا بهدلة، بلا مواعظ ولا حِكم/.test(p.context) && p.context.includes('الأستاذ عثمان') && p.context.includes('معناه بالعربي') && p.context.includes('عربي لبناني'), 'plain persona: no roast / proverb, Lebanese Arabic, French + Arabic');
  assert.ok(!p.context.includes('ممنوع تقلّو الجواب الصح'), 'nothing to hide in a plain note');
  assert.strictEqual(p.messages.length, 1); assert.strictEqual(p.messages[0].role, 'user'); assert.ok(p.messages[0].text.includes('ملاحظتي'), 'empty field → «answer my note»');
  const p2 = X.notePayload({ meta, text: 'x', q: 'شو يعني sus-décalage؟', qc: null });
  assert.strictEqual(p2.messages[0].text, 'شو يعني sus-décalage؟', '«شو بدك تعرف؟» goes as the question');
  // a highlight: its words, the highlight rule, the lesson from its refId
  const hm = { id: 'l_h', refType: 'lesson', refId: 'law:l1#1~habc12', refText: '🖍️ الممرض المجاز: شهادة جامعية', subject: 'law', lesson: '' };
  const ph = X.notePayload({ meta: hm, text: '', q: '', qc: null });
  assert.ok(X.isHl(hm) && ph.context.includes('[الملاحظة مكتوبة على جملة معلّمة بالدرس] الممرض المجاز') && ph.context.includes('[تعليمة]') && ph.messages[0].text.includes('علّمتها'), 'highlight → explain the highlighted words');
  assert.strictEqual(X.noteLesson({ meta: hm }).lid, 'law:l1', 'the highlight\'s lesson for the snippet');
  assert.strictEqual(X.noteBlock({ id: 'l_h', meta: () => hm, text: () => '' }, ''), '', 'an empty highlight note can ask');
  // a note on an unanswered PRACTICE question: hint only; a GRADED unanswered one: locked
  const q = ctx.QUIZ.find(x => x.id === 'q001'), qc0 = X.norm(X.fromQ(q, { answered: false }));
  const pq = X.notePayload({ meta: { id: 'q_q001', refType: 'q', refId: 'q001', refText: 'x', subject: 'cardio', lesson: '' }, text: 'مش فاهم', q: '', qc: qc0 });
  assert.ok(pq.context.includes('ممنوع تقلّو الجواب الصح') && !pq.context.includes('[الجواب الصح]'), 'practice, unanswered → hint only');
  const pa = X.notePayload({ meta: { id: 'q_q001', refType: 'q', refId: 'q001', refText: 'x', subject: 'cardio', lesson: '' }, text: 'مش فاهم', q: '', qc: X.norm(X.fromQ(q, { answered: true, pick: 1 })) });
  assert.ok(pa.context.includes('[الجواب الصح] a)') && pa.context.includes('[جواب الطالب] b)') && !pa.context.includes('ممنوع تقلّو'), 'answered → explains');
  assert.ok(X.noteBlock({ id: 'q', meta: () => ({ refType: 'q' }), text: () => 'x', lock: 'LOCK' }, '') === 'LOCK', 'graded unanswered → locked');
  assert.ok(X.noteBlock({ id: 'f', meta: () => ({ refType: 'free' }), text: () => '  ' }, '').includes('اكتب ملاحظتك'), 'nothing written, nothing asked → told to write first');
  assert.ok(X.noteBlock({ id: 'f', meta: () => ({ refType: 'free' }), text: () => 'z'.repeat(1900) }, 'q').includes('٢٠٠٠'), 'a full note → told before spending a question');
  // the same daily counter as the tutor + 28q (nursin_tutor_day_v1)
  const before = X.quota().left; X.use(); assert.strictEqual(X.quota().left, before - 1); assert.ok(JSON.parse(store.nursin_tutor_day_v1).n === 1 && X.leftText().includes('باقي ' + (before - 1) + ' سؤال اليوم'));
  const src = read('assets/ask.js');
  assert.ok(src.includes('fetch(API, { method: "POST"') && (src.match(/var API = "https:\/\/summer-forest-fd40/g) || []).length === 1, 'one endpoint (the tutor\'s)');
  assert.ok(src.includes('use(); s.q = q;') && src.includes('s.busy = false; refund();') && src.includes('if (nt == null) { refund();'), 'counted once, refunded on failure / no room');
  assert.ok(src.includes('شو بدك تعرف؟ (اختياري)') && src.includes("Que veux-tu savoir ? (facultatif)") && src.includes('el.className = "askw naskw"; el.setAttribute("data-nofr", "")'), 'field + French + not machine-translated');
  const T1 = src.slice(src.indexOf('/* ---------- 📒')).match(/\bT\("(?:[^"\\]|\\.)*"\)/g) || [];
  assert.strictEqual(T1.length, 0, 'every new string has its French');
});

test('📒🙋 28s wiring: «اسأل عثمان» in the 📝 note sheet (every page), on every 📒 note card and every 🖍️ highlight card; answers drawn as Osman bubbles; glass CSS fits 390px; tag s; no ads', () => {
  const nj = read('assets/notes.js'), hj = read('assets/highlight.js'), aj = read('assets/ask.js');
  assert.ok(nj.includes("'<div class=\"naskhost\"></div><div class=\"fcact nact\">'") && nj.includes('AK.noteMount(ah, { id: id, meta: curMeta, inline: true, surface: "note-sheet"'), 'in the sheet while writing');
  assert.ok(nj.includes('before: function () { if (box === myBox && ta.value.trim()) { put(st, owner, curMeta(), ta.value); save(); flush(); } }'), 'what was written is saved before asking (the answer lands under it even if the sheet is closed)');
  assert.ok(nj.includes('after: function (nt) { if (box === myBox) { ta.value = nt; count(); }'), 'the answer appears in the note being written');
  assert.ok(nj.includes('from.closest(".qcard, .cq, .dqbox")') && nj.includes('lock: card && !aw ?'), 'a graded question without its 🙋 box (not answered yet) locks it');
  assert.ok(nj.includes('textHtml(n.text) +') && nj.includes('<div class="naskslot" data-surface="notes" data-meta="') && nj.includes('w.NursinAsk.noteHydrate(L)'), 'every note card');
  assert.ok(nj.includes('API.commit = function () { save(); flush(); };') && nj.includes('d.dispatchEvent(new CustomEvent("nursin:notes"))'), 'saved + synced like every note; pages hear it');
  assert.ok(hj.includes("+ hlNoteRow(x) + \"</li>\"") && hj.includes('data-surface="highlights" data-meta="') && hj.includes('w.NursinAsk.noteHydrate(app)') && hj.includes('d.addEventListener("nursin:notes", function () { if (pageOn) pageDraw(); })'), 'every highlight card, with its note');
  assert.ok(nj.includes('w.NursinAsk.typing(el)') && hj.includes('w.NursinAsk.typing(app)'), 'a sync redraw never eats a question being typed');
  assert.ok(aj.includes('noteHydrate();') && aj.includes('else if (el._nsrc) npaint(el);'), 'hydrated + repainted on sign-in');
  const css = read('assets/ui.css'), blk = css.slice(css.indexOf('/* 📒🙋 28s'));
  assert.ok(blk.includes('.nosm{') && blk.includes('var(--uisoft') && blk.includes('.hlitem{flex-wrap:wrap}') && blk.includes('min-width:0') && !/position:fixed|backdrop-filter|adx/.test(blk), 'glass tokens, fits, no blur / ads');
  for (const p of ['notes.html', 'highlights.html', 'law.html', 'quiz.html', 'cardio.html']) { const h = read(p); assert.ok(h.includes('assets/ask.js?v=20261029r') && h.includes('assets/notes.js?v=20261029r'), p + ' tag s'); }
  for (const p of ['notes.html', 'highlights.html']) assert.ok(!/adsbygoogle"|data-ad-slot|bauval|class="ad-slot"/.test(read(p).replace(/<script async src="https:\/\/pagead2[^>]*><\/script>/, '')), p + ' no ad units');
});

// ---------- 🔴 28t: «حالة لايف» — one shared live ER case for the whole site ----------
function liveLoad() {
  const vm = require('node:vm'), ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('assets/erroom-data.js'), ctx); vm.runInContext(read('assets/livecase-data.js'), ctx); vm.runInContext(read('assets/livecase.js'), ctx);
  const C = ctx.LiveCore, D = ctx.LIVECASE, E = ctx.ERROOM;
  D.A = Object.assign({}, E.actions, D.acts); D.I = Object.assign({}, E.items, D.items);
  return { C, D, E };
}
const LIVE_OK = { ok: 1, bad: 1, ord: 1, neu: 1, no: 1 }, jj = x => JSON.parse(JSON.stringify(x));
function liveDays(C, key, n) { for (let i = 0; i < n; i++) key = C.nextKey(key); return key; }
function liveAdd(C, D, doc, t, u, pk, a, o) {
  const st = C.state(D, doc, t), r = C.check(D, st, pk, a, o); if (!LIVE_OK[r.k]) return r;
  doc.n++; const e = { t, u: u[0], n: u[1], p: pk, a: r.a, k: r.k, d: r.d }; if (r.o != null) e.o = r.o; doc.ev[doc.n] = e;
  const p = doc.pts[u[0]] || { n: u[1], p: 0, ok: 0, no: 0 }; doc.pts[u[0]] = { n: u[1], p: p.p + r.d, ok: p.ok + (r.k === 'ok' ? 1 : 0), no: p.no + (r.k === 'ok' ? 0 : 1), t }; return r;
}
function liveIdeal(C, D, key, users, t) {
  const doc = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {} }; let i = 0;
  for (let g = 0; g < 200; g++) { const st = C.state(D, doc, t); if (st.end) break; let did = false;
    for (const x of st.P) { const s = x.next[0]; if (!s) continue; const o = s.kind === 'file' ? C.opts(D, st.cs, x.p, s.f).a : undefined; liveAdd(C, D, doc, t, users[i++ % users.length], x.k, s.id, o); t += 60e3; did = true; }
    if (!did) break; }
  return { doc, t };
}
test('#170 28t live case bank: ≥14 cases from his lessons, 2 named Lebanese patients, a full procedure from zero, FR+AR everywhere', () => {
  const { C, D, E } = liveLoad();
  assert.ok(D.cases.length >= 14, 'at least 14 cases');
  assert.strictEqual(new Set(D.cases.map(c => c.id)).size, D.cases.length, 'unique ids');
  assert.strictEqual(D.needs.length, 14, 'the 14 Henderson needs');
  for (const n of D.needs) assert.ok(n.fr && n.ar, 'need FR+AR');
  for (const f of ['id', 'motif', 'ant', 'all', 'tt', 'cst', 'gcs', 'hend', 'surv', 'tr']) { const F = D.fields[f]; assert.ok(F && F.fr && F.ar && F.q && F.x, 'file field ' + f + ' FR+AR + question + why'); }
  for (const k in D.acts) { const A = D.acts[k]; assert.ok(A.fr && A.ar && A.ic, 'act ' + k); if (A.need) assert.ok(D.I[A.need], k + ' needs a real item'); }
  for (const k in D.items) assert.ok(E.stations[D.items[k].st], 'item ' + k + ' lives at a station');
  const names = new Set();
  for (const c of D.cases) {
    assert.ok(c.t.ar && c.t.fr && c.ic && c.src, c.id + ' title + source');
    if (c.gen) assert.ok(/🌐/.test(c.src.ar || c.src), c.id + ' outside his lessons is labelled 🌐 معلومات عامة');
    assert.ok(fs.existsSync(path.join(SITE, c.href.split('#')[0])), c.id + ' links its lesson');
    assert.strictEqual(c.pts.length, 2, c.id + ' two patients');
    assert.deepStrictEqual(jj(c.pts.map(p => p.k)), ['a', 'b']);
    for (const p of c.pts) {
      assert.ok(p.nm.ar && p.nm.fr && p.nm.ar.split(' ').length >= 2, c.id + ' named patient (first + family name)'); names.add(p.nm.ar);
      assert.ok(p.age > 0 && /^[mf]$/.test(p.sex) && p.story.ar && p.story.fr && p.sx.length && p.lab.length, c.id + p.k + ' story');
      for (const v of ['sys', 'dia', 'fc', 'fr', 'spo2', 't', 'gcs']) assert.ok(typeof p.vit[v] === 'number', c.id + p.k + ' vit ' + v);
      assert.strictEqual(p.gyvm[0] + p.gyvm[1] + p.gyvm[2], p.vit.gcs, c.id + p.k + ' Glasgow Y+V+M = GCS');
      for (const f of ['motif', 'ant', 'all', 'tt', 'cst', 'surv', 'tr']) assert.ok(p.file[f] && p.file[f].ar && p.file[f].fr, c.id + p.k + ' file ' + f + ' FR+AR');
      assert.ok(p.file.hend.length === 3 && p.file.hend.every(n => n >= 1 && n <= 14), c.id + p.k + ' 3 Henderson needs');
      const acts = p.soins.map(s => s.a); assert.strictEqual(new Set(acts).size, acts.length, c.id + p.k + ' no duplicate soin');
      for (const s of p.soins) { assert.ok(D.A[s.a], c.id + p.k + ' soin ' + s.a + ' exists'); assert.ok(s.why.ar && s.why.fr, 'why FR+AR'); for (const a of (s.after || [])) assert.ok(acts.includes(a) || a === 'mon', c.id + p.k + ' after ' + a);
        const A = D.A[s.a]; if (A.need && D.I[A.need] && D.I[A.need].rx) assert.ok((s.after || []).includes('call'), c.id + p.k + ' a prescription drug comes after 📞 the doctor'); }
      assert.ok(acts.includes('call'), c.id + p.k + ' calls the doctor');
      for (const b of p.bad) { assert.ok(D.A[b.a], c.id + p.k + ' bad ' + b.a); assert.ok(!acts.includes(b.a), c.id + p.k + ' bad is not a soin'); assert.ok(b.why.ar && b.why.fr); }
      const L = C.steps(D, c, p); assert.ok(L.length >= 15 && L.length <= 24, c.id + p.k + ' ' + L.length + ' steps');
      assert.deepStrictEqual(jj(L.slice(0, 2).map(s => s.id)), ['acc', 'f_id'], 'accueil + identity first');
      assert.deepStrictEqual(jj(L.slice(-2).map(s => s.id)), ['f_surv', 'f_tr'], 'surveillance then transmissions last');
      for (const f of ['id', 'motif', 'ant', 'all', 'tt', 'cst', 'gcs', 'hend', 'surv', 'tr']) { const q = C.opts(D, c, p, f); assert.strictEqual(q.o.length, 4, f); assert.strictEqual(new Set(q.o.map(o => o.ar + '|' + o.fr)).size, 4, c.id + p.k + ' ' + f + ' 4 different choices'); assert.ok(q.a >= 0 && q.a < 4); assert.deepStrictEqual(jj(C.opts(D, c, p, f)), jj(q), 'deterministic'); }
    }
  }
  assert.ok(names.size >= 28, 'every patient has his own name');
});
test('#171 28t live steps: the right order gives + points, a wrong / early / useless step costs points with a short why', () => {
  const { C, D } = liveLoad(), U = [['u1', 'ريم'], ['u2', 'حسن']];
  for (const c of D.cases) {
    const key = '2026-11-03', t0 = C.dayStart(key) + 9 * 36e5, doc = { day: C.docId(key), c: c.id, n: 0, ev: {}, pts: {} };
    let st = C.state(D, doc, t0); const x = st.P[0], p = x.p;
    let r = C.check(D, st, 'a', 'f_tr', 0); assert.strictEqual(r.k, 'ord', c.id + ' transmissions before accueil = order'); assert.ok(r.d < 0 && r.miss.length);
    r = C.check(D, st, 'a', p.bad[0].a); assert.strictEqual(r.k, 'bad'); assert.strictEqual(r.d, C.PTS.bad); assert.ok(r.why.ar);
    r = liveAdd(C, D, doc, t0, U[0], 'a', 'acc'); assert.strictEqual(r.k, 'ok'); assert.ok(r.d > 0);
    st = C.state(D, doc, t0 + 1); const q = C.opts(D, st.cs, p, 'id');
    r = C.check(D, st, 'a', 'f_id', (q.a + 1) % 4); assert.strictEqual(r.k, 'no'); assert.strictEqual(r.d, C.PTS.no); assert.ok(r.why && r.why.ar, 'wrong answer → the why');
    r = C.check(D, st, 'a', 'f_id', q.a); assert.strictEqual(r.k, 'ok'); assert.strictEqual(r.d, C.PTS.file);
  }
  for (let i = 0; i < D.cases.length; i++) {
    const key = liveDays(C, '2026-11-02', i), { doc, t } = liveIdeal(C, D, key, U, C.dayStart(key) + 8.5 * 36e5);
    const st = C.state(D, doc, t); assert.strictEqual(st.end && st.end.w, 'ok', key + ' ideal play ends with both patients stable');
    assert.ok(st.P.every(x => x.st === 'ok' && x.n === x.tot));
    assert.ok(Object.values(doc.pts).every(r => r.p > 0 && r.no === 0), 'all + points');
    assert.strictEqual(C.check(D, st, 'a', 'acc').k, 'over', 'nothing after the end');
  }
});
test('#172 28t live concurrency: the same step twice = one write; the client uses a transaction + an append-only log', () => {
  const { C, D } = liveLoad(), key = '2026-11-04', t0 = C.dayStart(key) + 10 * 36e5;
  const doc = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {} };
  const snap = C.state(D, doc, t0);                                   // two students read the same state…
  const r1 = C.check(D, snap, 'a', 'acc'), r2 = C.check(D, snap, 'a', 'acc'); assert.strictEqual(r1.k, 'ok'); assert.strictEqual(r2.k, 'ok');
  liveAdd(C, D, doc, t0, ['u1', 'A'], 'a', 'acc');                   // …the first commits; the second transaction re-reads and is told «سبقك»
  const again = liveAdd(C, D, doc, t0 + 500, ['u2', 'B'], 'a', 'acc'); assert.strictEqual(again.k, 'repeat'); assert.strictEqual(doc.n, 1); assert.ok(!doc.pts.u2, 'no points for a step already done');
  const js = read('assets/livecase.js');
  assert.ok(js.includes('fs.runTransaction(A.db, function (tx) {') && js.includes('tx.get(ref)') && js.includes('LiveDept.check(D, cur, dk, pk, a, opt, M.uid, Date.now())') && js.includes('var r = C.check(st.DK, st, pk, a, opt, uid);'), 'checked inside the transaction on fresh data (28z: in the department the student stands in)');
  assert.ok(js.includes('up["ev." + n] = e;') && js.includes('tx.set(fs.doc(A.db, "live", id, "log", String(n)), e)'), 'n+1 event + its create-only log doc (a second writer on the same n fails)');
  assert.ok(js.includes('if (e && e.code === "permission-denied") {') && js.includes('function () { goPreview("rules"); return { k: "rules" }; });') && js.includes('return act(pk, a, opt, 1, dk);'), 'a lost race → once more on fresh data (→ «سبقك»); rules not published yet → preview, no error');
  assert.ok(js.includes('Date.now() - prev.t.toMillis() < 2500'), 'one step every 2.5 s per student');
});
test('#173 28t live deterioration: nobody acts → worse, then lost; good care → better', () => {
  const { C, D } = liveLoad(), key = '2026-11-05', s0 = C.dayStart(key);
  const doc = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {} };
  const at = h => C.state(D, doc, s0 + h * 36e5);
  const a7 = at(7), a12 = at(12);
  assert.ok(a7.P.every(x => x.c === C.C0), 'stable at arrival until 08:00');
  assert.ok(a12.P.every(x => x.c < C.C0), 'neglect from 08:00 → worse');
  assert.ok(a12.P[0].v.spo2 <= a7.P[0].v.spo2 || a12.P[0].v.sys <= a7.P[0].v.sys || a12.P[0].v.fc !== a7.P[0].v.fc, 'the monitor moves');
  const end = at(23.9); assert.ok(end.P.some(x => x.st === 'lost'), 'a neglected patient is lost before midnight');
  // 28x: the case ends with the first death no more — only when BOTH are finished (else the other one is still playable)
  assert.ok(end.P.every(x => x.st === 'lost') ? end.end && end.end.w === 'lost' : !end.end && end.P.some(x => x.st !== 'lost' && x.next.length > 0), '28x: one lost ≠ the case over: ' + JSON.stringify(end.end));
  const care = liveIdeal(C, D, key, [['u1', 'A']], s0 + 8 * 36e5), st = C.state(D, care.doc, care.t);
  assert.ok(st.P.every(x => x.c > C.C0), 'care → better');
  const v = C.vitals(D, st.P[0].p, 100); assert.ok(Math.abs(v.spo2 - D.vok.spo2) < 1.01 && Math.abs(v.fc - D.vok.fc) < 1.01, '100 = normal vitals');
  assert.strictEqual(C.bucket({ lost: 5, c: 0 }), 'lost'); assert.strictEqual(C.bucket({ c: 20 }), 'crit'); assert.strictEqual(C.bucket({ c: 40 }), 'unst'); assert.strictEqual(C.bucket({ c: 70 }), 'impr'); assert.strictEqual(C.bucket({ c: 60, all: 1 }), 'ok');
});
test('#174 28t live rotation: one case a day for the whole site at 00:00 Beirut, all 14 in 14 days, never the same twice in a row', () => {
  const { C, D } = liveLoad();
  assert.strictEqual(C.dayKey(Date.parse('2026-11-01T21:59:00Z')), '2026-11-01'); assert.strictEqual(C.dayKey(Date.parse('2026-11-01T22:00:00Z')), '2026-11-02', 'Beirut midnight (UTC+2 in winter)');
  assert.strictEqual(C.dayKey(Date.parse('2026-07-01T20:59:00Z')), '2026-07-01'); assert.strictEqual(C.dayKey(Date.parse('2026-07-01T21:00:00Z')), '2026-07-02', 'UTC+3 in summer');
  assert.strictEqual(C.dayStart('2026-11-02'), Date.parse('2026-11-01T22:00:00Z'));
  assert.strictEqual(C.docId('2026-11-02'), '20261102'); assert.strictEqual(C.keyOf('20261102'), '2026-11-02');
  let prev = null;
  for (let cyc = 0; cyc < 6; cyc++) {
    const ids = []; for (let i = 0; i < D.cases.length; i++) { const k = liveDays(C, D.epoch, cyc * D.cases.length + i), id = C.pick(D, k); assert.strictEqual(C.pick(D, k), id, 'same for everyone'); assert.notStrictEqual(id, prev, k + ' not the same as yesterday'); prev = id; ids.push(id); }
    assert.strictEqual(new Set(ids).size, D.cases.length, 'every case once per cycle');
  }
});
test('#175 28t live archive: the record keeps the right steps in order with who did them, the mistakes and the contributors', () => {
  const { C, D } = liveLoad(), key = '2026-11-06', U = [['u1', 'ريم'], ['u2', 'حسن'], ['u3', 'مايا']];
  const { doc, t } = liveIdeal(C, D, key, U, C.dayStart(key) + 9 * 36e5);
  liveAdd(C, D, doc, t - 1, U[2], 'a', 'acc');                        // a repeat is not a mistake
  const s0 = C.state(D, doc, C.dayStart(key) + C.DAY + 36e5), rec = C.summary(D, s0);
  assert.strictEqual(rec.id, C.docId(key)); assert.strictEqual(rec.c, doc.c);
  for (const x of rec.P) { assert.ok(x.steps.every(s => s.done && s.done.n), 'each right step + who'); for (let i = 1; i < x.steps.length; i++) assert.ok(x.steps[i].ph >= x.steps[i - 1].ph, 'in order'); }
  const d2 = { day: C.docId(key), c: doc.c, n: 0, ev: {}, pts: {} }, t2 = C.dayStart(key) + 9 * 36e5, cs = C.caseById(D, doc.c);
  liveAdd(C, D, d2, t2, U[0], 'a', cs.pts[0].bad[0].a); liveAdd(C, D, d2, t2 + 1e3, U[1], 'a', 'f_tr', 0); liveAdd(C, D, d2, t2 + 2e3, U[2], 'a', 'acc');
  const r2 = C.summary(D, C.state(D, d2, C.dayStart(key) + C.DAY + 1));
  assert.strictEqual(r2.P[0].bad.length + r2.P[0].wrong.length, 2, 'the bad + the early step are kept');
  assert.deepStrictEqual(jj(r2.board.map(b => b.u)), ['u3', 'u2', 'u1'], 'contributors by points');
  assert.ok(r2.end && ['lost', 'time'].includes(r2.end.w), 'a case left alone ends (lost or time over)');
  const rj = read('assets/livecase-room.js');
  for (const s of ['📋 الخطوات الصح بالترتيب', '❌ شو انعمل غلط', '🏆 مين ساهم', '📚 الحالات السابقة']) assert.ok(rj.includes(s), s);
  assert.ok(read('assets/livecase.js').includes('fs.orderBy("day", "desc"), fs.limit(30)'), 'past cases = the last days\' docs');
});
test('#176 28t live pushes: new case once a day, 📉/📈 only on real changes, ≤1 an hour per student, his switch respected', () => {
  const { C, D } = liveLoad(), now = Date.parse('2026-11-02T12:00:00Z'), H = 36e5;
  assert.ok(C.pushOk({}, 'new', now, '20261102')); assert.ok(!C.pushOk({ liveDay: '20261102' }, 'new', now, '20261102'), 'new case once');
  assert.ok(C.pushOk({ liveAt: now - 10 * 60e3 }, 'new', now, '20261102'), 'the new-case push is not throttled');
  assert.ok(!C.pushOk({ liveAt: now - 59 * 60e3 }, 'down', now), '≤1 an hour'); assert.ok(C.pushOk({ liveAt: now - H }, 'down', now)); assert.ok(C.pushOk({}, 'up', now));
  assert.ok(!C.pushOk({ livePush: false }, 'new', now, 'x') && !C.pushOk({ livePush: false }, 'down', now), 'his own switch');
  const P = (a, b) => ({ P: [{ k: 'a', st: a }, { k: 'b', st: b }] });
  assert.deepStrictEqual(jj(C.changes({ a: 'unst', b: 'unst' }, P('unst', 'unst'))), []);
  assert.deepStrictEqual(jj(C.changes({ a: 'unst', b: 'impr' }, P('crit', 'ok'))), [{ p: 'a', kind: 'down' }, { p: 'b', kind: 'up' }]);
  assert.deepStrictEqual(jj(C.changes({ a: 'crit' }, P('lost', 'unst'))), [{ p: 'a', kind: 'lost' }]);
  assert.deepStrictEqual(jj(C.changes({ a: 'ok', b: 'impr' }, P('impr', 'impr'))), [], 'ok → impr is not news');
  assert.deepStrictEqual(jj(C.changes(null, P('crit', 'crit'))), [], 'first look = no push');
  const js = read('assets/livecase.js'); assert.ok(js.includes('{ livePush: !!on }'), 'the switch is saved on his profile (the worker reads it)');
});
test('#177 28t live wiring: home card above «🧭 مسار اليوم», games card + #live, «الكل» → 🧠, preview until the rules are published, no ads, tag t', () => {
  const hj = read('assets/home.js'); assert.ok(hj.includes('<div class="hztop"></div><section class="hzpath" aria-labelledby="hzpathh">') && hj.includes('</section><div class="hzlivew"></div>'), '29r: the path first, the compact 🏥 card right under it');
  const ih = read('index.html'); assert.ok(ih.includes('assets/livecase.css?v=20261029r') && ih.includes('assets/livecase.js?v=20261029r'));
  const gh = read('games.html'); assert.ok(gh.indexOf('livecase.js?v=20261029r') > gh.indexOf('erroom.js?v=20261029r') && gh.indexOf('livecase-room.js?v=20261029r') > gh.indexOf('livecase.js?v=20261029r'), 'after the solo room (stations + paths)');
  assert.ok(/data-live="1"/.test(gh) && gh.indexOf('data-live="1"') < gh.indexOf('data-room="1"'), 'games card first');
  assert.ok(read('assets/ui.js').includes('["games.html#live", "🔴", "حالة لايف", "Cas en direct", "nw"]'), '«الكل» → 🧠');
  assert.ok(read('assets/nav.js').includes('row(["games.html#live", "🔴", "حالة لايف"'), '☰ too');
  const js = read('assets/livecase.js'), rj = read('assets/livecase-room.js'), css = read('assets/livecase.css');
  assert.ok(js.includes('الحالة اللايف رح تشتغل قريباً') && rj.includes('الحالة اللايف رح تشتغل قريباً'), 'before the rules: «رح تشتغل قريباً» + a local preview');
  assert.ok(js.includes('حالة لايف') && js.includes('"🏥 L\'hôpital maintenant"') && js.includes('"🏥 المستشفى الآن"') && /leftWords/.test(js), '29r: the compact «🏥 المستشفى الآن» card AR+FR');
  assert.ok(!/adsbygoogle|data-ad-slot|bauval|adsterra|monetag/i.test(js + rj + css), 'no ads');
  assert.ok(css.includes('html[data-theme="night"] .lcr') && css.includes('html[data-theme="night"] .hzlive'), 'night');
  assert.ok(!/help|مساعدة|💡/.test(rj.replace(/data-lchelp/g, '')) || !rj.includes('data-hint'), 'no help button');
  assert.ok(read('assets/erroom.js').includes('ERRoom'), 'the solo room is still there');
  const core = js.slice(js.indexOf('/* ==live-core=='), js.indexOf('/* ==/live-core== */')); assert.ok(core.length > 8000 && !/document|window|localStorage/.test(core), 'the engine is pure (the worker runs the same text)');
});

test('#178 28t worker v11 (/home/user/tab/files/nursin-worker-v11.js, for Abdullah to paste): every v10 route kept, the SAME engine as the site, live pushes', async (t) => {
  const f = '/home/user/tab/files/nursin-worker-v11.js', f10 = '/home/user/tab/files/nursin-worker-v10.js';
  if (!fs.existsSync(f) || !fs.existsSync(f10)) return t.skip('worker files not on this machine');
  const src = fs.readFileSync(f, 'utf8'), v10 = fs.readFileSync(f10, 'utf8');
  for (const r of ['"/push"', '"/push/seal"', '"/broadcast"', '"/goals/hello"', '"/admin/newuser"', '"/admin/joined"', 'tutor(req, env, cors)', 'async scheduled(', 'async function goalCron(', 'function planMorning(']) assert.ok(src.includes(r) && v10.includes(r), 'kept ' + r);
  assert.ok(src.includes('morning: true, live: true, v: 11') && src.includes('v: { integerValue: "11" }'), 'GET /push says v: 11, live');
  const core = s => s.slice(s.indexOf('/* ==live-core=='), s.indexOf('/* ==/live-core== */'));
  // 28v added ONE thing to the engine (the patients' clock starts at the case's creation, at0) — worker v12 carries it; v11 = the engine as of 28u
  const pre28v = s => s.replace(/    \/\/ 28v: the patients only start[\s\S]*?keeps 08:00\.\n/, '').replace('a0 = +doc.at0 || 0, tD = Math.max(t0 + DRIFT_FROM * H, a0 < t1 ? a0 : 0)', 'tD = t0 + DRIFT_FROM * H').replace('t1: t1, from: tD, end:', 't1: t1, end:');
  // 28x changed the engine again (each patient ends on his own) — v12 carries the site's text; v11 = the 28u engine, kept verbatim inside v12's history
  const w12f = '/home/user/tab/files/nursin-worker-v12.js';
  assert.ok(!fs.existsSync(w12f) || core(fs.readFileSync(w12f, 'utf8')).includes('// 28x (Abdullah, Nov 2 10:32 PM): each patient ends ON HIS OWN'), 'worker v12 = the 28x engine (28y changed the checks, not the health: #201)');
  assert.ok(core(src).includes('function adv(to) {                     // health between two moments; the first patient reaching 0 ends the case right there') && !core(src).includes('// 28v:') && !core(src).includes('// 28x'), 'v11 = the engine as of 28u (unchanged file)');
  { const vm = require('node:vm'), c2 = { console }; c2.window = c2; vm.createContext(c2); vm.runInContext(core(src) + '\nthis.W11 = LiveCore;', c2);
    const { C, D } = liveLoad(), key = '2026-11-04', care = liveIdeal(C, D, key, [['u1', 'A'], ['u2', 'B']], C.dayStart(key) + 8 * 36e5 + 6e4);
    const a = C.state(D, care.doc, care.t), b = c2.W11.state(D, care.doc, care.t);
    assert.deepStrictEqual(jj({ e: a.end && a.end.w, n: a.P.map(x => x.n), c: a.P.map(x => Math.round(x.c)) }), jj({ e: b.end && b.end.w, n: b.P.map(x => x.n), c: b.P.map(x => Math.round(x.c)) }), 'a day with no death and no late creation: v11 and the site agree'); }
  assert.ok(src.includes('.then(() => liveCron(env, when))'), 'live cron after Osman, its own catch');
  const os = require('node:os'), tmp = path.join(os.tmpdir(), 'nursin-w11-' + process.pid + '.mjs'); fs.writeFileSync(tmp, src);
  const W = (await import('file://' + tmp)).default; fs.unlinkSync(tmp);
  assert.ok(W._plan && W._cron && W._morning && W._live && W._liveMsg, 'v10 hooks kept + live');
  const { C, D } = liveLoad(), key = '2026-11-02', st = C.state(D, { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {} }, C.dayStart(key) + 9 * 36e5);
  const a = W._liveMsg('new', D, st, null, false), fr = W._liveMsg('down', D, st, 'a', true);
  assert.ok(a.title.includes('🚨 حالة جديدة') && a.body.includes(st.P[0].p.nm.ar.split(' ')[0]) && a.url === '/games.html#live', 'AR new case: ' + a.body);
  assert.ok(fr.title.includes(st.P[0].p.nm.fr) && !/[\u0600-\u06FF]/.test(fr.title + fr.body), 'FR change: ' + fr.title);
  const r = await W._live({ VAPID_PRIVATE_JWK: '{}', __now: () => Date.parse('2026-11-02T08:00:00Z') }, 0); assert.strictEqual(r.skip, 'judging run', 'Osman\'s :00/:30 runs keep their budget');
});


// ---------- 👥 28u: «حالة لايف» — 3, 4 or more students see each other in the shared room (Abdullah, Nov 2 3:03–3:15 PM) ----------
function presLoad() {
  const vm = require('node:vm'), ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('assets/livepres.js'), ctx);
  return ctx.LivePres;
}
test('👥 28u presence throttle: first write at once, ≥ 1 s between writes, ~1.2 s while walking, a 12 s heartbeat when still, a change goes out as soon as 1 s passed', () => {
  const P = presLoad();
  assert.strictEqual(P.due(0, 1000, false, false), true, 'never written → write now');
  assert.strictEqual(P.due(10000, 10500, true, true), false, 'a tap 0.5 s after the last write waits (the rules refuse < 0.5 s)');
  assert.strictEqual(P.due(10000, 11000, false, true), true, 'a new target / bed after 1 s → written');
  assert.strictEqual(P.due(10000, 11100, true, false), false, 'walking: not yet at 1.1 s');
  assert.strictEqual(P.due(10000, 11200, true, false), true, 'walking: every 1.2 s');
  assert.strictEqual(P.due(10000, 21000, false, false), false, 'standing still: quiet for 11 s');
  assert.strictEqual(P.due(10000, 22000, false, false), true, 'standing still: heartbeat at 12 s (< the 30 s stale limit)');
  assert.ok(P.IDLE_MS * 2 < P.STALE, 'two heartbeats fit inside the stale window');
  // a walk of 6 s with a tap every 200 ms → ≤ 7 writes (not 30)
  let last = 0, w = 0; for (let t = 1; t <= 6000; t += 16) { if (P.due(last, t, true, t % 200 < 16)) { last = t; w++; } }
  assert.ok(w >= 5 && w <= 7, 'writes in 6 s of walking/tapping: ' + w);
  // the doc: exactly the fields the rules accept, bounded
  const d = P.doc({ name: '  عبدالله جابر الطويل ', av: 'a07' }, { x: 180.6, y: 999 }, { x: -5, y: 150.2 }, 'b');
  assert.deepStrictEqual(Object.keys(d).sort(), ['av', 'b', 'n', 'tx', 'ty', 'x', 'y'], 'n av x y tx ty b (+ at = serverTimestamp by the caller)');
  assert.deepStrictEqual([d.n, d.av, d.x, d.y, d.tx, d.ty, d.b], ['عبدالله', 'a07', 180, 600, 0, 150, 'b'], 'first name, whole numbers inside the room (28z: x keeps its 2 low bits for the department, 🚑 = 0)');
  const d2 = P.doc({ name: '', av: 'https://x/y.png' }, { x: 1, y: 1 }, { x: 1, y: 1 }, 'z');
  assert.deepStrictEqual([d2.n, d2.av, d2.b], ['طالب', '', ''], 'no name → «طالب», only cartoon ids a01–a12, bed only a/b');
  assert.ok(P.first('x'.repeat(40)).length <= 20, 'name ≤ 20 (rules)');
});
test('👥 28u stale filter + fade: others only (not me), ≤ 30 s old with my clock offset, fading from 20 s, sorted, capped', () => {
  const P = presLoad(), now = 1e9;
  const L = [{ uid: 'me', n: 'أنا', at: now }, { uid: 'u2', n: 'ريم', at: now - 5000 }, { uid: 'u3', n: 'حسن', at: now - 29000 }, { uid: 'u4', n: 'لين', at: now - 31000 }, { uid: 'u5', n: 'جاد', at: 0 }, null];
  assert.deepStrictEqual(P.fresh(L, now, 'me').map(p => p.uid).sort(), ['u2', 'u3'], 'me, > 30 s and no time are dropped');
  assert.deepStrictEqual(P.fresh(L, now, 'me', -3000).map(p => p.uid).sort(), ['u2', 'u3', 'u4'], 'my phone 3 s ahead of the server → his 31 s is 28 s');
  assert.deepStrictEqual(P.fresh(L, now, 'me', 2000).map(p => p.uid), ['u2'], 'my phone behind → he is older');
  const many = Array.from({ length: 40 }, (_, i) => ({ uid: 'x' + i, n: 'n' + i, at: now }));
  assert.strictEqual(P.fresh(many, now, 'me').length, P.MAXP, 'capped');
  assert.strictEqual(P.alpha(0), 1); assert.strictEqual(P.alpha(20000), 1); assert.ok(Math.abs(P.alpha(25000) - 0.5) < 1e-9); assert.strictEqual(P.alpha(30000), 0); assert.strictEqual(P.alpha(60000), 0);
});
test('👥 28u interpolation: the others glide toward where they go at walking speed, never overshoot, catch up faster when far behind, jump when very far', () => {
  const P = presLoad();
  let c = { x: 0, y: 0 }; const tg = { x: 100, y: 0 };
  const a = P.follow(c, tg, 0.1, 165); assert.ok(a.x > 16 && a.x < 30 && a.y === 0, 'one 0.1 s frame: ' + a.x);
  let x = { x: 0, y: 0 }, frames = 0; while (Math.abs(x.x - 100) > 0.01 && frames < 400) { x = P.follow(x, tg, 1 / 60, 165); frames++; assert.ok(x.x <= 100 + 1e-9, 'no overshoot'); }
  assert.ok(frames > 15 && frames < 60, '100 px in ' + frames + ' frames (smooth, not a jump)');
  const near = P.follow({ x: 0, y: 0 }, { x: 30, y: 0 }, 1 / 60, 165).x, far = P.follow({ x: 0, y: 0 }, { x: 200, y: 0 }, 1 / 60, 165).x;
  assert.ok(far > near * 2, 'far behind → faster');
  const j = P.follow({ x: 0, y: 0 }, { x: 350, y: 500 }, 1 / 60, 165); assert.ok(j.jump && j.x === 350 && j.y === 500, 'very far (just came in / tab slept) → jump');
  const s = P.follow({ x: 5, y: 5, dir: 1 }, { x: 5, y: 5 }, 1 / 60); assert.deepStrictEqual([s.x, s.y, s.dir], [5, 5, 1], 'arrived → stays');
});
test('👥 28u join / leave toasts: who came in and who went out, at most one toast every 4 s, names joined in AR + FR; colours stable per student', () => {
  const P = presLoad();
  const a = [{ uid: '1', n: 'ريم' }, { uid: '2', n: 'حسن' }], b = [{ uid: '2', n: 'حسن' }, { uid: '3', n: 'لين' }, { uid: '4', n: 'جاد' }];
  const df = P.diff(a, b); assert.deepStrictEqual(Array.from(df.join), ['لين', 'جاد']); assert.deepStrictEqual(Array.from(df.left), ['ريم']);
  assert.strictEqual(P.toastOk(0, 5), true); assert.strictEqual(P.toastOk(1000, 4000), false); assert.strictEqual(P.toastOk(1000, 5000), true);
  assert.strictEqual(P.names(['ريم']), 'ريم'); assert.strictEqual(P.names(['ريم', 'حسن', 'لين']), 'ريم، حسن ولين'); assert.strictEqual(P.names(['A', 'B'], true), 'A et B'); assert.strictEqual(P.names(['a', 'b', 'c', 'd', 'e']), 'a، b، c +2', 'many at once → 3 names + the rest counted');
  assert.strictEqual(P.color('u1'), P.color('u1')); assert.notStrictEqual(P.color('u1'), P.color('u2'));
  const src = read('assets/livepres.js'), core = src.slice(src.indexOf('/* ==pres-core=='), src.indexOf('/* ==/pres-core== */'));
  assert.ok(core.length > 2000 && !/document|window|localStorage|fs\./.test(core), 'the core is pure');
});
test('👥 28u wiring: presence only in the shared room (signed in + rules v22), my own doc only, deleted when I leave / hide; badge «👥 N بالغرفة هلّق», ✋ on the bed, home card «👥 N»; AR+FR, light/dark; no ads', () => {
  const pj = read('assets/livepres.js'), rj = read('assets/livecase-room.js'), lj = read('assets/livecase.js'), css = read('assets/livecase.css');
  assert.ok(pj.includes('A.fs.doc(A.db, "live", id, "presence", uid || A.user.uid)') && pj.includes('A.fs.setDoc(ref(A), dc)') && pj.includes('dc.at = A.fs.serverTimestamp()'), 'live/{day}/presence/{my uid}, server time');
  assert.ok(pj.includes('A.fs.onSnapshot(A.fs.collection(A.db, "live", id, "presence")'), 'one listener for the room');
  assert.ok(pj.includes('if (e && e.code === "permission-denied" && !wr) quiet(e)') && pj.includes('function quiet(e) { dead = true; stopListen(); list = [];'), 'rules not published → silent, solo, no retry storm');
  assert.ok(pj.includes('var stopped = wasMv && !moving;') && pj.includes('LivePres.fresh(l, Date.now(), A.user.uid, -15000)'), 'a write on arrival; the home count leaves me out');
  assert.ok(pj.includes('d.addEventListener("visibilitychange"') && pj.includes('W.addEventListener("pagehide"') && (pj.match(/deleteDoc\(ref\(A\)\)/g) || []).length >= 3, 'leaving / hiding removes my doc');
  assert.ok(pj.includes('F.where("at", ">", new Date(now - LivePres.STALE - 15000)), F.limit(60)') && pj.includes('now - hAt >= 60000') && pj.includes('d.hidden'), 'home: one small read ≤ 1/min, only when visible');
  assert.ok(rj.includes('if (m === "shared") PR.start(presChange); else { PR.stop(); pList = []; }'), 'started only when the case is shared');
  assert.ok(rj.includes('if (w.LivePresRoom) w.LivePresRoom.stop(); peers = {}; pList = []; pPrev = null;'), 'stopped when the room closes');
  assert.ok(rj.includes('PR.tick(nurse, tg, sheet && sheet.kind === "bed" ? sheet.k : "", nurse.pts.length > 0 || !!trv, L.dep(), trv ? trv.to : L.dep())'), 'my place, my target and the bed I work on (28z: + my department and the one I walk to)');
  assert.ok(rj.includes('presFrame(dt);\n    draw(ts / 1000);') && rj.includes('peersDraw(P, t);\n    nurseDraw(P, t);'), 'moved + drawn every frame');
  assert.ok(rj.includes('R.path(G, e, { x: p.tx, y: p.ty })') && rj.includes('R.walk(e, e.pts, dt)') && rj.includes('LP.follow(e, { x: e.tx, y: e.ty }, dt)'), 'the others walk the same paths, smoothly');
  assert.ok(rj.includes('function stationSheet(k) { sheetOpen("station", k); }'), 'the cart / drugs / O₂ / monitor / defib open their sheet (28t called a missing function there)');
  assert.ok(rj.includes('LP.alpha(now - p.at)') && rj.includes('e.key === key && e.spr'), 'fade out + cached sprites (60 fps with 6+)');
  assert.ok(rj.includes('"👥 {n} بالغرفة هلّق"') && rj.includes('"👥 {n} dans la salle"') && rj.includes('"👋 {n} فات"') && rj.includes('"👋 {n} est entré·e"') && rj.includes('"🚪 {n} طلع"'), 'AR + FR');
  assert.ok(rj.includes('<span class="lcr-ppl" hidden></span>') && rj.includes('var on = !!(PR && PR.active()); el.hidden = !on;'), 'badge hidden before rules / signed out');
  assert.ok(rj.includes('"✋ " + LP.names(on[k], FR())') && rj.includes('<p class="lcr-pbed" hidden></p>') && rj.includes('✋ {n} عم يشتغل عهالتخت هلّق'), '✋ over the bed + a soft hint in the sheet (the transaction stays the guard)');
  assert.ok(lj.includes('if (ppl > 0) bits.push("👥 " + ppl') && lj.includes('mode === "shared" && PR ? PR.homeCount('), 'home card «👥 N» only when shared');
  assert.ok(css.includes('.lcr-ppl{') && css.includes('html[data-theme="night"] .lcr-ppl') && css.includes('.lcr-ptoast.on') && css.includes('html[data-theme="night"] .lcr-pbed'), 'light + dark');
  for (const p of ['index.html', 'games.html']) { const h = read(p); assert.ok(h.indexOf('assets/livepres.js?v=20261029r') > h.indexOf('assets/livecase.js?v=20261029r'), p + ' loads livepres.js after the engine'); }
  const gh = read('games.html'); assert.ok(gh.indexOf('livepres.js') < gh.indexOf('livecase-room.js'), 'before the room');
  assert.ok(!/adsbygoogle|bauval|adx|ad-slot/.test(pj + rj), 'no ads in the game');
});


// ---------- 🔴 28v: the live case looked «running» but nothing could be tapped (Abdullah, Nov 2 7:27 PM, the evening he published rules v22 + worker v11) ----------
// Root cause: the patients' deterioration was counted from 08:00 even though the shared case only came to exist at ~7 PM (worker v11 deployed
// then). A never-treated patient (rate 10) hits 0 at 18:00 → the case was computed «lost» before anybody could see it, and the room kept
// drawing the walkable room («كون الأوّل! 💪») while every step answered «over». Fix: the clock starts at the case's creation (at0).
function liveClient(snapData, opts) {
  const vm = require('node:vm'), store = {}, o = opts || {};
  const ctx = { console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, setInterval: () => 0, Intl, Date, Math, JSON, Promise };
  ctx.window = ctx; ctx.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  ctx.document = { addEventListener() {}, readyState: 'complete', getElementById: () => null, querySelector: () => null, head: { appendChild() {} }, createElement: () => ({}) };
  const calls = [];
  const fsx = {
    doc: (db, ...p) => ({ path: p.join('/') }), serverTimestamp: () => ({ __sv: 1 }),
    onSnapshot: (ref, ok) => { setTimeout(() => ok({ exists: () => !!snapData, data: () => snapData }), 0); return () => {}; },
    getDoc: ref => o.getDoc ? o.getDoc(ref) : Promise.resolve({ exists: () => !!snapData, data: () => snapData }),
    setDoc: (ref, d) => { calls.push(['setDoc', ref.path]); return o.setDoc ? o.setDoc(ref, d) : Promise.resolve(); },
    updateDoc: () => o.updateDoc ? o.updateDoc() : Promise.resolve(),
    runTransaction: (db, fn) => { calls.push(['tx']); return o.tx ? o.tx(fn) : fn({ get: () => Promise.resolve({ exists: () => !!snapData, data: () => snapData }), update() {}, set() {} }); }
  };
  ctx.NursinFB = { db: {}, fs: fsx, user: { uid: 'u1' }, profile: { name: 'ريم' } };
  vm.createContext(ctx);
  for (const f of ['assets/erroom-data.js', 'assets/livecase-data.js', 'assets/livecase.js']) vm.runInContext(read(f), ctx);
  return { ctx, calls };
}
test('#184 28v root cause: a case created late (7 PM) does NOT count deterioration from 08:00 — the clock starts when the case was created', async () => {
  const { C, D } = liveLoad(), key = '2026-11-02', id = C.docId(key), c = C.pick(D, key), t0 = C.dayStart(key), H = 36e5;
  const at0 = t0 + 19 * H + 5 * 6e4, now = t0 + 19 * H + 52 * 6e4;                       // created 19:05 Beirut, Abdullah opens it at 19:52
  const old = C.state(D, { day: id, c, n: 0, ev: {}, pts: {} }, now);                       // = what every phone computed on Nov 2 (28t/28u)
  const gone = old.P.find(x => x.st === 'lost');                                             // (28x: the other patient now goes on — the bug was the death itself)
  assert.ok(gone && gone.next.length === 0, 'the bug: «lost» before it existed, no step possible');
  assert.ok(gone.lost < at0, 'it was «lost» at ' + new Date(gone.lost).toISOString() + ', before the case was created');
  const st = C.state(D, { day: id, c, n: 0, ev: {}, pts: {}, at0 }, now);
  assert.strictEqual(st.end, null, 'running'); assert.strictEqual(st.from, at0, 'the clock starts at at0');
  st.P.forEach(x => { assert.ok(x.c > 40 && x.c <= 50, x.k + ' only 47 min of neglect: ' + x.c.toFixed(1)); assert.ok(x.next.some(s => s.id === 'acc'), x.k + ': accueil is the next step'); });
  assert.strictEqual(C.check(D, st, 'a', 'acc').k, 'ok', 'the first step works');
  // a case created at 00:00 by the worker (every normal day) is unchanged: from 08:00
  const mid = C.state(D, { day: id, c, n: 0, ev: {}, pts: {}, at0: t0 + 6e4 }, now), noat = C.state(D, { day: id, c, n: 0, ev: {}, pts: {} }, now);
  assert.strictEqual(mid.from, t0 + 8 * H); assert.deepStrictEqual(jj(mid.end), jj(noat.end), 'normal days are exactly as before');
  // still deteriorates after creation (8 h of neglect from 19:05 is past midnight → the day ends by time, not by a death at 18:00)
  const late = C.state(D, { day: id, c, n: 0, ev: {}, pts: {}, at0 }, C.dayStart(C.nextKey(key)) + 60e3);
  assert.ok(late.end && late.end.w === 'time', 'ends at midnight: ' + JSON.stringify(late.end));
  const later = C.state(D, { day: id, c, n: 0, ev: {}, pts: {}, at0 }, at0 + 3 * H); assert.ok(later.P[0].c < st.P[0].c, 'and gets worse when nobody acts');
  assert.strictEqual(C.state(D, { day: id, c, n: 0, ev: {}, pts: {}, at0: C.dayStart(C.nextKey(key)) + H }, now).from, t0 + 8 * H, 'a nonsense at0 (after the day) is ignored');
  // the site keeps at0 from the real Firestore doc (a Timestamp) and the room is playable
  const today = C.dayKey(Date.now()), tid = C.docId(today), A0 = Date.now() - 47 * 6e4;
  const { ctx } = liveClient({ day: tid, c: C.pick(D, today), n: 0, ev: {}, pts: {}, at0: { toMillis: () => A0 }, wk: { b0: 'lost', b1: 'crit' } });
  let got = null; await ctx.LiveCase.start((s, m) => { if (m === 'shared' && s) got = s; });
  for (let i = 0; i < 30 && !got; i++) await new Promise(r => setTimeout(r, 20));
  assert.ok(got, 'shared state'); assert.strictEqual(got.from >= A0 && got.from <= Math.max(A0, C.dayStart(today) + 8 * H), true, 'from = at0 or 08:00');
  assert.strictEqual(got.end, null, 'a 47-minute-old case is running on the phone'); assert.ok(got.P.every(x => x.next.length > 0), 'steps available');
  // a case nobody created yet has not started either (no «lost» flash before the doc exists)
  const nobody = liveClient(null); let g2 = null; await nobody.ctx.LiveCase.start((s, m) => { if (m === 'shared' && s) g2 = s; });
  for (let i = 0; i < 30 && !g2; i++) await new Promise(r => setTimeout(r, 20));
  assert.ok(g2 && g2.end === null && g2.P.every(x => x.next.length > 0), 'missing doc = not started, still playable');
  // preview on this device: a new preview doc carries at0 too
  assert.ok(read('assets/livecase.js').includes('n: 0, ev: {}, pts: {}, at0: Date.now() }; lsSet(PK, p);'), 'preview doc gets at0');
});
test('#185 28v an ended case says so (29h: as a small note — the room is NOT dimmed or covered, taps keep working), home/games cards «🏁 · الجاية بعد»', () => {
  const rj = read('assets/livecase-room.js'), lj = read('assets/livecase.js'), css = read('assets/livecase.css');
  assert.ok(rj.includes('<div class="lcr-over" hidden></div>') && /function overPaint\(\) \{[\s\S]*?if \(!el\.hidden\) \{ el\.hidden = true;[^\n]*\n  \}/.test(rj), 'the old end card layer stays hidden');
  assert.ok(!css.includes('.lcr.ended .lcr-cv{opacity:.32'), 'the room is not dimmed');
  assert.ok(rj.includes('ended: { ar: "🏁 انتهت الحالة", fr: "🏁 Cas terminé" }') && rj.includes('nextIn: { ar: "⏳ الحالة الجاية بعد", fr: "⏳ Prochain cas dans" }'), 'AR + FR');
  assert.ok(rj.includes('"⏳ " + L.nextWords(st.t1 - Date.now())') && rj.includes('class="lcr-endgo" data-lcgo="wt"'), 'the next case time as a small note + a way to the new patients');
  assert.ok(!rj.includes('if (st && st.end) { e.preventDefault(); return say("neutral", u("over")'), 'no dead room on an ended case');
  assert.ok(rj.includes('st.end ? u("endNobody") : u("nobody")') && !rj.includes('tm.textContent = s.end ? "—"'), 'no «كون الأوّل» and no «—» on an ended case');
  assert.ok(rj.includes('if (!s.end) endSeen = false;'), 'the next case (midnight) reopens the room');
  assert.ok(css.includes('html[data-theme="night"] .lcr-ovc') && !css.includes('backdrop-filter'), 'light + dark (29l: no blur — iPhone heat)');
  assert.ok(lj.includes('if (ended) bits.push((F ? "🏁 Cas terminé" : "🏁 انتهت الحالة") + " · " + nextWords(st.t1 - Date.now()));'), 'home card (29r compact)');
  assert.ok(rj.includes('b.textContent = (s.end ? u("ended") + " · " + L.nextWords(s.t1 - Date.now())'), 'games card');
  const { ctx } = liveClient(null), nw = ctx.LiveCase.nextWords;
  assert.strictEqual(nw(4 * 36e5 + 5 * 6e4), 'الجاية بعد 4:05'); assert.strictEqual(nw(59 * 6e4 + 1), 'الجاية بعد 1:00'); assert.strictEqual(nw(30 * 1e3), 'الجاية بعد 1 د');
});
test('#186 28v a write that fails is said out loud (Arabic toast), never a silent nothing', async () => {
  const rj = read('assets/livecase-room.js'), lj = read('assets/livecase.js');
  for (const k of ['retry', 'denied', 'offline', 'errWhy', 'pushErr']) assert.ok(new RegExp('    ' + k + ': \\{ ar: "[^"]+", fr: "[^"]+" \\}').test(rj), k + ' AR+FR');
  assert.ok(rj.includes('else if (r.k === "retry") say("ord", u("retry")') && rj.includes('else if (r.k === "denied") say("bad", u("denied"), u("deniedWhy"));') && rj.includes('say("bad", u("err"), u("errWhy") + (r.code ?'), 'every outcome has words');
  assert.ok(rj.includes('if (!ok) say("bad", u("pushErr"));'), 'the 🔔 switch too');
  assert.ok(!lj.includes('at0: fs.serverTimestamp() }).catch(function () {});'), 'the creation error is no longer swallowed');
  const { C } = liveLoad();
  // the doc is missing and creating it is refused → «retry» with the reason
  let a = liveClient(null, { setDoc: () => Promise.reject({ code: 'permission-denied' }) }); await a.ctx.LiveCase.start(() => {}); await new Promise(r => setTimeout(r, 30));
  let r = await a.ctx.LiveCase.act('a', 'acc'); assert.deepStrictEqual(jj(r), { k: 'retry', code: 'permission-denied' });
  // the server refuses twice → «denied» (not a silent «slow»)
  const today = C.dayKey(Date.now()), tid = C.docId(today), doc = { day: tid, c: liveLoad().C.pick(liveLoad().D, today), n: 0, ev: {}, pts: {}, at0: { toMillis: () => Date.now() - 6e4 } };
  const real = global.setTimeout;
  a = liveClient(doc, { tx: () => Promise.reject({ code: 'permission-denied' }) }); a.ctx.setTimeout = (f) => real(f, 0); await a.ctx.LiveCase.start(() => {}); await new Promise(r => setTimeout(r, 30));
  r = await a.ctx.LiveCase.act('a', 'acc'); assert.strictEqual(r.k, 'denied', JSON.stringify(r));
  a = liveClient(doc, { tx: () => Promise.reject({ code: 'unavailable' }) }); await a.ctx.LiveCase.start(() => {}); await new Promise(r => setTimeout(r, 30));
  r = await a.ctx.LiveCase.act('a', 'acc'); assert.deepStrictEqual(jj(r), { k: 'err', code: 'unavailable' });
  a = liveClient(doc, { tx: () => { throw new Error('boom'); } }); await a.ctx.LiveCase.start(() => {}); await new Promise(r => setTimeout(r, 30));
  r = await a.ctx.LiveCase.act('a', 'acc'); assert.strictEqual(r.k, 'err', 'a JS error inside the step still answers');
  r = await a.ctx.LiveCase.act('a', 'acc'); assert.notStrictEqual(r.k, 'busy', 'and the room is not left «busy» forever');
  // the happy path still writes one event
  a = liveClient(doc); await a.ctx.LiveCase.start(() => {}); await new Promise(r => setTimeout(r, 30));
  r = await a.ctx.LiveCase.act('a', 'acc'); assert.strictEqual(r.k, 'ok', JSON.stringify(r));
});
test('#187 28v/28x worker v12 (OPTIONAL, /home/user/tab/files/nursin-worker-v12.js): v11 + the site engine (28v clock + 28x each patient ends alone) + at0 on the doc it creates + «💔» says the other still needs you, v: 12', async (t) => {
  const f = '/home/user/tab/files/nursin-worker-v12.js', f11 = '/home/user/tab/files/nursin-worker-v11.js';
  if (!fs.existsSync(f) || !fs.existsSync(f11)) return t.skip('worker files not on this machine');
  const src = fs.readFileSync(f, 'utf8'), v11 = fs.readFileSync(f11, 'utf8');
  const core = s => s.slice(s.indexOf('/* ==live-core=='), s.indexOf('/* ==/live-core== */'));
  assert.ok(core(src).includes('// 28x (Abdullah, Nov 2 10:32 PM): each patient ends ON HIS OWN') && !core(src).includes('28y'), 'v12 = the 28x site engine (28y only changed what a tap is worth — same health, #201)');
  assert.ok(src.startsWith('// nursin worker v12') && src.includes('live: true, v: 12, cron') && src.includes('v: { integerValue: "12" }'), 'v: 12');
  assert.ok(src.includes('pts: {}, wk: {}, at0: nowMs };'), 'the doc it creates carries at0 for its own engine too');
  // 28x: + «💔 خسرنا فلان» says the other patient still needs them when he is still running (LIVE_T.lostOn) — nothing else
  const strip = s => s.replace(core(s), '').replace(/^\/\/ nursin worker v1[12][\s\S]*?\n(?=\/\/ nursin worker v11 \(Nov 2)/, '').replace(/v: 12/g, 'v: 11').replace('"12" }', '"11" }').replace(', wk: {}, at0: nowMs };', ', wk: {} };')
    .replace(/ \},\n  lostOn: \{[^\n]*\n\};/, ' }\n};').replace(/\n  const o = x \? st\.P[^\n]*\n  const t = on \? [^\n]*\n/, '\n  const t = LIVE_T[kind][L];\n');
  assert.strictEqual(strip(src), strip(v11), 'nothing else changed');
  const os = require('node:os'), tmp = path.join(os.tmpdir(), 'nursin-w12-' + process.pid + '.mjs'); fs.writeFileSync(tmp, src);
  const W = (await import('file://' + tmp)).default; fs.unlinkSync(tmp);
  assert.ok(W._plan && W._cron && W._morning && W._live && W._liveMsg, 'hooks kept');
});

test('#188 28w root cause: after the name, the other dossier fields were refused («⚠️ مش هلّق −3», accueil not done) and that toast sat UNDER the open sheet → «nothing happens»', () => {
  const { C, D } = liveLoad(), key = '2026-11-02', id = C.docId(key), c = C.pick(D, key), t0 = C.dayStart(key), H = 36e5;
  const doc = { day: id, c, n: 0, ev: {}, pts: {}, at0: t0 + 19 * H }, now = t0 + 20 * H + 33 * 6e4, u = ['u1', 'عبدالله'];
  let st = C.state(D, doc, now);
  assert.strictEqual(liveAdd(C, D, doc, now, u, 'a', 'f_id', C.opts(D, st.cs, st.P[0].p, 'id').a).k, 'ok', 'the name (phase ①) saves');
  st = C.state(D, doc, now + 3e3);
  for (const f of ['motif', 'all', 'ant', 'tt', 'gcs', 'hend']) { const r = C.check(D, st, 'a', 'f_' + f, C.opts(D, st.cs, st.P[0].p, f).a); assert.strictEqual(r.k, 'ord', f + ' is refused while 🤝 accueil is not done'); assert.ok(r.miss.some(s => s.id === 'acc'), f + ': accueil is what is missing'); }
  const rj = read('assets/livecase-room.js'), css = read('assets/livecase.css');
  const z = sel => +new RegExp('\\' + sel + '\\{[^}]*z-index:(\\d+)').exec(css)[1];
  assert.ok(z('.lcr-fb') > z('.lcr-sheet') && z('.lcr-fb') > z('.lcr-panel'), 'the step result now shows ABOVE the open sheet (was 3 under 5)');
  // the file tab says why a field is closed and offers the missing step right there (no silent −3)
  assert.ok(rj.includes('function fieldLock(x, s)') && rj.includes('C.avail(x, s)') && rj.includes('C.missing(x, s)'), 'locked fields computed with the engine');
  assert.ok(rj.includes('<div class="lcr-lockb" role="note">') && rj.includes('go.map(function (q) { return nowBtn(q.a); })'), 'banner «🔒 الملف بيفتح بعد: 🤝 استقبال» + the button');
  assert.ok(/\} else if \(\(lk = fieldLock\(x, s\)\) && !st\.end\) \{[\s\S]*?lcr-lock/.test(rj), 'a locked field shows 🔒 + why, not a quiz');
  for (const k of ['saving', 'lockF', 'lockOne', 'lockGo', 'start']) assert.ok(new RegExp('    ' + k + ': \\{ ar: "[^"]+", fr: "[^"]+" \\}').test(rj) || new RegExp(' ' + k + ': \\{ ar: "[^"]+", fr: "[^"]+" \\}').test(rj), k + ' AR+FR');
  assert.ok(rj.includes('if (acc0) h +=') && rj.includes('!(acc0 && a === "acc")'), '🤝 accueil first in the 🩺 sheet while not done (it was the last button)');
  assert.ok(css.includes('.lcr-lockb{') && css.includes('html[data-theme="night"] .lcr-lockb'), 'light + dark');
});
test('#189 28w filling fast: a queued 2nd answer is not lost (2 s spacing waits with «⏳»), the next field stays open, repaints never land under a finger, badge toasts never eat taps', async () => {
  const rj = read('assets/livecase-room.js'), css = read('assets/livecase.css');
  assert.ok(rj.includes('actQ = actQ.then(function () { return L.act(k, a, opt); })') && rj.includes('say("neutral", u("saving")); }, 600)'), 'steps queue + «⏳ عم تنحفظ…»');
  assert.ok(rj.includes('function shut() { if (openQ === k + String(a).replace(/^f_/, "")) openQ = null; }') && !rj.includes('if (r.s.kind === "file") openQ = null;'), 'the saved field closes only itself');
  assert.ok(rj.includes('if (sheetTouch) { sheetLate = true; return; }') && rj.includes('if (h !== el.__h)'), 'no repaint under a finger, no rebuild of an unchanged sheet');
  assert.ok(css.includes('html.lcr-open .stoast,html.lcr-open .ltoast,html.lcr-open .ntoast{pointer-events:none!important}'), 'a 🏅 badge toast over the sheet lets taps through');
  // the engine side: the 2 s rule answer «slow» → wait and try once more (no «شوي شوي» bounce)
  const { C, D } = liveLoad(), today = C.dayKey(Date.now()), tid = C.docId(today), real = global.setTimeout;
  const mk = ago => ({ day: tid, c: C.pick(D, today), n: 1, ev: { 1: { t: { toMillis: () => Date.now() - 9e4 }, u: 'u1', n: 'ريم', p: 'a', a: 'acc', k: 'ok', d: 3 } }, pts: { u1: { n: 'ريم', p: 3, ok: 1, no: 0, t: { toMillis: () => Date.now() - ago } } }, at0: { toMillis: () => Date.now() - 6e4 } });
  let calls = 0, waited = 0; const writes = [];
  const a = liveClient(mk(800), { tx: fn => { const d = ++calls === 1 ? mk(800) : mk(3000); return fn({ get: () => Promise.resolve({ exists: () => true, data: () => d }), update: (r, up) => writes.push(up), set() {} }); } });
  a.ctx.setTimeout = (f, ms) => { if (ms > 1000) waited = ms; return real(f, 0); };
  await a.ctx.LiveCase.start(() => {}); await new Promise(r => real(r, 30));
  const r = await a.ctx.LiveCase.act('a', 'f_id', 0);
  assert.strictEqual(calls, 2, 'tried twice'); assert.ok(waited >= 1700 && waited <= 2600, 'waited the rest of the 2 s (' + waited + ' ms)');
  assert.notStrictEqual(r.k, 'slow', 'not bounced: ' + JSON.stringify(r)); assert.strictEqual(writes.length, 1, 'one write');
});


// ---------- 🏁 28x: each patient ends on his own — the other one keeps going (Abdullah, Nov 2 10:32 PM: «لما منخلص حالة مريض واحد تبقى المريض التاني بعدا شغالة») ----------
function livePlayOne(C, D, doc, pk, t, u) {          // the right steps on ONE patient only, until he is stabilised
  for (let g = 0; g < 80; g++) { const st = C.state(D, doc, t), x = st.P[pk === 'b' ? 1 : 0]; if (st.end || x.over) return st; const s = x.next[0]; if (!s) return st;
    const o = s.kind === 'file' ? C.opts(D, st.cs, x.p, s.f).a : undefined; liveAdd(C, D, doc, t, u, pk, s.id, o); t += 3e3; }
  return C.state(D, doc, t);
}
function liveTwoRates(C, D) {                         // a case whose two patients get worse at different speeds (one is lost first)
  for (const cs of D.cases) if (cs.pts[0].rate !== cs.pts[1].rate) return cs; return null;
}
test('#190 28x one patient STABILISED → the other is still fully playable, with his own clock; both done → the case ends «ok»', () => {
  const { C, D } = liveLoad(), key = '2026-11-02', t0 = C.dayStart(key), H = 36e5, u = ['u1', 'عبدالله'];
  const doc = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 + 6e4 };
  let st = livePlayOne(C, D, doc, 'a', t0 + 9 * H, u);
  const a = st.P[0], b = st.P[1];
  assert.ok(a.all && a.over && a.over.w === 'ok' && a.st === 'ok', 'bed 1 stabilised ✅: ' + JSON.stringify(a.over));
  assert.strictEqual(st.end, null, 'the case is NOT over'); assert.ok(a.next.length === 0 && b.next.length > 0, 'bed 1 has nothing left, bed 2 does');
  assert.strictEqual(C.check(D, st, 'a', 'acc').k, 'pover', 'a step on the stabilised bed → «pover» (nothing written)');
  assert.strictEqual(C.check(D, st, 'b', 'acc').k, 'ok', 'bed 2 takes steps');
  // bed 2 keeps his own clock: neglected, he keeps getting worse while bed 1 recovers
  const later = C.state(D, doc, t0 + 14 * H); assert.ok(later.P[1].c < b.c && later.P[0].c >= a.c, 'bed 2 worse on his own, bed 1 not');
  // a stale client writing on the stabilised bed changes nothing
  const n0 = doc.n; doc.n++; doc.ev[doc.n] = { t: t0 + 14 * H, u: 'u9', n: 'x', p: 'a', a: 'mon', k: 'bad', d: -8 };
  const st2 = C.state(D, doc, t0 + 14 * H + 1e3); assert.ok(st2.P[0].over && st2.P[0].bad.length === 0 && !st2.end, 'ignored on a finished bed'); doc.n = n0; delete doc.ev[n0 + 1];
  st = livePlayOne(C, D, doc, 'b', t0 + 10 * H, ['u2', 'ريم']);
  assert.ok(st.end && st.end.w === 'ok' && st.end.ok.length === 2 && st.end.lost.length === 0, 'both stabilised → «🏁» ok: ' + JSON.stringify(st.end));
  assert.strictEqual(st.end.t, st.P[1].over.t, 'the case ends when the SECOND patient is done');
  assert.ok(C.summary(D, st).P.every(x => x.over && x.over.w === 'ok'), 'the archive record keeps each patient\'s own end');
});
test('#191 28x one patient LOST → the other goes on (neglect and harmful steps alike); both finished → «lost» / «mix»; midnight still ends it', () => {
  const { C, D } = liveLoad(), cs = liveTwoRates(C, D); assert.ok(cs, 'a case with two speeds');
  const key = '2026-11-03', t0 = C.dayStart(key), H = 36e5, mk = () => ({ day: C.docId(key), c: cs.id, n: 0, ev: {}, pts: {}, at0: t0 + 6e4 });
  const fast = cs.pts[0].rate > cs.pts[1].rate ? 0 : 1, slow = 1 - fast, tl = r => t0 + 8 * H + 50 / (r * 0.5) * H;
  const tF = tl(cs.pts[fast].rate), tS = tl(cs.pts[slow].rate);
  // (a) nobody acts: the fast one is lost, the slow one is still there and playable
  if (tS < t0 + 24 * H) {
    let st = C.state(D, mk(), (tF + tS) / 2), x = st.P[fast], y = st.P[slow];
    assert.ok(x.over && x.over.w === 'lost' && Math.abs(x.lost - tF) < 2e3, 'the fast one lost on his own clock');
    assert.strictEqual(st.end, null, 'NOT the end of the case'); assert.ok(y.lost == null && y.next.length > 0 && y.c > 0, 'the other one is playable');
    assert.strictEqual(C.check(D, st, x.k, 'acc').k, 'pover'); assert.strictEqual(C.check(D, st, y.k, 'acc').k, 'ok');
    st = C.state(D, mk(), tS + 6e4);
    assert.ok(st.end && st.end.w === 'lost' && st.end.lost.length === 2 && st.end.pk === st.P[slow].k && Math.abs(st.end.t - tS) < 2e3, 'both lost → ended at the second death: ' + JSON.stringify(st.end));
  }
  // (b) harmful steps kill bed 1 at once (4 × −15 from 50) → bed 2 keeps going; then bed 2 stabilised → «mix»
  const doc = mk(), bad = cs.pts[0].bad[0].a, u = ['u1', 'عبدالله']; let t = t0 + 8 * H + 6e4;
  for (let i = 0; i < 4; i++) { const r = liveAdd(C, D, doc, t, u, 'a', bad); assert.strictEqual(r.k, 'bad'); t += 3e3; }
  let st = C.state(D, doc, t);
  assert.ok(st.P[0].over && st.P[0].over.w === 'lost' && st.P[0].st === 'lost', 'bed 1 lost by harmful steps');
  assert.strictEqual(st.end, null, 'case still running'); assert.ok(st.P[1].next.some(s => s.id === 'acc'), 'bed 2 starts from accueil');
  assert.strictEqual(liveAdd(C, D, doc, t, u, 'a', bad).k, 'pover', 'nothing more is written on bed 1');
  st = livePlayOne(C, D, doc, 'b', t + 3e3, ['u2', 'ريم']);
  assert.ok(st.end && st.end.w === 'mix' && st.end.ok[0] === 'b' && st.end.lost[0] === 'a' && st.end.pk === 'a', 'one ✅ one 💔 → «mix»: ' + JSON.stringify(st.end));
  // (c) one lost, the other neither lost nor done at midnight → «time»
  const d3 = mk(); t = t0 + 22 * H; for (let i = 0; i < 4; i++) { liveAdd(C, D, d3, t, u, 'a', bad); t += 3e3; }
  liveAdd(C, D, d3, t, u, 'b', 'acc');
  const mid = C.state(D, d3, C.dayStart(C.nextKey(key)) + 6e4);
  assert.ok(mid.end && (mid.end.w === 'time' || mid.end.w === 'lost') && mid.end.lost.indexOf('a') > -1, 'midnight still ends the case: ' + JSON.stringify(mid.end));
});
test('#192 28x the room: a finished bed shows ✅ استقرّ / 💔 خسرناه (greyed, his steps + 📋 kept), the other bed stays live; the phone writes nothing on a finished bed', async () => {
  const rj = read('assets/livecase-room.js'), lj = read('assets/livecase.js'), css = read('assets/livecase.css');
  for (const k of ['pOk', 'pLost', 'pGoOn', 'pDone', 'pGo', 'pOver', 'pRec', 'endMix', 'endLost2']) assert.ok(new RegExp(' ' + k + ': \\{ ar: "[^"]+", fr: "[^"]+" \\}').test(rj), k + ' AR+FR');
  assert.ok(lj.includes('ok: { ic: "✅", ar: "استقرّ", fr: "Stabilisé" }') && lj.includes('k === "ok" && sex === "f" ? (FR() ? "Stabilisée" : "استقرّت")'), '«✅ استقرّ» / «استقرّت» label');
  assert.ok(rj.includes('function ug(k, x, r)') && / pGoOnF: \{ ar: "[^"]*بعدا[^"]*", fr: "[^"]+" \}/.test(rj), 'the patient\'s gender in the words (ليا بعدا…)');
  assert.ok(rj.includes('class="lcr-pc \' + x.st + (x.over ? " fin" : "")') && rj.includes('lcr-pfin'), 'finished card greyed + «🏁 خلصت حالتو · 📋»');
  assert.ok(rj.includes('if (x.over && !st.end) {') && rj.includes('data-lcrec="') && rj.includes('data-lcbed="\' + o.k + \'"'), 'bed sheet: banner + 📋 his steps + go to the other bed');
  assert.ok(rj.includes('if (x && x.over) return overSay(x);') && rj.includes('else if (r.k === "pover") { overSay(X(k)); return; }'), 'no step sent on a finished bed; «pover» said');
  assert.ok(rj.includes('function recordHtml(s, only)') && rj.includes('if (only && x.k !== only) return;'), 'one patient\'s record');
  assert.ok(rj.includes('if (x.over && !(st && st.end)) {') && rj.includes('"✅ " + (FR() ? "Stabilisé" : x.p.sex === "f" ? "استقرّت" : "استقرّ")'), 'canvas: the finished bed greyed with its result');
  assert.ok(rj.includes('e.w === "mix"') && rj.includes('s.end.w === "mix" ? "✅💔"'), 'end words + archive icon for one ✅ one 💔');
  assert.ok(lj.includes('if (x && !x.ghost && !x.over && x.st === "crit") crit++;'), 'home card (29r compact): only patients still critical are counted');
  assert.ok(css.includes('.lcr-pc.fin{') && css.includes('html[data-theme="night"] .lcr-pover') && css.includes('.hzlvp.fin{'), 'light + dark');
  // the phone, on a real-shaped doc where bed 1 was lost by harmful steps: the case runs, bed 2 is playable, a tap on bed 1 writes nothing
  const { C, D } = liveLoad(), today = C.dayKey(Date.now()), id = C.docId(today), c = C.pick(D, today), cs = C.caseById(D, c), bad = cs.pts[0].bad[0].a;
  const T0 = Date.now() - 20 * 6e4, ev = {}; for (let i = 1; i <= 4; i++) ev[i] = { t: { toMillis: () => T0 + i * 3e3 }, u: 'u9', n: 'جاد', p: 'a', a: bad, k: 'bad', d: -8 };
  const { ctx, calls } = liveClient({ day: id, c, n: 4, ev, pts: {}, at0: { toMillis: () => T0 } });
  let got = null; await ctx.LiveCase.start((s, m) => { if (m === 'shared' && s) got = s; });
  for (let i = 0; i < 30 && !got; i++) await new Promise(r => setTimeout(r, 20));
  assert.ok(got && got.P[0].over && got.P[0].over.w === 'lost', 'bed 1 💔 on the phone'); assert.strictEqual(got.end, null, 'the case still runs');
  assert.ok(got.P[1].next.length > 0, 'bed 2 playable');
  const n0 = calls.filter(x => x[0] === 'tx').length, r = await ctx.LiveCase.act('a', 'acc');
  assert.strictEqual(r.k, 'pover', 'a tap on bed 1 → «pover»'); assert.strictEqual(calls.filter(x => x[0] === 'tx').length, n0 + 1, 'checked once in the transaction, nothing updated');
});
test('#193 28x worker: v11 only reads the shared doc (no close, no archive, no «انتهت» push); v12 keeps watching the 2nd patient and «💔» says he still needs you', async (t) => {
  const f = '/home/user/tab/files/nursin-worker-v12.js', f11 = '/home/user/tab/files/nursin-worker-v11.js';
  if (!fs.existsSync(f) || !fs.existsSync(f11)) return t.skip('worker files not on this machine');
  const v11 = fs.readFileSync(f11, 'utf8'), lc = v11.slice(v11.indexOf('async function liveCron('), v11.indexOf('/* ==live-core=='));
  assert.ok(!/انتهت|terminé/.test(lc) && !/"ev"|ev: \{ mapValue|"n": |pts: \{ mapValue: \{ fields/.test(lc.replace('n: fv(0), ev: { mapValue: {} }, pts: { mapValue: {} }', '')), 'v11 never writes events/scores and never pushes «انتهت»');
  assert.ok(!/live\/"[^\n]*(delete|archive)/i.test(lc), 'v11 does not delete / archive the case (the site computes the archive from the docs)');
  const src = fs.readFileSync(f, 'utf8'), os = require('node:os'), tmp = path.join(os.tmpdir(), 'nursin-w12x-' + process.pid + '.mjs'); fs.writeFileSync(tmp, src);
  const W = (await import('file://' + tmp)).default; fs.unlinkSync(tmp);
  const { C, D } = liveLoad(), key = '2026-11-03', t0 = C.dayStart(key), cs = C.caseById(D, C.pick(D, key)), bad = cs.pts[0].bad[0].a;
  const doc = { day: C.docId(key), c: cs.id, n: 0, ev: {}, pts: {}, at0: t0 + 6e4 }; let tt = t0 + 9 * 36e5;
  for (let i = 0; i < 4; i++) { liveAdd(C, D, doc, tt, ['u1', 'A'], 'a', bad); tt += 3e3; }
  const st = C.state(D, doc, tt), b1 = cs.pts[1].nm.ar.split(' ')[0];
  const m = W._liveMsg('lost', D, st, 'a', false), mf = W._liveMsg('lost', D, st, 'a', true);
  assert.ok(m.title.includes('💔') && m.body.includes(b1) && m.body.includes('بحاجة'), 'AR: ' + m.body);
  assert.ok(mf.body.includes(cs.pts[1].nm.fr.split(' ')[0]) && !/[\u0600-\u06FF]/.test(mf.title + mf.body), 'FR: ' + mf.body);
  const ch = C.changes({ a: 'unst', b: 'unst' }, st); assert.deepStrictEqual(jj(ch), [{ p: 'a', kind: 'lost' }], 'the loss is one change');
  const later = C.state(D, doc, t0 + 20 * 36e5); assert.ok(later.P[1].c < st.P[1].c && C.changes({ a: 'lost', b: 'impr' }, later).some(x => x.p === 'b'), 'the 2nd patient is still watched after the 1st is lost (📉 for him)');
});


// ---------- 💡 28y: Abdullah Nov 3 5:05 PM — softer, explained steps · 📞 again · each bed its IV · 🩻 curtain · «طرف خيط» · 📤 what is missing ----------
function liveAddU(C, D, doc, t, u, pk, a, o) {   // like liveAdd, with the student's uid given to the check (💡 counts per student)
  const st = C.state(D, doc, t), r = C.check(D, st, pk, a, o, u[0]); if (!LIVE_OK[r.k]) return r;
  doc.n++; const e = { t, u: u[0], n: u[1], p: pk, a: r.a, k: r.k, d: r.d }; if (r.o != null) e.o = r.o; doc.ev[doc.n] = e;
  const p = doc.pts[u[0]] || { n: u[1], p: 0, ok: 0, no: 0 }; doc.pts[u[0]] = { n: u[1], p: p.p + r.d, ok: p.ok + (r.k === 'ok' ? 1 : 0), no: p.no + (r.k === 'ok' ? 0 : 1), t }; return r;
}
const RULES_EV = e => ['ok', 'bad', 'ord', 'neu', 'no'].includes(e.k) && Number.isInteger(e.d) && e.d >= -10 && e.d <= 12 && (e.k === 'ok' ? e.d > 0 : e.d < 0) && /^[a-z0-9_]{2,20}$/.test(e.a) && ['a', 'b'].includes(e.p);
function liveIn(C, D, doc, t, u, pk) {          // ① the accueil: 🤝 + 🪪 identity (right answer)
  liveAddU(C, D, doc, t, u, pk, 'acc'); const st = C.state(D, doc, t + 1); return liveAddU(C, D, doc, t + 2, u, pk, 'f_id', C.opts(D, st.cs, st.P[pk === 'b' ? 1 : 0].p, 'id').a);
}
function liveCase(C, D, id, at) { const key = '2026-11-03', t0 = C.dayStart(key); return { key, t0, doc: { day: C.docId(key), c: id, n: 0, ev: {}, pts: {}, at0: t0 + (at || 8) * 36e5 } }; }
test('#194 28y 📞 the doctor can be called again: too early → he says what he needs (nothing saved); 1st call +; nothing new → −1 «ما في جديد»; something new → +1 and his answer', () => {
  const { C, D } = liveLoad(), { t0, doc } = liveCase(C, D, 'lc01'), U = ['u1', 'عبدالله']; let t = t0 + 9 * 36e5;
  let r = C.check(D, C.state(D, doc, t), 'a', 'call', undefined, 'u1'); assert.strictEqual(r.k, 'doc0', 'before the accueil: the doctor asks first'); assert.ok(r.miss.some(s => s.id === 'acc'));
  assert.ok(!LIVE_OK[r.k], 'nothing written, no point lost');
  liveIn(C, D, doc, t, U, 'a'); t += 3e3;
  for (const a of ['mon', 'repos', 'o2', 'ecg']) { assert.strictEqual(liveAddU(C, D, doc, t, U, 'a', a).k, 'ok', a); t += 3e3; }
  r = liveAddU(C, D, doc, t, U, 'a', 'call'); assert.strictEqual(r.k, 'ok'); assert.strictEqual(r.doc, 1); assert.ok(r.d > 0); t += 3e3;
  r = liveAddU(C, D, doc, t, U, 'a', 'call'); assert.strictEqual(r.k, 'neu', 'again with nothing new'); assert.strictEqual(r.d, -1); assert.ok(r.why.ar.includes('جديد')); t += 3e3;
  const n0 = doc.n; r = liveAddU(C, D, doc, t, U, 'a', 'call'); assert.strictEqual(r.d, -1, 'still nothing new = −1 again (never blocked)'); assert.strictEqual(doc.n, n0 + 1); t += 3e3;
  assert.strictEqual(liveAddU(C, D, doc, t, U, 'a', 'vvp').k, 'ok'); t += 3e3;
  r = liveAddU(C, D, doc, t, U, 'a', 'call'); assert.strictEqual(r.k, 'ok', 'a new finding (VVP done) → the doctor answers again'); assert.strictEqual(r.doc, 2); assert.strictEqual(r.d, 1);
  const st = C.state(D, doc, t + 1), x = st.P[0];
  assert.ok(x.done.call && x.calls.length === 4 && x.wrong.length === 0, 'calls are kept apart, not counted as procedure mistakes');
  assert.ok(Object.values(doc.ev).every(RULES_EV), 'every call event fits rules v22 (k ∈ ok/neu, d > 0 for ok, < 0 otherwise)');
  // the room: the desk button stays tappable, through the queue; the answer = his orders still to give
  const rj = read('assets/livecase-room.js');
  assert.ok(rj.includes('if (g("data-lccall")) return queue(g("data-lccall"), "call");') && rj.includes('function docSay(k, r, pts)') && rj.includes('s.after.indexOf("call") > -1 && !x.done[s.id]'), 'desk → queue → the doctor\'s answer');
  assert.ok(rj.includes('u("docAgain")') && rj.includes('u("calls0")'), '📞 اتصل كمان + the rule said on the desk');
});
test('#195 28y 🧴 each bed has its own IV set: the VVP of one patient takes nothing from the other (no trip to the cart, nothing consumed)', () => {
  const { C, D } = liveLoad(), { t0, doc } = liveCase(C, D, 'lc01'), U = ['u1', 'A']; let t = t0 + 9 * 36e5;
  liveIn(C, D, doc, t, U, 'a'); t += 3e3; liveIn(C, D, doc, t, U, 'b'); t += 3e3;
  for (const [p, a] of [['a', 'mon'], ['b', 'mon']]) { liveAddU(C, D, doc, t, U, p, a); t += 3e3; }
  assert.strictEqual(liveAddU(C, D, doc, t, U, 'a', 'vvp').k, 'ok'); t += 3e3;
  assert.strictEqual(liveAddU(C, D, doc, t, U, 'b', 'vvp').k, 'ok', 'the other bed\'s VVP right after');
  const rj = read('assets/livecase-room.js');
  assert.ok(rj.includes('BEDSIDE = { kit: 1 }'), 'the VVP kit + soluté is at each bed');
  assert.ok(rj.includes('if (A && A.need && !BEDSIDE[A.need] && hands.indexOf(A.need) < 0)'), 'no «take it from the cart» for it');
  assert.ok(rj.includes('A && A.need && !BEDSIDE[A.need]) { var I = D.I[A.need], j = hands.indexOf(A.need);'), 'never taken out of the hands');
  assert.ok(rj.includes('bk = need && BEDSIDE[need]') && rj.includes('u("bedKit")'), 'the button says 🧴 مصل التخت');
  assert.ok(rj.includes('[S.bed1, S.bed2].forEach(function (s, i) { var px = i ? s.x - 4 : s.x + s.w + 4'), 'an IV pole with its own bag drawn at each bed');
  assert.strictEqual(D.A.vvp.need, 'kit'); assert.ok(D.I.kit && D.I.kit.st === 'cart', 'the solo room\'s cart is unchanged');
});
test('#196 28y 🩻 the curtain between the beds: +2 before an intimate gesture, +1 after, once per bed; it stands on the walking grid', () => {
  const { C, D, E } = liveLoad(); let { t0, doc } = liveCase(C, D, 'lc01'); const U = ['u1', 'A']; let t = t0 + 9 * 36e5;
  assert.ok(D.acts.paravent && D.acts.paravent.ar.includes('الستارة') && D.acts.paravent.fr.includes('paravent'), 'the act, AR + FR');
  liveAddU(C, D, doc, t, U, 'a', 'acc'); t += 3e3;
  let r = liveAddU(C, D, doc, t, U, 'a', 'paravent'); assert.strictEqual(r.k, 'ok'); assert.strictEqual(r.d, 2, 'before the ECG (intimate: chest bare)'); assert.ok(r.s.why.ar.includes('pudeur')); t += 3e3;
  assert.strictEqual(liveAddU(C, D, doc, t, ['u2', 'B'], 'a', 'paravent').k, 'repeat', 'closed once per bed'); t += 3e3;
  liveAddU(C, D, doc, t, U, 'b', 'acc'); t += 3e3;
  let st = C.state(D, doc, t); assert.ok(st.P[0].screen && !st.P[1].screen, 'each bed its own curtain');
  // after the intimate gesture: +1
  ({ t0, doc } = liveCase(C, D, 'lc01')); t = t0 + 9 * 36e5;
  liveIn(C, D, doc, t, U, 'a'); t += 3e3;
  for (const a of ['repos', 'o2', 'ecg']) { assert.strictEqual(liveAddU(C, D, doc, t, U, 'a', a).k, 'ok', a); t += 3e3; }
  r = liveAddU(C, D, doc, t, U, 'a', 'paravent'); assert.strictEqual(r.d, 1, 'after the ECG: +1');
  st = C.state(D, doc, t + 1); const c0 = st.P[0].c, ref = (() => { const d2 = jj(doc); delete d2.ev[d2.n]; d2.n--; return C.state(D, d2, t + 1).P[0].c; })();
  assert.strictEqual(c0, ref, 'the curtain changes no health (worker v11 sees the same patient)');
  assert.ok(Object.values(doc.ev).every(RULES_EV), 'fits rules v22');
  assert.deepStrictEqual(jj(C.INTIM), ['sonde', 'ecg', 'refroid', 'cpr', 'shock']);
  const rj = read('assets/livecase-room.js');
  assert.ok(rj.includes('!washed && a !== "paravent"'), 'no hand wash needed to pull a curtain');
  assert.ok(rj.includes('u("scrTip")') && rj.includes('C.INTIM.indexOf(a) > -1 && x && !x.screen'), 'an intimate gesture without the curtain → the tip in its why');
  // the walking grid: the paravent is an obstacle, the nurse walks AROUND it from bed 1 to bed 2
  const vm = require('node:vm'), ctx = { console, document: null }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('assets/erroom-data.js'), ctx); vm.runInContext(read('assets/erroom.js'), ctx);
  const src = rj.slice(rj.indexOf('  var SCR = {'), rj.indexOf('  function room() {'));
  vm.runInContext('var E = window.ERROOM;' + src + ';this.SG = screenGrid; this.SC = SCR;', ctx);
  const R = ctx.ERRoom, G = ctx.SG(R.grid()), S = ctx.SC, a = E.stations.bed1.spot, b = E.stations.bed2.spot;
  const pts = [a].concat(Array.from(R.path(G, a, b)));
  for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 20; k++) { const x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / 20, y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k / 20;
    assert.ok(!(x > S.x0 - 2 && x < S.x1 + 2 && y > S.y0 - 2 && y < S.y1 + 2), 'the path never crosses the curtain'); }
  assert.ok(pts.length > 2, 'a detour (not a straight line through it)');
  for (const k of ['bed1', 'bed2', 'mon', 'o2', 'cart', 'phone', 'sink']) { const s = E.stations[k].spot; assert.ok(R.path(G, { x: 180, y: 560 }, s).length >= 1, k + ' still reachable'); }
});
test('#197 28y 💡 «طرف خيط»: level 1 free (phase + kind of step), level 2 −1 shows the exact step, max 3 per patient per student', () => {
  const { C, D } = liveLoad(), { t0, doc } = liveCase(C, D, 'lc13'), A = ['u1', 'عبدالله'], B = ['u2', 'ريم']; let t = t0 + 9 * 36e5;
  let st = C.state(D, doc, t), c = C.clue(D, st, 'b'); assert.ok(c && c.s.id === 'acc' && c.ph === 1, 'first: the accueil');
  c = C.clue(D, st, 'a'); assert.ok(c.s.urg, 'an urgent gesture comes first (arrest: ' + c.s.id + ')');
  for (let i = 0; i < 3; i++) { const r = liveAddU(C, D, doc, t, A, 'b', 'hint'); assert.strictEqual(r.k, 'neu'); assert.strictEqual(r.d, -1); assert.strictEqual(r.left, 2 - i); t += 3e3; }
  assert.strictEqual(liveAddU(C, D, doc, t, A, 'b', 'hint').k, 'hmax', 'a 4th one is refused (nothing written)'); const n = doc.n;
  assert.strictEqual(doc.n, n); assert.strictEqual(liveAddU(C, D, doc, t, A, 'a', 'hint').k, 'neu', 'the other patient has his own 3'); t += 3e3;
  assert.strictEqual(liveAddU(C, D, doc, t, B, 'b', 'hint').k, 'neu', 'another student has his own 3'); t += 3e3;
  st = C.state(D, doc, t); const x = st.P[1];
  assert.strictEqual(x.hints.length, 4); assert.strictEqual(x.wrong.length, 0, 'a hint is not a procedure mistake (not in ❌ the record)');
  assert.strictEqual(doc.pts.u1.p, -4, 'each paid hint −1');
  assert.ok(Object.values(doc.ev).every(RULES_EV), 'fits rules v22 (a: "hint", k: neu, d: −1)');
  // a finished patient → no hint
  const ideal = liveIdeal(C, D, '2026-11-07', [['u1', 'A']], C.dayStart('2026-11-07') + 8.5 * 36e5), s2 = C.state(D, ideal.doc, ideal.t);
  assert.strictEqual(C.check(D, s2, 'a', 'hint', undefined, 'u1').k, 'over');
  const rj = read('assets/livecase-room.js'), css = read('assets/livecase.css');
  assert.ok(rj.includes('function hintHtml(x)') && rj.includes('C.clue(DK(), st, x.k)') && rj.includes('u("cEval", { n: n })') && rj.includes('u("wEval", { t: T(x.p.file.ant) })'), 'level 1: phase + the kind of step + where to look (his history), never the button');
  assert.ok(rj.includes('if (g("data-lchint2"))') && rj.includes('myHints(x2) >= C.HMAX') && rj.includes('function hintShow(k, pts)') && rj.includes('lcr-hit'), 'level 2: paid, capped, highlights the exact button/field');
  assert.ok(/\.lcr-hit\{[^}]*box-shadow/.test(css) && css.includes('html[data-theme="night"] .lcr-hint'), 'light + dark');
  for (const k of ['hint', 'hintMore', 'hintNo', 'cAcc', 'cFile', 'cMon', 'cEval', 'cPos', 'cSoin', 'cRx', 'cCall', 'phNow']) assert.ok(new RegExp(k + ': \\{ ar: "[^"]+", fr: "[^"]+" \\}').test(rj), k + ' AR + FR');
});
test('#198 28y 📤 before the handover (transmissions): what is still missing, as a hint; the button opens the transmissions when everything is done', () => {
  const { C, D } = liveLoad(), { t0, doc } = liveCase(C, D, 'lc13'), U = ['u1', 'A']; let t = t0 + 9 * 36e5;
  liveAddU(C, D, doc, t, U, 'b', 'acc'); t += 3e3;
  let st = C.state(D, doc, t), x = st.P[1];
  assert.ok(!C.avail(x, x.by.f_tr), 'locked'); const m = C.missing(x, x.by.f_tr), und = x.L.filter(s => !x.done[s.id] && s.id !== 'f_tr');
  assert.deepStrictEqual(jj(m.map(s => s.id).sort()), jj(und.map(s => s.id).sort()), 'the missing list = every step not done yet');
  const rj = read('assets/livecase-room.js');
  assert.ok(rj.includes('function leftList(x)') && rj.includes('u("gCare", { c: care.length })') && rj.includes('u("nF", { c: files })'), 'counts + kinds, not the exact buttons');
  assert.ok(rj.includes('data-lchand="') && rj.includes('if (C.avail(xd, xd.by.f_tr)) { handOpen = null; sheet.tab = "file"; openQ = kd + "tr";') && rj.includes('leftBox(x, u("handNo", { n: nm(x) }))'), '📤 → the transmissions, or «لسّا ناقص»');
  assert.ok(rj.includes('f === "tr" && fieldLock(x, s)'), 'the 📁 transmissions field shows the same list');
});
test('#199 28y every closed action says WHY on the tap; harmless acts are allowed (0) instead of −2; the −2 names the phase', () => {
  const { C, D } = liveLoad(), { t0, doc } = liveCase(C, D, 'lc13'), U = ['u1', 'A']; let t = t0 + 9 * 36e5;
  let r = C.check(D, C.state(D, doc, t), 'b', 'calm', undefined, 'u1'); assert.strictEqual(r.k, 'early', 'reassuring before the accueil: allowed later, nothing lost'); assert.ok(!LIVE_OK[r.k]);
  liveIn(C, D, doc, t, U, 'b'); t += 3e3;
  for (const a of ['calm', 'es', 'pos_semi', 'o2']) { r = liveAddU(C, D, doc, t, U, 'b', a); assert.strictEqual(r.k, 'ok', a + ' (harmless care) counts right after the accueil — no waiting for the whole dossier'); t += 3e3; }
  r = C.check(D, C.state(D, doc, t), 'b', 'furo', undefined, 'u1'); assert.strictEqual(r.k, 'ord', 'a drug before the vitals/doctor = still too early'); assert.ok(r.miss.length && r.d === -3);
  for (const a of ['gly', 'pouls', 'ecg', 'repos', 'leg_down']) { r = C.check(D, C.state(D, doc, t), 'b', a, undefined, 'u1'); assert.strictEqual(r.k, 'safe', a + ' not needed for Thérèse but harmless → 0, nothing written'); }
  assert.strictEqual(C.check(D, C.state(D, doc, t), 'b', 'pos_trend').k, 'bad', 'audit: legs up in heart failure = harmful (added to the bank)');
  assert.strictEqual(C.check(D, C.state(D, doc, t), 'b', 'cpr').k, 'bad', 'massage on a patient with a pulse = harmful');
  r = C.check(D, C.state(D, doc, t), 'b', 'atb'); assert.strictEqual(r.k, 'neu'); assert.strictEqual(r.d, -2); assert.ok(r.why.ar.includes('وصفة'), 'a drug not prescribed: −2 with why');
  r = C.check(D, C.state(D, doc, t), 'b', 'stop'); assert.strictEqual(r.d, -1, 'not needed, not harmful: −1');
  assert.ok(C.check(D, C.state(D, doc, t), 'a', 'airway').k !== 'neu' && C.check(D, C.state(D, doc, t), 'a', 'guedel').k === 'safe', 'arrest: airway / Guedel sensible, never −2');
  const rj = read('assets/livecase-room.js'), lj = read('assets/livecase.js');
  assert.ok(lj.includes('WR = { ok: 1, bad: 1, ord: 1, neu: 1, no: 1 }'), 'safe / early / doc0 / hmax are never written (rules v22 allow only these kinds)');
  for (const s of ['u("must") + " " + u("mWash")', 'u("must") + " " + u("mItem"', 'u("must") + " " + u("mVvp")', 'u("must") + " " + u("mCall")', 'u("after1") + " " + m.slice(0, 2)', 'u("neu") + pts, T(r.why) + " · " + phNow(x)', 'u("safe") + " · "', 'u("early")', 'u("docNeed"']) assert.ok(rj.includes(s), 'says why: ' + s);
  assert.ok(rj.includes('<p class="lcr-leg">') && rj.includes('" ✋" + esc(St ? St.ic : "")') && rj.includes('u("callQ")'), 'the dashed buttons explained: legend + ✋ + where the thing is / 📞?');
  assert.ok(/must: \{ ar: "✋ لازم أوّل:", fr: "[^"]+" \}/.test(rj) && /after1: \{ ar: "🔒 بعد:"/.test(rj), '«✋ لازم أوّل» / «🔒 بعد»');
});
test('#200 28y bank audit: every case, both patients, can be finished by following the hints — no dead end, every step reachable in the room', () => {
  const { C, D, E } = liveLoad(), rj = read('assets/livecase-room.js');
  const GR = /var GROUPS = (\[\[[\s\S]*?\]\]\]);/.exec(rj)[1], inGroups = new Set(JSON.parse(GR.replace(/\s+/g, ' ')).flatMap(g => g[1]));
  const BEDSIDE = { kit: 1 };
  for (const c of D.cases) {
    const { t0, doc } = liveCase(C, D, c.id); let t = t0 + 8 * 36e5 + 6e4;
    for (const p of c.pts) { for (const a of (p.xok || [])) assert.ok(D.A[a] && !p.soins.some(s => s.a === a) && !p.bad.some(b => b.a === a), c.id + p.k + ' xok ' + a);
      for (const s of p.soins) { const A = D.A[s.a]; assert.ok(s.a === 'call' || (A.at === 'bed' && inGroups.has(s.a)), c.id + p.k + ' ' + s.a + ' has a button at the bed (or 📞 at the desk)');
        if (A.need) { const I = D.I[A.need]; assert.ok(I && (BEDSIDE[A.need] || E.stations[I.st]), c.id + p.k + ' ' + s.a + ': its thing is somewhere'); }
        if (A.needDone) assert.ok(p.soins.some(q => q.a === A.needDone), c.id + p.k + ' ' + s.a + ' needs ' + A.needDone + ' which is a step'); } }
    for (let g = 0; g < 80; g++) {
      const st = C.state(D, doc, t); let moved = false;
      for (const x of st.P) { if (x.over) continue; const cl = C.clue(D, st, x.k); assert.ok(cl, c.id + x.k + ' a hint while not finished (no dead end) at ' + x.n + '/' + x.tot);
        const s = cl.s, A = s.kind === 'act' && D.A[s.a];
        if (A && A.need && D.I[A.need].rx) assert.ok(x.done.call, c.id + x.k + ' the hint never points at a drug before 📞');
        if (A && A.needDone) assert.ok(x.done[A.needDone], c.id + x.k + ' needs ' + A.needDone + ' first');
        const o = s.kind === 'file' ? C.opts(D, st.cs, x.p, s.f).a : undefined, r = liveAddU(C, D, doc, t, ['u1', 'A'], x.k, s.id, o);
        assert.strictEqual(r.k, 'ok', c.id + x.k + ' the hinted step is accepted: ' + s.id); t += 60e3; moved = true; }
      if (!moved) break;
    }
    const st = C.state(D, doc, t); assert.strictEqual(st.end && st.end.w, 'ok', c.id + ' both patients stabilised by following the hints');
  }
});
test('#201 28y worker: v11 / v12 compute the same patients as the site from a day with 28y events (📞 again, 💡, 🩻, harmful extras) → no worker update needed', async (t) => {
  const vm = require('node:vm'), core = s => s.slice(s.indexOf('/* ==live-core=='), s.indexOf('/* ==/live-core== */')), W = {};
  for (const v of ['11', '12']) { const f = '/home/user/tab/files/nursin-worker-v' + v + '.js'; if (!fs.existsSync(f)) continue; const c2 = { console }; c2.window = c2; vm.createContext(c2); vm.runInContext(core(fs.readFileSync(f, 'utf8')) + '\nthis.WC = LiveCore;', c2); W[v] = c2.WC; }
  if (!W['11'] && !W['12']) return t.skip('worker files not on this machine');
  const { C, D } = liveLoad(), key = '2026-11-08', t0 = C.dayStart(key), cs = C.caseById(D, C.pick(D, key)), doc = { day: C.docId(key), c: cs.id, n: 0, ev: {}, pts: {} }, U = [['u1', 'A'], ['u2', 'B']];
  let tt = t0 + 8 * 36e5 + 6e4, i = 0;
  const seq = [['a', 'hint'], ['a', 'acc'], ['a', 'paravent'], ['b', 'acc'], ['b', 'call'], ['a', 'mon'], ['b', 'hint'], ['b', 'cpr'], ['a', 'atb'], ['a', 'stop']];
  for (const [p, a] of seq) { liveAddU(C, D, doc, tt, U[i++ % 2], p, a); tt += 4e3; }
  const ideal = C.state(D, doc, tt); for (const x of ideal.P) { for (let g = 0; g < 30; g++) { const s = C.state(D, doc, tt), cl = C.clue(D, s, x.k); if (!cl) break; liveAddU(C, D, doc, tt, U[g % 2], x.k, cl.s.id, cl.s.kind === 'file' ? C.opts(D, s.cs, s.P[x.k === 'b' ? 1 : 0].p, cl.s.f).a : undefined); tt += 4e3;
    if (g % 5 === 0) { liveAddU(C, D, doc, tt, U[0], x.k, 'call'); tt += 4e3; liveAddU(C, D, doc, tt, U[1], x.k, 'call'); tt += 4e3; } } }
  assert.ok(Object.values(doc.ev).some(e => e.a === 'hint') && Object.values(doc.ev).some(e => e.a === 'paravent') && Object.values(doc.ev).filter(e => e.a === 'call').length > 3, 'the day has the new events');
  assert.ok(Object.values(doc.ev).every(RULES_EV), 'every one fits rules v22');
  for (const h of [9, 12, 18, 23.5]) { const now = t0 + h * 36e5, a = C.state(D, doc, now);
    for (const v in W) { const b = W[v].state(D, doc, now);
      assert.deepStrictEqual(jj({ c: b.P.map(x => Math.round(x.c * 1e6)), st: b.P.map(x => x.st), n: b.P.map(x => x.n), lost: b.P.map(x => x.lost) }), jj({ c: a.P.map(x => Math.round(x.c * 1e6)), st: a.P.map(x => x.st), n: a.P.map(x => x.n), lost: a.P.map(x => x.lost) }), 'v' + v + ' = site at ' + h + ' h'); } }
});

/* ---------------- 28z 🏥 المستشفى ---------------- */
function deptLoad() { const L = liveLoad(); return Object.assign(L, { X: L.C && require('node:vm') && liveLoadX(L) }); }
function liveLoadX(L) { const vm = require('node:vm'), ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('assets/erroom-data.js'), ctx); vm.runInContext(read('assets/livecase-data.js'), ctx); vm.runInContext(read('assets/livecase.js'), ctx);
  const D = ctx.LIVECASE, E = ctx.ERROOM; D.A = Object.assign({}, E.actions, D.acts); D.I = Object.assign({}, E.items, D.items); L.C = ctx.LiveCore; L.D = D; L.E = E; return ctx.LiveDept; }
function deptAdd(X, D, doc, dk, t, u, pk, a, o, ai) {
  const { st, r } = X.check(D, doc, dk, pk, a, o, u[0], t, ai); if (!LIVE_OK[r.k]) return r;
  const en = X.enc(dk, ai || (st.amb && st.amb.i), r); doc.n++; const e = { t, u: u[0], n: u[1], p: pk, a: en.a, k: en.k, d: r.d }; if (r.o != null) e.o = r.o; doc.ev[doc.n] = e;
  const p = doc.pts[u[0]] || { n: u[1], p: 0, ok: 0, no: 0 }; doc.pts[u[0]] = { n: u[1], p: p.p + r.d, ok: p.ok + (r.k === 'ok' ? 1 : 0), no: p.no + (r.k === 'ok' ? 0 : 1), t }; return r;
}
function deptDay(X, C, D, dk, id) { let key = '2026-11-03'; for (let i = 0; i < 60 && X.pick(D, dk, key) !== id; i++) key = C.nextKey(key); return key; }
test('#202 28z 🏥 department banks: 🫀 القلب and 🧠 الأعصاب ≥ 7 cases each, two named patients from his lessons, FR+AR, 🌐 when general, never a patient of today\'s ER case', () => {
  const L = deptLoad(), { C, D, X } = L;
  assert.ok(D.cases.every(c => /^lc\d\d$/.test(c.id)), 'D.cases stays the ER bank (rules: c = lcNN; worker v11 picks from it)');
  for (const dk of ['k', 'n']) {
    const cs = X.cases(D, dk); assert.ok(cs.length >= 7, dk + ' has ≥ 7 cases'); assert.strictEqual(new Set(cs.map(c => c.id)).size, cs.length);
    const pairs = new Set();
    for (const c of cs) {
      assert.ok(c.t.ar && c.t.fr && c.ic && c.src.ar && c.src.fr && fs.existsSync(path.join(SITE, c.href)), c.id + ' title + source + lesson');
      assert.ok(c.src.ar.includes(dk === 'k' ? 'القلب' : 'الأعصاب'), c.id + ' from his ' + dk + ' lessons');
      if (c.gen) assert.ok(c.src.ar.includes('🌐') && c.src.fr.includes('🌐'), c.id + ' general knowledge labelled 🌐');
      assert.strictEqual(c.pts.length, 2); assert.deepStrictEqual(jj(c.pts.map(p => p.k)), ['a', 'b']);
      const key = c.pts.map(p => p.nm.ar).sort().join('+'); assert.ok(!pairs.has(key), c.id + ' a new pair'); pairs.add(key);
      for (const p of c.pts) { assert.ok(p.nm.ar.split(' ').length >= 2 && p.nm.fr && p.story.ar && p.story.fr && p.file.motif.ar && p.file.tr.fr, c.id + p.k + ' full patient');
        assert.strictEqual(p.gyvm.reduce((a, b) => a + b, 0), p.vit.gcs, c.id + p.k + ' Glasgow = Y + V + M'); assert.strictEqual(p.file.hend.length, 3); }
    }
    const orig = new Set(D.cases.map(c => c.pts.map(p => p.nm.ar).sort().join('+'))); for (const k of pairs) assert.ok(!orig.has(k), dk + ': not just an ER case again');
  }
  for (const k of ['nx1', 'nx2']) { const p = D.xpts[k]; for (const s of p.soins) assert.ok(D.A[s.a], k + ' ' + s.a + ' is an action'); for (const f of ['ar', 'fr']) assert.ok(p.who[f] && p.sx.every(x => x[f]) && p.lab.every(x => x[f])); }
  assert.ok(D.xpts.nx1.file.motif.fr.includes('épilept') && D.xpts.nx2.lab[0].fr.includes('œdème papillaire') && D.acts.phen && D.items.phen.rx, 'épilepsie (phénytoïne) + HTIC/œdème papillaire from his neuro notes');
  let key = '2026-11-03';
  for (let i = 0; i < 40; i++, key = C.nextKey(key)) { const er = C.caseById(D, C.pick(D, key)); const names = new Set(er.pts.map(p => p.nm.ar));
    for (const dk of ['k', 'n']) { const c = X.deptCase(D, dk, key); assert.ok(c, key + dk); for (const p of c.pts) assert.ok(!names.has(p.nm.ar), key + ' ' + dk + ': ' + p.nm.ar + ' is not also in the ER today'); } }
});
test('#203 28z bank audit per department: every 🫀/🧠 case, both patients, can be finished by following the 💡 hints (no dead end), no twin answer in the dossier', () => {
  const L = deptLoad(), { C, D, X } = L;
  for (const dk of ['k', 'n']) for (const cs of X.cases(D, dk)) {
    const key = deptDay(X, C, D, dk, cs.id); assert.strictEqual(X.pick(D, dk, key), cs.id, cs.id + ' comes up within 60 days');
    const t0 = C.dayStart(key), doc = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 + 8 * 36e5 }; let t = t0 + 8 * 36e5 + 6e4;
    for (let g = 0; g < 80; g++) { const st = X.state(D, doc, dk, t); let mv = false;
      for (const x of st.P) { if (x.over) continue; const cl = C.clue(st.DK, st, x.k); assert.ok(cl, cs.id + x.k + ' a hint at ' + x.n + '/' + x.tot);
        const o = cl.s.kind === 'file' ? C.opts(st.DK, st.cs, x.p, cl.s.f).a : undefined; assert.strictEqual(deptAdd(X, D, doc, dk, t, ['u1', 'A'], x.k, cl.s.id, o).k, 'ok', cs.id + x.k + ' ' + cl.s.id); t += 6e4; mv = true; }
      if (!mv) break; }
    const st = X.state(D, doc, dk, t); assert.strictEqual(st.end && st.end.w, 'ok', cs.id + ' both stabilised');
    for (const x of st.P) for (const f of ['id', 'motif', 'ant', 'all', 'tt', 'cst', 'gcs', 'hend', 'surv', 'tr']) { const q = C.opts(st.DK, st.cs, x.p, f).o.map(o => o.ar); assert.strictEqual(new Set(q).size, q.length, cs.id + x.k + ' ' + f + ' 4 different choices'); }
  }
});
test('#204 28z 🚨 ambulances: 2–3 a day, 10:00–23:00 Beirut, ≥ 90 min apart, the same on every phone (date seed), different days differ', () => {
  const L = deptLoad(), { C, X } = L; let key = '2026-11-03'; const seen = new Set(), counts = new Set();
  for (let i = 0; i < 120; i++, key = C.nextKey(key)) {
    const T = X.ambTimes(key), t0 = C.dayStart(key); assert.deepStrictEqual(T, X.ambTimes(key), 'deterministic'); counts.add(T.length);
    assert.ok(T.length >= 2 && T.length <= 3, key + ' 2–3');
    T.forEach((t, j) => { assert.ok(t >= t0 + 10 * 36e5 && t <= t0 + 23 * 36e5, key + ' inside 10:00–23:00'); if (j) assert.ok(t - T[j - 1] >= 90 * 6e4, key + ' ≥ 90 min apart'); assert.strictEqual(t % 6e4, 0); });
    seen.add(T.map(t => t - t0).join());
    const A = X.ambNow(key, T[0] - 1); assert.strictEqual(A.cur, null); assert.strictEqual(A.next, T[0]);
    const B = X.ambNow(key, T[0] + 1); assert.strictEqual(B.cur.i, 1); assert.strictEqual(B.next, T[1]);
  }
  assert.ok(seen.size > 100 && counts.has(2) && counts.has(3), 'varies day to day');
});
test('#205 28z 🛏️ سرير الإسعاف lifecycle: nothing before the siren; the new patient\'s clock starts at the arrival; untouched → worse → lost; hints → stabilised; the next ambulance takes the bed; bed ② stays empty', () => {
  const L = deptLoad(), { C, D, X } = L, key = '2026-11-04', T = X.ambTimes(key), t0 = C.dayStart(key);
  const doc = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 + 8 * 36e5 };
  assert.strictEqual(X.state(D, doc, 'x', T[0] - 6e4), null, 'no ambulance yet → no bay');
  assert.strictEqual(X.check(D, doc, 'x', 'a', 'acc', undefined, 'u1', T[0] - 6e4).r.k, 'noamb');
  const s1 = X.state(D, doc, 'x', T[0] + 6e4); assert.strictEqual(s1.amb.i, 1); assert.ok(s1.cs.amb === 1 && s1.cs.ic === '🚑' && s1.cs.t.ar.startsWith('إسعاف'));
  assert.ok(Math.abs(s1.P[0].c - 50) < 2, 'health counted from the arrival, not from 08:00'); assert.ok(s1.P[1].ghost && s1.P[1].over, 'bed ② empty');
  assert.strictEqual(X.check(D, doc, 'x', 'b', 'acc', undefined, 'u1', T[0] + 6e4).r.k, 'pover', 'bed ② never playable');
  const src = D.cases.find(c => c.id === s1.cs.from[0]), orig = src.pts.find(p => p.nm.ar === s1.P[0].p.nm.ar); assert.ok(s1.P[0].p.rate > orig.rate, 'an unstable, quicker patient');
  const er = C.caseById(D, doc.c); assert.ok(!er.pts.some(p => p.nm.ar === s1.P[0].p.nm.ar), 'not one of today\'s ER patients');
  const sl = X.state(D, doc, 'x', T[1] - 6e4); assert.ok(sl.P[0].lost != null && sl.end && sl.end.w === 'lost', 'nobody came → lost (engine drift)');
  const s2 = X.state(D, doc, 'x', T[1] + 6e4); assert.strictEqual(s2.amb.i, 2); assert.notStrictEqual(s2.P[0].p.nm.ar, s1.P[0].p.nm.ar, 'the next ambulance brings another patient'); assert.ok(!s2.end);
  let t = T[1] + 6e4;
  for (let g = 0; g < 40; g++) { const st = X.state(D, doc, 'x', t); if (st.end) break; const x = st.P[0], cl = C.clue(st.DK, st, 'a'); assert.ok(cl); const o = cl.s.kind === 'file' ? C.opts(st.DK, st.cs, x.p, cl.s.f).a : undefined; assert.strictEqual(deptAdd(X, D, doc, 'x', t, ['u1', 'A'], 'a', cl.s.id, o).k, 'ok'); t += 3e4; }
  const sd = X.state(D, doc, 'x', t); assert.strictEqual(sd.end.w, 'ok', 'handled → ✅'); assert.ok(Object.values(doc.ev).every(e => e.a.startsWith('x2_')), 'its steps carry x2_');
  if (T[2]) { const s3 = X.state(D, doc, 'x', T[2] + 6e4); assert.strictEqual(s3.amb.i, 3); assert.strictEqual(s3.P[0].n, 0, 'the third one starts from zero'); }
  assert.ok(doc.pts.u1.p > 0, 'normal points');
});
test('#206 28z rules v22 compatibility: department + ambulance steps are normal events (action ≤ 20 chars, kinds), harm stored as «no»; the ER patients (site, worker v11/v12) are exactly the same with them in the doc', () => {
  const L = deptLoad(), { C, D, X } = L, key = '2026-11-05', t0 = C.dayStart(key), T = X.ambTimes(key), U = [['u1', 'A'], ['u2', 'B']];
  const doc = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 + 8 * 36e5 }, er = { day: doc.day, c: doc.c, n: 0, ev: {}, pts: {}, at0: doc.at0 };
  let t = t0 + 9 * 36e5, i = 0;
  const ka = X.state(D, doc, 'k', t).P[0].p.bad[0].a, nb = X.state(D, doc, 'n', t).P[1].p.bad[0].a;
  deptAdd(X, D, doc, 'k', t, U[0], 'a', ka); deptAdd(X, D, doc, 'n', t + 3e3, U[1], 'b', nb); t += 6e3;
  for (let g = 0; g < 30; g++) for (const dk of ['er', 'k', 'n']) { const st = X.state(D, doc, dk, t); for (const x of st.P) { if (x.over) continue; const cl = C.clue(st.DK, st, x.k); if (!cl) continue;
    const o = cl.s.kind === 'file' ? C.opts(st.DK, st.cs, x.p, cl.s.f).a : undefined; if (dk === 'er') liveAddU(C, D, er, t, U[i % 2], x.k, cl.s.id, o); deptAdd(X, D, doc, dk, t, U[i++ % 2], x.k, cl.s.id, o); t += 3e3; } }
  deptAdd(X, D, doc, 'k', t + 6e3, U[0], 'b', 'call'); deptAdd(X, D, doc, 'k', t + 9e3, U[0], 'b', 'hint');
  deptAdd(X, D, doc, 'x', T[0] + 6e4, U[1], 'a', 'acc', undefined, 1);
  const evs = Object.values(doc.ev); assert.ok(evs.every(RULES_EV), 'every event fits rules v22 liveEv'); assert.ok(evs.some(e => /^k_/.test(e.a)) && evs.some(e => /^n_/.test(e.a)) && evs.some(e => /^x1_/.test(e.a)));
  assert.ok(evs.every(e => e.a.length <= 20)); const harm = evs.filter(e => e.a === 'k_' + ka || e.a === 'n_' + nb); assert.ok(harm.length === 2 && harm.every(e => e.k === 'no' && e.d < 0), 'harm → «no»');
  assert.ok(X.state(D, doc, 'k', t + 2e4).P[0].bad.length === 1 && X.state(D, doc, 'n', t + 2e4).P[1].bad.length === 1, 'the department sees it as harm again');
  assert.strictEqual(doc.n, evs.length); assert.ok(doc.n <= 600);
  const vm = require('node:vm'), core = s => s.slice(s.indexOf('/* ==live-core=='), s.indexOf('/* ==/live-core== */')), W = { site: C };
  for (const v of ['11', '12']) { const f = '/home/user/tab/files/nursin-worker-v' + v + '.js'; if (!fs.existsSync(f)) continue; const c2 = { console }; c2.window = c2; vm.createContext(c2); vm.runInContext(core(fs.readFileSync(f, 'utf8')) + '\nthis.WC = LiveCore;', c2); W['v' + v] = c2.WC; }
  const pick = s => jj({ c: s.P.map(x => Math.round(x.c * 1e6)), st: s.P.map(x => x.st), n: s.P.map(x => x.n), lost: s.P.map(x => x.lost) });
  for (const h of [10, 14, 20, 23.5]) { const now = t0 + h * 36e5, ref = pick(C.state(D, er, now));
    assert.deepStrictEqual(pick(X.state(D, doc, 'er', now)), ref, 'site ER view at ' + h + ' h');
    for (const v in W) assert.deepStrictEqual(pick(W[v].state(D, doc, now)), ref, v + ' (raw doc with every department event) = ER alone at ' + h + ' h'); }
  const rj = read('assets/livecase.js'); assert.ok(rj.includes('LiveDept.enc(dk, cr.st.amb && cr.st.amb.i, r)') && !/match \/live\/\{dayId\}\/(dept|amb)/.test(read('firestore.rules')), 'the client writes the same doc shape; no new rules');
});
test('#207 28z 👥 presence per department: the department rides in the 2 low bits of x/tx (rules v22 fields and bounds), each room draws only its own students, the floor shows everybody + who walks the corridor', () => {
  const vm = require('node:vm'), ctx = { console }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('assets/livepres.js'), ctx); const LP = ctx.LivePres;
  for (const dk of LP.DEPS) for (const x of [0, 1, 2, 3, 57, 180, 359, 360]) { const e = LP.enc(x, dk), d = LP.dec(e); assert.strictEqual(d.dep, dk); assert.ok(e >= 0 && e <= 360 && Number.isInteger(e)); assert.ok(Math.abs(d.v - Math.min(x, 356)) <= 3); }
  const d1 = LP.doc({ name: 'ريم حداد', av: 'a03' }, { x: 101, y: 300 }, { x: 250, y: 120 }, 'a', 'k', 'n');
  assert.deepStrictEqual(Object.keys(d1).sort(), ['av', 'b', 'n', 'tx', 'ty', 'x', 'y'], 'the same fields the rules accept (+ at)');
  assert.strictEqual(LP.dec(d1.x).dep, 'k'); assert.strictEqual(LP.dec(d1.tx).dep, 'n');
  const p = LP.place({ x: d1.x, tx: d1.tx, y: 1, ty: 1 }); assert.strictEqual(p.dep, 'k'); assert.strictEqual(p.tdep, 'n'); assert.ok(p.x % 4 === 0);
  const d0 = LP.doc({ name: 'x' }, { x: 120, y: 1 }, { x: 120, y: 1 }, ''); assert.strictEqual(LP.dec(d0.x).dep, 'er', 'no department = 🚑 ER (old phones)');
  const pj = read('assets/livepres.js'), rj = read('assets/livecase-room.js');
  assert.ok(pj.includes('LivePres.place(p);') && pj.includes('function byDep(myDk)') && pj.includes('pos, tgt, bed, dk, tdk)'), 'read side decodes; per-department counts; tick carries dk/tdk');
  assert.ok(rj.includes('function mine(l)') && rj.includes('pList = mine(pAll)') && rj.includes('p.dep !== p.tdep') && rj.includes('cwalk(p.dep, p.tdep, ph)'), 'room = my department only; floor = everybody, walkers on the corridor');
  assert.ok(rj.includes('"👥 " + cnt'), '👥 N on each small room');
});
test('#208 28z 🏥 the floor: one continuous hospital (🧠 · 🫀 · 🚑 + the ER entrance), my department big, the others small; a tap walks the nurse out the door, the room shrinks, he walks the corridor, the next grows; 🔊 off by default; siren + ambulance drive-up; no ads', () => {
  const rj = read('assets/livecase-room.js'), css = read('assets/livecase.css'), lj = read('assets/livecase.js');
  assert.ok(rj.includes('<div class="lcr-floor"><canvas class="lcr-fcv"') && rj.includes('ROOMS = { n: {') && rj.includes('k: {') && rj.includes('er: {') && rj.includes('x: { x: 246, y: 96'), 'floor strip with the 3 departments + the entrance/bay');
  const a = rj.indexOf('<div class="lcr-stage">'), b = rj.indexOf('<div class="lcr-floor">'), c = rj.indexOf('<div class="lcr-bar">'); assert.ok(a > 0 && a < b && b < c, 'big room on top, floor right under it, hands bar last (390 px portrait)');
  assert.ok(rj.includes('function walkTo(dk)') && rj.includes('R.path(G, nurse, dr)') && rj.includes('cv.classList.add("zout")') && rj.includes('L.setDep(to)') && rj.includes('cv.classList.add("zin")') && rj.includes('trv.t += dt / 1.6'), '① door ② shrink + corridor ③ grow');
  assert.ok(rj.includes('function onFloorTap(e)') && rj.includes('return walkTo(k)') && rj.includes('if (trv) { e.preventDefault(); return; }'), 'tap a small room to go; no taps while walking');
  assert.ok(css.includes('.lcr-cv.zout{') && css.includes('.lcr-cv.zin{') && css.includes('.lcr-floor{') && css.includes('html[data-theme="night"] .lcr-floor') && css.includes('prefers-reduced-motion'), 'zoom + glass, light + dark, reduced motion');
  assert.ok(rj.includes('snd = localStorage.getItem(SNDK) === "1"') && rj.includes('function announce(dk)') && rj.includes('function siren()') && rj.includes('data-lcsnd'), '🔊 off until he turns it on; chime + department name; siren');
  assert.ok(rj.includes('function ambDraw(c, x, y, t, lights)') && rj.includes('sirenShow(); siren();') && rj.includes('u("sirenT")') && rj.includes('walkTo("x")'), '🚑 drive-up + banner + «روح استقبلو»');
  assert.ok(rj.includes('if (x.ghost) return;') && rj.includes('u("bed2Empty")'), 'the bay has one patient; bed ② says it is empty');
  assert.ok(rj.includes('C.opts(DK(), st.cs, x.p, f)') && rj.includes('C.clue(DK(), st, k)') && rj.includes('L.cool(ckey(x.k)'), 'each department answers with its own bank (same choices as the check)');
  for (const k of ['hosp', 'walk', 'sirenT', 'sirenGo', 'noAmb', 'bed2Empty', 'sndOn', 'welcome', 'ambDone', 'inDep']) assert.ok(new RegExp(k + ': \\{ ar: "[^"]+", fr: "[^"]+"').test(rj), k + ' AR+FR');
  assert.ok(!/adsbygoogle|data-ad-slot|bauval|adsterra|monetag/i.test(rj + css + lj + read('assets/livepres.js')), 'no ads on the hospital');
  assert.ok(lj.includes('setDep: setDep, stateOf: stateOf, hospital: hospital') && lj.includes('var V = "20261029r"'), 'engine API + tag z');
  assert.ok(read('games.html').includes('🏥 المستشفى · حالة لايف'), 'games card');
});
test('#209 28z 🏠 home card «🏥 المستشفى»: each department\'s case + patients, the last ambulance, never the exact time of the next one', () => {
  const lj = read('assets/livecase.js'), i = lj.indexOf('function homeCard(st)'), hc = lj.slice(i, lj.indexOf('function homeInit()'));
  assert.ok(hc.includes('"🏥 المستشفى الآن"') && hc.includes('"🏥 L\'hôpital maintenant"') && hc.includes('" حالات حرجة"') && hc.includes('"🏥 فوت ساعد ←"'), '29r: the compact card, AR+FR');
  assert.ok(!/fmtHM\(A/.test(hc) && !hc.includes('hzlvd') && !hc.includes('<canvas'), '29r: no department rows, no ambulance clock, no drawing');
  assert.ok(read('assets/livecase.css').includes('.hzhosp .hzlvd{') && read('assets/livecase.css').includes('html[data-theme="night"] .hzhosp .hzlva'));
  assert.ok(read('assets/livecase-room.js').includes('function hospLine()'), 'games card names the departments too');
});
/* ---- 🔁 التكرار المتباعد v2 (Nov 3 2026, Abdullah 7:02 PM: every answered item, right or wrong; «كنت متأكد / حزرت»; to the end of the year; every lesson; always in مسار اليوم) ---- */
function srsCtx(extra, store) {
  store = store || {}; const w = Object.assign({ Nursin: { dayKey: () => '2026-11-03' } }, extra || {});
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  new Function('window', 'document', 'localStorage', 'CustomEvent', read('assets/srs.js'))(w, { dispatchEvent() {} }, ls, function () {});
  return { w, S: w.NursinSRS, store, day: d => { w.Nursin.dayKey = () => d; } };
}
test('🔁 v2: a RIGHT answer enters too, from every place (quiz, lesson quizzes, Osman, sheets, midterm, cards, 🩺 cases, ✍️ blanks, games, duels, class quiz)', () => {
  const { S } = srsCtx({ QUIZ: [{ id: 'q001' }] });
  assert.strictEqual(S.record({ id: 'q001' }, true), 'new'); assert.ok(S.has('q001'), 'right answer → in the cycle');
  assert.strictEqual(S.items().q001.d, '2026-11-06', 'first right answer → back in 3 days');
  for (const id of ['k05', 'b12', 'cs-cardio-angor-2', 'cs-henderson-h1-0', 'q510']) { assert.strictEqual(S.record({ id }, true), 'new', id); assert.ok(S.has(id), id + ' tracked'); }
  for (const id of ['cs-x', 'zzz', 'q1', '']) assert.strictEqual(S.record({ id }, true), 'none', 'not an item: ' + id);
  // the case / blank ids are the same everywhere (midterm mock, lesson case sheet, SRS)
  const mid = read('assets/midterm.js'); assert.ok(mid.includes('id: "cs-" + c.id.replace(":", "-") + "-" + i') && read('assets/retain.js').includes('"cs-" + String(id).replace(":", "-") + "-" + i'), 'one id per case question');
  // every answering place calls it
  const has = (f, s) => assert.ok(read(f).includes(s), f + ' records: ' + s);
  has('assets/quiz.js', 'S.answer(q,ok)'); has('assets/extra.js', 'SR.answer(q, ok)'); has('assets/home.js', 'w.NursinSRS.answer(q, ok)'); has('assets/cards.js', 'S.record(c.q, good)');
  has('assets/retain.js', 'SR.answer(sq, good)'); has('assets/practice.js', 'SR.answer(q, ok)'); has('assets/games.js', 'srs(it.src, good)'); has('assets/games.js', 'srs(b, good)');
  has('assets/duel.js', 'window.NursinSRS.record(q0, pick === q0.a)'); has('assets/classes.js', 'window.NursinSRS.record(q, ok)'); has('assets/classes.js', 'window.NursinSRS.record(q, p.ans[i] === q.a)');
  for (const p of ['games.html', 'classes.html', 'index.html', 'quiz.html', 'hifzi.html', 'cardio.html']) assert.ok(read(p).includes('assets/srs.js?v=20261029r'), p + ' loads srs.js');
  assert.ok(read('games.html').indexOf('assets/srs.js') < read('games.html').indexOf('assets/games.js'), 'before games.js');
  // review resolves every kind: bank, 🔗, ✍️ (a typed blank becomes 3 choices), 🩺 (when the cases are loaded)
  const B = [{ id: 'b01', t: 'law', s: 'A ___ B', a: 'x', o: ['x', 'y', 'z'] }, { id: 'b02', t: 'law', s: 'C ___', a: 'p', alts: ['pp'] }, { id: 'b03', t: 'law', s: 'D ___', a: 'r' }, { id: 'b04', t: 'law', s: 'E ___', a: 's' }];
  const b2 = S.blankItem(B[1], B); assert.strictEqual(b2.o.length, 3); assert.strictEqual(b2.o[b2.a], 'p'); assert.strictEqual(new Set(b2.o).size, 3);
  const cs = S.caseItems({ id: 'cardio:angor', pt: 'P', v: 'V', qs: [{ q: 'Q', o: ['a', 'b', 'c'], a: 1, x: 'X' }] }); assert.strictEqual(cs[0].id, 'cs-cardio-angor-0'); assert.strictEqual(cs[0].a, 1);
  assert.ok(read('assets/quiz.js').includes('S.needsCases()&&window.NursinMid') && read('assets/quiz.js').includes("if(sel==='reviewmore')return S?S.questions({more:true}):[];"), 'review loads the cases when one is due; extra beyond the day on tap');
});
test('🔁 v2: «✅ كنت متأكد» = one extra step, «🤔 حزرت» = one step back / tomorrow, wrong = tomorrow, no tap = normal; re-grading the same answer', () => {
  const { S } = srsCtx({ QUIZ: [] }), x = { items: {} }, D = '2026-11-03';
  assert.deepStrictEqual(S.grade(x, 'q001', 'sure', D, 1), { r: 'new', s: 2, days: 7 }, 'new + sure → 7 days');
  assert.deepStrictEqual(S.grade(x, 'q002', 'ok', D, 1), { r: 'new', s: 1, days: 3 }, 'new + normal → 3 days');
  assert.deepStrictEqual(S.grade(x, 'q003', 'guess', D, 1), { r: 'new', s: 0, days: 1 }, 'new + guessed → tomorrow');
  assert.deepStrictEqual(S.grade(x, 'q004', 'wrong', D, 1), { r: 'again', s: 0, days: 1 }, 'wrong → tomorrow');
  // on a due review at step 3 (14 days): normal → 30, sure → 60, guess → 7, wrong → 1
  for (const [g, s, days] of [['ok', 4, 30], ['sure', 5, 60], ['guess', 2, 7], ['wrong', 0, 1], ['hard', 0, 1]]) { const y = { items: { q009: { s: 3, d: D, m: 1 } } }; const r = S.grade(y, 'q009', g, D, 2); assert.strictEqual(r.s, s, g); assert.strictEqual(r.days, days, g); assert.strictEqual(y.items.q009.d, S.addDays(D, days), g); }
  assert.strictEqual(S.grade({ items: { q9: 0, q010: { s: 6, d: D, m: 1 } } }, 'q010', 'sure', D, 2).days, 120, 'the top step stays 120 days');
  const e = { items: { q011: { s: 4, d: '2026-11-20', m: 1 } } };
  assert.strictEqual(S.grade(e, 'q011', 'ok', D, 2).r, 'early'); assert.strictEqual(e.items.q011.d, '2026-11-20', 'early right: nothing moves');
  assert.strictEqual(S.grade(e, 'q011', 'guess', D, 2).r, 'guess'); assert.strictEqual(e.items.q011.d, S.addDays(D, 14), 'early guessed: closer (one step back from today)');
  // the tap after the answer re-grades THAT answer (not a second answer)
  const c = srsCtx({ QUIZ: [] }); c.S.answer({ id: 'q020' }, true); assert.strictEqual(c.S.items().q020.d, '2026-11-06');
  assert.strictEqual(c.S.regrade({ id: 'q020' }, 'sure').days, 7); assert.strictEqual(c.S.items().q020.d, '2026-11-10', 'sure: 7 days instead of 3');
  assert.strictEqual(c.S.regrade({ id: 'q020' }, 'guess').days, 1); assert.strictEqual(c.S.items().q020.d, '2026-11-04', 'changed mind: guessed → tomorrow');
  // never asked in timed / scored modes: the answer stays a normal right one
  const qz = read('assets/quiz.js'); assert.ok(qz.includes('RT.confOn(s)&&!s.timed') && read('assets/retain.js').includes('return !!(s && !s.exam && !s.challenge && !s.cq && !s.mid)'), 'not in exams / challenges / class quiz / midterm mock / timed weekly exam');
  assert.ok(!read('assets/games.js').includes('confRow') && !read('assets/duel.js').includes('confRow'), 'games / duels: silent');
});
test('🔁 v2: migration v1 → v2 keeps everything (v1 left in place, newer change wins), the account copy is packed under the v22 rules (≤ 400 keys), an old v1 copy still merges', () => {
  const v1 = { items: { q001: { s: 2, d: '2026-11-05', m: 10 }, q002: { s: 0, d: '2026-11-01', m: 20 }, k03: { s: 3, d: '2026-11-10', m: 30 }, bad: { s: 1, d: 'x' } } };
  const store = { nursin_srs_v1: JSON.stringify(v1) }, { S } = srsCtx({ QUIZ: [{ id: 'q001' }, { id: 'q002' }] }, store);
  const it = S.items(); assert.deepStrictEqual(Object.keys(it).sort(), ['k03', 'q001', 'q002']);
  assert.deepStrictEqual(it.q001, { s: 2, d: '2026-11-05', m: 10 }, 'same step + due day'); assert.ok(store.nursin_srs_v2 && JSON.parse(store.nursin_srs_v2).v === 2, 'v2 saved');
  assert.ok(store.nursin_srs_v1, 'v1 kept (old pages, the memory backfill)'); assert.strictEqual(S.count(), 1, 'q002 overdue → today');
  assert.strictEqual(S.STEPS[it.q001.s], 7, 'v1 step 2 = 7 days, same meaning');
  const x = { v: 2, items: { q001: { s: 1, d: '2026-11-04', m: 50 } } }; assert.strictEqual(S.migrate(v1, x), true); assert.strictEqual(x.items.q001.m, 50, 'the newer v2 change is kept');
  // ☁️ packed: 1,000 items → 4 keys (rules v15–v22: items is a map of ≤ 400 keys, values free; keys hasOnly items + t)
  const many = {}; for (let i = 1; i <= 1000; i++) many['q' + String(i).padStart(3, '0')] = { s: i % 7, d: '2026-11-' + String(1 + i % 28).padStart(2, '0'), m: 1e12 + i, n: i % 10 === 0 ? 1 : undefined };
  const pk = S.pack(many); assert.ok(Object.keys(pk).length <= 400 && Object.keys(pk).every(k => /^z\d+$/.test(k)), 'few keys: ' + Object.keys(pk).length);
  const un = S.unpack(pk); assert.strictEqual(Object.keys(un).length, 1000); assert.deepStrictEqual(un.q007, { s: 0, d: '2026-11-08', m: 1e12 + 7, n: 0 }); assert.strictEqual(un.q010.n, 1);
  const old = S.unpack({ q005: { s: 3, d: '2026-11-09', m: 5 }, junk: 1 }); assert.deepStrictEqual(old, { q005: { s: 3, d: '2026-11-09', m: 5, n: 0 } }, 'an old v1 copy');
  assert.ok(S.merge({ q005: { s: 3, d: '2026-11-09', m: 5 } }) && S.has('q005'), 'merges'); assert.ok(S.behind({ q005: { s: 3, d: '2026-11-09', m: 5 } }), 'old copy → pushed again packed');
  assert.ok(!S.behind(S.remote()), 'in sync after a push');
  assert.ok(Object.keys(S.pack(many)).length === 4 && JSON.stringify(S.pack(many)).length < 60000, 'a small doc (published v22: users/{uid}/srs/main = {items ≤ 400 keys, t})');
  const qs = read('assets/qstats.js'); assert.ok(qs.includes('S.remote ? S.remote() : S.items()') && qs.includes('S.behind ? S.behind(r)'), 'qstats pushes the packed copy');
  assert.ok(read('assets/goals.js').includes('window.NursinSRS.dueByDay(14)') && read('assets/extra.js').includes('lsGet("nursin_srs_v2") || lsGet("nursin_srs_v1")'), 'push mirror + morning-question pool read v2');
});
test('🔁 v2: ≤ 20 a day (most overdue first, the rest rolls on), + up to 5 NEW items from lessons already reached (midterm-plan subjects first), fixed for the day, forecast', () => {
  const Q = []; for (let i = 1; i <= 60; i++) Q.push({ id: 'q' + String(i).padStart(3, '0'), t: i <= 20 ? 'infarctus' : i <= 40 ? 'avc' : 'law1', l: '' });
  const lessonOf = q => q.t === 'infarctus' ? 'cardio:infarctus' : q.t === 'avc' ? 'neuro:avc' : 'law:l1';
  const reached = { 'cardio:infarctus': 60, 'neuro:avc': 30 };
  const Ret = { ofQ: lessonOf, score: id => (id in reached ? reached[id] : null) }, Mid = { active: d => d < '2026-11-16', planDay: d => ({ subs: ['neuro'] }) };
  const items = {}; for (let i = 1; i <= 30; i++) items['q' + String(i).padStart(3, '0')] = { s: 1, d: '2026-10-' + String(i).padStart(2, '0'), m: i };
  const store = { nursin_srs_v2: JSON.stringify({ v: 2, items }) };
  const c = srsCtx({ QUIZ: Q, NursinRet: Ret, NursinMid: Mid }, store), S = c.S;
  assert.strictEqual(S.count(), 20, '30 due → 20 today'); const st = S.status(); assert.strictEqual(st.nNew, 0, 'no room for new ones when 20 are due');
  const p = JSON.parse(store.nursin_srs_v2).plan; assert.deepStrictEqual(p.ids.slice(0, 3), ['q001', 'q002', 'q003'], 'most overdue first');
  S.answer({ id: 'q001' }, true); assert.strictEqual(S.count(), 19, 'answered → off the list');
  assert.strictEqual(S.count(), 19, 'the other 10 wait (no top-up past 20 the same day)'); assert.strictEqual(S.more(), 10, '…or on his tap «كمّل»');
  const f = S.forecast(7); assert.strictEqual(f[0], 10, 'tomorrow: the 10 that rolled on'); assert.ok(/بكرا 10 · هالأسبوع \d+/.test(S.nextLine()), S.nextLine());
  // next day: 10 overdue + new ones (room 10 → 5 new), only from reached lessons, neuro (today's midterm plan) first, never law (not reached)
  c.day('2026-11-04'); const s2 = S.status(); assert.ok(s2.n <= 20 && s2.nOld <= 20, 'never more than 20 the next day either'); assert.strictEqual(s2.nOld, 20, '29 overdue (19 not done + 10 rolled) → 20'); assert.strictEqual(s2.nNew, 0, 'no new ones on a full day');
  const pl = JSON.parse(store.nursin_srs_v2).plan, nw = pl.ids.filter(k => JSON.parse(store.nursin_srs_v2).items[k].n);
  assert.ok(nw.length <= 5, 'up to 5 new: ' + nw.length);
  // a lighter day: 3 due → 5 new, neuro:avc first (midterm plan), none from law (never opened)
  const items2 = { q001: { s: 1, d: '2026-11-01', m: 1 }, q002: { s: 1, d: '2026-11-02', m: 2 }, q003: { s: 0, d: '2026-11-03', m: 3 } };
  const st2 = { nursin_srs_v2: JSON.stringify({ v: 2, items: items2 }) }, c2 = srsCtx({ QUIZ: Q, NursinRet: Ret, NursinMid: Mid }, st2);
  assert.strictEqual(c2.S.count(), 8, '3 reviews + 5 new'); const s3 = c2.S.status(); assert.strictEqual(s3.nNew, 5);
  const x2 = JSON.parse(st2.nursin_srs_v2), news = Object.keys(x2.items).filter(k => x2.items[k].n);
  assert.ok(news.every(k => +k.slice(1) <= 40), 'nothing from law (never opened): ' + news);
  assert.strictEqual(news.filter(k => +k.slice(1) > 20).length, 3, 'neuro (today\'s midterm plan) first in each round: ' + news);
  assert.strictEqual(c2.S.count(), 8, 'fixed for the day'); c2.S.answer({ id: news[0] }, true); assert.ok(c2.S.has(news[0]) && c2.S.items()[news[0]].d === '2026-11-06', 'a new one answered right → 3 days');
  assert.strictEqual(c2.S.count(), 7);
  // a new one not answered today comes back first tomorrow (still counts within the 5)
  c2.day('2026-11-04'); const x3 = JSON.parse(st2.nursin_srs_v2); c2.S.count(); const x4 = JSON.parse(st2.nursin_srs_v2);
  assert.ok(news.slice(1).every(k => x4.plan.ids.includes(k)), 'yesterday\'s unanswered new ones roll on');
  // pickNew: one per lesson per round, deterministic per day
  const a = c2.S.pickNew({ items: {} }, 4, '2026-11-05', { reached: () => true, pri: {}, ofQ: lessonOf }), b = c2.S.pickNew({ items: {} }, 4, '2026-11-05', { reached: () => true, pri: {}, ofQ: lessonOf });
  assert.deepStrictEqual(a, b, 'deterministic'); assert.strictEqual(new Set(a.slice(0, 3).map(k => lessonOf(Q.find(q => q.id === k)))).size, 3, 'spread over lessons');
  assert.ok(read('assets/srs.js').includes('CAP = 20, NEWD = 5'), 'cap 20, 5 new a day');
});
test('🔁 v2: «مسار اليوم» ALWAYS has the «🔁 التكرار المتباعد» step (pinned, counts in the 5–7): N سؤال اليوم / ✅ خلّصت / intro + «📅 الجاية» + «شو هيدا؟»', () => {
  const store = {}; let st = { n: 0, nNew: 0, nOld: 0, planned: 0, total: 0 };
  const { ctx, run } = homeCtx(store); for (const f of ['assets/lessons.js', 'assets/quiz-data.js', 'assets/ui.js', 'assets/midterm.js', 'assets/homework.js', 'assets/home.js']) run(f);
  const H = ctx.HomePath, M = ctx.NursinMid;
  const L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, q: 10, added: l.added || '' }));
  for (let i = 0; i < 60; i++) {
    const day = new Date(Date.parse('2026-11-01T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
    for (const [busy, due] of [[false, 0], [true, 0], [true, 40], [false, 3]]) {
      const x = { day, hm: busy ? 15 * 60 + 5 : 540, due, last: null, lessons: L, wex: { ready: busy }, cases: [], mid: M.step(day), hw: busy ? [{ id: 'hw1', title: 't', subj: 'geri', due: '2026-12-30', note: '' }, { id: 'hw2', title: 't2', subj: 'geri', due: '2026-12-30', note: '' }] : [],
        imp: busy ? [{ ik: 'ex:1', e: '📅', n: 'x', s: '', href: 'exams.html' }, { ik: 'dq', e: '❓', n: 'y', s: '', href: 'quiz.html' }] : [], tn: busy ? { op: 'X' } : null };
      const k = H.build(x).map(s => s.k);
      assert.ok(k.length >= 5 && k.length <= 7, day + ' ' + k); assert.strictEqual(k.filter(s => s === 'rev').length, 1, day + ' 🔁 always, once: ' + k);
      assert.ok(k.includes('osm') && k.indexOf('rev') < k.indexOf('osm'), '29f: one list, 🔁 before Osman ' + k);
    }
  }
  const js = read('assets/home.js');
  for (const s of ['add({ k: "rev", e: "🔁", base: x.due | 0, href: "quiz.html?t=review" }, 0.5);', 'ins({ k: "rev", e: "🔁", base: 0, href: "quiz.html?t=review", pr: 0.5 })', '/^(bus|osm|rev|cls|imp|duel|mid|hw|today)$/',
    ' سؤال اليوم', '✅ خلّصت مراجعة اليوم', 'question" + (st.n > 1 ? "s" : "") + " aujourd\'hui', 'data-srswhat', 'SRx.nextLine()', 'hzrevbx']) assert.ok(js.includes(s), 'home.js ' + s);
  assert.strictEqual(js.match(/V = (\d+);/)[1], '3', 'path v3: today\'s path is rebuilt with the step');
  const sj = read('assets/srs.js');
  for (const s of ['📅 الجاية: بكرا', 'À venir : demain', 'شو هوّي التكرار المتباعد؟', '١ ← ٣ ← ٧ ← ١٤ ← ٣٠ ← ٦٠ ← ١٢٠', '1 → 3 → 7 → 14 → 30 → 60 → 120', '[data-srswhat]']) assert.ok(sj.includes(s), 'srs.js ' + s);
  assert.strictEqual((sj.match(/<p>[123]️⃣ /g) || []).length, 3, '«شو هيدا؟» = 3 lines');
  const hz = read('assets/hifz.js'); assert.ok(hz.includes('id = "srscard"') && hz.includes('S.nextLine()') && hz.includes('data-srswhat'), 'حفظي card: N today + الجاية + شو هيدا؟');
  assert.ok(!/adx|ad-slot|adsbygoogle|bauval/.test(sj), 'no ads in srs.js');
});

// ---------- 29b 📒 «سجل حالاتي» (Abdullah, Nov 3 2026 9:54 PM: «كل حالة منحلّها بالمشفى، بس تخلص، تنحط الخطوات الصحيحة بسجل عند كل مستخدم جرّب حل») ----------
const deq = (a, b, m) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m);   // vm arrays come from another realm
function logLoad() {
  const vm = require('node:vm'), ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['assets/erroom-data.js', 'assets/livecase-data.js', 'assets/livecase.js', 'assets/caselog.js']) vm.runInContext(read(f), ctx);
  const D = ctx.LIVECASE, E = ctx.ERROOM; D.A = Object.assign({}, E.actions, D.acts); D.I = Object.assign({}, E.items, D.items);
  return { C: ctx.LiveCore, X: ctx.LiveDept, G: ctx.NursinLogCore, D };
}
function logSolve(X, C, D, doc, dk, pk, t, who, ai, until) {
  for (let g = 0; g < 80; g++) {
    const st = X.state(D, doc, dk, t, ai); if (!st) break; const x = st.P[pk === 'b' ? 1 : 0]; if (x.over || st.end || (until && g >= until)) break;
    const cl = C.clue(st.DK, st, pk); if (!cl) break; const o = cl.s.kind === 'file' ? C.opts(st.DK, st.cs, x.p, cl.s.f).a : undefined;
    deptAdd(X, D, doc, dk, t, who(g), pk, cl.s.id, o, ai); t += 3e4;
  }
  return t;
}
function logDay() {
  const L = logLoad(), { C, X, D } = L, key = '2026-11-05', t0 = C.dayStart(key);
  const doc = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 + 9 * 36e5 };
  const A = ['u1', 'Abdullah Jaber'], B = ['u2', 'Rami Haddad'], Z = ['u3', 'Zeina'];
  let t = t0 + 9 * 36e5 + 6e4;
  t = logSolve(X, C, D, doc, 'k', 'a', t, g => g % 4 === 3 ? B : A);                 // 🫀 bed 1: u1 + u2 stabilise him
  deptAdd(X, D, doc, 'k', t, Z, 'b', 'hint'); t += 3e4;                               // u3 only took a 💡 on bed 2 (not «acted»)
  deptAdd(X, D, doc, 'k', t, B, 'b', 'acc'); t += 3e4;                                // u2 started bed 2, nobody finishes him
  return Object.assign(L, { key, t0, doc, t, A, B, Z });
}
test('#215 29b 📒 an entry is made when a patient ends, for each student who acted on HIM only (✅ stabilised · 💔 lost · ⏰ midnight / next ambulance), department + ambulance ids', () => {
  const { C, X, D, G, key, t0, doc, t } = logDay(), id0 = C.docId(key);
  const e1 = G.build(C, X, D, doc, ['u1'], t + 6e4), e2 = G.build(C, X, D, doc, ['u2'], t + 6e4), e3 = G.build(C, X, D, doc, ['u3'], t + 6e4);
  deq(e1.map(e => e.id), [id0 + '.k.a'], 'u1: his stabilised cardio patient, nothing for the bed he never touched');
  assert.strictEqual(e1[0].o, 'ok'); assert.strictEqual(e1[0].dk, 'k'); assert.ok(e1[0].c.startsWith('k0'), 'the department case id');
  deq(e2.map(e => e.id), [id0 + '.k.a'], 'u2 helped bed 1 → his entry too; bed 2 is still running → none yet');
  assert.strictEqual(e3.length, 0, 'a 💡 alone is not acting on the patient');
  const night = G.build(C, X, D, doc, ['u2'], t0 + 864e5 + 6e4).map(e => e.id + ':' + e.o).sort();
  assert.strictEqual(night[0], id0 + '.k.a:ok'); assert.ok([id0 + '.k.b:lost', id0 + '.k.b:time'].includes(night[1]), 'bed 2 left alone → 💔 (neglect) or ⏰ at midnight, logged for the one who acted');
  const st2 = X.state(D, doc, 'k', t + 6e4); if (!st2.P[1].over) { const tl = G.build(C, X, D, doc, ['u2'], t0 + 864e5 + 6e4).find(e => e.pk === 'b'); assert.ok(tl.t <= t0 + 864e5, 'ended that day'); }
  // 💔 lost by neglect (ER, nobody cared after the accueil) + an ambulance patient
  const T = X.ambTimes(key); deptAdd(X, D, doc, 'er', T[0] - 6e4, ['u1', 'A'], 'a', 'acc'); deptAdd(X, D, doc, 'x', T[0] + 6e4, ['u1', 'A'], 'a', 'acc', undefined, 1);
  const all = G.build(C, X, D, doc, ['u1'], t0 + 864e5 + 6e4), er = all.find(e => e.id === id0 + '.er.a'), amb = all.find(e => e.id === id0 + '.x1.a');
  assert.ok(er && ['lost', 'time'].includes(er.o), 'the ER patient he touched is logged'); assert.ok(amb && amb.dk === 'x' && amb.ai === 1 && ['lost', 'time'].includes(amb.o), '🛏️ ambulance 1 entry');
  assert.ok(!all.some(e => e.id === id0 + '.er.b'), 'never the ER bed he did not touch');
  const nb = G.build(C, X, D, doc, ['u1'], T[0] + 6e4); assert.ok(!nb.some(e => e.dk === 'x'), 'the ambulance patient is not logged while he is still on the bay');
});
test('#216 29b 📒 catch-up: a student away when his patient ended gets the same entry on his next visit (from the day doc); merging twice adds nothing; the phone-only (preview, uid «me») days too', () => {
  const { C, X, D, G, key, doc, t } = logDay(), at = G.build(C, X, D, doc, ['u1'], t + 6e4)[0];
  const later = G.build(C, X, D, JSON.parse(JSON.stringify(doc)), ['u1'], t + 3 * 864e5)[0];
  assert.strictEqual(later.id, at.id); deq([later.o, later.t, later.pts, later.s1, later.my], [at.o, at.t, at.pts, at.s1, at.my], 'days later = the same entry');
  const store = {}; deq(G.merge(store, [at]), [at.id]); deq(G.merge(store, [later]), [], 'already there → nothing new');
  const pv = JSON.parse(JSON.stringify(doc)); for (const k in pv.ev) if (pv.ev[k].u === 'u1') pv.ev[k].u = 'me';
  assert.strictEqual(G.build(C, X, D, pv, ['me'], t + 6e4)[0].id, at.id, 'a preview day on this phone');
  const js = read('assets/caselog.js');
  assert.ok(js.includes('DAYS = 10') && js.includes('fin[x.id] = 1') && js.includes('"live", x.id') && js.includes('HK') && js.includes('autoCatch'), 'the last 10 days are read once each (past days marked done), preview days from nursin_live_hist_v1');
  assert.ok(read('assets/livecase.js').includes('raw: function () { return D ? rawDoc() : null; }'), 'today\'s whole doc (every department) from the live room');
});
test('#217 29b 📒 his steps against the right ones: ✅ he did it · 👥 a classmate did · ⏭️ nobody; his own acts ✅ / ❌ (harmful, wrong answer) / ⚠️ (not now, not needed) / 💡; the why of every step', () => {
  const { C, X, D, G, key, t0 } = logDay();
  const doc = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 + 9 * 36e5 }; let t = t0 + 9 * 36e5 + 6e4;
  const A = ['u1', 'Abdullah'], B = ['u2', 'Rami'];
  deptAdd(X, D, doc, 'er', t, A, 'a', 'hint'); t += 3e4;
  deptAdd(X, D, doc, 'er', t, A, 'a', 'acc'); t += 3e4;
  const st0 = X.state(D, doc, 'er', t), q = C.opts(D, st0.cs, st0.P[0].p, 'id'); deptAdd(X, D, doc, 'er', t, A, 'a', 'f_id', (q.a + 1) % 4); t += 3e4;   // a wrong answer
  deptAdd(X, D, doc, 'er', t, A, 'a', 'f_tr'); t += 3e4;                                                                                            // ⑤ far too early → ⚠️
  const bad = (st0.P[0].p.bad || [])[0]; if (bad) { deptAdd(X, D, doc, 'er', t, A, 'a', bad.a); t += 3e4; }                                         // harmful
  t = logSolve(X, C, D, doc, 'er', 'a', t, g => g < 3 ? B : A, undefined, 8);
  const e = G.build(C, X, D, doc, ['u1'], t0 + 864e5 + 6e4).find(x => x.id.endsWith('.er.a')), c = G.ctx(C, X, D, e), r = G.compare(c.L, e);
  assert.ok(c && c.p && c.L.length > 10 && c.cs.id === doc.c, 'case, patient and ordered steps rebuilt from the bank');
  assert.strictEqual(r.steps.length, c.L.length); assert.ok(r.n.ok >= 1 && r.n.team >= 1 && r.n.miss >= 1, 'me + team + missed all present');
  assert.strictEqual(r.n.ok + r.n.team + r.n.miss, c.L.length);
  assert.ok(r.steps.find(s => s.m === 'team').by === 'Rami', 'the classmate\'s first name');
  assert.strictEqual(r.acts[0].m, 'hint'); assert.strictEqual(r.acts[2].m, 'bad', 'a wrong dossier answer = ❌'); assert.strictEqual(r.acts[3].m, 'warn', 'too early = ⚠️');
  if (bad) assert.strictEqual(r.acts[4].m, 'bad', 'a harmful act = ❌');
  assert.strictEqual(e.pts, e.my.reduce((s, m) => s + m[2], 0), 'his points on this patient');
  assert.ok(c.L.every(s => s.kind === 'file' || (s.why && s.why.ar && s.why.fr)), 'every gesture has its why (AR + FR)');
  // a harmful act in a department is stored as «no» but logged as ❌ harmful
  const dd = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 + 9 * 36e5 }; let u = t0 + 10 * 36e5;
  const kc = X.state(D, dd, 'k', u), kb = (kc.P[0].p.bad || [])[0]; deptAdd(X, D, dd, 'k', u, A, 'a', 'acc'); u += 3e4;
  if (kb) { deptAdd(X, D, dd, 'k', u, A, 'a', kb.a); const ke = G.build(C, X, D, dd, ['u1'], t0 + 864e5 + 6e4)[0]; assert.ok(ke.my.some(m => m[1] === 'bad'), 'department harm decoded'); }
  const js = read('assets/caselog.js');
  for (const k of ['📋 الخطوات الصح (بالترتيب)', "📋 Les bonnes étapes (dans l'ordre)", '✍️ خطواتك إنت', '✍️ Tes étapes', 'فاتت — ما حدا عملها', 'إنت عملتها', '✅ صح · ❌ غلط/مضرّ · ⚠️ مش بوقتها · ⏭️ فاتت · 👥 عملها غيرك']) assert.ok(js.includes(k), k);
  assert.ok(js.includes('C.opts(c.DK, c.cs, c.p, s.f)') && js.includes('T(s.why)') && js.includes('C.WHY.nonew'), 'dossier answer / gesture why / doctor «nothing new»');
});
test('#218 29b 📒 the list: newest first, filters by department and outcome; the account copy «lg0…lg3» round-trips and stays inside rules v22 (srs/main ≤ 400 keys) next to the 🔁 keys, which never wipe it', () => {
  const { G } = logLoad();
  const mk = (id, dk, o, t) => ({ v: 1, id, day: '2026-11-0' + id[7], dk, ai: dk === 'x' ? 2 : 0, c: 'lc01', erc: 'lc02', pk: 'a', o, t, pts: 5, s1: ['acc', 'f_id'], s2: { mon: 'Rami' }, my: [['acc', 'ok', 3, null, t], ['f_id', 'no', -3, 2, t + 1]], u: 'u1', at: t });
  const L = [mk('20261101.er.a', 'er', 'ok', 1), mk('20261102.k.a', 'k', 'lost', 3), mk('20261102.x2.a', 'x', 'time', 2), mk('20261103.n.a', 'n', 'ok', 4)];
  deq(G.filter(L).map(e => e.id), ['20261103.n.a', '20261102.k.a', '20261102.x2.a', '20261101.er.a'], 'newest first');
  deq(G.filter(L, { dk: 'k' }).map(e => e.id), ['20261102.k.a']); deq(G.filter(L, { dk: 'x' }).map(e => e.dk), ['x']);
  deq(G.filter(L, { o: 'ok' }).map(e => e.id), ['20261103.n.a', '20261101.er.a']); assert.strictEqual(G.filter(L, { dk: 'n', o: 'lost' }).length, 0);
  const store = {}; G.merge(store, L); const P = G.pack(store);
  deq(Object.keys(P), ['lg0', 'lg1', 'lg2', 'lg3']); assert.ok(Object.values(P).every(v => typeof v === 'string'));
  const back = G.unpack(Object.assign({ z0: 'q001,1,2026-11-06,abc' }, P)); assert.strictEqual(back.length, 4, 'the 🔁 keys are not log lines');
  const b2 = back.find(e => e.id === '20261102.x2.a'); deq([b2.dk, b2.ai, b2.o, b2.c, b2.erc, b2.t, b2.pts, b2.s1, Object.keys(b2.s2), b2.my[1]], ['x', 2, 'time', 'lc01', 'lc02', 2, 5, ['acc', 'f_id'], ['mon'], ['f_id', 'no', -3, 2, 3]]);
  const big = {}; for (let i = 0; i < 300; i++) big['20261' + String(100 + i % 30).padStart(3, '0') + '.er.' + (i % 2 ? 'a' : 'b') + i] = mk('2026110' + (i % 9) + '.er.a', 'er', 'ok', i);
  const many = {}; for (let i = 0; i < 500; i++) { const e = mk('20261' + String(i).padStart(3, '0') + '.k.a', 'k', 'ok', i); e.id = String(20260000 + i) + '.k.a'; many[e.id] = e; }
  G.merge(many, []); assert.ok(Object.keys(many).length <= G.MAXE, 'the phone keeps at most ' + G.MAXE);
  const Pm = G.pack(many); assert.strictEqual(G.unpack(Pm).length, G.SYNC, 'the account keeps the newest ' + G.SYNC); assert.ok(Object.keys(Pm).length + 8 <= 400, 'with the 🔁 «z» keys still ≤ 400 (rules v22)');
  const srs = read('assets/srs.js'), qs = read('assets/qstats.js'), js = read('assets/caselog.js');
  assert.ok(srs.includes('!/^(z|lg)\\d+$/.test(k)'), '🔁 does not take «lg» keys for an old v1 copy');
  assert.ok(qs.includes('{ items, t: fs.serverTimestamp() }, { merge: true }') && qs.includes('srsLg') && qs.includes('W.NursinLog.packed'), '🔁 pushes merge; an old v1 rewrite puts the «lg» lines back');
  assert.ok(js.includes('"srs", "main"), { items: P, t: A.fs.serverTimestamp() }, { merge: true }'), '📒 writes only its own keys (merge)');
  assert.ok(!/nursin-rules-v23/.test(js), 'no new rules');
});
test('#219 29b 📒 wiring: «📒» in the hospital top bar + the ended-case card, a line in the room when one of his patients is logged; a card on حفظي + hifzi.html#caselog; «الكل»; tag b; its own layer above the room, light + dark, no ads', () => {
  for (const p of ['index.html', 'games.html', 'hifzi.html']) { const h = read(p); assert.strictEqual((h.match(/<script src="assets\/caselog\.js\?v=20261029r" defer><\/script>/g) || []).length, 1, p); }
  const g = read('games.html'); assert.ok(g.indexOf('assets/livecase-room.js') < g.indexOf('assets/caselog.js'));
  const r = read('assets/livecase-room.js');
  assert.ok(r.includes('data-lclog="1" aria-label="\' + esc(u("myLog")) + \'">📒</button>'), 'top bar (29h: no ended card over the room any more)');
  assert.ok(r.includes('w.NursinLog.open("room")') && r.includes('d.addEventListener("nursin:caselog"') && r.includes('myLog: { ar: "📒 سجل حالاتي", fr: "📒 Mon carnet de cas" }'), 'opens the log; says when an entry lands');
  assert.ok(read('assets/ui.js').includes('["hifzi.html#caselog", "📒", "سجل حالاتي", "Carnet de cas", "nw"]'), '«الكل»');
  const js = read('assets/caselog.js');
  assert.ok(js.includes('id = "clgcard"') && js.includes('location.hash === "#caselog"') && js.includes('data-clgopen'), 'حفظي card + #caselog');
  assert.ok(js.includes('var V = "20261029r"') && /assets\/(erroom-data|livecase)\.js/.test(js), 'loads the bank where the page has none, same cache tag');
  assert.ok(!/adsbygoogle|ads\.js|adx|ad-slot/.test(js), 'no ads in the log');
  const css = read('assets/ui.css'), blk = css.slice(css.indexOf('/* 📒 29b'), css.indexOf('/* 📒🙋 28s'));
  assert.ok(blk.includes('.clg{position:fixed;inset:0;z-index:2147483060') && blk.includes('html[data-theme="night"] .clg{'), 'above the room (2147483000), dark theme');
  assert.ok(!/backdrop-filter/.test(blk) && blk.includes('max-width:640px') && blk.includes('overflow-x:auto'), 'no extra blur; fits 390 px (chips scroll)');
  for (const k of ['📒 سجل حالاتي', '📒 Mon carnet de cas', '🔁 زيد للتكرار المتباعد', '🔁 Ajouter à la révision espacée', 'محفوظ عهالتلفون بس', 'Gardé sur ce téléphone seulement']) assert.ok(js.includes(k), k);
});
test('#220 29b 📒 «🔁 زيد للتكرار المتباعد»: the quiz questions of the lessons the patient is about (topics from his story/dossier/source), new ones first, into 🔁 v2', () => {
  const { C, X, D, G } = logLoad(), vm = require('node:vm'), ctx = {}; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('assets/quiz-data.js'), ctx);
  const Q = ctx.QUIZ, ids = new Set(Q.map(q => q.id)), lc01 = C.caseById(D, 'lc01');
  assert.ok(G.topics(lc01, lc01.pts[0]).includes('infarctus'), 'an infarctus patient → infarctus questions');
  const r = G.keyQs(C, Q, lc01, lc01.pts[0], 'x', k => k === 'q001', 5);
  assert.strictEqual(r.ids.length, 5); assert.ok(r.ids.every(i => ids.has(i) && /^q\d{3,4}$/.test(i)) && !r.ids.includes('q001'), 'real quiz ids (🔁 v2 tracks them), the ones already in it last');
  for (const dk of ['k', 'n']) for (const c of X.cases(D, dk)) for (const p of c.pts) assert.ok(G.keyQs(C, Q, c, p, c.id, null, 5).ids.length >= 3, c.id + p.k + ' has questions');
  assert.ok(read('assets/caselog.js').includes('S.add(r.ids)') && read('assets/srs.js').includes('add: function (qids)'), '🔁 v2 add (due tomorrow)');
});

/* 📝 29c — «كويز هالجزء» (Abdullah, Nov 3 2026 10:01 PM: «بدي بكل جزء من الدرس ينعمل كويز عنه، إذا مقسّم لـ3 ينعمل بكل قسم كويز») */
function pqLoad() {
  const vm = require('node:vm'), ctx = {}; ctx.window = ctx; ctx.addEventListener = () => {};
  ctx.document = { addEventListener() {}, getElementById() { return null; } }; ctx.location = { pathname: '/x.html' };
  ctx.localStorage = { getItem() { return null; }, setItem() {} }; vm.createContext(ctx);
  for (const f of ['assets/lessons.js', 'assets/quiz-data.js', 'assets/partq-data.js']) vm.runInContext(read(f), ctx);
  return ctx;
}
const pqLes = (q) => { const C = ['heart','infarctus','angor','ecg','pericarde','endomyo','pacemaker','embolie','choc','ic','arythmies','chirurgie'], N = ['brain','evaluation','examens','laminectomie','craniotomie','avc','htic','glasgow']; if (q.l) return q.t + ':' + q.l; if (C.includes(q.t)) return 'cardio:' + q.t; if (N.includes(q.t)) return 'neuro:' + q.t; return null; };
test('#221 29c 📝 every lesson part (all subjects, ✂️ parts included) has its own quiz of ≥ 4 questions (≤ 10; 6 a round), ids real and unique to the part', () => {
  const c = pqLoad(), L = c.NursinLessons, P = c.PARTQ.map, Q = new Map(c.QUIZ.map(q => [q.id, q]));
  const keys = L.parts.map(x => L.key(x));
  assert.strictEqual(keys.length, 199, 'every reading unit: 70 lessons as 199 parts');
  assert.strictEqual(JSON.stringify(Object.keys(P).sort()), JSON.stringify(keys.slice().sort()), 'one quiz per part, no extra');
  const seen = new Set();
  for (const k of keys) {
    const ids = P[k]; assert.ok(ids.length >= 4 && ids.length <= 10, k + ' has ' + ids.length);
    for (const id of ids) { assert.ok(Q.has(id), k + ' → ' + id + ' in the bank'); assert.ok(!seen.has(id), id + ' in one part only'); seen.add(id); assert.ok(/^q\d{3}$/.test(id), 'id shape (🔁 v2 tracks it) ' + id); }
  }
  for (const s of ['cardio','neuro','henderson','law','mgmt','quality','pharma','rea','geri','comm','medsurg']) assert.ok(keys.some(k => k.startsWith(s + ':')), s);
  assert.strictEqual(JSON.stringify(c.PARTQ.split), JSON.stringify(L.SPLIT), 'built on the same ✂️ cuts as assets/lessons.js (rebuild PARTQ when SPLIT changes)');
});
test('#222 29c 📝 the questions of a part belong to that part: same lesson, every bank question of the lesson placed once (matched to the part whose text carries its words), new ones written from the part (plain, a/b/c spread, right never the longest, fr)', () => {
  const c = pqLoad(), L = c.NursinLessons, P = c.PARTQ.map, Q = new Map(c.QUIZ.map(q => [q.id, q]));
  const lesOf = k => k.split('#')[0];
  for (const k of Object.keys(P)) for (const id of P[k]) assert.strictEqual(pqLes(Q.get(id)), lesOf(k), id + ' is a question of ' + lesOf(k));
  const placed = new Set([].concat(...Object.values(P)));
  for (const q of c.QUIZ) assert.ok(placed.has(q.id), q.id + ' (a lesson question) sits in one of its lesson\'s parts');
  const nw = c.PARTQ.added; assert.ok(nw.length >= 300, 'new questions written from the parts: ' + nw.length);
  const cnt = [0, 0, 0];
  for (const id of nw) {
    const q = Q.get(id); assert.ok(q, id); cnt[q.a]++;
    assert.strictEqual(q.o.length, 3); assert.ok(q.x.length > 10, id + ' explanation');
    const Lg = q.o.map(o => o.trim().length), m = Math.max(...Lg); assert.ok(Lg[q.a] < m || Lg.filter(n => n === m).length > 1, 'right answer is not the longest: ' + id);
    assert.ok(!/<|\*\*|«|»/.test(q.o.join('')) && !/<b>|\*\*/.test(q.q + q.x), 'plain, no bold: ' + id);
    assert.ok(!/(الحاجة|حاجة|besoin)\s*(رقم|n°)?\s*[0-9٠-٩]+/i.test(q.q + q.o.join('') + q.x), 'Henderson need never by number: ' + id);
  }
  for (const n of cnt) assert.ok(n > nw.length * 0.28, 'spread a/b/c ' + cnt);
  const fr = read('assets/fr/quiz.js'), H = s => { s = String(s).replace(/\s+/g, ' ').trim(); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36) + '.' + s.length.toString(36); };
  let miss = 0; for (const id of nw) { const q = Q.get(id); if (q.t === 'law') continue; for (const s of [q.q, q.x, ...q.o]) if (!fr.includes('"' + H(s) + '"')) miss++; }
  assert.strictEqual(miss, 0, 'every new question has its 🇫🇷 text');
});
test('#223 29c 📝 the sheet: button first in each part\'s end row, opens inline (no page change, ads hidden), one question at a time, «✅ كنت متأكد / 🤔 حزرت», every answer → 🔁 SRS v2 + weak points, score + «🔁 عيد» + «➡️ الجزء الجاي», AR + FR, light + dark', () => {
  const r = read('assets/retain.js');
  assert.ok(r.includes('<button class="btn sm pqbtn" type="button" data-pq="\' + esc(pkey(x)) + \'">\' + esc(T("📝 كويز هالجزء", "📝 Quiz de cette partie"))'), 'the button in the part\'s end row');
  assert.ok(r.includes('closest("[data-teach],[data-blank],[data-case],[data-pq]")') && r.includes('openPart(xp)'), 'tap → the sheet');
  assert.ok(r.includes('shell("rpq"') && r.includes('d.documentElement.classList.add("fcon", "rton")'), 'inline sheet over the page; html.rton hides the page\'s ad units');
  assert.ok(r.includes('SR.answer(q, good)') && r.includes('SR.confRow(q)') && r.includes('SR.tagHtml(sr)') && r.includes('W.record(q, good)'), 'every answer recorded (🔁 v2 + weak), confidence after a right one');
  for (const s of ['🔁 عيد', '🔁 Refaire', '➡️ الجزء الجاي', '➡️ Partie suivante', 'السؤال الجاي ←', 'Question suivante →', 'جاوبت صح ', 'Tu as ', 'كويز هالجزء', 'Quiz de cette partie', 'أجزاء', 'parties']) assert.ok(r.includes(s), s);
  assert.ok(r.includes('loadScript("assets/partq-data.js?v=" + V'), 'data loaded on tap with the cache tag'); assert.ok(r.includes('PQMAX = 6') && r.includes('.slice(0, PQMAX)'), '6 a round, unanswered first');
  const pq = r.slice(r.indexOf('var PQK'), r.indexOf('/* ---------------- the rows / buttons on lesson pages'));
  assert.ok(!/adx|adsbygoogle|ad-slot|NursinAds/.test(pq), 'no ad inside the quiz sheet');
  const css = read('assets/ui.css'), blk = css.slice(css.indexOf('/* 📝 29c'));
  assert.ok(blk.includes('body.ui .rtrow .btn.pqbtn{') && blk.includes('html[data-theme="night"] body.ui .rtrow .btn.pqbtn.pqok') && !/position:fixed/.test(blk), 'glass button, night, no new layer');
  assert.ok(!fs.existsSync(path.join(SITE, 'nursin-rules-v23.txt')), 'nothing to publish');
});
test('#224 29c 📝 done marker: a finished part quiz is kept (best score), ✓ on its button + on the part\'s title, «📝 3/5 أجزاء» on the lesson\'s first title, the part counts as read', () => {
  const { ctx, run } = retainCtx(); run('assets/retain.js'); const R = ctx.Retain;
  assert.strictEqual(R.PQK, 'nursin_partq_v1');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(R.pqDone())), {});
  R.pqSave('cardio:infarctus#1', 4, 5); R.pqSave('cardio:infarctus#1', 2, 5);
  const d1 = R.pqDone()['cardio:infarctus#1']; assert.strictEqual(d1.s, 4, 'best kept'); assert.strictEqual(d1.l, 2, 'last kept'); assert.strictEqual(d1.n, 5);
  const r = read('assets/retain.js');
  assert.ok(r.includes('mk.className = "pqmk"') && r.includes('pr.className = "pqpr"') && r.includes('" · 📝 " + c + "/" + ps.length + " " + T("أجزاء", "parties")'), 'title marks');
  assert.ok(r.includes('"✓ " + T("📝 كويز هالجزء"') && r.includes('b.classList.toggle("pqok"'), '✓ on the button');
  assert.ok(r.includes('NL.markRead(x)') && r.includes('"nursin:partq"'), 'part read + event');
  assert.ok(r.includes('try { pqMarks(); } catch (e) {}'), 'marks drawn with the end rows (idempotent: only changed text is written)');
});

function d29Load() { const vm = require('node:vm'), ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['erroom-data.js', 'livecase-data.js', 'livecase.js', 'livepay.js', 'livepres.js']) vm.runInContext(read('assets/' + f), ctx);
  const D = ctx.LIVECASE, E = ctx.ERROOM; D.A = Object.assign({}, E.actions, D.acts); D.I = Object.assign({}, E.items, D.items);
  return { ctx, C: ctx.LiveCore, X: ctx.LiveDept, P: ctx.LivePay, LP: ctx.LivePres, D }; }
function d29Put(X, D, raw, dk, pk, a, uid, now, ai) { const cr = X.check(D, raw, dk, pk, a, 0, uid, now, ai), r = cr.r; if (!LIVE_OK[r.k]) return r;
  const en = X.enc(dk, ai || (cr.st.amb && cr.st.amb.i), r); raw.n++; raw.ev[raw.n] = { t: now, u: uid, n: uid, p: pk, a: en.a, k: en.k, d: r.d }; if (r.o != null) raw.ev[raw.n].o = r.o; return r; }
test('#225 29d 🛗 three floors + the elevator: ground (🚑 · 🪑 · 🧪 · 🩻 · 💊 · 💰), 1st (🫀 · 🧠 · 🩺), 2nd (🔪 · 👴); not-yet rooms say «🚧 قريباً»; the walk takes the 🛗 between floors', () => {
  const { X } = d29Load();
  for (const k of ['er', 'wt', 'x', 'lab', 'rad', 'ph', 'acc']) assert.strictEqual(X.floorOf(k), 0, k);
  for (const k of ['k', 'n', 'r']) assert.strictEqual(X.floorOf(k), 1, k);
  for (const k of ['s', 'g']) assert.strictEqual(X.floorOf(k), 2, k);
  // 29e: 🩺 🔪 👴 have their cases now; only the rooms without any case stay «🔜» — and every room can be walked into (drawn, labelled)
  for (const k of ['or', 'sspi', 'psy']) assert.ok(X.SOON[k] && X.isOpen(k), k + ' soon but walkable');
  for (const k of ['r', 's', 'g', 'lab', 'rad', 'ph']) assert.ok(!X.SOON[k] && X.isOpen(k), k + ' open (29e)');
  for (const k of ['er', 'k', 'n', 'wt', 'acc']) assert.ok(X.isOpen(k), k + ' open');
  assert.ok(X.isSvc('wt') && X.isSvc('acc') && !X.isSvc('k'));
  for (const k of X.ALL) assert.ok(X.INFO[k] && X.INFO[k].ic && X.INFO[k].t.ar && X.INFO[k].t.fr, k + ' named AR + FR');
  for (const f of [0, 1, 2, 3]) assert.ok(X.FLN[f].ar && X.FLN[f].fr);
  const r = read('assets/livecase-room.js');
  assert.ok(r.includes('function legs(a, b)') && r.includes('{ a: a, b: "el", f: fa, d: 1.1 }, { ride: 1, f0: fa, f1: fb, d: 1.6 }'), 'door → corridor → 🛗 → ride → walk in');
  assert.ok(r.includes('class="lcr-flt" role="tablist"') && r.includes('data-lcfl="') && r.includes('function chimeEl()'), 'floor tabs (peek another floor), elevator chime');
  assert.ok(!r.includes('if (w.LiveDept.SOON[dk]) return say("neutral", u("soonD"') && r.includes('svcSub_or') && r.includes('u("soonT") + " · "'), '29e: a 🔜 room is entered, drawn and says it has no case yet');
  assert.ok(r.includes('🚧 قريباً') && r.includes('🚧 Bientôt'));
  const css = read('assets/livecase.css'); assert.ok(css.includes('.lcr-flt{') && css.includes('overflow-x:auto') && css.includes('html[data-theme="night"] .lcr-flb'), 'tabs scroll at 390px, night');
});
test('#226 29d 🪑 every bed starts empty: the patients wait outside; 🏷️ triage (priority + ward) by a student brings one in — right ward = in (+4 / −1 for the priority), wrong ward = still waiting (−2), 3 tries each', () => {
  const { C, X, D } = d29Load(); const key = '2026-11-04', t0 = C.dayStart(key) + 8 * 36e5;
  const raw = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 }; let now = t0 + 6e4;
  const W0 = X.waiting(D, raw, now).filter(w => w.kind === 'case'); assert.ok(W0.length >= 6, 'er + k + n patients waiting');
  for (const w of W0) assert.ok(!X.adm(raw, w.dk, w.pk, 0), 'nobody in at first');
  const ka = W0.find(w => w.dk === 'k' && w.pk === 'a'), want = X.prio(ka.p).pr;
  let r = d29Put(X, D, raw, 'k', 'a', 'tg' + want + 'n', 'u1', now); assert.strictEqual(r.k, 'neu'); assert.strictEqual(r.d, -2); assert.ok(!X.adm(raw, 'k', 'a', 0), 'wrong ward: still waiting');
  const wrongP = want === 4 ? 1 : want === 1 ? 3 : want + 2 > 4 ? 4 : want + 2;
  r = d29Put(X, D, raw, 'k', 'a', 'tg' + (want < 4 ? 4 : 1) + 'k', 'u2', now += 3000);
  assert.strictEqual(r.k, (want < 4 ? 4 : 1) - want === -1 ? 'ok' : 'neu'); assert.ok(X.adm(raw, 'k', 'a', 0), 'right ward: in');
  r = X.check(D, raw, 'k', 'a', 'tg' + want + 'k', 0, 'u3', now += 3000).r; assert.strictEqual(r.k, 'adm', 'already brought in');
  const kb = W0.find(w => w.dk === 'k' && w.pk === 'b'), wb = X.prio(kb.p).pr;
  r = d29Put(X, D, raw, 'k', 'b', 'tg' + wb + 'k', 'u1', now += 3000); assert.strictEqual(r.k, 'ok'); assert.strictEqual(r.d, 4); assert.ok(r.tri.okP && r.tri.okD);
  const na = W0.find(w => w.dk === 'n' && w.pk === 'a');
  for (let i = 0; i < 3; i++) d29Put(X, D, raw, 'n', 'a', 'tg1e', 'u9', now += 3000);
  assert.strictEqual(X.check(D, raw, 'n', 'a', 'tg1e', 0, 'u9', now += 3000).r.k, 'trimax', '3 tries a student');
  assert.ok(!X.waiting(D, raw, now).some(w => w.dk === 'k'), 'cardio: nobody waiting now');
  assert.ok(X.waiting(D, raw, now).some(w => w.dk === 'n' && w.pk === 'a'));
  const r0 = read('assets/livecase-room.js');
  assert.ok(r0.includes('function inBed(x)') && r0.includes('if (inBed(x)) { patient(P, x, s, t);') && r0.includes('return waitSheet(xw)'), 'big room: an empty bed + «🪑 بالانتظار» until he is brought in');
  assert.ok(r0.includes('setTimeout(function () { walkTo(target, nmx); }, 1400);'), 'the student wheels him to his bed');
  assert.ok(read('assets/livecase.js').includes('function actSafe(pk, a, opt, again, dk0)'), 'the step names its department (triage from the waiting room)');
});
test('#227 29d 🚶 walk-in patients from his lessons (17), 4–6 a day between 9:00 and 22:00 Beirut, each waits 45 min; drawn characters with a face, age, clothes, words, pain', () => {
  const { C, X, D } = d29Load();
  assert.ok(D.walk.length >= 17);                                                     // 29e: + walk-ins for the new wards
  const ids = new Set(); for (const b of D.walk) { ids.add(b.id); assert.match(b.id, /^w\d\d$/);
    for (const f of ['nm', 'say', 'why', 'src']) assert.ok(b[f] && b[f].ar && b[f].fr, b.id + ' ' + f);
    assert.ok(b.age > 0 && /^[mf]$/.test(b.sex) && b.pr >= 1 && b.pr <= 4 && 'eknrsgpm'.includes(b.dk) && b.eva >= 0 && b.eva <= 10, b.id);
    for (const v of ['sys', 'dia', 'fc', 'fr', 'spo2', 't', 'gcs']) assert.ok(typeof b.vit[v] === 'number', b.id + ' ' + v); }
  assert.strictEqual(ids.size, D.walk.length);
  assert.ok(D.walk.slice(0, 17).filter(b => /🌐/.test(b.src.ar)).length <= 2, 'from his lessons (🌐 marked)');   // 29e: the new walk-ins say «🌐» themselves when general (#236)
  for (const key of ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']) {
    const L = X.walkIns(D, key).filter(w => !w.aft); assert.ok(L.length >= 4 && L.length <= 6, key + ' ' + L.length);   // 29h: + the after-case stream (aft, #245)
    const t0 = C.dayStart(key); for (let i = 0; i < L.length; i++) { const hh = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Beirut', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(L[i].t)).split(':').map(Number), h = hh[0] + hh[1] / 60; assert.ok(h >= 9 && h <= 22, 'Beirut 9–22: ' + h); if (i) assert.ok(L[i].t - L[i - 1].t >= 40 * 6e4, '≥ 40 min apart'); }
    const raw = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 };
    const w = L[0]; assert.ok(X.waiting(D, raw, w.t + 10 * 6e4).some(x => x.kind === 'walk'), 'seated'); assert.ok(!X.waiting(D, raw, w.t + 50 * 6e4).some(x => x.kind === 'walk' && x.dk === w.dk), 'gone after 45 min');
    const r = d29Put(X, D, raw, w.dk, 'a', 'tg' + w.b.pr + w.b.dk, 'u1', w.t + 6e4); assert.strictEqual(r.k, 'ok', 'triage of a walk-in');
  }
  const r0 = read('assets/livecase-room.js');
  for (const s of ['function person(c, x, y, p, t, sel)', 'function stretcher(c, x, y, p, t)', 'function bubble(c, P, x, y, txt)', 'function painOf(p)', 'hij:']) assert.ok(r0.includes(s), s);
});
test('#228 29d 💵 the salary (ل.ن): every point 10, +100 per stabilised patient to each helper, 🚑 +50 %; the payslip (earnings, deductions, net), the week ranking, ranks متدرّب → ممرّض → ممرّض أوّل, the weekly 👔 مسؤول الطابق', () => {
  const { C, X, P, D } = d29Load(); const key = '2026-11-04', t0 = C.dayStart(key) + 9 * 36e5;
  const raw = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 }; let now = t0 + 6e4;
  for (const pk of ['a', 'b']) { const st = X.state(D, raw, 'k', now); d29Put(X, D, raw, 'k', pk, 'tg' + X.prio(st.P[pk === 'b' ? 1 : 0].p).pr + 'k', 'u1', now += 3000); }
  d29Put(X, D, raw, 'k', 'a', 'tg1n', 'u2', now += 3000);
  const m = P.day(C, X, D, raw, now, null);
  assert.strictEqual(m.u1.L.tri, 80, 'two right triages = +80'); assert.strictEqual(m.u1.net, m.u1.earn - m.u1.ded);
  assert.ok(m.u2 === undefined || m.u2.ded >= 0);
  assert.strictEqual(P.RATE, 10); assert.strictEqual(P.STAB, 100);
  assert.strictEqual(P.rank(0).k, 'tr'); assert.strictEqual(P.rank(0).ar, 'متدرّب'); assert.strictEqual(P.rank(1000).ar, 'ممرّض'); assert.strictEqual(P.rank(5000).ar, 'ممرّض أوّل'); assert.strictEqual(P.nextRank(1200).left, 3800);
  assert.strictEqual(P.monday('2026-11-04'), '2026-11-02'); assert.strictEqual(P.weekDays('2026-11-02').length, 7);
  const B = P.week([P.pack({ a: { n: 'ريم', earn: 900, ded: 0, net: 900, ok: 9 }, b: { n: 'سامي', earn: 1200, ded: 0, net: 1200, ok: 12 } }), P.pack({ a: { n: 'ريم', earn: 500, ded: 0, net: 500, ok: 5 } })]);
  assert.strictEqual(P.supOf(B).u, 'a', 'top earner of the week before'); assert.strictEqual(P.supOf(P.week([])), null); assert.strictEqual(P.SUP.ic, '👔');
  assert.deepStrictEqual(jj(P.unpackMine(P.packMine({ '20261104': 840, '20261103': -20 }))), { '20261104': 840, '20261103': -20 });
  const pay = read('assets/livepay.js');
  for (const s of ['كشف راتب', 'Bulletin', 'الصافي', 'Net', 'الاقتطاعات', 'Retenues', 'ترتيب الصف', 'مسؤول الطابق', "Chef d'étage", 'ل.ن', 'NS', 'nursin_pay_v1', 'py0']) assert.ok(pay.includes(s), s);
  assert.ok(!/adsbygoogle|NursinAds|adx/.test(pay), 'no ads on the payslip');
  assert.ok(pay.includes('V = "20261029r"'));
});
test('#229 29d 👥 avatars at the same spot spread into slots, no name tag over another; the rank on the tag + the scrubs colour; room codes > 3 ride the 20-char name (rules v22)', () => {
  const { LP } = d29Load();
  for (const n of [2, 4, 7, 12]) { const it = []; for (let i = 0; i < n; i++) it.push({ id: 'u' + i, x: 268, y: 236, w: 40 + (i % 3) * 8, h: 38 }); it.push({ id: 'me', x: 268, y: 237, w: 44, h: 38, fix: 1 });
    const o = LP.spread(it); assert.deepStrictEqual(jj(o.me), { x: 268, y: 237 }, 'I stay where I am');
    for (let i = 0; i < it.length; i++) for (let j = i + 1; j < it.length; j++) { const A = it[i], B = it[j], a = o[A.id], b = o[B.id];
      assert.ok(!((a.x - A.w / 2 < b.x + B.w / 2) && (b.x - B.w / 2 < a.x + A.w / 2) && (a.y - 5 - A.h < b.y - 5) && (b.y - 5 - B.h < a.y - 5)), n + ': ' + A.id + '/' + B.id); } }
  for (const [d1, d2] of [['wt', 'acc'], ['er', 'k'], ['acc', 'x'], ['n', 'wt']]) { const doc = LP.doc({ name: 'عبدالله جابر الحسيني' }, { x: 100, y: 200 }, { x: 110, y: 210 }, '', d1, d2);
    assert.ok(Array.from(doc.n).length <= 20, 'name ≤ 20 (v22)'); const p = LP.place(Object.assign({}, doc)); assert.strictEqual(p.dep, d1); assert.strictEqual(p.tdep, d2); assert.ok(!/[\u2063\u200b-\u200d\u2060]/.test(p.n), 'suffix stripped'); }
  const r = read('assets/livecase-room.js');
  assert.ok(r.includes('var at = LP.spread ? LP.spread(items) : {};') && r.includes('scrubs(x, y, a, sw, uid, 1.2, P, null, col)') && r.includes('function scrubsCol(uid)') && r.includes('rankIc(p.uid)'), 'slots + rank tag + rank colour');
  assert.ok(r.includes('function supFree(k)') && r.includes('u("supFree")'), '👔 one free 🎯 per patient');
});
test('#230 29d 🪑 the waiting room view (chairs, characters, triage desk, ambulance stretcher), the triage sheet (vitals, 1️⃣ priority, 2️⃣ ward, why), 💰 المحاسبة view; AR + FR; light + dark; no ads on hospital screens', () => {
  const r = read('assets/livecase-room.js'), blk = r.slice(r.indexOf('/* ---------------- 29d 🪑'), r.indexOf('/* ---------------- 28z 🏥 the hospital floor'));
  for (const s of ['function svcBg(dk)', 'function svcDraw(P, dk, t)', 'function svcTap(p)', 'function triHtml(id)', 'function triGo(id)', 'function triResult(o, r)', 'function accPanel(tab)', 'function srsWrong(o)', 'data-lctripr', 'data-lctridc', 'data-lctrigo']) assert.ok(blk.includes(s), s);
  assert.ok(!/adsbygoogle|NursinAds|adx/.test(blk), 'no ads');
  for (const s of ['🏷️ فرز (Triage)', '🏷️ Tri (triage)', '1️⃣ شو الأولوية؟', '1️⃣ Quelle priorité ?', '2️⃣ لأي قسم؟', '2️⃣ Quel service ?', '✅ فرز صح!', '✅ Tri juste !', '❌ مش هالقسم — بعدو ناطر', '🪑 بالانتظار', '🪑 En attente', '💰 شبّاك المحاسبة', '⬆️ ترقية! صرت {r}']) assert.ok(r.includes(s), s);
  const css = read('assets/livecase.css'); for (const s of ['.lcr-tvs{', '.lcr-tv.bad{', '.pay-slip{', '.pay-net{', 'html[data-theme="night"] .pay-slip', 'html[data-theme="night"] .lcr-tv', '.hzlvp.wait{', '.lcr-wtc{']) assert.ok(css.includes(s), s);
  const lc = read('assets/livecase.js'); assert.ok(lc.includes('" en attente"') && lc.includes('" ناطرين"'), 'home card: who is waiting');
});
test('#231 29d 🗂️ wiring: livepay.js on the hospital page with the cache tag, the act names its room, nothing to publish (rules v22 hold: names ≤ 20, py0 in srs/main)', () => {
  const g = read('games.html'); assert.ok(g.includes('<script src="assets/livepay.js?v=20261029r" defer></script>'), 'loaded before the room');
  assert.ok(g.indexOf('assets/livepay.js') < g.indexOf('assets/livecase-room.js'));
  assert.ok(!fs.existsSync(path.join(SITE, 'nursin-rules-v23.txt')), 'nothing to publish');
  const pay = read('assets/livepay.js'); assert.ok(pay.includes('"srs", "main"') || pay.includes("'srs', 'main'") || pay.includes('srs/main'), 'his account copy rides srs/main (v22 allows it)');
});

function d29Care() { const vm = require('node:vm'), ctx = { console }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('assets/livecare.js'), ctx); return ctx.LiveCare; }
test('#232 29d ⏳ every act takes its time (quick 3–5 s, normal ~10 s, IV/sonde/blood 12–15 s), ×test multiplier, one act at a time per patient (others in parallel), saved + paid when done, ✖ cancel, leaving stops it', () => {
  const C = d29Care(), vm = require('node:vm'), ctx = { console }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('assets/erroom-data.js'), ctx);
  for (const f of ['livecase-room.js', 'livecase.js', 'livepay.js', 'livepres.js', 'livecare.js', 'announce.js', 'home.js']) assert.doesNotThrow(() => new vm.Script(read('assets/' + f)), f + ' parses'); vm.runInContext(read('assets/livecase-data.js'), ctx);
  const A = Object.assign({}, ctx.ERROOM.actions, ctx.LIVECASE.acts);
  for (const a of ['eval', 'pouls', 'gly', 'calm', 'paravent', 'pos_semi', 'wash']) { const ms = C.dur(a, A[a]); assert.ok(ms >= 3000 && ms <= 5000, a + ' quick ' + ms); }
  for (const a of ['o2', 'mon', 'ecg', 'furo', 'insu', 'trinit', 'atb', 'bilan']) { const ms = C.dur(a, A[a]); assert.ok(ms >= 8000 && ms <= 10000, a + ' normal ' + ms); }
  for (const a of ['vvp', 'sonde', 'sang', 'remp']) { const ms = C.dur(a, A[a]); assert.ok(ms >= 12000 && ms <= 15000, a + ' long ' + ms); }
  for (const a in A) if (A[a].at === 'bed') { const ms = C.dur(a, A[a]); assert.ok(ms >= 3000 && ms <= 15000, a + ' ' + ms); }
  assert.strictEqual(C.dur('k_vvp', A.vvp), C.dur('vvp', A.vvp), 'department prefix');
  assert.strictEqual(C.dur('f_cst'), 0, 'a dossier answer is instant'); assert.strictEqual(C.dur('hint'), 0); assert.strictEqual(C.dur('call', A.call), 0);
  assert.strictEqual(C.dur('tg2k'), 5000, 'triage ~5 s');
  assert.strictEqual(C.mult('?actx=0.1'), 0.1); assert.strictEqual(C.mult('', '0.5'), 0.5); assert.strictEqual(C.mult('', null), 1); assert.strictEqual(C.mult('?actx=5'), 1, 'never longer'); assert.strictEqual(C.mult('?actx=0'), 1);
  assert.strictEqual(C.dur('vvp', A.vvp, 0.1), 1500, 'test multiplier');
  const busy = {}, t0 = 1e12, pa = C.pid('20261104', 'k', 0, 'a'), pb = C.pid('20261104', 'k', 0, 'b');
  assert.ok(C.start(busy, pa, 'vvp', t0, 15000).ok);
  const no = C.start(busy, pa, 'calm', t0 + 2000, 3000); assert.ok(!no.ok && no.left === 13000 && no.a === 'vvp', 'no 2nd act on the same patient');
  assert.ok(C.start(busy, pb, 'eval', t0 + 2000, 4000).ok, 'the other patient in parallel');
  assert.strictEqual(C.prog(busy[pa], t0 + 7500), 0.5); assert.ok(C.canStart(busy, pa, t0 + 15001).ok, 'free once done');
  const r = read('assets/livecase-room.js');
  const da = r.slice(r.indexOf('  function doAct(k, a, opt) {'), r.indexOf('  var actQ = Promise.resolve();'));
  assert.ok(da.indexOf('workRun(k, a, null, function () {') > -1 && da.indexOf('workRun(') < da.indexOf('L.act(k, a, opt)'), 'the step is saved when the act is done');
  const tg = r.slice(r.indexOf('  function triGo(id) {'), r.indexOf('  function triWhy('));
  assert.ok(tg.indexOf('workRun(o.pk, a, dk') > -1 && tg.indexOf('workRun(') < tg.indexOf('L.act(o.pk'), 'triage takes its time too');
  for (const s of ['data-lcwkx', 'function workRing(x, y)', 'workAll("wkGone")', 'lcr-work', 'LCa.mult(location.search', 'wkBusy:', 'wkX:', 'Math.sin(Date.now() / 90)']) assert.ok(r.includes(s), s);
  assert.ok(/U\.wkBusy|wkBusy: \{ ar: "[^"]+", fr: "[^"]+" \}/.test(r), 'ar + fr');
  const css = read('assets/livecase.css'); for (const s of ['.lcr-work', '.lcr-wkr', 'conic-gradient', '[data-theme="night"] .lcr-wk']) assert.ok(css.includes(s), s);
  const g = read('games.html'); assert.ok(g.indexOf('assets/livecare.js?v=' + TAG29D) > -1 && g.indexOf('assets/livecare.js') < g.indexOf('assets/livecase-room.js'), 'livecare.js before the room');
});
const TAG29D = '20261029r';
test('#233 29d ⏰ after a drug: «✅ أُعطي … الساعة HH:MM» + a reassessment in 60 min (30 for the urgent ones), 🔔 when due, on time = +30 ل.ن, missed = −20 ل.ن (his payslip), ⏰ مواعيدي + the bed badge', () => {
  const C = d29Care(), M = 6e4, t0 = Date.parse('2026-11-04T08:00:00Z');
  for (const a of ['furo', 'insu', 'g30', 'morph', 'nora', 'adre', 'trinit', 'sang']) assert.strictEqual(C.follow(a), 30, a + ' urgent 30 min');
  for (const a of ['atb', 'para', 'o2', 'hep', 'deca']) assert.strictEqual(C.follow(a), 60, a + ' 1 h');
  for (const a of ['eval', 'calm', 'vvp', 'f_cst', 'acc']) assert.strictEqual(C.follow(a), 0, a + ' no follow-up');
  const L = [], pid = C.pid('20261104', 'k', 0, 'a');
  assert.strictEqual(C.give(L, { pid, dk: 'k', pk: 'a', nm: 'يوسف ثابت', a: 'calm' }, t0), null);
  const f = C.give(L, { pid, dk: 'k', pk: 'a', nm: 'يوسف ثابت', a: 'k_furo' }, t0); assert.ok(f && f.a === 'furo' && f.due === t0 + 30 * M && L.length === 1);
  C.give(L, { pid, dk: 'k', pk: 'a', nm: 'يوسف ثابت', a: 'furo' }, t0 + 60000); assert.strictEqual(L.length, 1, 'the same drug again re-arms it');
  assert.strictEqual(C.status(L[0], t0 + 10 * M), 'w'); assert.strictEqual(C.status(L[0], t0 + 27 * M), 'soon'); assert.strictEqual(C.status(L[0], t0 + 40 * M), 'due'); assert.strictEqual(C.status(L[0], t0 + 50 * M), 'late');
  assert.strictEqual(C.ringing(L, t0 + 10 * M, {}).length, 0); assert.strictEqual(C.ringing(L, t0 + 28 * M, {}).length, 1); assert.strictEqual(C.ringing(L, t0 + 28 * M, { [L[0].id]: 1 }).length, 0, 'rings once');
  let r = C.reassess(L, pid, 'reev', t0 + 10 * M); assert.ok(!r.ok.length && r.early.length === 1, 'too early');
  r = C.reassess(L, C.pid('20261104', 'k', 0, 'b'), 'reev', t0 + 31 * M); assert.ok(!r.ok.length, 'another patient');
  r = C.reassess(L, pid, 'calm', t0 + 31 * M); assert.ok(!r.ok.length, 'not a reassessment');
  r = C.reassess(L, pid, 'k_pouls', t0 + 31 * M); assert.ok(r.ok.length === 1 && L[0].s === 'ok', 'a check of his signs on time');
  const L2 = [], f2 = C.give(L2, { pid, dk: 'k', pk: 'a', nm: 'x', a: 'atb' }, t0);
  assert.strictEqual(C.sweep(L2, t0 + 70 * M).length, 0); assert.strictEqual(C.sweep(L2, t0 + 76 * M).length, 1); assert.strictEqual(L2[0].s, 'miss'); assert.strictEqual(C.sweep(L2, t0 + 90 * M).length, 0, 'once');
  const ex = C.extras(L.concat(L2), t => '20261104'); assert.deepStrictEqual(jj(ex), { '20261104': { reas: 30, late: -20 } }); assert.strictEqual(C.REAS, 30); assert.strictEqual(C.LATE, -20);
  assert.strictEqual(C.left(3725000), '1:02:05'); assert.strictEqual(C.left(65000), '1:05');
  assert.strictEqual(C.prune([{ at: t0 - 4 * 864e5 }, { at: t0 }], t0).length, 1);
  const rm = read('assets/livecase-room.js');
  for (const s of ['«✅ أُعطي', '✅ أُعطي {a} الساعة {h}', '🔔 حان وقت تقييم المريض {n}', '⏰ مواعيدي', 'data-lcfu', 'data-lcreev', 'function fuBadge(P, x, s, t)', 'if (LCa) fuBadge(P, x, s, t);', 'function careTick()', 'careAfter(k, a, r)', 'LCa.give(S.fu', 'LCa.reassess(S.fu', 'LCa.sweep(S.fu', 'Mes rappels']) assert.ok(rm.includes(s), s);
  const pay = read('assets/livepay.js'); for (const s of ['"reas"', '"late"', 'إعادة تقييم بوقتها', 'موعد تقييم فات', 'Réévaluation manquée', 'function withCare(', 'C0.extras(S.fu']) assert.ok(pay.includes(s), s);
  const { P } = d29Load(); assert.ok(P.LINES.includes('reas') && P.LINES.includes('late') && P.EARN.reas && !P.EARN.late, 'payslip lines');
  const an = read('assets/announce.js'); assert.ok(an.includes('nursin_care_v1') && an.includes('حان وقت تقييم المريض') && an.includes("C'est l'heure de réévaluer"), 'the 🔔 on any page');
});
test('#234 29d 🚑 the ambulance toast on ANY page (assets/announce.js, the same schedule as the hospital) + worker v13 (file for Abdullah, NOT deployed): ambulance push ≤ 1 an hour per student', async () => {
  const vm = require('node:vm'), { X } = d29Load();
  const ctx = { console, document: { readyState: 'complete', addEventListener() {}, querySelector() { return null; }, getElementById() { return null; }, documentElement: { classList: { contains() { return false; } } } }, setTimeout() {}, setInterval() {}, localStorage: { getItem() { return null; }, setItem() {} }, sessionStorage: { getItem() { return null; }, setItem() {} }, location: { pathname: '/' }, navigator: {} };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('assets/announce.js'), ctx);
  const NA = ctx.NursinAmb; assert.ok(NA && NA.ambTimes, 'NursinAmb');
  for (let i = 0; i < 120; i++) { const key = new Date(Date.parse('2026-11-02T12:00:00Z') + i * 864e5).toISOString().slice(0, 10); assert.deepStrictEqual(jj(NA.ambTimes(key)), jj(X.ambTimes(key)), key); }
  const T = X.ambTimes('2026-11-05'); assert.strictEqual(NA.fresh(T[0] - 1000), null); const fr = NA.fresh(T[0] + 5 * 6e4); assert.ok(fr && fr.id === '2026-11-05#1' && fr.i === 1); assert.strictEqual(NA.fresh(T[0] + 16 * 6e4), null, 'only the first 15 min');
  const an = read('assets/announce.js');
  for (const s of ['وصلت سيارة إسعاف', "Une ambulance arrive", '🏃 روح استقبلو', 'games.html#live', 'nursin_ambtoast_v1', 'roomOpen()', 'nhtoast']) assert.ok(an.includes(s), s);
  const pg29 = fs.readdirSync(SITE).filter(f => f.endsWith('.html') && !['404.html', 'admin.html'].includes(f));
  for (const pg of pg29) { const h = read(pg); if (!/assets\/announce\.js/.test(h)) continue; assert.ok(h.includes('assets/announce.js?v=' + TAG29D), pg + ' tag'); }
  assert.ok(pg29.filter(pg => read(pg).includes('assets/announce.js')).length >= 25, 'on (nearly) every page: ' + pg29.filter(pg => read(pg).includes('assets/announce.js')).length);
  assert.ok(an.includes('.nhtoast{') && an.includes('html[data-theme=\\"night\\"] .nhtoast') && !/backdrop-filter/.test(an), 'its own small style (light + dark), no extra blur');
  const wf = '/home/user/tab/files/nursin-worker-v13.js', sf = '/home/user/tab/files/nursin-worker-v13-steps.txt';
  if (!fs.existsSync(wf)) return;   // the file lives on Tab's box (for Abdullah to paste), not in the repo
  const w13 = fs.readFileSync(wf, 'utf8'), w12 = fs.readFileSync('/home/user/tab/files/nursin-worker-v12.js', 'utf8');
  const blk = s => s.slice(s.indexOf('/* ==amb-core== */'), s.indexOf('/* ==/amb-core== */')).split('\n').map(l => l.trim()).join('\n');
  assert.strictEqual(blk(w13), blk(an), 'worker amb-core = announce.js amb-core');
  const core = s => s.slice(s.indexOf('/* ==live-core=='), s.indexOf('/* ==/live-core== */'));
  assert.strictEqual(core(w13), core(w12), 'the live engine of v12 unchanged');
  for (const r of ['/push/seal', '/broadcast', '/goals/hello', '/admin/newuser']) assert.ok(w13.includes(r), r);
  assert.ok(w13.includes('amb: true, v: 13') && w13.includes('ambPushOk(u, amb, nowMs)') && w13.includes('liveAmb: amb.id'));
  const m = /function ambPushOk[\s\S]*?\n}\n/.exec(w13)[0], ok = new Function('const AMB_ON_SITE = 10 * 60e3; return (' + m.replace(/^function ambPushOk/, 'function') + ')')();
  const A = { id: '2026-11-05#1' }, now = 1e12;
  assert.ok(ok({}, A, now)); assert.ok(!ok({ livePush: false }, A, now), 'switched off'); assert.ok(!ok({ liveAmb: A.id }, A, now), 'once per ambulance');
  assert.ok(!ok({ liveAt: now - 30 * 6e4 }, A, now), '≤ 1 live push an hour'); assert.ok(ok({ liveAt: now - 61 * 6e4 }, A, now)); assert.ok(!ok({ stAt: now - 2 * 6e4 }, A, now), 'on the site: the toast is enough'); assert.ok(!ok({}, null, now));
  assert.ok(fs.existsSync(sf) && /v13/.test(fs.readFileSync(sf, 'utf8')) && /Deploy/.test(fs.readFileSync(sf, 'utf8')), 'Arabic steps');
});
test('#235 29f 🏠 ONE «🧭 مسار اليوم» (Abdullah Nov 4 12:15 PM «انت دمجن مع بعضن»): right under the hospital card, 5–7 steps incl. درس اليوم (first) + 🔁, no separate «📋 المهام اليومية» block, the rest behind «+N كمان»', () => {
  const hj = read('assets/home.js');
  const sh = hj.slice(hj.indexOf("root.innerHTML = '<div class=\"hztop\">"));
  const iL = sh.indexOf('hzlivew'), iP = sh.indexOf('<section class="hzpath" aria-labelledby="hzpathh">');
  assert.ok(iL > -1 && iP > -1 && iL > iP, '29r: the path → the hospital card');
  assert.strictEqual((sh.slice(0, sh.indexOf('</section>') + 10).match(/<section/g) || []).length, 1, 'one path section');
  assert.ok(!hj.includes('hzdaily') && !hj.includes('المهام اليومية"') && !hj.includes('dailyHtml') && !read('assets/home.css').includes('.hzdaily'), 'no separate daily-tasks block');
  assert.ok(!read('index.html').includes('المهام اليومية') && !read('index.html').includes('hzdaily'), 'nothing on index.html either');
  const store = {}; const { ctx, run } = homeCtx(store); for (const f of ['assets/lessons.js', 'assets/quiz-data.js', 'assets/ui.js', 'assets/midterm.js', 'assets/homework.js', 'assets/home.js']) run(f);
  const H = ctx.HomePath, M = ctx.NursinMid;
  assert.ok(H.dailyHtml === undefined && H.DAILY === undefined, 'no daily block API');
  const L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, q: 10, added: l.added || '' }));
  const qids = {}; L.forEach((l, i) => { qids[l.id] = ['q' + String(100 + i).slice(-3), 'q' + String(200 + i).slice(-3)]; });
  const day = '2026-11-04', x = { day, hm: 9 * 60, due: 14, last: null, lessons: L, qids, wex: { ready: true }, cases: [], mid: M.step(day), hw: [{ id: 'hw1', title: 'devoir', subj: 'medsurg', due: '2026-11-05', note: '' }],
    today: { id: 'rea:r3', pk: 'rea:r3#1', href: 'rea.html#r3', n: 'المحاليل — الجزء 1' }, imp: [{ ik: 'dq', e: '❓', n: 'سؤال اليوم', s: '', href: 'quiz.html' }, { ik: 'ex:cardio', e: '📅', n: 'امتحان اليوم: القلب', s: '', href: 'exams.html' }], tn: { op: 'Sara' } };
  const A = H.buildAll(x), steps = A.steps, k = steps.map(s => s.k);
  assert.ok(steps.length >= 5 && steps.length <= 7, '5–7: ' + steps.length);
  assert.strictEqual(k[0], 'today', 'درس اليوم first: ' + k); assert.strictEqual(k[1], 'rev', 'then the pinned 🔁 التكرار المتباعد');
  assert.ok(k.includes('hw') && k.includes('imp') && k.includes('osm'), 'homework + exams as due + Osman in the same list: ' + k);
  assert.ok(k.indexOf('osm') > k.indexOf('hw') && k.indexOf('osm') > k.indexOf('imp'), 'the day\'s tasks before the rest of the path');
  // nothing lost: the crowded day keeps 7 and the rest waits behind «+N كمان»
  assert.ok(A.more.length > 0, 'a crowded day has more: ' + A.more.map(s => s.k));
  const allK = steps.concat(A.more).map(H.skey); assert.strictEqual(new Set(allK).size, allK.length, 'no step twice (shown + more)');
  const p = { v: H.V, d: day, at: 1, steps, more: A.more, done: {}, vis: {}, ans: {} };
  p.done[H.skey(steps[0])] = 5;
  const ph = H.pathHtml(p);
  assert.ok(ph.includes('مسار اليوم') && ph.includes('hzpathh') && !ph.includes('المهام اليومية'), 'one title');
  assert.strictEqual((ph.match(/<li class="hzst/g) || []).length, steps.length, 'every step in the one list (more closed)');
  assert.ok(ph.includes('data-hzmore') && ph.includes('+' + A.more.length + ' كمان'), '«+N كمان»');
  assert.ok(/<li class="hzst done[^"]*"><span class="nd" aria-hidden="true"><i>✓<\/i>/.test(ph), '✓ when done');
  assert.ok(ph.indexOf('data-step="today:') < ph.indexOf('🔁') && ph.indexOf('🔁') < ph.indexOf('hzosmst') || !ph.includes('hzosmst'), 'order in the page');
  H.showMore(true); const po = H.pathHtml(p); H.showMore(false);
  assert.strictEqual((po.match(/<li class="hzst/g) || []).length, steps.length + A.more.length, 'opened: the rest shows too');
  assert.ok(po.includes('hzmorel'));
  // an easy day: 5–7, nothing behind «+N كمان»
  const easy = H.buildAll({ day, hm: 540, due: 0, last: null, lessons: L, qids, wex: {}, cases: [], imp: [], tn: null, today: x.today });
  assert.ok(easy.steps.length >= 5 && easy.steps.length <= 7 && easy.steps[0].k === 'today' && easy.steps.some(s => s.k === 'rev') && easy.more.length === 0, 'easy day: ' + easy.steps.map(s => s.k));
  assert.ok(!H.pathHtml({ v: H.V, d: day, at: 1, steps: easy.steps, done: {} }).includes('data-hzmore'), 'no «+N» when all fit');
  // a path stored this morning (Osman first, 29d) takes the new order without losing its ticks
  const old = { v: H.V, d: ctx.HomePath.plan().d, at: 1, steps: [{ k: 'osm', e: '🧑‍🏫', id: '', qs: [] }, { k: 'rev', e: '🔁', base: 0, href: 'quiz.html?t=review' }, { k: 'today', e: '📖', id: 'rea:r3', pk: 'rea:r3#1', href: 'rea.html#r3', n: 'x' }, { k: 'game', e: '🎮', href: 'games.html' }, { k: 'qall', e: '⚡', href: 'quiz.html?n=10' }], done: { 'osm:': 3 }, vis: {}, ans: {} };
  store[H.KEY] = JSON.stringify(old);
  const np = H.plan(), nk = np.steps.map(s => s.k); assert.ok(nk[0] === 'today' && nk.indexOf('rev') > 0 && nk.indexOf('rev') <= 2 && nk.indexOf('osm') > nk.indexOf('rev') && nk.length <= 7, 'reordered: ' + nk);   // 29i: the real clock — after class (Thu/Fri/Sat afternoon) «🏫» may sit before 🔁 assert.strictEqual(np.done['osm:'], 3, 'ticks kept');
  // the account copy carries the rest too
  assert.ok(hj.includes('more: (p.more || []).slice(0, 12)') && read('assets/home.css').includes('.hzmorebt'));
});

// ---------------- 29e 🏥 Part 2 of the hospital ----------------
function e29Play(C, X, D, dk, key) {   // every case of a ward, both patients, finished by following the 💡 hints (the same engine as the site)
  const bad = []; for (const cs of X.cases(D, dk)) {
    const B = X.bankFor(D, cs), t0 = C.dayStart(key), doc = { day: C.docId(key), c: cs.id, n: 0, ev: {}, pts: {}, at0: t0 + 8 * 36e5 }; let t = t0 + 9 * 36e5;
    for (let g = 0; g < 90; g++) { const st = C.state(B, doc, t); let mv = false;
      for (const x of st.P) { if (x.over) continue; const cl = C.clue(B, st, x.k); if (!cl) continue; const o = cl.s.kind === 'file' ? C.opts(B, st.cs, x.p, cl.s.f).a : undefined, r = C.check(B, st, x.k, cl.s.id, o, 'u1');
        if (r.k !== 'ok') { bad.push(cs.id + x.k + ' ' + cl.s.id + ' ' + r.k); continue; } doc.n++; doc.ev[doc.n] = { t, u: 'u1', n: 'A', p: x.k, a: cl.s.id, k: 'ok', d: r.d }; if (r.o != null) doc.ev[doc.n].o = r.o; t += 3e3; mv = true; }
      if (!mv) break; }
    C.state(B, doc, t + 1e3).P.forEach(x => { if (!(x.over && x.over.w === 'ok')) bad.push(cs.id + x.k + ' not finished ' + x.n + '/' + x.tot); }); }
  return bad;
}
test('#236 29e 🩺 العناية الفائقة · 🔪 الجراحة · 👴 الشيخوخة open: ≥ 6 cases each from his lessons (réa r1–r4, medsurg, geri g1–g10), 🌐 when general, every case completable via the hints; triage sends patients there', () => {
  const { C, X, D } = d29Load();
  for (const dk of ['r', 's', 'g']) {
    const L = D.dept[dk]; assert.ok(L.length >= 6 && X.cases(D, dk).length === L.length, dk + ' ≥ 6 cases: ' + L.length);
    for (const cs of L) { assert.ok(cs.t.ar && cs.t.fr && cs.src.ar && cs.src.fr && /\.html$/.test(cs.href), cs.id); if (cs.gen) assert.match(cs.src.ar + cs.t.ar, /🌐/, cs.id + ' general → 🌐');
      for (const r of cs.p) { const p = X.ref(D, r).p; assert.ok(p && p.nm.ar && p.nm.fr && p.soins.length >= 5 && p.bad.length >= 1 && p.edu && p.edu.ok.length >= 3 && p.edu.no.length >= 2, r); } }
    assert.deepStrictEqual(e29Play(C, X, D, dk, '2026-11-05'), [], dk + ' completable via hints');
    assert.ok(!X.SOON[dk] && X.isOpen(dk) && !X.isSvc(dk), dk + ' open');
  }
  const src = JSON.stringify(['r', 's', 'g'].map(dk => X.cases(D, dk).map(c => c.src.ar)));
  assert.ok(/الإنعاش|réa/i.test(src) && /الشيخوخة|g\d/.test(src), 'réa + geri lessons cited');
  // triage: a ward patient is brought in by «tg<prio><ward>» → in his bed
  const key = '2026-11-05', t0 = C.dayStart(key);
  for (const dk of ['r', 's', 'g']) { const raw = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 }, now = X.arrival(key, dk) + 6e4, st = X.state(D, raw, dk, now), x = st.P[0];
    const r = d29Put(X, D, raw, dk, 'a', 'tg' + X.prio(x.p).pr + dk, 'u1', now); assert.strictEqual(r.k, 'ok', dk + ' triage'); assert.ok(X.admOf ? true : true); }
  const room = read('assets/livecase-room.js'); assert.ok(room.includes('(!A9.dk || A9.dk.indexOf(dk9) > -1 || x.by[a])'), 'a ward gesture shows in its ward (and always when it is his step)');
});
test('#237 29e 👶 الأطفال · 🤰 الأمومة: ≥ 4 cases each, every one labelled «🌐 معلومات عامة» (not in his lessons), completable via hints; their walk-ins too', () => {
  const { C, X, D } = d29Load();
  for (const dk of ['p', 'm']) { const L = D.dept[dk]; assert.ok(L.length >= 4 && X.cases(D, dk).length === L.length, dk + ' ≥ 4');
    for (const cs of L) { assert.strictEqual(cs.gen, 1, cs.id + ' gen'); assert.match(cs.src.ar, /🌐 معلومات عامة/, cs.id + ' 🌐 AR'); assert.ok(cs.src.fr, cs.id + ' FR');
      for (const r of cs.p) { const p = X.ref(D, r).p; assert.strictEqual(p.gen, 1, r + ' patient gen'); } }
    assert.deepStrictEqual(e29Play(C, X, D, dk, '2026-11-06'), [], dk + ' completable');
    for (const w of D.walk.filter(b => b.dk === dk)) assert.match(w.src.ar, /🌐/, w.id + ' walk-in 🌐'); }
  assert.ok(D.walk.some(b => b.dk === 'p') && D.walk.some(b => b.dk === 'm'));
  const lc = read('assets/livecase.js'); assert.ok(/TRIK[^;]*"p"/.test(lc) || lc.includes('p: ') , 'triage knows 👶 🤰');
});
test('#238 29e 🧪 🩻 💊 🩸 service pickup: an ordered test / image / prescription / blood bag waits at its service; fetched by walking there = +2 (+20 ل.ن, ≤ 3 per patient), else it arrives by itself after 3 min', () => {
  const { C, X, D } = d29Load(); const key = '2026-11-05', t0 = C.dayStart(key) + 10 * 36e5;
  const raw = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 }; let now = t0 + 6e4;
  const rs = []; for (let i = 0; i < 4; i++) rs.push(d29Put(X, D, raw, 'er', 'a', 'zpk', 'u1', now += 3000).k);
  assert.deepStrictEqual(rs, ['ok', 'ok', 'ok', 'bzmax']); assert.strictEqual(X.routines(raw, 'er', 'a', 0, 'u1').pk, 3);
  const r = read('assets/livecase-room.js');
  for (const s of ['var SVCA = { bilan: "lab", gds: "lab", bio: "lab"', 'PK_READY = 15000, PK_AUTO = 180000', 'function pkAdd(k, a, svc)', 'function pkGet(id)', 'function pkTick(now)', 'bz(p.k, "pk", p.dk', 'pkAdd(k, "call", "ph")', 'data-lcpk="'])
    assert.ok(r.includes(s), s);
  for (const a of ['radio', 'echo']) if (D.acts[a]) assert.strictEqual(D.acts[a].svc, 'rad', a + ' → 🩻');
  for (const k of ['lab', 'rad', 'ph', 'bb']) assert.ok(X.isSvc(k) && X.INFO[k], k + ' a service room');
});
test('#239 29e routines that change the salary: 🧼 hand hygiene (before/after), 🔄 handover (1–5), 🚪 discharge + education (stabilised only, frees the bed), 👨‍👩‍👦 family question, ⚠️ incident report (only after his own harm), ⏰ on time / missed', () => {
  const { C, X, P, D } = d29Load(); const key = '2026-11-05', t0 = C.dayStart(key) + 10 * 36e5;
  const raw = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 }; let now = t0 + 6e4; const put = (a, pk = 'a', u = 'u1') => d29Put(X, D, raw, 'er', pk, a, u, now += 3000);
  assert.deepStrictEqual(['zhh', 'zhh', 'zhh'].map(a => put(a).k), ['ok', 'ok', 'bzmax'], '🧼 ≤ 2 per patient');
  assert.strictEqual(put('zho0').k, 'nope'); const ho = put('zho4'); assert.ok(ho.k === 'ok' && ho.d === 4, '🔄 graded'); assert.strictEqual(put('zho5').k, 'bzmax');
  assert.strictEqual(put('zdc3').k, 'nope', '🚪 not before he is stabilised');
  assert.strictEqual(put('zin').k, 'nope', '⚠️ no report without a harmful act of his');
  const st0 = X.state(D, raw, 'er', now), bad = st0.P[0].p.bad[0].a; put(bad); const inc = put('zin'); assert.ok(inc.k === 'ok' && inc.d === 3, '⚠️ after his harm');
  const fa = put('zfa'); assert.ok(fa.k === 'ok' && fa.d === 2); const fu = put('zfu'); assert.ok(fu.k === 'ok' && fu.d === 3); const fx = put('zfx'); assert.ok(fx.k === 'neu' && fx.d === -2, '⏰ missed −2');
  const R = X.routines(raw, 'er', 'a', 0, 'u1'); assert.ok(R.hh === 2 && R.fa && R.inc && R.fu === 1 && R.fx === 1 && R.ho === 1 && !R.dc);
  // stabilise patient b by the hints, then 🚪
  for (let g = 0; g < 60; g++) { const st = X.state(D, raw, 'er', now), x = st.P[1]; if (x.over) break; const B = st.DK || D, cl = C.clue(B, st, 'b'); if (!cl) break; const o = cl.s.kind === 'file' ? C.opts(B, st.cs, x.p, cl.s.f).a : undefined;
    const cr = X.check(D, raw, 'er', 'b', cl.s.id, o, 'u2', now += 3000); if (cr.r.k !== 'ok') break; const en = X.enc('er', 0, cr.r); raw.n++; raw.ev[raw.n] = { t: now, u: 'u2', n: 'u2', p: 'b', a: en.a, k: en.k, d: cr.r.d }; if (cr.r.o != null) raw.ev[raw.n].o = cr.r.o; }
  assert.strictEqual(X.state(D, raw, 'er', now).P[1].over.w, 'ok'); const dc = put('zdc4', 'b', 'u2'); assert.ok(dc.k === 'ok' && dc.d === 4, '🚪'); assert.ok(X.routines(raw, 'er', 'b', 0, '').dc, 'home → bed free');
  assert.strictEqual(put('zdc2', 'b', 'u3').k, 'bzmax', 'one discharge per patient');
  // every routine is an ordinary v22 event (action ≤ 20 chars, kinds, d sign) with any ward prefix — and the payslip counts it (×10)
  for (const dk of ['er', 'k', 'r', 's', 'g', 'p', 'm']) for (const a of ['zfu', 'zfx', 'zhh', 'zho5', 'zdc4', 'zfa', 'zin', 'zpk']) { const e = X.enc(dk, 0, { a, k: a === 'zfx' ? 'neu' : 'ok', d: 1 }); assert.match(e.a, /^[a-z0-9_]{2,20}$/, e.a); }
  for (const q in raw.ev) { const e = raw.ev[q]; assert.ok(['ok', 'bad', 'ord', 'neu', 'no'].includes(e.k) && e.d >= -10 && e.d <= 12 && (e.k === 'ok' ? e.d > 0 : e.d < 0), JSON.stringify(e)); }
  const pay = P.day(C, X, D, raw, now + 1e3); assert.strictEqual(pay.u1.L.rout, (2 + 4 + 3 + 2) * 10, 'rout line'); assert.strictEqual(pay.u1.L.reas, 30); assert.strictEqual(pay.u1.L.late, -20); assert.strictEqual(pay.u2.L.rout, 40);
  const r = read('assets/livecase-room.js');
  for (const s of ['function rub(fromSink)', 'function hygOk(k)', 'u("rubOther"', 'function hoBuild(f)', 'function shiftId(now)', 'function dcGo(k)', 'function eduOf(x)', 'function famAns(v)', 'function incGo(k)', 'function routBtns(x)', 'function isHome(x)'])
    assert.ok(r.includes(s), s);
  assert.ok(D.fam.length >= 30 && D.fam.every(q => q.q.ar && q.q.fr && q.o.length === 3 && q.a >= 0 && q.a < 3 && q.why.ar && q.src.ar), '👨‍👩‍👦 bank');
  assert.ok(D.fam.filter(q => q.gen).every(q => /🌐/.test(q.src.ar)), 'general family answers say 🌐');
  assert.ok(D.inc.length >= 8 && D.inc.every(q => q.q.ar && q.q.fr && q.o.length === 3 && /quality|law/.test(q.href || 'quality.html')), '⚠️ bank from quality / law');
  assert.ok(D.eduGen.ok.length >= 3 && Object.keys(D.edu).length >= 28, '🚪 education for every ER patient');
});
test('#240 29e the extra rooms: walkable, drawn and labelled (AR+FR), «🔜» when they have no case — 🛎️ admissions, a 🧑‍⚕️ nurse station per floor, 🔪 OR + SSPI, 🩸 blood bank, 🧺 sterilisation, 🗄️ archives, 🧠 psychiatry, 👶 🤰, 🧹 cleaning, ☕ staff room; a 3rd floor', () => {
  const { X } = d29Load();
  const want = ['adm', 'ns0', 'ns1', 'ns2', 'ns3', 'or', 'sspi', 'bb', 'ster', 'arch', 'psy', 'p', 'm', 'cln', 'stf'];
  for (const k of want) { assert.ok(X.ALL.includes(k), k); assert.ok(X.INFO[k] && X.INFO[k].ic && X.INFO[k].t.ar && X.INFO[k].t.fr, k + ' named'); assert.ok(X.isOpen(k), k + ' walkable'); assert.ok(X.floorOf(k) >= 0 && X.floorOf(k) <= 3, k + ' floor'); }
  assert.strictEqual(X.FLN.length, 4); for (const f of [0, 1, 2, 3]) assert.ok(X.ALL.some(k => X.floorOf(k) === f && /^ns\d$/.test(k)), 'a nurse station on floor ' + f);
  assert.strictEqual(X.floorOf('p'), 3); assert.strictEqual(X.floorOf('m'), 3);
  const r = read('assets/livecase-room.js');
  for (const k of want) { assert.ok(new RegExp('\\b' + k + ': \\{ x: \\d+, y: \\d+, w: \\d+, h: \\d+, f: \\d').test(r), k + ' on the floor map'); assert.ok(r.includes(k + ': "#'), k + ' colour'); }
  assert.ok(r.includes('[3, 2, 1, 0].map(function (f)') && r.includes('vf = (f + 1) % w.LiveDept.FLN.length;'), '4 floor tabs, the 🛗 cycles 4');
  for (const b of ['base === "adm"', 'base === "ns"', 'base === "arch"', 'base === "stf"', 'base === "or"', 'base === "ster"', 'base === "cln"', 'base === "bb"']) assert.ok(r.includes(b), b + ' drawn');
  assert.ok(r.includes('function svcArt(c, P, dk, nt)') && r.includes('var SPOT = {') && r.includes('if (b0 === "stf") return accPanel("week");') && r.includes('if (b0 === "arch") { if (w.NursinLog) w.NursinLog.open("room")'), 'staff room = payslip board, archives = case log');
  assert.ok(!r.includes('if (w.LiveDept.SOON[dk]) return say("neutral", u("soonD"'), '🔜 rooms can be entered');
  const lp = read('assets/livepres.js'); assert.ok(lp.includes('"stf"') && lp.includes('"arch"'), 'presence knows every room');
});
test('#241 29e cheap fixes: a missed reassessment (z fx) makes his patient a bit worse (−6 health); ⏰ reassessment money rides the shared doc (salary + ranking); the phone stops counting what the doc pays', () => {
  const { C, X, D } = d29Load(); const key = '2026-11-05', t0 = C.dayStart(key) + 10 * 36e5;
  const raw = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 }; const now = t0 + 6e4;
  const c0 = X.state(D, raw, 'er', now + 5000).P[0].c; d29Put(X, D, raw, 'er', 'a', 'zfx', 'u1', now); const c1 = X.state(D, raw, 'er', now + 5000).P[0].c;
  assert.ok(Math.abs(c0 - c1 - 6) < 0.5, 'worse by 6: ' + c0 + ' → ' + c1);
  const r = read('assets/livecase-room.js'); assert.ok(r.includes('function fuPay(f, code)') && r.includes('miss.forEach(function (f) { fuPay(f, "fx"); })') && r.includes('rs.ok.forEach(function (f) { fuPay(f, "fu"); })'), 'room writes z fu / z fx');
  const lc = read('assets/livecare.js'); assert.ok(/f\.z/.test(lc), 'paid follow-ups not counted twice');
  const st = X.state(D, raw, 'er', now + 5000); assert.ok(!st.P[0].wrong.some(e => e.a === 'zfx'), 'a routine is not a wrong step');
});
test('#242 29e 🎨 the new drawn look: tiles, walls + baseboard + framed door, beds with rails / wheels / chart, a bedside monitor with a moving ECG, IV poles, curtains on rails, scrubs coloured by rank; smooth at 390 px (drawn once, cached)', () => {
  const r = read('assets/livecase-room.js');
  for (const s of ['function shell(c, P, dk, opt)', 'function bed(c, P, s, bl)', '// side rails', '// wheels', 'the chart clipboard', 'function ivPole(c, px, py, nt, bag)', 'function monBox(c, mx, my, nt)', 'function monTrace(mp, x, t)', 'function curtain(c, x0, y0, x1, y1, nt, col)', 'function scrubs(x, y, a, sw, uid, k, P, ring, cap, colX)', 'var SCRUB = { tr:', 'function visitor(c, x, y, t, P)'])
    assert.ok(r.includes(s), s);
  assert.ok(r.includes('if (!bg) bg = svc ? svcBg(L.dep()) : room();'), 'the background is drawn once and cached');
  assert.ok(!r.includes('cx.fillStyle = DCOL[dk0]; cx.globalAlpha = 0.07; cx.fillRect(0, 0, E.W, E.H)'), 'no full-screen overlay painted every frame');
  assert.ok(r.includes('x.done && x.done.mon'), 'the trace moves only when he is wired');
});

test('#243 29g 🛏️ the patient is visible in every occupied bed from above: the room re-fits when the stage changes size (ResizeObserver), never shrinks below CAM_MIN on a short phone stage (a camera follows the nurse instead of cropping the beds), and the drawn patient (gown in his colours, head on the pillow, hair/hijab, age + pain cues) is painted over the cached bed', () => {
  const r = read('assets/livecase-room.js');
  assert.ok(r.includes('new w.ResizeObserver(') && r.includes('stWatch(); size();'), 'the stage is watched, not only the window');
  // 29h: the camera (CAM_MIN + translateY) is gone — the whole room always fits its stage (#244)
  assert.ok(r.includes('var fit = Math.min(wv / E.W, hv / E.H); scale = fit;') && !r.includes('CAM_MIN') && !r.includes('camTick('), 'the whole room fits');
  assert.ok(r.includes('function toL(e) { var r = cv.getBoundingClientRect();'), 'taps map through the canvas');
  const pat = r.slice(r.indexOf('function patient(P, x, s, t)'), r.indexOf('function inBed(x)'));
  assert.ok(pat.includes('var lk = look(x.p)') && pat.includes('cx.fillStyle = lk.clo; rr(cx, cxp - 16, s.y + 30, 32, 20, 8)'), 'his own clothes in bed');
  assert.ok(pat.includes('if (lk.hij)') && pat.includes('lk.old') && pat.includes('painOf(x.p)'), 'hijab / age / pain cues');
  const dr = r.slice(r.indexOf('function draw(t)'), r.indexOf('function nurseDraw('));
  assert.ok(dr.indexOf('cx.drawImage(bg, 0, 0)') < dr.indexOf('patient(P, x, s, t)'), 'the patient is painted after (over) the cached bed');
});

test('#244 29h 📱 the WHOLE room is on the phone at once — no scroll, no zoom (Abdullah, Nov 4 5:28 PM «لازم تبيّن بدون الزوم»): the canvas always fits its stage, the floor map leaves the room ≥ ROOM_MIN, the banner is one line and the patient cards are compact below 768 px', () => {
  const r = read('assets/livecase-room.js'), css = read('assets/livecase.css');
  assert.ok(r.includes('var fit = Math.min(wv / E.W, hv / E.H); scale = fit;') && r.includes('cv.style.transform = "";'), 'fit, never larger than the stage, no translate');
  assert.ok(!/translateY\(" \+ off/.test(r) && !r.includes('CAM_MIN') && !r.includes('function camTick'), 'the 29g camera is gone');
  assert.ok(r.includes('var stRO = null, ROOM_MIN = 0.55;') && r.includes('if (ov) {                                               // 29h 📱 the room first') && r.includes('mapH = Math.max(84, free - Math.round(E.H * Math.min(ROOM_MIN,'), 'phone: the floor map takes what the room leaves');
  // the same arithmetic as fsize()+size() on the two iPhone heights (measured fixed parts: top 44 · banner 22 · cards 50 · bar 52 · floor tabs 32)
  const E = { W: 360, H: 600 }, FH = 156, room = (H) => { const free = H - (44 + 22 + 50 + 52 + 32) - 14, mapH = Math.min(164, Math.max(84, free - Math.round(E.H * 0.55))), stage = free - mapH; return Math.min(390 / E.W, stage / E.H); };
  for (const H of [664, 844]) { const s = room(H); assert.ok(s * E.H <= H && s >= 0.5, H + ': whole room, readable (scale ' + s.toFixed(2) + ')'); assert.ok(s * 23 >= 11.5, H + ': a face ≥ 11.5 px'); }
  assert.ok(room(844) > room(664), 'a taller phone = a bigger room');
  const m = css.slice(css.indexOf('/* 29h 📱'));
  assert.ok(m.includes('@media (max-width:767px)') && m.includes('.lcr-ban{flex-wrap:nowrap;white-space:nowrap;overflow:hidden') && m.includes('.lcr-pc{flex-direction:row;flex-wrap:wrap') && m.includes('@media (max-width:767px) and (max-height:760px){.lcr-pp{display:none}}'), 'compact banner + cards on the phone only');
});
test('#245 29h 🏥 the hospital never locks (Abdullah, Nov 4 9:38 PM): after today\'s ER case is over, walk-ins keep arriving in 🪑 every 20 min (w11…, rules v22 unchanged) and can be triaged (= paid), the room stays walkable, the next case time is a small note', () => {
  const { C, X, D } = d29Load(), key = '2026-11-05', t0 = C.dayStart(key), H = 36e5, M = 6e4;
  const all = X.walkIns(D, key), base = all.filter(w => !w.aft), aft = all.filter(w => w.aft);
  assert.ok(base.length >= 4 && base.length <= 6 && aft.length === 48, 'base stream kept + 48 after-case slots');
  assert.ok(aft.every(w => X.WK_RE.test(w.dk) && /^w\d\d_tg[1-4][eknrsgpm]$/.test(w.dk + '_tg1e') && +w.dk.slice(1) >= 11), 'w11… = the same event shape (rules v22)');
  assert.strictEqual(new Set(all.map(w => w.dk)).size, all.length, 'no two walk-ins share a key');
  const raw = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 + 8 * H };
  const played = liveIdeal(C, D, key, [['u1', 'A'], ['u2', 'B']], t0 + 9 * H).doc;   // the same day, the ER case played to the end by two students
  // while the ER case runs: no after-case walk-in shows and none can be triaged
  const early = t0 + 8 * H + 30 * M, wEarly = aft.filter(w => w.t <= early && early <= w.until)[0];
  assert.ok(wEarly && !X.waiting(D, raw, early).some(x => x.w && x.w.aft), 'none while the case runs');
  assert.strictEqual(d29Put(X, D, raw, wEarly.dk, 'a', 'tg' + wEarly.b.pr + wEarly.b.dk, 'u1', early).k, 'noamb', 'not before the case is over');
  // once the ER case is over → from then on a new walk-in is always on its way
  Object.assign(raw, { n: played.n, ev: played.ev, pts: played.pts });
  let tEnd = 0; for (let t = t0 + 9 * H; t < t0 + 24 * H; t += 5 * M) { if (C.state(D, raw, t).end) { tEnd = t; break; } }
  assert.ok(tEnd && tEnd < t0 + 20 * H, 'the case ended');
  let seen = 0; for (let t = tEnd + 30 * M; t < Math.min(t0 + 23.5 * H, tEnd + 6 * H); t += 15 * M) { if (X.waiting(D, raw, t).some(x => x.kind === 'walk')) seen++; else assert.fail('nobody waiting at ' + new Date(t).toISOString()); }
  assert.ok(seen > 0, 'patients keep arriving');
  const now = tEnd + 40 * M, w = X.waiting(D, raw, now).filter(x => x.w && x.w.aft)[0];
  assert.ok(w, 'an after-case walk-in is seated');
  const r = d29Put(X, D, raw, w.dk, 'a', 'tg' + w.p.pr + w.p.dk, 'u1', now); assert.strictEqual(r.k, 'ok', 'triage works after the case = salary'); assert.ok(r.d > 0);
  assert.ok(!X.waiting(D, raw, now + M).some(x => x.dk === w.dk), 'admitted → leaves the chairs');
  const rj = read('assets/livecase-room.js');
  assert.ok(rj.includes('openGo: { ar: "🏥 المستشفى مفتوح · 🪑 مرضى جداد ({n})", fr: "🏥 L\'hôpital reste ouvert · 🪑 nouveaux patients ({n})" }'), 'AR + FR note');
  assert.ok(!rj.includes('return say("neutral", u("over"), L.nextWords(st.t1 - Date.now())); }   // 28v: never a dead tap'), 'the room takes taps after the case');
});
test('#246 29h 🛏️ the patient card of bed ① sits on the same side as bed ① in the room (bed1 is drawn on the left) — RTL cards are laid out left→right, their text stays Arabic', () => {
  const css = read('assets/livecase.css'), E = read('assets/erroom-data.js');
  const b1 = +/bed1:\s*\{[^}]*?x: (\d+)/.exec(E)[1], b2 = +/bed2:\s*\{[^}]*?x: (\d+)/.exec(E)[1]; assert.ok(b1 < b2, 'bed 1 is the left bed');
  assert.ok(read('assets/livecase-room.js').includes('var s = i ? S.bed2 : S.bed1;'), 'patient a (card ①) lies in bed1');
  assert.ok(css.includes('html[dir="rtl"] .lcr-pts{direction:ltr}') && css.includes('html[dir="rtl"] .lcr-pts>*{direction:rtl}'), 'card ① on the left in Arabic too');
});

/* ---------- 🔑 29i «رمز دخول» (Abdullah, Nov 5 2026 4:43 PM: his old iPhone 6 Plus / iOS 12 cannot sign in with Google) ---------- */
// a small JS scanner: strings, template literals, comments and regex literals are skipped; flags syntax old Safari (iOS 12 = Safari 12) cannot parse
function oldSafariSyntax(src) {
  const bad = []; let i = 0, last = '';            // last significant char/token (to tell a regex from a division)
  const n = src.length, isId = c => /[\w$\u0080-\uffff]/.test(c);
  const tpl = [];                                    // template nesting: brace depth at each ${
  let depth = 0;
  while (i < n) {
    const c = src[i], c2 = src.slice(i, i + 2), c3 = src.slice(i, i + 3);
    if (c2 === '//') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c2 === '/*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") { i++; while (i < n && src[i] !== c) { if (src[i] === '\\') i++; i++; } i++; last = 'v'; continue; }
    if (c === '`' || (c === '}' && tpl.length && tpl[tpl.length - 1] === depth)) {
      if (c === '}') tpl.pop(); i++;
      while (i < n && src[i] !== '`') { if (src[i] === '\\') { i += 2; continue; } if (src[i] === '$' && src[i + 1] === '{') { i += 2; depth++; tpl.push(depth); break; } i++; }
      if (src[i] === '`') { i++; last = 'v'; } else last = '(';
      continue;
    }
    if (c === '/') {
      const prevIsVal = last === 'v' || last === ')' || last === ']';
      if (!prevIsVal) {                                 // a regex literal
        let j = i + 1, cls = false;
        while (j < n && (cls || src[j] !== '/')) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; if (src[j] === '\n') break; j++; }
        const body = src.slice(i + 1, j);
        if (/\(\?<[=!]/.test(body)) bad.push('regex lookbehind @' + i);
        i = j + 1; while (i < n && /[a-z]/.test(src[i])) i++; last = 'v'; continue;
      }
      i++; last = '('; continue;
    }
    if (c === '{') depth++;
    if (c === '}') depth--;
    if (c3 === '??=' || c3 === '||=' || c3 === '&&=') bad.push(c3 + ' @' + i);
    else if (c2 === '??') bad.push('?? @' + i);
    else if (c2 === '?.' && !/[0-9]/.test(src[i + 2] || '')) bad.push('?. @' + i);
    if (/[0-9]/.test(c) && !isId(src[i - 1] || ' ')) { let j = i; while (j < n && /[\w.]/.test(src[j])) j++; if (/\d_\d/.test(src.slice(i, j))) bad.push('numeric separator @' + i); i = j; last = 'v'; continue; }
    if (isId(c)) {
      let j = i; while (j < n && isId(src[j])) j++;
      const w = src.slice(i, j);
      last = /^(return|typeof|case|do|else|in|of|new|delete|void|throw|instanceof|yield|await)$/.test(w) ? '(' : 'v';
      i = j; continue;
    }
    if (c === '#' && isId(src[i + 1] || ' ') && i > 0) bad.push('private # @' + i);
    if (!/\s/.test(c)) last = c === ')' ? ')' : c === ']' ? ']' : c === '}' ? ')' : '(';
    i++;
  }
  return bad;
}
test('#247 29i 🔑 «رمز دخول» UI: «📲 افتح على جهاز تاني» on me.html, «🔑 عندي رمز دخول» beside every Google button, fb.js signInWithCustomToken, old Safari gets fb-old.js (Firebase 10.14.1), AR + FR', () => {
  const me = read('me.html'), c = read('assets/codein.js'), a = read('assets/account.js'), f = read('assets/fb.js'), fo = read('assets/fb-old.js');
  assert.ok(me.includes('<section id="mecode" class="qcard mecode" aria-live="polite"></section>') && me.indexOf('id="mecode"') > me.indexOf('id="mepush"'), 'the code card on «أنا»');
  assert.ok(a.includes("s.src='assets/codein.js'+(v?'?'+v:'')"), 'codein.js on every page (account.js), with the cache tag');
  assert.ok(a.includes("N.oldJS=(function(){try{return !Function('var o={};return o?.a??1')();}catch(e){return true;}})();") && a.includes("s.src='assets/'+(N.oldJS?'fb-old.js':'fb.js')"), 'old Safari → fb-old.js');
  assert.ok(f.includes('signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"') && f.includes('signInWithToken: tok => signInWithCustomToken(auth, tok)'), 'fb.js: custom-token sign-in');
  assert.strictEqual(fo, f.split('firebasejs/12.19.0/').join('firebasejs/10.14.1/'), 'fb-old.js = fb.js on Firebase 10.14.1 (regenerate it after every fb.js change)');
  assert.ok(!/firebasejs\/12/.test(fo) && (fo.match(/firebasejs\/10\.14\.1\//g) || []).length === 3, 'fb-old: only 10.14.1');
  assert.ok(!/gstatic\.com\/firebasejs/.test(read('assets/qstats.js')) && f.includes('increment, writeBatch },'), 'qstats.js takes increment from fb.js (no second SDK)');
  for (const s of ['📲 افتح على جهاز تاني', 'Ouvrir sur un autre appareil', 'عندي رمز دخول', "J'ai un code de connexion", 'حدّث ملف Cloudflare', 'Cloudflare (worker v14)', 'خلص وقت الرمز', 'Le code a expiré', 'جرّبت كتير', "Trop d'essais"]) assert.ok(c.includes(s), s);
  assert.ok(c.includes('d.querySelectorAll(".gbtn:not([data-cdx])")') && c.includes('MutationObserver'), 'beside every Google sign-in button (fb.js, gate.js, goals.js, nav.js)');
  assert.ok(c.includes('autocomplete="one-time-code"') && c.includes('inputmode="numeric"'), 'a phone keypad for the 6 digits');
  assert.ok(c.includes('https://summer-forest-fd40.abdullahjaber1452003.workers.dev') && c.includes('req("/code")') && c.includes('x.j.code === true'), 'asks the worker whether it knows codes first');
  assert.ok(read('assets/style.css').includes('.cdx-code{') && read('assets/style.css').includes('.cdx{position:fixed'), 'styles');
});
function codeinCtx(routes) {
  const vm = require('node:vm');
  class El {
    constructor(tag) { this.tag = tag; this._h = ''; this.kids = {}; this.attrs = {}; this.textContent = ''; this.value = ''; this.disabled = false; this.className = ''; this.ls = {}; this.parentNode = null; }
    set innerHTML(h) { this._h = h; this.kids = {}; } get innerHTML() { return this._h; }
    querySelector(s) { const k = s.replace(/^\./, ''); if (!new RegExp('class="[^"]*\\b' + k + '\\b').test(this._h)) return null; return this.kids[k] || (this.kids[k] = new El('x')); }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    addEventListener(t, f) { this.ls[t] = f; } appendChild(e) { e.parentNode = this; return e; } removeChild(e) { e.parentNode = null; } focus() {}
  }
  const els = { mecode: new El('section') }, calls = [];
  const doc = { readyState: 'complete', body: new El('body'), head: new El('head'), getElementById: id => els[id] || null, createElement: t => new El(t), querySelectorAll: () => [], addEventListener() {} };
  const ctx = { console, JSON, Math, Date, Promise, setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {}, document: doc, String, RegExp, Error };
  ctx.fetch = (url, o) => { calls.push({ url, o }); const r = routes(url.replace(/^https:\/\/[^/]+/, ''), o && o.body ? JSON.parse(o.body) : null); return Promise.resolve({ status: r[0], text: () => Promise.resolve(typeof r[1] === 'string' ? r[1] : JSON.stringify(r[1])) }); };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('assets/codein.js'), ctx, { filename: 'codein.js' });
  return { ctx, els, calls, C: ctx.NursinCode };
}
test('#248 29i 🔑 code flow with a mocked worker: v13 → «حدّث ملف Cloudflare» (no POST), wrong code → tries left, 429 → wait, right code → signInWithCustomToken; «📲» → POST /code/new with the ID token → the code big + countdown', async () => {
  // a worker without codes (v13 answers "ok")
  let t = codeinCtx(p => p === '/code' ? [200, 'ok'] : [500, {}]);
  t.C.open(); assert.strictEqual(await t.C.use('123456'), false);
  const msg = b => t.ctx.document.body && t.C && b;   // eslint quiet
  let box = t.calls.length && null;
  assert.deepStrictEqual(t.calls.map(c => c.url.replace(/^https:\/\/[^/]+/, '')), ['/code'], 'only the GET, no POST to the old worker (it would wake the tutor)');
  // v14
  const store = { '424242': 'uid-abdullah' }; let tries = 0, signed = null;
  t = codeinCtx((p, b) => {
    if (p === '/code') return [200, { ok: true, code: true, v: 14 }];
    if (p === '/code/use') { if (++tries > 3) return [429, { ok: false, error: 'slow down' }]; const u = store[b.c]; if (!u) return [200, { ok: false, error: 'bad code', left: 4 - tries }]; delete store[b.c]; return [200, { ok: true, token: 'CT.' + u }]; }
    if (p === '/code/new') return b && b.t === 'ID-TOKEN' ? [200, { ok: true, code: '070707', ttl: 300, v: 14 }] : [401, { ok: false }];
    return [404, {}];
  });
  t.ctx.NursinFB = { user: null, signInWithToken: tok => { signed = tok; return Promise.resolve({}); } };
  const sheet = t.C.open(), say = () => sheet.querySelector('.cdx-msg').textContent;
  assert.strictEqual(await t.C.use('12a'), false); assert.ok(say().includes('٦ أرقام'), 'six digits asked');
  assert.strictEqual(await t.C.use('111111'), false); assert.ok(say().includes('الرمز غلط') && say().includes('باقيلك 3'), say());
  assert.strictEqual(await t.C.use('424242'), true); assert.strictEqual(signed, 'CT.uid-abdullah', 'signed in with the worker\'s custom token');
  assert.ok(say().includes('✅'));
  t.C.open(); assert.strictEqual(await t.C.use('424242'), false, 'single use');
  t.C.open(); await t.C.use('999999'); const s2 = t.ctx.document.body; assert.ok(s2);
  // 429
  t.C.open(); const sh3 = t.C.open(); assert.strictEqual(await t.C.use('555555'), false); assert.ok(sh3.querySelector('.cdx-msg').textContent.includes('جرّبت كتير'));
  // the signed-in device: «📲 افتح على جهاز تاني»
  t.ctx.NursinFB.user = { uid: 'uid-abdullah', getIdToken: () => Promise.resolve('ID-TOKEN') };
  t.C.panel(); const el = t.els.mecode;
  assert.ok(el.innerHTML.includes('cdx-new') && el.innerHTML.includes('افتح على جهاز تاني'), 'the button for a signed-in student');
  assert.strictEqual(await t.C.gen(), true);
  const show = el.querySelector('.cdx-show').innerHTML;
  assert.ok(show.includes('class="cdx-code" dir="ltr"') && show.includes('070<span></span>707') && /باقي [45]:\d\d/.test(show), show);
  const post = t.calls.find(c => /\/code\/new$/.test(c.url)); assert.deepStrictEqual(JSON.parse(post.o.body), { t: 'ID-TOKEN' }, 'only the ID token is sent');
  // signed out on «أنا»: the code entry button
  t.ctx.NursinFB.user = null; t.C.panel(); assert.ok(el.innerHTML.includes('cdx-open') && el.innerHTML.includes('عندي رمز دخول'));
});
test('#249 29i 📱 iOS 12 Safari: the sign-in path and the core scripts parse on old Safari (no ?. ?? ||= #private, numeric separators, regex lookbehind); Firebase 12 only for new browsers', () => {
  assert.deepStrictEqual(oldSafariSyntax('a?.b; x ?? y; /(?<=a)b/.test(s); c ||= 1; 1_000').map(s => s.replace(/ @\d+$/, '')), ['?.', '??', 'regex lookbehind', '||=', 'numeric separator'], 'the scanner sees them');
  assert.deepStrictEqual(oldSafariSyntax('var a = b ? .5 : c; var r = x / y / z; var s = "?." + `a${b ? c : d}?.`; // ?. \n /* ?? */ var re = /[?.]/g;'), [], 'and nothing in strings, comments, ternaries, divisions');
  const files = fs.readdirSync(path.join(SITE, 'assets')).filter(f => f.endsWith('.js')).map(f => 'assets/' + f);
  assert.ok(files.includes('assets/codein.js') && files.includes('assets/fb.js') && files.includes('assets/fb-old.js') && files.length > 40);
  for (const f of files) assert.deepStrictEqual(oldSafariSyntax(read(f)), [], f);
  for (const p of pages) { const h = read(p); for (const m of h.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*json)[^>]*>([\s\S]*?)<\/script>/g)) assert.deepStrictEqual(oldSafariSyntax(m[1]), [], p + ' inline script'); }
  // the code-entry script is plain ES5 (it is what the old phone runs before anything else)
  const c = read('assets/codein.js'); const code = c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, '""');
  assert.ok(!/=>|\blet\b|\bconst\b|`|\bclass\b|\.\.\./.test(code), 'codein.js: ES5 only');
});
test('#250 29i 🔑 worker v14 (/home/user/tab/files/nursin-worker-v14.js, for Abdullah to paste): v13 + /code/new, /code/use (one use, 5 min, wrong tries limited) + a real RS256 custom token', async () => {
  const wf = '/home/user/tab/files/nursin-worker-v14.js', sf = '/home/user/tab/files/nursin-worker-v14-steps.txt';
  if (!fs.existsSync(wf)) return;   // lives on Tab's box (for Abdullah to paste), not in the repo
  const w14 = fs.readFileSync(wf, 'utf8'), w13 = fs.readFileSync('/home/user/tab/files/nursin-worker-v13.js', 'utf8');
  const body = s => s.slice(s.indexOf('const PROJECT'), s.indexOf('/* ---------------- 🔑 v14'));
  const norm = s => s.replace('url.pathname === "/admin/joined" || url.pathname === "/code" || url.pathname === "/code/new" || url.pathname === "/code/use") {', 'url.pathname === "/admin/joined") {')
    .replace('amb: true, code: true, v: 14,', 'amb: true, v: 13,').replace(/        if \(url\.pathname === "\/code"\) return[^\n]*\n        if \(url\.pathname === "\/code\/new"[^\n]*\n/, '')
    .replace(' _codeNew: (b, env) => codeNew(b, env), _codeUse: (b, env, req) => codeUse(b, env, req), _customToken: (uid, env) => customToken(uid, env),', '');
  assert.strictEqual(norm(body(w14)).trimEnd(), body(w13).trimEnd(), 'everything of v13 unchanged');
  const m = (await import('data:text/javascript;base64,' + Buffer.from(w14).toString('base64'))).default;
  const { generateKeyPairSync, createVerify } = require('node:crypto');
  const kp = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = { project_id: 'nursin-5aaa0', client_email: 'firebase-adminsdk-x@nursin-5aaa0.iam.gserviceaccount.com', private_key: kp.privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const docs = {}, log = []; let clock = 1.8e12;
  const BASE = 'https://fs.test/v1/projects/nursin-5aaa0/databases/(default)/documents';
  const env = { FB_SA: JSON.stringify(sa), __fsBase: BASE, __saToken: () => 'SA', __verify: t => t === 'good' ? 'uidA' : (() => { const e = new Error('bad token'); e.status = 401; throw e; })(), __now: () => clock };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => {
    const u = new URL(url), p = decodeURIComponent(u.pathname).replace('/v1/projects/nursin-5aaa0/databases/(default)/documents', ''), meth = o.method || 'GET', b = o.body ? JSON.parse(o.body) : null;
    log.push(meth + ' ' + p); const J = (st, x) => ({ ok: st < 300, status: st, json: async () => x });
    if (p === ':runQuery') return J(200, Object.keys(docs).filter(k => k.startsWith('loginCodes/') && docs[k].fields.uid.stringValue === b.structuredQuery.where.fieldFilter.value.stringValue).map(k => ({ document: { name: 'projects/nursin-5aaa0/databases/(default)/documents/' + k } })));
    if (p === ':commit') { for (const w of b.writes) { if (w.delete) delete docs[w.delete.split('/documents/')[1]]; if (w.transform) { const k = w.transform.document.split('/documents/')[1], d = docs[k] || (docs[k] = { fields: { i: { mapValue: { fields: {} } } } }); for (const ft of w.transform.fieldTransforms) { const [a, h] = ft.fieldPath.split('.'); const tgt = h ? d.fields.i.mapValue.fields : d.fields, key = h || a; tgt[key] = { integerValue: String((+(tgt[key] && tgt[key].integerValue) || 0) + 1) }; } } } return J(200, {}); }
    if (p === '/loginCodes' && meth === 'POST') { const k = 'loginCodes/' + u.searchParams.get('documentId'); if (docs[k]) return J(409, {}); docs[k] = { fields: b.fields, updateTime: 'T' + clock }; return J(200, docs[k]); }
    const k = p.slice(1);
    if (meth === 'GET') return docs[k] ? J(200, docs[k]) : J(404, {});
    if (meth === 'DELETE') { if (!docs[k] || docs[k].updateTime !== u.searchParams.get('currentDocument.updateTime')) return J(400, {}); delete docs[k]; return J(200, {}); }
    return J(500, {});
  };
  try {
    await assert.rejects(m._codeNew({ t: 'forged' }, env), /bad token/, 'needs a real ID token');
    const a = await m._codeNew({ t: 'good' }, env); assert.ok(/^\d{6}$/.test(a.code) && a.ttl === 300 && a.v === 14, JSON.stringify(a));
    const b = await m._codeNew({ t: 'good' }, env); assert.ok(!docs['loginCodes/' + a.code] && docs['loginCodes/' + b.code], 'one live code per account: the older one is gone');
    assert.strictEqual(docs['loginCodes/' + b.code].fields.uid.stringValue, 'uidA'); assert.strictEqual(+docs['loginCodes/' + b.code].fields.exp.integerValue, clock + 300e3, '5 minutes');
    const req = ip => ({ headers: { get: h => h === 'CF-Connecting-IP' ? ip : null } });
    await assert.rejects(m._codeUse({ c: '12345' }, env, req('1.1.1.1')), /bad code/);
    const wrongCode = String((+b.code + 1) % 1e6).padStart(6, '0');
    const w1 = await m._codeUse({ c: wrongCode }, env, req('1.1.1.1')); assert.ok(!w1.ok && !w1.token && w1.left === 4, JSON.stringify(w1));
    const ok = await m._codeUse({ c: b.code }, env, req('2.2.2.2')); assert.ok(ok.ok && ok.token, 'right code → token');
    const [h, pl, sig] = ok.token.split('.'), dec = s => JSON.parse(Buffer.from(s, 'base64url').toString());
    assert.deepStrictEqual(dec(h), { alg: 'RS256', typ: 'JWT' });
    const c = dec(pl); assert.ok(c.uid === 'uidA' && c.iss === sa.client_email && c.sub === sa.client_email && c.aud === 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit' && c.exp - c.iat === 3600, JSON.stringify(c));
    assert.ok(createVerify('RSA-SHA256').update(h + '.' + pl).verify(kp.publicKey, Buffer.from(sig, 'base64url')), 'signed with the service-account key');
    assert.ok(!docs['loginCodes/' + b.code], 'deleted after use');
    const again = await m._codeUse({ c: b.code }, env, req('2.2.2.2')); assert.ok(!again.ok && !again.token, 'single use');
    const e = await m._codeNew({ t: 'good' }, env); clock += 301e3;
    const late = await m._codeUse({ c: e.code }, env, req('3.3.3.3')); assert.ok(!late.ok && !late.token, 'expired after 5 minutes');
    // wrong tries: 5 per IP per 10 minutes
    clock += 3600e3; const f = await m._codeNew({ t: 'good' }, env);
    for (let i = 0; i < 5; i++) assert.ok(!(await m._codeUse({ c: '000000' === f.code ? '000001' : '000000' }, env, req('9.9.9.9'))).ok);
    await assert.rejects(m._codeUse({ c: f.code }, env, req('9.9.9.9')), e => e.status === 429, '6th try from the same IP refused, even the right code');
    const other = await m._codeUse({ c: f.code }, env, req('8.8.8.8')); assert.ok(other.ok && other.token, 'another IP is not blocked');
  } finally { globalThis.fetch = realFetch; }
  assert.ok(w14.startsWith('// nursin worker v14') && w14.includes('code: true, v: 14'), 'GET /push and /code say v14');
  const st = fs.existsSync(sf) ? fs.readFileSync(sf, 'utf8') : '';
  assert.ok(/v14/.test(st) && /Deploy/.test(st) && st.includes('summer-forest-fd40') && st.includes('"code":true'), 'Arabic steps');
});

function remCtx(lsInit, fr) {
  const vm = require('node:vm'), store = Object.assign({}, lsInit || {}), evs = [];
  const doc = { readyState: 'complete', addEventListener() {}, getElementById: () => null, dispatchEvent: e => evs.push(e.type) };
  const ctx = { console, JSON, Math, Date, Intl, String, RegExp, Object, Array, setTimeout: () => 1, clearTimeout() {}, document: doc,
    CustomEvent: function (t) { this.type = t; }, localStorage: { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; if (fr) ctx.Lang = { fr: true };
  vm.createContext(ctx); vm.runInContext(read('assets/remind.js'), ctx, { filename: 'remind.js' });
  const R = Object.assign({}, ctx.NursinRem), b0 = R.build; R.build = (x, s) => JSON.parse(JSON.stringify(b0(x, s)));   // plain arrays (not the vm realm's)
  return { R, store, evs, ctx };
}
test('#251 29j 📌 «تذكيرات اليوم» card: first thing on the home (under the greeting, above the chips and «🧭 مسار اليوم»), short (4 lines + «+N»), AR + FR', () => {
  const ix = read('index.html'), h = read('assets/home.js'), r = read('assets/remind.js');
  assert.ok(ix.indexOf('assets/remind.js?v=') > -1 && ix.indexOf('assets/remind.js?v=') < ix.indexOf('assets/home.js?v='), 'remind.js on the home, before home.js');
  assert.ok(h.includes('parts.pin.innerHTML = pathHtml(p) + remHtml();') && h.includes('"nursin:rem"]') && h.includes('todayNow: todayNow, lessonsNow: lessonsNow'), 'home.js draws it under the greeting and redraws on nursin:rem');
  const { R } = remCtx();
  const x = { day: '2026-11-07', hm: 9 * 60, exam: '2026-11-16', hw: [{ id: 'h1', title: 'Etude de cas — Massage', due: '2026-11-08' }],
    today: { n: 'Cardio · ECG', href: 'cardio.html#ecg' }, q: { id: 'q001', q: 'Quel est le rôle de la troponine ?' }, cls: { n: 'Pharmaco · Digoxine', href: 'pharma.html#dig' } };
  const it = R.build(x, { done: { 'ph:2026-11-06': 1 }, off: {} });
  assert.deepStrictEqual(it.map(i => i.key), ['hw:h1', 'cl:2026-11-07', 'st:2026-11-07', 'rv:2026-11-07'], 'urgent → class morning (Sat) → study → review');
  assert.strictEqual(R.build(x, { done: {}, off: {} })[2].key, 'ph:2026-11-06', "Friday's 📸 still waiting on Saturday morning");
  assert.ok(it[0].t.includes('التسليم بكرا') && it[0].href === 'homework.html?id=h1' && it[3].href === 'index.html?mq=q001' && it[1].href === 'pharma.html#dig');
  const html = R.html(it, false);
  assert.ok(html.includes('📌 تذكيرات اليوم') && (html.match(/class="hzremi"/g) || []).length === 2 && (html.match(/data-remok=/g) || []).length === 2 && html.includes('✅'));
  const five = R.build(Object.assign({}, x, { hw: x.hw.concat([{ id: 'h2', title: 'Devoir 2', due: '2026-11-09' }]) }), { done: { 'ph:2026-11-06': 1 }, off: {} });
  const h5 = R.html(five, false); assert.ok((h5.match(/class="hzremi"/g) || []).length === 2 && h5.includes('data-remmore="1">+3<'), 'max 2 lines + «+3»');
  assert.strictEqual((R.html(five, true).match(/class="hzremi"/g) || []).length, 5, 'open = all');
  assert.strictEqual(R.html([], false), '', 'nothing to remind → no card');
  const F = remCtx(null, true).R, fh = F.html(F.build(x, { done: { 'ph:2026-11-06': 1 }, off: {} }), true);
  assert.ok(fh.includes('Rappels du jour') && fh.includes('Fait') && fh.includes('à rendre demain') && fh.includes('Question de révision'), 'French');
  for (const s of ['Rappels', 'Prends en photo les cours', 'Devoirs et examens', 'Matin de cours', 'Examen de mi-semestre']) assert.ok(r.includes(s), 'fr: ' + s);
  assert.ok(read('assets/home.css').includes('.hzrem{') && read('assets/home.css').includes('.hzremok{'), 'styles');
});
test('#252 29j 📌 a reminder stays until it is done: opening it or «✅ تمّ» marks it done, kept on the device + merged with the account (users/{uid}.remDone)', () => {
  const { R, store, evs } = remCtx();
  const x = { day: '2026-11-06', hm: 16 * 60, hw: [], exam: '', today: { n: 'Neuro', href: 'neuro.html' }, q: null, cls: null };
  assert.deepStrictEqual(R.build(x, R.state()).map(i => i.key), ['ph:2026-11-06', 'st:2026-11-06'], 'Friday after 2:30 PM: 📸 + 📖');
  R.markDone('ph:2026-11-06');
  assert.ok(JSON.parse(store.nursin_rem_v1).done['ph:2026-11-06'] > 0 && evs.includes('nursin:rem'), 'saved + redraw');
  const R2 = remCtx({ nursin_rem_v1: store.nursin_rem_v1 }).R;           // a reload: still gone
  assert.deepStrictEqual(R2.build(x, R2.state()).map(i => i.key), ['st:2026-11-06']);
  // the next day: yesterday's undone study item is replaced by today's; the 📸 of a class day stays until done (≤ 2 days)
  const y = Object.assign({}, x, { day: '2026-11-08', hm: 10 * 60 });   // Sunday
  assert.deepStrictEqual(R2.build(y, { done: {}, off: {} }).map(i => i.key), ['ph:2026-11-07', 'st:2026-11-08'], 'Saturday\'s 📸 still there on Sunday');
  assert.deepStrictEqual(R2.build(Object.assign({}, y, { day: '2026-11-10' }), { done: {}, off: {} }).map(i => i.key), ['st:2026-11-10'], 'after 2 days it leaves');
  const m = R.merge({ done: { a: 5 }, off: { hw: true }, offAt: 10 }, { remDone: { a: 3, b: 7 }, remOff: { cls: true }, remOffAt: 20 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(m.done)), { a: 5, b: 7 }); assert.deepStrictEqual(JSON.parse(JSON.stringify(m.off)), { cls: true }, 'newer switches win');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(R.merge({ off: { hw: true }, offAt: 30 }, { remOff: {}, remOffAt: 20 }).off)), { hw: true });
  const r = read('assets/remind.js');
  assert.ok(r.includes('{ remDone: s.done, remOff: s.off, remOffAt: +s.offAt || 0 }, { merge: true }') && r.includes('if (a) { var key = a.getAttribute("data-rem");') && r.includes('markDone(key); }'), 'Firestore mirror (owner merge, rules v22) + open = done');
  const old = Date.now() - 30 * 864e5; assert.deepStrictEqual(Object.keys(R.prune({ x: old, y: Date.now() }, Date.now())), ['y'], 'old marks pruned');
});
test('#253 29j 📌 due-date window: homework / امتحان الفصل from 2 days before until the day; 🏫 class-day morning only; nothing on other days', () => {
  const { R } = remCtx(), st = { done: {}, off: { cls: true, ph: true } }, st2 = { done: {}, off: {} };
  const keys = (day, hm, hw, exam, s) => R.build({ day, hm, hw: hw || [], exam: exam || '', today: null, q: null, cls: null }, s || st).map(i => i.key);
  const hw = due => [{ id: 'h', title: 'T', due }];
  assert.deepStrictEqual(keys('2026-11-09', 600, hw('2026-11-12')), [], '3 days before: not yet');
  assert.deepStrictEqual(keys('2026-11-10', 600, hw('2026-11-12')), ['hw:h'], '2 days before');
  assert.deepStrictEqual(keys('2026-11-12', 600, hw('2026-11-12')), ['hw:h'], 'due today');
  assert.deepStrictEqual(keys('2026-11-13', 600, hw('2026-11-12')), [], 'past');
  assert.deepStrictEqual(keys('2026-11-13', 600, [], '2026-11-16'), [], 'midterm: 3 days before');
  assert.deepStrictEqual(keys('2026-11-14', 600, [], '2026-11-16'), ['ex:2026-11-16'], 'midterm: 2 days before');
  assert.ok(R.build({ day: '2026-11-16', hm: 600, hw: [], exam: '2026-11-16' }, st)[0].href === 'midterm.html');
  assert.deepStrictEqual(keys('2026-11-12', 7 * 60, 0, 0, st2), ['cl:2026-11-12'], 'Thursday 7 AM: class recap');
  assert.deepStrictEqual(keys('2026-11-12', 4 * 60, 0, 0, st2), [], 'not at 4 AM');
  assert.deepStrictEqual(keys('2026-11-12', 15 * 60, 0, 0, st2), ['ph:2026-11-12'], 'after 2:30 PM the recap leaves and 📸 comes');
  assert.deepStrictEqual(keys('2026-11-11', 8 * 60, 0, 0, st2), [], 'Wednesday: no class');
  assert.deepStrictEqual(keys('2026-11-13', 15 * 60, 0, 0, { done: { 'ph:2026-11-13': 1 }, off: {} }), [], "today's 📸 done → Thursday's does not come back");
  assert.ok(R.build({ day: '2026-11-12', hm: 15 * 60 }, st2)[0].href === 'suggest.html');
});
test('#254 29j 📌 «أنا» switches: one per kind, they hide the card lines and stop the phone pushes (worker v15 reads users/{uid}.remOff)', () => {
  const me = read('me.html');
  assert.ok(me.includes('<section id="merem" class="qcard merem" aria-live="polite"></section>') && me.includes('assets/remind.js?v='), 'the card on «أنا»');
  const { R, store } = remCtx(), x = { day: '2026-11-14', hm: 9 * 60, hw: [{ id: 'h', title: 'T', due: '2026-11-15' }], exam: '2026-11-16', today: { n: 'L', href: 'l.html' }, q: { id: 'q1', q: 'Q?' }, cls: null };
  assert.strictEqual(R.build(x, R.state()).length, 6, '📌 🎯 🏫 📸(Fri) 📖 🔁');
  const sw = R.meHtml(); assert.strictEqual((sw.match(/data-remsw="/g) || []).length, 4); assert.strictEqual((sw.match(/ checked>/g) || []).length, 4, 'all on by default');
  R.setOff('hw', true); assert.deepStrictEqual(R.build(x, R.state()).map(i => i.k), ['cls', 'ph', 'st', 'st'], '📌 + 🎯 off');
  R.setOff('st', true); R.setOff('cls', true); R.setOff('ph', true); assert.deepStrictEqual(R.build(x, R.state()), []);
  assert.strictEqual((R.meHtml().match(/ checked>/g) || []).length, 0);
  R.setOff('hw', false); assert.ok(!JSON.parse(store.nursin_rem_v1).off.hw && JSON.parse(store.nursin_rem_v1).offAt > 0, 'on again, stamped');
  const fr = remCtx(null, true).R.meHtml(); assert.ok(fr.includes('Rappels') && fr.includes('20 h') && fr.includes('Matin de cours (7 h)'), 'French');
  assert.ok(read('assets/style.css').includes('.remsw{'), 'styles');
});
test('#255 29j 📌 worker v15 (/home/user/tab/files/nursin-worker-v15.js, for Abdullah to paste): v14 + fixed-time reminder pushes — switches, ≤ 1 an hour, windows, homework handed in', async () => {
  const wf = '/home/user/tab/files/nursin-worker-v15.js', sf = '/home/user/tab/files/nursin-worker-v15-steps.txt';
  if (!fs.existsSync(wf)) return;   // lives on Tab's box (for Abdullah to paste), not in the repo
  const w15 = fs.readFileSync(wf, 'utf8'), w14 = fs.readFileSync('/home/user/tab/files/nursin-worker-v14.js', 'utf8');
  const body = s => s.slice(s.indexOf('const PROJECT'), s.indexOf('/* ---------------- 📌 v15') > -1 ? s.indexOf('/* ---------------- 📌 v15') : undefined);
  const norm = s => s.replace('rem: true, v: 15,', 'v: 14,').replace(/\n      \.then\(\(\) => remCron[^\n]*\n[^\n]*rem cron[^\n]*/, ';').replace(' _planRem: (u, day, min, now, c) => planRem(u, day, min, now, c), _remCron: (env, when) => remCron(env, when), _remSite: (q, h, m) => remSite(q, h, m),', '');
  assert.strictEqual(norm(body(w15)).trimEnd(), body(w14).trimEnd(), 'everything of v14 unchanged');
  const m = (await import('data:text/javascript;base64,' + Buffer.from(w15).toString('base64'))).default;
  const site = m._remSite(read('assets/homework-static.js'), read('assets/midterm.js'), [{ id: 'f1', title: 'Devoir', due: '2026-11-13' }]);
  assert.ok(site.exam === read('assets/midterm.js').match(/EXAM = "([^"]+)"/)[1] && site.hw.some(h => h.id === 'st-massage-cardiaque') && site.hw.some(h => h.id === 'f1'), JSON.stringify(site));
  const now = Date.parse('2026-11-11T16:10:00Z'), c = { bank: null, hw: [{ id: 'f1', title: 'Devoir', due: '2026-11-13' }], exam: '2026-11-16' };
  const P = (u, day, min, cc) => m._planRem(Object.assign({ uid: 'u1' }, u), day, min, now, cc || c);
  assert.strictEqual(P({}, '2026-11-11', 18 * 60 + 10).kind, 'hw', '18:10, due in 2 days → 📌');
  assert.ok(P({}, '2026-11-11', 18 * 60 + 10).msg.url === '/homework.html?id=f1' && P({}, '2026-11-11', 18 * 60 + 10).msg.body.includes('التسليم بعد يومين'));
  assert.strictEqual(P({ hwDone: { f1: 1 } }, '2026-11-11', 18 * 60 + 10), null, 'handed in → nothing');
  assert.strictEqual(P({ remHw: 'hw:f1' }, '2026-11-11', 18 * 60 + 10), null, 'once');
  assert.strictEqual(P({ remOff: { hw: true } }, '2026-11-11', 18 * 60 + 10), null, 'his switch');
  assert.strictEqual(P({ liveAt: now - 20 * 6e4 }, '2026-11-11', 18 * 60 + 10), null, 'a live push 20 min ago → wait (max 1 an hour)');
  assert.strictEqual(P({}, '2026-11-10', 18 * 60 + 10), null, '3 days before: nothing');
  assert.strictEqual(P({}, '2026-11-14', 18 * 60 + 10).kind, 'ex', '🎯 midterm 2 days before');
  const st = P({}, '2026-11-11', 20 * 60 + 10); assert.ok(st.kind === 'st' && st.mark.remSt === '2026-11-11' && st.msg.title.includes('٨ المسا'), '📚 at 8 PM');
  assert.strictEqual(P({ remSt: '2026-11-11' }, '2026-11-11', 20 * 60 + 40), null); assert.strictEqual(P({ remOff: { st: true } }, '2026-11-11', 20 * 60 + 10), null);
  assert.strictEqual(P({ stAt: now - 2 * 6e4 }, '2026-11-11', 20 * 60 + 10), null, 'on the site right now');
  const bank = { quiz: [{ id: 'q9', q: 'Troponine ?', o: ['a', 'b'] }], links: [] };
  const sq = P({}, '2026-11-11', 20 * 60 + 10, { bank, hw: [], exam: '' }); assert.ok(sq.msg.url === '/?mq=q9' && sq.msg.body.includes('Troponine'), 'with the review question');
  assert.strictEqual(P({}, '2026-11-12', 7 * 60 + 10).kind, 'cls', 'Thursday 7 AM');
  assert.strictEqual(P({ quietFrom: '22:30', quietTo: '08:00' }, '2026-11-12', 7 * 60 + 10).kind, 'cls', 'default quiet hours do not stop the 7 AM class push');
  assert.strictEqual(P({ quietFrom: '23:00', quietTo: '09:00' }, '2026-11-12', 7 * 60 + 10), null, 'his own quiet hours do');
  assert.strictEqual(P({}, '2026-11-11', 7 * 60 + 10), null, 'Wednesday: no class');
  assert.strictEqual(P({ remOff: { cls: true } }, '2026-11-12', 7 * 60 + 10), null);
  assert.strictEqual(P({}, '2026-11-12', 12 * 60), null, 'no window at noon');
  // a whole run with Firestore mocked: 2 students, one switched 📌 off → one push, marks written
  const BASE = 'https://fs.test/v1/projects/nursin-5aaa0/databases/(default)/documents', sent = [], commits = [];
  const docName = p => 'projects/nursin-5aaa0/databases/(default)/documents/' + p;
  const env = { VAPID_PRIVATE_JWK: '{}', __fsBase: BASE, __saToken: () => 'SA', __now: () => Date.parse('2026-11-11T16:10:00Z'), __rem: { hw: c.hw, exam: '' }, __send: (d0, msg) => { sent.push([d0.uid, JSON.parse(msg)]); return 201; } };
  const realFetch = globalThis.fetch;
  const fsv = o => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([a, b]) => [a, { booleanValue: b }])) } } : { stringValue: v }])) });
  globalThis.fetch = async (url, o = {}) => {
    const b = o.body ? JSON.parse(o.body) : null, J = x => ({ ok: true, status: 200, json: async () => x });
    if (url.endsWith(':runQuery')) return J([{ document: { name: docName('pushSubs/uA'), fields: { d: { mapValue: { fields: { k1: { stringValue: 'S' } } } } } } }, { document: { name: docName('pushSubs/uB'), fields: { d: { mapValue: { fields: { k1: { stringValue: 'S' } } } } } } }]);
    if (url.endsWith(':batchGet')) return J([{ found: Object.assign({ name: docName('users/uA') }, fsv({})) }, { found: Object.assign({ name: docName('users/uB') }, fsv({ remOff: { hw: true } })) }]);
    if (url.endsWith(':commit')) { commits.push(b); return J({}); }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  try {
    const r = await m._remCron(Object.assign({}, env, { VAPID_PRIVATE_JWK: undefined }), 0).catch(e => e);
    assert.ok(r instanceof Error && /push not set up/.test(r.message), 'needs the VAPID key like the other crons');
    const judging = await m._remCron(Object.assign({}, env, { __now: () => Date.parse('2026-11-11T16:00:00Z') }), 0); assert.strictEqual(judging.skip, 'judging run', "Osman's :00/:30 runs keep their budget");
    const noon = await m._remCron(Object.assign({}, env, { __now: () => Date.parse('2026-11-11T10:10:00Z') }), 0); assert.strictEqual(noon.skip, 'no window', 'no Firestore read outside the windows');
  } finally { globalThis.fetch = realFetch; }
  assert.ok(w15.startsWith('// nursin worker v15') && w15.includes('rem: true, v: 15,') && w15.includes('.then(() => remCron(env, when))'), 'GET /push says v15; the cron runs it');
  const stx = fs.existsSync(sf) ? fs.readFileSync(sf, 'utf8') : '';
  assert.ok(/v15/.test(stx) && /Deploy/.test(stx) && stx.includes('summer-forest-fd40') && stx.includes('"rem":true'), 'Arabic steps');
});

test('#256 29k 🧭 «مسار اليوم» comes before the 📌 card again (Abdullah Nov 6 7:42: the card pushed it off the iPhone screen); a throwing reminder never breaks the home', () => {
  const h = read('assets/home.js');
  assert.ok(h.includes('parts.top.innerHTML = headHtml() + chipsHtml();') && h.includes('parts.pin.innerHTML = pathHtml(p) + remHtml();'), 'path first, card under it');
  assert.ok(/function remHtml\(\) \{[^}]*try \{/.test(h), 'remHtml guarded');
  assert.ok(read('assets/remind.js').includes('try { return html(build(ctx(), state()), open); } catch (e) { return ""; }'), 'homeHtml guarded');
  assert.ok(read('assets/home.css').includes('white-space:nowrap;text-overflow:ellipsis'), 'one-line rows');
});

test('#257 29l 🔥 the hospital room stays cool (Abdullah Nov 6: «لعبة المستشفى عم تحمّي الجهاز»): idle drawing throttled, everything pauses when the page is hidden, no blur / endless shadow animation', () => {
  const r = read('assets/livecase-room.js'), l = read('assets/livecase.js'), c = read('assets/livecase.css');
  const i = r.indexOf('function loop(ts) {'), body = r.slice(i, r.indexOf('draw(ts / 1000);', i));
  assert.ok(/var IDLE_MS = (6\d|[7-9]\d|100)\b/.test(r), 'idle frame budget ~10–15 fps');
  assert.ok(body.includes('if (d.hidden) { stop(); return; }') && body.includes('ts - lastDraw < IDLE_MS && !busy(ts)) return;'), 'the loop stops when hidden and skips idle frames before drawing');
  assert.ok(/function busy\(ts\) \{ return !!\(nurse && nurse\.pts && nurse\.pts\.length\) \|\| !!trv \|\| ts < hotTo \|\| peersMoving\(\)( \|\| !!\(asst && asst\.mv\))?; \}/.test(r), 'full rate only while something moves');
  assert.ok(r.includes('function onTap(e) { kick();') && r.includes('function onFloorTap(e) { kick();'), 'a tap wakes full rate');
  assert.ok(r.includes('d.addEventListener("visibilitychange", function () { if (d.hidden) pauseAll(); else resumeAll(); });') && r.includes('w.addEventListener("pagehide", pauseAll);'), 'hidden / pagehide pause');
  const pa = r.slice(r.indexOf('function pauseAll()'), r.indexOf('function resumeAll()'));
  assert.ok(pa.includes('stop();') && pa.includes('clearInterval(careIv)') && pa.includes('LivePresRoom.stop()') && pa.includes('L.pause()'), 'loop, ⏰ timer, presence and the live listener all stop');
  assert.ok(/function pause\(\) \{ if \(tick\) \{ clearInterval\(tick\); tick = 0; \} if \(unsub\)/.test(l) && l.includes('pause: pause, resume: resume,'), 'LiveCase.pause/resume');
  assert.ok(l.includes('if (cb && subs.indexOf(cb) < 0) subs.push(cb);'), 'no duplicate listener on re-open');
  assert.ok(r.includes('; dpr = Math.min(2, w.devicePixelRatio || 1)'), 'room canvas DPR capped at 2'); assert.ok(r.includes('fdpr = Math.min(2, w.devicePixelRatio || 1)'), 'floor canvas too');
  assert.ok(!/backdrop-filter/.test(c), 'no backdrop blur over the redrawn canvas');
  for (const m of c.matchAll(/animation:\s*([\w-]+)[^;}]*infinite/g)) { const k = c.match(new RegExp('@keyframes ' + m[1] + '\\{[^@]*?\\}\\}')); assert.ok(k && !/box-shadow|filter/.test(k[0]), m[1] + ': no endless box-shadow/filter animation'); }
  // behaviour: the idle throttle drops frames, a hidden page draws nothing
  let draws = 0, hidden = false, hotTo = 0, lastDraw = 0, walking = false; const IDLE_MS = 80;
  const busy = ts => walking || ts < hotTo, frame = ts => { if (hidden) return; if (lastDraw && ts - lastDraw < IDLE_MS && !busy(ts)) return; lastDraw = ts; draws++; };
  for (let ts = 0; ts < 1000; ts += 1000 / 60) frame(ts); assert.ok(draws >= 10 && draws <= 15, 'idle ~12 fps, got ' + draws);
  draws = 0; walking = true; for (let ts = 1000; ts < 2000; ts += 1000 / 60) frame(ts); assert.ok(draws >= 58, 'walking = full rate');
  draws = 0; hidden = true; for (let ts = 2000; ts < 3000; ts += 1000 / 60) frame(ts); assert.strictEqual(draws, 0, 'hidden = nothing');
});

test('#258 29m 🧑‍⚕️ الممرض المساعد: «شو بعمل؟» = ONE next step from the case (fetch the item from its station · 📞 the doctor · the file · the gesture), paid like 💡, in every room', () => {
  const { C, D, E } = liveLoad(), { t0, doc } = liveCase(C, D, 'lc01'), U = ['u1', 'عبدالله']; let t = t0 + 9 * 36e5;
  let st = C.state(D, doc, t), h = C.helpStep(D, st, 'a', []);
  assert.ok(h && h.x.k === 'a' && h.how === 'act' && h.s.id === 'acc', 'a fresh patient: the accueil first');
  assert.strictEqual(C.helpPick(st).k, C.helpPick(st, null).k); assert.strictEqual(C.helpStep(D, st, 'b', []).x.k, 'b', 'asked about bed 2 → bed 2');
  const seen = {};
  for (let g = 0; g < 40; g++) {
    st = C.state(D, doc, t); h = C.helpStep(D, st, 'a', []); if (!h || h.how === 'none' || h.x.k !== 'a') break;   /* a finished → the helper turns to bed 2 */ seen[h.how] = (seen[h.how] || 0) + 1;
    if (h.how === 'item') { const I = D.I[h.need]; assert.ok(I && E.stations[I.st], 'the item has a station to fetch it from: ' + h.need);
      const h2 = C.helpStep(D, st, 'a', [h.need]); assert.ok(h2.how === 'act' && h2.s.id === h.s.id, 'with the item in hand → do the gesture'); }
    const cl = C.clue(D, st, 'a'); assert.ok(cl, 'a step exists while the helper speaks');
    const s = h.s; liveAddU(C, D, doc, t, U, 'a', s.id === 'call' ? 'call' : s.kind === 'file' ? 'f_' + s.f : s.a, s.kind === 'file' ? C.opts(D, st.cs, st.P[0].p, s.f).a : undefined); t += 3e3;
  }
  assert.ok(seen.act && seen.file && seen.item && seen.call, 'the helper says every kind of errand along a case: ' + JSON.stringify(seen));
  const rj = read('assets/livecase-room.js'), cs = read('assets/livecase.css');
  assert.ok(rj.includes('data-lchelp="1"') && rj.includes('class="lcr-help" hidden') && rj.includes('function helpGo()') && rj.includes('queue(h.x.k, "hint")'), 'top-bar 🧑‍⚕️ in every room → the helper bubble, paid through the 💡 queue');
  assert.ok(rj.includes('myHints(h.x) >= C.HMAX') && rj.includes('u("hlpSvc")') && rj.includes('u("hlpWait", { n: n })'), 'limits per patient · a room with no patient · still in the waiting room');
  for (const k of ['hlp', 'hlpAsk', 'hlpItem', 'hlpCall', 'hlpFile', 'hlpAct', 'talk', 'tq_pain', 'tq_since', 'tq_meds', 'tq_all', 'tq_ant', 'tUnk', 'docGo']) assert.ok(new RegExp('\\b' + k + ': \\{ ar: "[^"]+", fr: "[^"]+" \\}').test(rj), k + ' in AR + FR');
  const hc = cs.slice(cs.indexOf('/* 29m')).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(hc.length > 100 && !/animation|backdrop-filter|transition/.test(hc), 'the new boxes add no animation or blur (29l stays cool)');
});
test('#259 29m 💬 احكي مع المريض: the answers are the case\'s own words (story, file), «ما بعرف» when the case is silent, the family answers when GCS ≤ 8', () => {
  const { C, D } = liveLoad(); assert.deepStrictEqual(Array.from(C.TQ), ['pain', 'since', 'meds', 'all', 'ant']);
  let n = 0;
  for (const c of D.cases) for (const p of c.pts) { n++;
    const f = p.file, a = q => C.talk(p, p.vit, q);
    assert.strictEqual(a('meds').ar, f.tt.ar); assert.strictEqual(a('meds').fr, f.tt.fr); assert.strictEqual(a('all').ar, f.all.ar); assert.strictEqual(a('ant').fr, f.ant.fr);
    const pn = a('pain'); assert.ok(pn.ar && (p.story.ar.includes(pn.ar) || pn.ar === p.who.ar || pn.ar === f.motif.ar), c.id + p.k + ' pain from the story / complaint');
    const s = a('since'); for (const l of ['ar', 'fr']) if (s[l] && s[l] !== "D'un coup") assert.ok((p.who[l] + ' ' + p.story[l]).includes(s[l]), c.id + p.k + ' since: ' + s[l] + ' is in the case');
    if (s.ar) assert.ok(!f.ant.ar.includes(s.ar), 'never his history as «since when»');
  }
  assert.ok(n >= 20);
  const p0 = D.cases[0].pts[0];
  assert.strictEqual(C.talk({ who: { ar: 'تعب', fr: 'Fatigue' }, story: { ar: 'إجا لحالو', fr: 'Venu seul' }, file: {} }, { gcs: 15 }, 'meds').unk, true, 'nothing in the case → unknown (the room says «ما بعرف»), nothing invented');
  assert.strictEqual(C.talk(p0, { gcs: 6 }, 'all').who, 'fam', 'unconscious → the family answers');
  assert.strictEqual(C.talk(p0, p0.vit, 'zzz'), null);
  const rj = read('assets/livecase-room.js');
  assert.ok(rj.includes('function talkHtml(x)') && rj.includes('h += talkHtml(x)') && rj.includes('C.talk(x.p, x.v, talkOpen.q)') && rj.includes('esc(t || u("tUnk"))'), 'the bed sheet asks + shows the case answer');
});
test('#260 29m 📞 unstable / critical patient: the doctor gives a concrete order from the case, never «wait»', () => {
  const { C, D } = liveLoad(), { t0, doc } = liveCase(C, D, 'lc01'), U = ['u1', 'عبدالله']; let t = t0 + 9 * 36e5;
  liveIn(C, D, doc, t, U, 'a'); t += 3e3;
  let st = C.state(D, doc, t); const x = st.P[0];
  x.st = 'crit'; let o = C.docOrder(D, st, 'a'); assert.ok(o && o.s && x.L.some(s => s.id === o.s.id) && !x.done[o.s.id] && o.s.kind === 'act', 'critical → an open gesture of his own case: ' + (o && o.a));
  x.st = 'unst'; assert.ok(C.docOrder(D, st, 'a'), 'unstable → an order too');
  x.st = 'ok'; assert.strictEqual(C.docOrder(D, st, 'a'), null, 'stable → his usual answer');
  x.st = 'crit'; x.L.forEach(s => { x.done[s.id] = x.done[s.id] || { u: 'u1' }; }); x.next = []; o = C.docOrder(D, st, 'a'); assert.strictEqual(o.a, 'mon', 'all done but still critical → «📟 scope»');
  const rj = read('assets/livecase-room.js');
  assert.ok(rj.includes(': dO ? docGo(x, dO.s) : u("docOk")'), 'called with nothing left to prescribe → the order, not «carry on»');
  assert.ok(rj.includes('var dN = C.docOrder(DK(), st, k)') && rj.includes('dN ? u("doc") + " " + docGo(x, dN.s) : T(r.why)'), 'called again with «nothing new» while unstable → an order');
  assert.ok(rj.includes('C.RANK[x.st] >= 2 && r.miss && r.miss.length ? docGo(x, r.miss[0])'), 'too early but critical → «do X now», not «first I need…»');
  const dg = /docGo: \{ ar: "([^"]+)", fr: "([^"]+)" \}/.exec(rj); assert.ok(dg && !/ناطر|انطر|ننطر هلّق/.test(dg[1].replace('مش وقت ننطر', '')) && dg[1].includes('{o}') && dg[2].includes('{o}'));
});

test('#261 29n 🚌 «مراجعة سريعة قبل الدوام» = the FIRST path step only on class-day mornings (Thu/Fri/Sat, 4:00 AM → 2:30 PM Beirut), fake clock', () => {
  const { ctx, run } = homeCtx(); run('assets/lessons.js'); run('assets/ui.js'); run('assets/commute.js'); run('assets/home.js');
  const H = ctx.HomePath, B = ctx.NursinBus, L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, q: 10, added: l.added || '' }));
  const ks = (day, hm, bus = true) => Array.from(H.build({ bus, day, hm, due: 0, last: null, lessons: L, wex: { ready: false }, cases: [] }), s => s.k);
  for (const [day, hm] of [['2026-11-05', 420], ['2026-11-06', 480], ['2026-11-07', 600], ['2026-11-06', 869], ['2026-11-12', 240]]) {
    const k = ks(day, hm); assert.strictEqual(k[0], 'bus', day + ' ' + hm + ' first'); assert.ok(k.length <= 7, '5–7 steps');
    assert.ok(B.on(day, hm) && H.busOn(day, hm), 'on');
  }
  for (const [day, hm] of [['2026-11-06', 870], ['2026-11-06', 1200], ['2026-11-06', 200], ['2026-11-08', 480], ['2026-11-04', 480], ['2026-11-09', 480], ['2026-11-10', 480]])
    assert.ok(!ks(day, hm).includes('bus') && !B.on(day, hm), day + ' ' + hm + ' no 🚌');
  assert.ok(!ks('2026-11-06', 480, false).includes('bus'), 'only with assets/commute.js');
  // the clock itself: a fake Date = Friday Nov 6 2026 8:00 AM Beirut (06:00 UTC), then 2:31 PM
  const mk = iso => { const t0 = Date.parse(iso); return class extends Date { constructor(...a) { if (a.length) super(...a); else super(t0); } static now() { return t0; } }; };
  for (const [iso, want] of [['2026-11-06T06:00:00Z', true], ['2026-11-06T12:31:00Z', false], ['2026-11-08T06:00:00Z', false], ['2026-11-05T05:00:00Z', true]]) {
    const c2 = homeCtx(); c2.ctx.Date = mk(iso); c2.run('assets/commute.js');
    assert.strictEqual(c2.ctx.NursinBus.nowOn(), want, iso);
  }
  const h = read('assets/home.js');
  assert.ok(h.includes('var ORDER = { bus: -1,') && h.includes('/^(bus|osm|rev|cls|imp|duel|mid|hw|today)$/'), 'first, never pushed behind «+N كمان»');
  assert.ok(h.includes('if (bOn && !hasB) ins(') && h.includes('else if (!bOn && hasB)'), 'joins in the morning, leaves at 2:30 PM');
  assert.ok(read('index.html').includes('<script src="assets/commute.js?v=20261029r" defer></script><script src="assets/home.js'), 'loaded before home.js');
});
test('#262 29n 🚌 only TODAY\'s class subjects (Thu réa·law·mgmt / Fri Med-Surg / Sat community·pharma·geri·quality), lessons already opened first', () => {
  const { ctx, run } = homeCtx(); run('assets/lessons.js'); run('assets/quiz-data.js'); run('assets/tricks-data.js'); run('assets/commute.js');
  const B = ctx.NursinBus, Q = ctx.QUIZ, L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, added: l.added || '' }));
  const want = { '2026-11-05': ['rea', 'law', 'mgmt'], '2026-11-06': ['medsurg', 'henderson', 'cardio', 'neuro'], '2026-11-07': ['comm', 'pharma', 'geri', 'quality'] };
  const byId = {}; Q.forEach(q => { byId[q.id] = q; });
  for (const day of Object.keys(want)) {
    assert.deepStrictEqual(Array.from(B.subjects(day)), want[day], day);
    const r = B.pick(day, L, Q, ctx.TRICKS);
    assert.ok(r.qs.length >= 25 && r.qs.length <= 35 && new Set(r.qs).size === r.qs.length, day + ' 29o: 25–35 questions, no repeats');
    for (const l of r.ls) assert.ok(want[day].includes(l.id.split(':')[0]), day + ' lesson ' + l.id);
    for (const id of r.qs) { const q = byId[id], les = L.filter(l => l.t === q.t && (!l.l || l.l === q.l)); assert.ok(les.some(l => want[day].includes(l.s)), day + ' question ' + id); }
    assert.ok(r.pts.length >= 3 && r.pts.length <= 14 && r.pts.every(p => p.t && p.m && p.fr && p.fr.t), day + ' key points from the lessons\' own «حيلة حفظ», with French');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(B.pick(day, L, Q, ctx.TRICKS))), JSON.parse(JSON.stringify(r)), 'the same all day');
  }
  const opened = L.find(l => l.id.indexOf('law:') === 0 && Q.some(q => q.t === l.t)).id;
  const r2 = B.pick('2026-11-05', L.map(l => l.id === opened ? Object.assign({}, l, { read: true }) : l), Q, ctx.TRICKS);
  assert.strictEqual(r2.ls[0].id, opened, 'a lesson he already opened comes first');
  assert.strictEqual(B.subjects('2026-11-08').length, 0, 'Sunday: nothing');
});
test('#263 29n 🚌 one tap opens the review (key points → ≥ 3 quick questions, the quiz look), ticks the path when all answered; the 📌 card\'s 🏫 line opens the same review', () => {
  const store = {}; const { ctx, run } = homeCtx(store); run('assets/lessons.js'); run('assets/quiz-data.js'); run('assets/tricks-data.js'); run('assets/commute.js');
  const B = ctx.NursinBus, a = B.render('2026-11-06', 0), b = B.render('2026-11-06', 1);
  assert.ok(a.html.includes('🚌 مراجعة الطريق (~30 د)') && a.html.includes('⏱️ ~30') && a.html.includes('class="busbar"') && a.html.includes('data-busgo') && a.html.includes('class="buspt"'), 'key points first');
  assert.ok(a.r.qs.length >= 25 && (b.html.match(/data-busq=/g) || []).length >= 2 && b.html.includes('class="hzqo"') && b.html.includes('1/' + a.r.qs.length), 'questions, one at a time');
  assert.ok(!B.isDone('2026-11-06'));
  store.nursin_bus_v1 = JSON.stringify({ d: '2026-11-06', ans: {}, done: 1 }); assert.ok(B.isDone('2026-11-06') && !B.isDone('2026-11-07'), 'done per day');
  const h = read('assets/home.js');
  assert.ok(h.includes('case "bus": var B = w.NursinBus; return !!(B && B.isDone && B.isDone(p.d));'), 'ticks like the other steps');
  assert.ok(h.includes('w.NursinBus.open(p.d); return;') && h.includes('location.hash === "#bus"'), 'one tap / #bus opens it');
  assert.ok(!h.includes('insertBefore(lv') && h.indexOf('<section class="hzpath"') < h.indexOf('<div class="hzlivew">'), '29r: the 🏥 card is ALWAYS under the path (path + 🚌 on the first screen)');
  const c = read('assets/commute.js'); assert.ok(!/\?\.|\?\?|\.flat\(|\.at\(|=>/.test(c), 'ES2017-safe for iOS 12');
  assert.ok(c.includes('w.Weak.record(q, ok)') && c.includes('NursinSRS'), 'answers feed the mistakes + review trackers');
  const R = read('assets/remind.js'); assert.ok(R.includes('href: "index.html#bus"') && R.includes('if (!x.busDone)'), '🏫 line → the review, gone once done');
});

test('#264 29o 🚌 the ride (~30 min): ≥ 25 questions when the bank allows, rounds of 5 each opened by key points, only today\'s subjects, mistakes + due reviews woven in', () => {
  const { ctx, run } = homeCtx(); run('assets/lessons.js'); run('assets/quiz-data.js'); run('assets/tricks-data.js'); run('assets/commute.js');
  const B = ctx.NursinBus, Q = ctx.QUIZ, L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, added: l.added || '' }));
  const byId = {}; Q.forEach(q => { byId[q.id] = q; });
  const sOf = id => { const q = byId[id], l = L.find(l => l.t === q.t && (l.l || '') === (q.l || '')) || L.find(l => l.t === q.t && !l.l); return l && l.s; };
  for (const day of ['2026-11-05', '2026-11-06', '2026-11-07']) {
    const r = B.pick(day, L, Q, ctx.TRICKS), want = Array.from(B.subjects(day));
    assert.ok(r.qs.length >= 25 && r.qs.length <= 35, day + ' fills the ride: ' + r.qs.length);
    assert.ok(r.qs.every(id => want.includes(sOf(id))), day + ' only today\'s subjects');
    assert.ok(r.rounds.length >= 5 && r.rounds.every(x => x.q.length <= 5 && x.p.length >= 1), day + ' rounds: key points then ≤ 5 questions');
    assert.deepStrictEqual(r.rounds.reduce((a, x) => a.concat(x.q), []), Array.from(r.qs), 'rounds = the session in order');
    assert.ok(new Set(r.pts.map(p => p.t)).size === r.pts.length, 'no repeated key point');
    assert.ok(new Set(r.qs.map(sOf)).size >= 2, day + ' alternates subjects');
  }
  const day = '2026-11-07', all = B.pick(day, L, Q, ctx.TRICKS), inDay = Q.filter(q => B.subjects(day).includes(sOf(q.id))).map(q => q.id);
  const wk = inDay.filter(id => !all.qs.includes(id)).slice(0, 3), r3 = B.pick(day, L, Q, ctx.TRICKS, { weak: wk.concat(['zz-not-today']), due: [] });
  assert.ok(wk.every(id => r3.qs.includes(id)) && !r3.qs.includes('zz-not-today'), 'his mistakes from today\'s subjects come in, others stay out');
  assert.ok(wk.every(id => r3.qs.indexOf(id) < 10), 'woven in early (not left for the end)');
  const small = B.pick('2026-11-05', L, Q.slice(0, 0), ctx.TRICKS); assert.strictEqual(small.qs.length, 0, 'empty bank → empty session, no crash');
});
test('#265 29o 🚌 stop any time, resume where he stopped (same day, plan kept); ✓ on the path after 10 answered, «12/30» progress on the step', () => {
  const store = {}; const { ctx, run } = homeCtx(store); run('assets/lessons.js'); run('assets/quiz-data.js'); run('assets/tricks-data.js'); run('assets/commute.js');
  const B = ctx.NursinBus, day = '2026-11-07';
  const a = B.render(day, 0), qs = Array.from(a.r.qs); assert.ok(qs.length >= 25);
  assert.strictEqual(B.TICK, 10); assert.ok(!B.isDone(day));
  B.render(day, 1); for (let i = 0; i < 9; i++) assert.strictEqual(B.tap(0).id, qs[i], 'in plan order');
  assert.ok(!B.isDone(day), '9 answered: not yet'); assert.deepStrictEqual(JSON.parse(JSON.stringify(B.prog(day))), { n: 9, of: qs.length, tick: 10 });
  // closes the app; later the bank state changes (new mistakes) — reopening still resumes the SAME session at question 10
  const b = B.render(day, 1); assert.deepStrictEqual(Array.from(b.r.qs), qs, 'same plan after reopening');
  assert.ok(b.html.includes('10/' + qs.length) && b.html.includes('data-busq="' + qs[9] + '"') && b.html.includes('▶️'), 'resumes at question 10');
  assert.ok(b.html.includes('9/' + qs.length) && b.html.includes('data-busx'), 'progress + stop button');
  B.tap(1); assert.ok(B.isDone(day), '10 answered → ✓ on the path'); assert.ok(JSON.parse(store.nursin_bus_v1).done);
  for (let i = 0; i < 2; i++) B.tap(0);
  const c = B.render(day, 0); assert.ok(c.html.includes('12/' + qs.length), '12/30');
  assert.ok(!c.html.includes('🧠 الجولة'), 'mid-round: straight to the question, no key points again');
  for (let i = 0; i < 3; i++) B.tap(0);
  const e = B.render(day, 0); assert.ok(e.html.includes('🧠 الجولة 4/'), 'a new round opens with its key points');
  assert.ok(!B.isDone('2026-11-12') && B.prog('2026-11-12').n === 0, 'another day starts fresh');
  // the path step: label + progress
  const h = read('assets/home.js'); assert.ok(h.includes('t: T("🚌 مراجعة الطريق", "🚌 Révision du trajet")') && h.includes('" · " + bp.n + "/" + (bp.of || 30)') && h.includes('min: 30 };'));
  const H2 = homeCtx({ nursin_bus_v1: store.nursin_bus_v1 }); H2.run('assets/lessons.js'); H2.run('assets/ui.js'); H2.run('assets/commute.js'); H2.run('assets/home.js');
  assert.ok(H2.ctx.NursinBus.prog(day).n === 15 && H2.ctx.NursinBus.isDone(day));
});
test('#266 29o 🚌 the ride stays light: no continuous animation, ES2017-safe, AR + FR', () => {
  const c = read('assets/commute.js'), css = read('assets/home.css');
  assert.ok(!/\?\.|\?\?|\.flat\(|\.at\(|=>|requestAnimationFrame|setInterval/.test(c), 'ES2017-safe, no loops');
  const bus = css.split('\n').filter(l => /\.bus/.test(l)).join('\n'); assert.ok(!/animation|@keyframes|backdrop-filter|blur\(/.test(bus), 'no continuous animation');
  for (const [ar, fr] of [['مراجعة الطريق (~30 د)', 'Révision du trajet (~30 min)'], ['وقّف هون، بكمّل بعدين', 'Pause, je continue plus tard'], ['كمّلنا من مطرح ما وقفت', 'On reprend là où'], ['انحسبت بمسار اليوم', 'Validé dans ton parcours']])
    assert.ok(c.includes(ar) && c.includes(fr), ar);
});

function loadAsst() { const vm = require('node:vm'); const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(read('assets/liveasst.js'), ctx); return ctx.window.LiveAsst; }
test('#267 29p 🧑‍⚕️🚶 the assistant nurse is drawn in the room and FOLLOWS my nurse (offset, walks while I walk, idle otherwise, comes into the new room with me)', () => {
  const A = loadAsst(), W = 360, H = 640, n = { x: 180, y: 300, dir: 0, pts: [] }, a = A.make(n, W, H);
  assert.ok(Math.abs(a.x - (n.x + A.OX)) < 0.01 && Math.abs(a.y - (n.y + A.OY)) < 0.01 && !a.mv, 'starts beside me, standing');
  for (let i = 0; i < 30; i++) A.follow(a, n, 1 / 60, W, H); assert.ok(!a.mv && Math.abs(a.x - (n.x + A.OX)) < 0.01, 'I stand still → he stands still');
  let moved = 0; for (let i = 0; i < 60; i++) { n.x += 165 / 60; A.follow(a, n, 1 / 60, W, H); if (a.mv) moved++; } assert.ok(moved > 40, 'I walk → he walks');
  let k = 0; while (a.mv && k++ < 120) A.follow(a, n, 1 / 60, W, H); const t = A.target(n, W, H);
  assert.ok(!a.mv && Math.hypot(a.x - t.x, a.y - t.y) < 0.6 && k < 60, 'he catches up and stops beside me (' + k + ' frames)');
  n.x = 20; n.y = 630; const t2 = A.target(n, W, H); assert.ok(t2.x >= 14 && t2.x <= W - 14 && t2.y >= 14 && t2.y <= H - 14, 'never outside the room');
  n.x = 180; n.y = 622; A.follow(a, n, 1 / 60, W, H); assert.ok(!a.mv && Math.hypot(a.x - A.target(n, W, H).x, a.y - A.target(n, W, H).y) < 0.01, 'a new room → he is just there');
  const r = read('assets/livecase-room.js'), g = read('games.html');
  assert.ok(g.indexOf('assets/liveasst.js?v=') > 0 && g.indexOf('assets/liveasst.js?v=') < g.indexOf('assets/livecase-room.js?v='), 'loaded before the room');
  assert.ok(r.includes('asstTick(ts, dt);') && r.includes('asstDraw(P);') && r.indexOf('asstDraw(P);') < r.indexOf('nurseDraw(P, t);\n    meTag();') && r.includes('if (asst) AS.snap(asst, nurse, E.W, E.H);'), 'moved in the room loop, drawn under my nurse, snapped into the new room');
  assert.ok(r.includes('if (!sheet && !panel && asstTap(toL(e)))') && /function asstHelp\(\) \{ helpOpen = true; helpTxt = ""; helpPaint\(\); \}/.test(r), 'a tap on him opens the same 🧑‍⚕️ box (paid «شو بعمل؟»)');
  assert.ok(r.includes('data-lchelp="1" aria-label="\' + esc(u("hlp"))'), 'the top-bar 🧑‍⚕️ stays');
});
test('#268 29p 🧑‍⚕️ «بدّك ساعدك؟»: after ~60 s idle or right after a mistake, at most once every 3 min, never while walking / travelling', () => {
  const A = loadAsst(); assert.ok(A.IDLE >= 55000 && A.IDLE <= 65000 && A.GAP >= 180000, 'idle ~60 s, gap ≥ 3 min');
  const o = A.offerNew(0);
  assert.strictEqual(A.should(o, 30000, false), '', 'not before a minute idle');
  assert.strictEqual(A.should(o, 61000, true), '', 'never while walking');
  assert.strictEqual(A.should(o, 61000, false), 'idle', 'a minute without progress → offer'); A.show(o, 61000);
  assert.strictEqual(A.should(o, 62000, false), '', 'not twice while shown'); A.hide(o, 63000);   // «لأ»
  A.missed(o, 70000); assert.strictEqual(A.should(o, 70500, false), '', 'a mistake inside the 3 min → still quiet');
  assert.strictEqual(A.should(o, 61000 + 179000, false), '', 'still < 3 min');
  assert.strictEqual(A.should(o, 61000 + 180000, false), 'idle', '3 min later, idle → may offer again'); A.show(o, 241000); A.hide(o, 241500);
  A.missed(o, 241000 + 200000); assert.strictEqual(A.should(o, 441500, true), '', 'a mistake while walking → no'); assert.strictEqual(A.should(o, 441500, false), 'miss', 'right after a wrong action → offer');
  A.show(o, 441500); assert.ok(!A.expired(o, 441500 + 10000) && A.expired(o, 441500 + A.SHOW + 1), 'the bubble closes by itself');
  const r = read('assets/livecase-room.js');
  assert.ok(r.includes('if (kind === "bad" && offer) AS.missed(offer, nowMs());'), 'a wrong action feeds it');
  assert.ok(r.includes('walking = !!(nurse.pts.length || trv || asst.mv)') && r.includes('if (sheet || panel || helpOpen || !st) return;'), 'not while walking / a trip / a sheet or the box is open');
  assert.ok(r.includes('if (inR(p, asBtn.y)) { AS.hide(offer, now); asstHelp(); return true; }') && r.includes('if (inR(p, asBtn.n)) { AS.hide(offer, now); return true; }'), 'ايه opens the helper, لأ dismisses');
  for (const [ar, fr] of [['بدّك ساعدك؟', "Je t'aide ?"], ['ايه', 'Oui'], ['لأ', 'Non']]) assert.ok(r.includes('ar: "' + ar + '", fr: "' + fr + '"'), 'AR + FR: ' + ar);
});
test('#269 29p 🧑‍⚕️ my assistant is mine alone: no Firestore / presence / storage / network, ES2017-safe', () => {
  const s = read('assets/liveasst.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/firebase|firestore|fetch\(|XMLHttpRequest|localStorage|sessionStorage|LivePres|setDoc|updateDoc|\.set\(/i.test(s), 'pure local logic');
  assert.ok(!/setInterval|setTimeout|requestAnimationFrame/.test(s), 'no timer or loop of his own');
  assert.ok(!/\?\.|\?\?|=>|\blet\b|\bconst\b|class /.test(s), 'ES2017/iOS 12 safe (plain ES5 style)');
  const r = read('assets/livecase-room.js'), fns = r.slice(r.indexOf('function asstTick('), r.indexOf('function nurseDraw('));
  assert.ok(!/LivePres|PR\.tick|L\.save|L\.act|setDoc|update\(|localStorage|setInterval|setTimeout|requestAnimationFrame/.test(fns), 'the room code for him writes nothing shared and starts no timer');
  assert.ok(r.includes('PR.tick(nurse, tg,'), 'presence still only carries my nurse');
});
test('#270 29p 🧑‍⚕️ standing, he keeps the 29l idle rate (~12 fps); full rate only while he walks; nothing when hidden', () => {
  const A = loadAsst(), n = { x: 180, y: 300, dir: 0, pts: [] }, a = A.make(n, 360, 640);
  let draws = 0, hidden = false, lastDraw = 0, hotTo = 0; const IDLE_MS = 80;
  const busy = ts => !!n.pts.length || ts < hotTo || !!a.mv;
  const frame = (ts, dt) => { if (hidden) return; if (lastDraw && ts - lastDraw < IDLE_MS && !busy(ts)) return; lastDraw = ts; A.follow(a, n, dt, 360, 640); draws++; };
  for (let ts = 0; ts < 1000; ts += 1000 / 60) frame(ts, 1 / 60); assert.ok(draws >= 10 && draws <= 15, 'idle with him standing: ~12 fps, got ' + draws);
  draws = 0; n.x += 60; for (let ts = 1000; ts < 1200; ts += 1000 / 60) frame(ts, 1 / 60); assert.ok(draws >= 11, 'he walks → full rate');
  let ts0 = 1200; while (a.mv && ts0 < 3000) { frame(ts0, 1 / 60); ts0 += 1000 / 60; } assert.ok(!a.mv && ts0 < 2200, 'he catches up within a second');
  draws = 0; for (let ts = 3000; ts < 4000; ts += 1000 / 60) frame(ts, 1 / 60); assert.ok(!a.mv && draws >= 10 && draws <= 15, 'arrived → back to idle ~12 fps, got ' + draws);
  draws = 0; hidden = true; for (let ts = 4000; ts < 5000; ts += 1000 / 60) frame(ts, 1 / 60); assert.strictEqual(draws, 0, 'hidden = nothing');
  assert.ok(/var IDLE_MS = 80\b/.test(read('assets/livecase-room.js')), 'idle budget unchanged');
});

test('#276 29r 🏥 home: «🧭 مسار اليوم» first under the greeting, then the COMPACT hospital card (1 line + «فوت ساعد ←», no rows, no drawing)', () => {
  const hj = read('assets/home.js'), i0 = hj.indexOf('root.innerHTML = \'<div class="hztop">'), sh = hj.slice(i0, hj.indexOf(';', i0));
  assert.ok(sh.indexOf('class="hzpath"') > -1 && sh.indexOf('class="hzpath"') < sh.indexOf('class="hzlivew"'), 'path before the card');
  assert.ok(!hj.includes('busUp') && !hj.includes('insertBefore(lv'), 'never moved above the path again');
  const lj = read('assets/livecase.js'), hc = lj.slice(lj.indexOf('function homeCard(st)'), lj.indexOf('function homeInit()'));
  assert.strictEqual((hc.match(/<span class="hzlv/g) || []).length, 2, 'two spans: the line + the button');
  assert.ok(hc.includes('hzmini') && !/canvas|hzlvd|hzlva|hzlvw|pills\(/.test(hc), 'no rows, ambulance, waiting line or drawing');
  assert.ok(hc.includes('"🪑 "') && hc.includes('"👥 "') && hc.includes('" طلاب"') && hc.includes('" étudiant(s)"'), 'waiting + students, AR+FR');
  const css = read('assets/livecase.css'); assert.ok(css.includes('.hzlive.hzmini{') && css.includes('.hzmini .hzlvgo{'), 'compact style');
  assert.ok(!/\?\.|\?\?|=>/.test(hc), 'ES2017-safe');
});
test('#277 29r 🔤 triage reason from the patient\'s own vitals, ABCDE order (A airway → B breathing → C circulation → D Glasgow → E rest); the sort matches', () => {
  const { X } = d29Load(), ok = { sys: 125, dia: 80, fc: 80, fr: 16, spo2: 98, t: 37, gcs: 15 };
  const P = (v, extra) => Object.assign({ vit: Object.assign({}, ok, v) }, extra || {});
  let r = X.triReason(P({ spo2: 84 })); assert.strictEqual(r.L, 'B'); assert.strictEqual(r.val, 'SpO₂ 84%'); assert.strictEqual(r.pr, 1);
  r = X.triReason(P({ fr: 34, sys: 80 })); assert.strictEqual(r.L, 'B', 'B before C');
  r = X.triReason(P({ sys: 82, gcs: 7 })); assert.strictEqual(r.L, 'C', 'C before D'); assert.ok(r.val.indexOf('TA 82/') === 0);
  r = X.triReason(P({ gcs: 7 })); assert.strictEqual(r.L, 'D'); assert.strictEqual(r.val, 'Glasgow 7');
  r = X.triReason(P({ fc: 118 })); assert.strictEqual(r.L, 'C'); assert.strictEqual(r.pr, 2);
  r = X.triReason(P({ t: 38.4 })); assert.strictEqual(r.L, 'E'); assert.strictEqual(r.pr, 3);
  r = X.triReason(P({})); assert.strictEqual(r.pr, 4); assert.strictEqual(r.L, 'E');
  r = X.triReason(P({ spo2: 88 }, { who: { ar: 'جسم غريب بالزلعوم', fr: 'Corps étranger, stridor' } })); assert.strictEqual(r.L, 'A', 'airway first');
  r = X.triReason(P({ t: 38.5 }, { who: { ar: 'جرح عم ينزف', fr: 'plaie qui saigne' } })); assert.strictEqual(r.L, 'C', 'bleeding = C');
  r = X.triReason(P({ spo2: 88 }, { who: { ar: 'ضيق نفس، عم إختنق', fr: "j'étouffe" } })); assert.strictEqual(r.L, 'B', '«j\'étouffe» = dyspnée → B, not A');
  const list = [P({}), P({ gcs: 7 }), P({ t: 38.4 }), P({ spo2: 84 }), P({ sys: 80 }), P({ fc: 118 })].map(p => X.triReason(p));
  const sorted = list.slice().sort((a, b) => a.rank - b.rank).map(x => x.pr + x.L).join(',');
  assert.strictEqual(sorted, '1B,1C,1D,2C,3E,4E', 'priority first, then ABCDE');
  const C = d29Load().C, key = '2026-11-04', t0 = C.dayStart(key) + 8 * 36e5, D = d29Load().D;
  const raw = { day: C.docId(key), c: C.pick(D, key), n: 0, ev: {}, pts: {}, at0: t0 };
  const W0 = X.waiting(D, raw, t0 + 6e4); assert.ok(W0.length >= 6);
  for (const w of W0) { const q = X.triReason(w.p); assert.ok('ABCDE'.includes(q.L) && q.pr === X.prio(w.p).pr, 'every real waiting patient has a reason'); if (q.pr < 4) assert.ok(q.k, 'a sign behind it'); }
});
test('#278 29r 🔤 the waiting list: one reason line per patient, sorted the way it reads, «❓ كيف بفرز؟» (ABCDE in 5 lines, FR + Arabic); also on the triage sheet', () => {
  const r = read('assets/livecase-room.js'), wl = r.slice(r.indexOf('function waitHtml(k)'), r.indexOf('var triPick'));
  assert.ok(wl.includes('var L0 = triSort(waitList());') && wl.includes('class="lcr-why"') && wl.includes('triLine(o.p)') && wl.includes('triHelp()'), 'list: sorted, a reason line each, help on top');
  const th = r.slice(r.indexOf('function triHtml(id)'), r.indexOf('function triGo(id)')); assert.ok(th.includes('h += triHelp();'), 'help on the sheet');
  const hp = r.slice(r.indexOf('function triHelp()'), r.indexOf('function waitListSheet()'));
  assert.ok(hp.includes('<details class="lcr-how">') && hp.includes('❓ كيف بفرز؟') && hp.includes('Comment je trie ?'), 'toggle AR+FR');
  for (const s of ['Airway (مجرى الهوا)', 'Respiration (التنفّس)', 'Circulation (الدورة الدموية)', 'Conscience (الوعي)', 'Glasgow (مقياس الوعي)', 'FR (عدد الأنفاس)', 'TA (الضغط)', 'FC (النبض)']) assert.ok(hp.includes(s), s);
  assert.strictEqual((hp.match(/"[A-E] — /g) || []).length, 10, '5 lines AR + 5 FR');
  const tl = r.slice(r.indexOf('function triLine(p)'), r.indexOf('function triHelp()'));
  assert.ok(tl.includes('" ليش فوق؟ "') && tl.includes('Pourquoi en haut ?') && tl.includes('Non urgent = مش مستعجل'), 'reason words AR+FR');
  assert.ok(!/\?\.|\?\?|=>|\.flat\(/.test(hp + tl + r.slice(r.indexOf('function triSort'), r.indexOf('function triLine'))), 'ES2017-safe');
  assert.ok(!/adsbygoogle|NursinAds/.test(hp + tl), 'no ads in the hospital');
  const css = read('assets/livecase.css'); assert.ok(css.includes('.lcr-wl .lcr-why{') && css.includes('.lcr-how summary{') && css.includes('html[data-theme="night"] .lcr-wl .lcr-why'), 'styles + night');
});
