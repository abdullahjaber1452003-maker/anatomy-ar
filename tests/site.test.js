const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const SITE = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');
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
    assert.strictEqual((h.match(/assets\/account\.js\?v=20261028b/g) || []).length, 1, p + ' account.js once with cache tag');
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
  assert.ok(h.indexOf('assets/gate3d.js?v=20261028b') > -1 && h.indexOf('assets/gate3d.js') < h.indexOf('assets/viewer.js'), 'gate runs before the viewer');
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
  assert.ok(h.indexOf('assets/quiz-data.js') < h.indexOf('assets/weak.js') && h.includes('assets/weak.js?v=20261028b'), 'quiz bank + weak points loaded');
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
  for (const p of pages.concat('admin.html')) assert.match(read(p), /<script src="assets\/announce\.js\?v=20261028b" defer><\/script>/, p);
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
  assert.ok(h.indexOf('assets/flow.js?v=20261028b') > -1 && h.indexOf('assets/flow.js') < h.indexOf('assets/viewer.js'), 'flow.js before the viewer on 3d.html');
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
  assert.ok(h.includes('🐢 السرعة') && h.includes('assets/flow.js?v=20261028b'), '3d.html mentions it, fresh cache tag');
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
    assert.equal((h.match(/<script src="assets\/pwa\.js\?v=20261028b" defer><\/script>/g) || []).length, 1, p + ' pwa.js once');
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
  assert.ok(read('index.html').includes('assets/pwa.js?v=20261028b'), 'fresh cache tag');
});

test('🧭 tidy navigation + 👋 welcome card (Oct 26): five groups, every page reachable, sign-in then notifications once per device, «بعدين» on each step, no ads inside', () => {
  const all = fs.readdirSync(SITE).filter(f => f.endsWith('.html'));
  for (const p of all) {
    const h = read(p);
    assert.equal((h.match(/<script src="assets\/nav\.js\?v=20261028b" defer><\/script>/g) || []).length, 1, p + ' nav.js once with cache tag');
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
  assert.ok(h.includes('id="homecont"') && !h.includes('class="card hg"') && read('hifzi.html').includes('details class="box warn hmist"'), 'home: continue, no group cards, tips on hifzi');
  const css = read('assets/style.css');
  const adx = css.indexOf('.adx{');
  assert.ok(css.indexOf('.gnav{position:fixed') > -1 && css.indexOf('.gnav{position:fixed') < adx && css.indexOf('.obx{position:fixed') < adx, 'new fixed elements before .adx');
});

test('⚖️ law lessons (Oct 26): lessons from a data list (his notes only), 4-grade table, licence conditions, «قريباً» placeholder, 10 law quiz questions, listed in nav/home/quiz/live/tutor/admin', () => {
  const h = read('law.html');
  assert.ok(h.includes('id="lawlessons"') && h.includes('data-practice="class"') && h.includes('data-practice="blanks" data-t="law"') && h.includes('quiz.html?t=law'));
  for (const s of ['law-data.js', 'blanks-data.js', 'law.js', 'practice.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261028b'), s);
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
  assert.strictEqual(law.length, 29); assert.deepStrictEqual(w.QGROUPS.law, ['law']);   // Oct 29: +8 l3 + 3 non-Lebanese assert.ok(w.QTOP.law);
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
  new Function('window', read('assets/quiz-data.js'))(w); assert.strictEqual(w.QUIZ.length, 356);   // Oct 30: +72 (gériatrie 40, santé communautaire 24, perfusion 8)
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
  assert.ok(pm > -1 && q.includes('id="pmode"') && q.includes('assets/practice.js?v=20261028b'));
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
    assert.ok(head.includes('<script src="assets/gate.js?v=20261028b"></script>'), p + ': gate.js in <head>, synchronous (locked before first paint)');
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
  for (const p of pages.concat(['admin.html', 'chat.html'])) assert.ok(read(p).includes('<script src="assets/goals.js?v=20261028b" defer></script>'), p + ' has goals.js');
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
  for (const s of ['mgmt-data.js', 'blanks-data.js', 'mgmt.js', 'practice.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261028b'), s);
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
    for (const s of [data, 'blanks-data.js', t + '.js', 'practice.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261028b'), page + ' ' + s);
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
    if (!['admin.html', 'chat.html', 'hifzi.html', 'me.html', 'notes.html', 'highlights.html'].includes(f)) assert.ok(h.includes('ca-pub-2554036492962277'), f + ' AdSense kept');   // Oct 29: no ads on حفظي / أنا
    assert.ok(h.includes('G-7MY0Z597WC'), f + ' GA4 kept');
  }
  for (const p of ['index.html', 'cardio.html', 'quiz.html']) assert.ok(/assets\/ads\.js\?v=20261028b/.test(read(p)), p + ' Adsterra loader kept, fresh tag');
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
  for (const s of ['quiz-data.js', 'pharma-data.js', 'games.js', 'study.js', 'account.js', 'nav.js']) assert.ok(g.includes('assets/' + s + '?v=20261028b'), 'games.html loads ' + s);
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
  const h = read('me.html'); assert.ok(h.includes('<section id="study"') && h.includes('assets/study.js?v=20261028b'), '👤 أنا: streak + timer + weekly card (Oct 29: moved from the home page)');
  for (const p of ['cardio.html', 'neuro.html', 'henderson.html', 'law.html', 'mgmt.html', 'quality.html', 'pharma.html', 'quiz.html']) assert.ok(read(p).includes('assets/study.js?v=20261028b'), p + ' loads study.js');
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
  for (const p of pages.concat(['admin.html', 'chat.html'])) { const h = read(p); assert.ok(/<script src="assets\/lessons\.js\?v=20261028b" defer><\/script>(<script src="assets\/hifz\.js\?v=20261028b" defer><\/script>)?(<script src="assets\/notes\.js\?v=20261028b" defer><\/script>(<script src="assets\/highlight\.js\?v=20261028b" defer><\/script>)?)?<script src="assets\/account\.js\?v=20261028b"/.test(h), p + ' loads lessons.js (+ hifz.js) before account.js'); }
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
  assert.ok(gh.includes('id="glv"') && gh.includes('data-g="fill"') && gh.includes('assets/blanks-data.js?v=20261028b'), 'level picker + 4th game');
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
  assert.ok(gh.includes('assets/games.js?v=20261028b') && gh.includes('assets/quiz-data.js?v=20261028b'), 'fresh cache tag');
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
  assert.ok(gh.includes('assets/games.js?v=20261028b') && gh.includes('assets/style.css?v=20261028b'), 'fresh cache tag');
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
  assert.ok(read('index.html').includes('assets/goals.js?v=20261028b'), 'fresh cache tag');
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
  assert.ok(gh.includes('data-g="er"') && gh.includes('ناوبة بالطوارئ') && gh.includes('assets/ersim-data.js?v=20261028b') && gh.indexOf('ersim-data.js') < gh.indexOf('assets/games.js'), 'card + data script before games.js');
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
  assert.ok(gh.includes('assets/ersim-scene.js?v=20261028b') && gh.indexOf('ersim-scene.js') < gh.indexOf('assets/games.js'), 'scene script before games.js');
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
  assert.ok(gh.includes('assets/ersim-story.js?v=20261028b') && gh.indexOf('ersim-story.js') < gh.indexOf('ersim-scene.js') && gh.indexOf('ersim-scene.js') < gh.indexOf('assets/games.js'), 'story engine before the scene and games.js');
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
  for (const f of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) { const h = read(f); if (h.includes('assets/nav.js')) assert.ok(h.indexOf('assets/osman.js?v=20261028b') > -1 && h.indexOf('assets/osman.js') < h.indexOf('assets/nav.js'), f + ' loads osman.js before nav.js'); }
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
    const h = read(p), i = h.indexOf('<script src="assets/lang.js?v=20261028b"></script>');
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
  assert.ok(L.parts.filter(x => x.s === 'quality' && x.l === 'q2').length === 6 && L.list.length === 65, 'q2 → 6 parts; R.list (weekly exams) unchanged (+4 lessons Oct 29, +17 Oct 30)');
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
  assert.ok(at('osmhome') < at('duel') && at('duel') < at('prio') && at('prio') < at('priorev') && at('priorev') < at('wkles') && at('wkles') < at('tilehold'), 'Osman → tournament → priorities');
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
    const x = read(p), t = x.indexOf('<script src="assets/theme.js?v=20261028b"></script>');
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
  assert.strictEqual((q.match(/data-set="/g) || []).length, 30, 'all 29 quiz sets kept + 🚑 réa (Oct 29)');
  assert.ok(q.includes('data-pm="class" data-lesson="l1">⚖️ كويز متل الصف (القانون)') && q.includes('data-pm="blanks"'), 'other exercises kept, class quiz law-only');
  assert.ok(q.indexOf('id="quiz"') < q.indexOf('id="weak"'), 'the quiz before the weak-points panel');
  assert.ok(css.includes('html.gl-lock .qpick,html.gl-lock .qweak{display:none!important}'), 'still locked when signed out');
  // 🇫🇷 French for the new UI
  const ui = read('assets/fr/ui.js'); for (const s of ['Défi du jour', 'Reprendre le dernier cours', '🌙 Nuit', '✏️ Prix de la semaine', 'Choisis le type d\'exercice']) assert.ok(ui.includes(s), 'fr: ' + s);
});

test('🔁 مراجعة اليوم + ⚠️ الأخطاء الشائعة + 📝 كويز الصف + «درس اليوم» + 2 Adsterra units (Oct 28, 8:32–10:59 PM)', async () => {
  // 🔁 spaced repetition: wrong / «صعبة» → tomorrow; a right answer on a due review → 3, 7, 14 days, then out; early right answers change nothing
  const w = { QUIZ: [{ id: 'q001' }, { id: 'q002' }], Nursin: { dayKey: () => '2026-10-29' } }, store = {};
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  new Function('window', 'document', 'localStorage', 'CustomEvent', read('assets/srs.js'))(w, { dispatchEvent() {} }, ls, function () {});
  const S = w.NursinSRS, x = { items: {} };
  assert.deepStrictEqual(S.STEPS, [1, 3, 7, 14]);
  assert.strictEqual(S.step(x, 'q001', false, '2026-10-29', 1), 'again'); assert.strictEqual(x.items.q001.d, '2026-10-30');
  assert.strictEqual(S.step(x, 'q001', true, '2026-10-29', 2), 'early'); assert.strictEqual(x.items.q001.d, '2026-10-30');
  assert.strictEqual(S.step(x, 'q001', true, '2026-10-30', 3), 'next'); assert.strictEqual(x.items.q001.d, '2026-11-02');
  assert.strictEqual(S.step(x, 'q001', true, '2026-11-02', 4), 'next'); assert.strictEqual(x.items.q001.d, '2026-11-09');
  assert.strictEqual(S.step(x, 'q001', false, '2026-11-09', 5), 'again'); assert.strictEqual(x.items.q001.s, 0); assert.strictEqual(x.items.q001.d, '2026-11-10');
  for (const [dd, nx] of [['2026-11-10', '2026-11-13'], ['2026-11-13', '2026-11-20'], ['2026-11-20', '2026-12-04']]) { S.step(x, 'q001', true, dd, 6); assert.strictEqual(x.items.q001.d, nx); }
  assert.strictEqual(S.step(x, 'q001', true, '2026-12-04', 7), 'done'); assert.ok(!x.items.q001, 'after the 14-day step it leaves');
  assert.strictEqual(S.step(x, 'q002', true, '2026-10-29', 1), 'none', 'a right answer on a new question adds nothing');
  assert.strictEqual(S.hard({ id: 'q002' }), 'again'); assert.ok(S.has('q002') && S.count() === 0, '«صعبة» = due tomorrow, not today');
  assert.strictEqual(S.record({ id: 'zzz' }, false), 'none', 'only quiz-bank ids');
  const qj = read('assets/quiz.js');
  assert.ok(qj.includes("if(sel==='review')return S?S.questions():[];") && qj.includes("S.record(q,ok)") && qj.includes('id=\"srhard\"') && qj.includes("new CustomEvent('nursin:answer'"), 'quiz: review pool, record, «صعبة», answer event');
  const h = read('index.html'), q = read('quiz.html');
  const hz = read('assets/hifz.js');
  assert.ok(h.includes('id="priorev"') && hz.includes('href="quiz.html?t=review"') && hz.includes('S.count()'), 'home «📌 الأهمّيات»: 🔁 مراجعة اليوم with the due count (Oct 29)');
  assert.ok(q.includes('id="qrev"') && q.indexOf('assets/srs.js?v=20261028b') < q.indexOf('assets/quiz.js?v=20261028b') && h.includes('assets/srs.js?v=20261028b'), 'quiz button + srs.js loaded');
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
  for (const s of ['rea-data.js', 'rea.js', 'quiz-data.js']) assert.ok(h.includes('assets/' + s + '?v=20261028b'), s);
  assert.ok(read('index.html').includes('href="rea.html"'), 'linked from the home subject list');
  const w = {}; new Function('window', read('assets/rea-data.js'))(w);
  const r1 = w.REA.lessons[0]; assert.strictEqual(r1.k, 'r1'); assert.ok(r1.n.includes('ABG'));
  for (const s of ['7.35', 'ROME', 'Allen', 'PaCO', 'HCO']) assert.ok(r1.html.includes(s), s);
  const q = {}; new Function('window', read('assets/quiz-data.js'))(q);
  const set = (t, l) => q.QUIZ.filter(x => x.t === t && (!l || x.l === l));
  const rea = set('rea'); assert.ok(rea.length >= 10 && rea.length <= 14, 'about 12 réa questions');
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
    assert.ok(h.includes('<script src="assets/lessons.js?v=20261028b" defer></script><script src="assets/hifz.js?v=20261028b" defer></script>'), f);
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
  assert.ok(main.indexOf('id="osmhome"') < main.indexOf('id="duel"') && main.indexOf('id="duel"') < main.indexOf('id="prio"'), 'order');
  assert.ok(co.includes('هلّق اعمل هيدا') && co.includes('osmgo') && co.includes('▶️ ابدأ'), 'one action + big start');
  for (const id of ['osmhome', 'duel', 'prio', 'priorev', 'wkles']) assert.equal((h.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id + ' once');
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
    const h = read(p); assert.ok(h.includes('assets/cards.js?v=20261028b') && h.includes('assets/srs.js?v=20261028b'), p);
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
    assert.equal((s.match(/<script src="assets\/notes\.js\?v=20261028b" defer><\/script>/g) || []).length, 1, p + ' notes.js once');
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
  for (const [p, data, v, n, t] of [['geri.html', 'geri-data.js', 'GERI', 10, 'geri'], ['community.html', 'comm-data.js', 'COMM', 6, 'comm']]) {
    const h = read(p);
    for (const s of [data, 'subject.js', 'quiz-data.js', 'cards.js', 'srs.js', 'notes.js', 'hifz.js', 'lessons.js']) assert.ok(h.includes('assets/' + s + '?v=20261028b'), p + ' loads ' + s);
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
  for (const p of B2_LESSON_PAGES) { const h = read(p); assert.equal((h.match(/<script src="assets\/retain\.js\?v=20261028b" defer><\/script>/g) || []).length, 1, p); assert.ok(h.indexOf('assets/cards.js') < h.indexOf('assets/retain.js'), p + ' after cards.js'); }
  for (const p of ['index.html', 'hifzi.html', 'quiz.html']) assert.equal((read(p).match(/assets\/retain\.js\?v=20261028b/g) || []).length, 1, p);
  const q = read('quiz.html'); assert.ok(q.indexOf('assets/retain.js') < q.indexOf('assets/quiz.js'), 'retain before quiz.js');
  const r = read('assets/retain.js'); assert.ok(r.includes('var V = "20261028b"'), 'data files load with the same tag');
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
  const h = read('index.html'); assert.equal((h.match(/id="wexhome"/g) || []).length, 1, 'one compact home entry'); assert.ok(h.indexOf('id="wexhome"') > h.indexOf('id="prio"'), 'inside الأهمّيات');
  assert.ok(read('hifzi.html').includes('id="wexhifz"'), 'حفظي card');
  assert.ok(read('assets/retain.js').includes('T("جاهز", "Prêt")'), 'badge جاهز (fr Prêt)');
});
test('🎯 متأكد ولا محزّر؟: one tap before the answer shows, guessed-right = back in review + weak points like a wrong answer; never in exams / challenges / class quiz / live / tournament', () => {
  const { ctx, run } = retainCtx(); run('assets/retain.js'); const R = ctx.Retain;
  assert.ok(R.confOn({ sel: 'all' }) && R.confOn({ sel: 'mixed' }));
  for (const s of [{ exam: 'x' }, { challenge: 'c1' }, { cq: 'k' }, null]) assert.ok(!R.confOn(s), JSON.stringify(s));
  const qz = read('assets/quiz.js');
  assert.ok(qz.includes("var guessed=ok&&conf==='guess';") && qz.includes('S.hard(q);sr=\'guess\'') && qz.includes('W.record(q,false)'), 'guessed right → SRS again + weak');
  assert.ok(qz.includes('data-cf=""') && qz.includes("T2('تخطّي','Passer')"), 'optional skip');
  assert.ok(qz.includes('if(conf===undefined&&RT&&RT.confOn(state))return pick(k);'), 'scored modes answer at once, unchanged');
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
  const qz = read('assets/quiz.js'); assert.ok(qz.includes('RT.whyFor(q,conf===\'guess\')') && qz.includes('!s.timed'), 'quiz draws it, not in a timed exam');
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
  assert.ok(main.indexOf('id="hz"') > -1 && main.indexOf('id="hz"') < main.indexOf('id="osmhome"'), '#hz first in main, old cards kept under it');
  assert.ok(h.includes('<body class="home hz ui">') && h.includes('<link rel="stylesheet" href="assets/home.css?v=20261028b">') && h.includes('<script src="assets/home.js?v=20261028b" defer></script>'), 'home files with cache tag');
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
test('🧭 مسار اليوم: 3–5 steps from real data, the same all day (stored per Beirut day), ticks by itself, a first lesson + quiz for new students', () => {
  const { ctx, run, store } = homeCtx(); run('assets/lessons.js'); run('assets/ui.js'); run('assets/home.js');
  const H = ctx.HomePath, L = ctx.NLESSONS.list.map(l => ({ id: l.s + ':' + (l.l || l.t), s: l.s, t: l.t, l: l.l || '', n: l.n, href: l.href, score: null, read: false, q: 10 }));
  // brand new: first lesson that has a quiz + its quiz + one more
  const fresh = H.build({ day: '2026-10-31', due: 0, last: null, lessons: L, wex: { ready: false }, cases: [] });
  assert.ok(fresh.length >= 3 && fresh.length <= 5, 'count ' + fresh.length);
  assert.deepStrictEqual(Array.from(fresh, s => s.k).slice(0, 2), ['new', 'quiz'], 'first lesson, then its quiz');
  // a studying student
  const L2 = L.map(l => Object.assign({}, l, l.id === 'cardio:infarctus' ? { score: 82, read: true } : l.id === 'neuro:avc' ? { score: 22, read: true } : l.id === 'neuro:htic' ? { score: 55, read: true } : {}));
  const x = { day: '2026-10-31', due: 14, last: { id: 'cardio:infarctus', href: 'cardio.html#infarctus', name: 'القلب', part: '' }, lessons: L2, wex: { ready: true, done: false }, cases: ['neuro:htic', 'cardio:infarctus'] };
  const a = H.build(x), b = H.build(JSON.parse(JSON.stringify(x)));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), 'deterministic');
  assert.deepStrictEqual(Array.from(a, s => s.k), ['rev', 'cont', 'quiz', 'weak', 'wex'], 'reviews → continue → quiz → weakest → weekly bonus');
  assert.strictEqual(a[0].n, 10, 'at most 10 reviews a day'); assert.strictEqual(a[3].id, 'neuro:avc', 'the most faded lesson');
  assert.strictEqual(a[2].href, 'quiz.html?t=infarctus&n=10');
  const c = H.build(Object.assign({}, x, { due: 0, wex: { ready: false } }));
  assert.ok(c.some(s => s.k === 'case' && /^(neuro|cardio)\.html\?case=/.test(s.href)), 'a patient case when one exists for a studied lesson');
  // every step's link is a real page
  for (const s of a.concat(c, fresh)) { const f = s.href.split(/[?#]/)[0]; assert.ok(fs.existsSync(path.join(SITE, f)), s.href); }
  // stored once per day: same plan on reload even if the data moved; a new day builds a new one
  let due = 6; ctx.NursinSRS = { count: () => due }; ctx.Nursin = { dayKey: () => '2026-10-31' };
  const p1 = H.plan(); due = 40; const p2 = H.plan();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(p1.steps)), JSON.parse(JSON.stringify(p2.steps)), 'no reshuffle the same day');
  assert.ok(JSON.parse(store[H.KEY]).d === '2026-10-31');
  ctx.Nursin.dayKey = () => '2026-11-01'; assert.notStrictEqual(H.plan().d, '2026-10-31', 'a new day, a new path');
  // ticks: reviews counted down, lesson read / quiz answered after the plan was made, visited-and-back for the others
  const now = Date.now(), P = { d: '2026-11-01', at: now - 60000, done: {}, vis: {}, steps: [{ k: 'rev', base: 14, n: 10 }, { k: 'cont', id: 'cardio:infarctus' }, { k: 'quiz', id: 'cardio:infarctus' }, { k: 'case', id: 'neuro:htic' }, { k: 'wex' }] };
  due = 9; assert.ok(!H.isDone(P, 0)); due = 4; assert.ok(H.isDone(P, 0), '10 reviews done');
  store.nursin_ret_v1 = JSON.stringify({ L: { 'cardio:infarctus': { r: 80, t: now - 1000, rd: now - 1000, h: 2 } } });
  assert.ok(H.isDone(P, 1) && !H.isDone(P, 2), 'read ≠ quiz');
  store.nursin_ret_v1 = JSON.stringify({ L: { 'cardio:infarctus': { r: 85, t: now - 500, rd: now - 1000, h: 2 } } });
  assert.ok(H.isDone(P, 2), 'quiz answers on that lesson tick the quiz');
  assert.ok(!H.isDone(P, 3)); P.vis[3] = now - 30000; assert.ok(H.isDone(P, 3), 'opened and came back');
  ctx.Retain = { wstatus: () => ({ ready: true, done: true }) }; assert.ok(H.isDone(P, 4), 'weekly exam done');
  H.refreshDone(P); assert.strictEqual(Object.keys(P.done).length, 5, 'stays done');
  // texts: «خلصت X من Y • قرّبت تخلص 🔥» + celebration + «كمّل» on the current step
  const js = read('assets/home.js');
  assert.ok(js.includes('قرّبت تخلص 🔥') && js.includes('خلصت مسار اليوم') && js.includes('T("كمّل", "Continuer")') && js.includes('"▶ " + T("هلّق", "Maintenant")'));
});
test('📋 «الكل» lists every page of the site, every link resolves; subject chips go to the real subject pages', () => {
  const { ctx, run } = homeCtx(); run('assets/ui.js'); run('assets/home.js'); const H = ctx.HomePath;
  const hrefs = H.ALL.flatMap(g => Array.from(g.items, i => i[0]));
  const actions = ['#search', '#avatar', '#theme', '#lang', '#goals', '#online', '#cards', '#case', '#blank', '#teach', '#install', '#pen'];
  for (const x of hrefs) { if (x.charAt(0) === '#') { assert.ok(actions.includes(x), 'action ' + x); continue; } assert.ok(fs.existsSync(path.join(SITE, x.split(/[?#]/)[0])), x); }
  const pagesLinked = new Set(hrefs.filter(x => x.charAt(0) !== '#').map(x => x.split(/[?#]/)[0]));
  for (const p of fs.readdirSync(SITE).filter(f => f.endsWith('.html') && !['404.html', 'admin.html', 'index.html'].includes(f))) assert.ok(pagesLinked.has(p), p + ' reachable from «الكل»');
  assert.deepStrictEqual(Array.from(H.ALL, g => g.k), ['learn', 'train', 'friends', 'tools']);
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
  assert.strictEqual(pages.length, 30, 'no page lost: ' + pages.join(' '));
  const { ctx, run } = homeCtx(); run('assets/ui.js'); const U = ctx.NursinUI;
  assert.deepStrictEqual(Object.keys(U.PAGES).sort(), pages, 'the shell knows every page (title + nav tab)');
  for (const p of pages) {
    const h = read(p), i = U.info(p);
    assert.ok(/<body class="([^"]* )?ui( [^"]*)?">/.test(h), p + ': body.ui');
    const css = h.indexOf('<link rel="stylesheet" href="assets/ui.css?v=20261028b">'), st = h.indexOf('assets/style.css?v=20261028b');
    assert.ok(css > st && st > -1, p + ': ui.css after style.css');
    if (h.includes('assets/tutor.css')) assert.ok(css > h.indexOf('assets/tutor.css'), p + ': after the page css');
    if (h.includes('assets/home.css')) assert.ok(css < h.indexOf('assets/home.css'), p + ': before home.css');
    const js = h.indexOf('<script src="assets/ui.js?v=20261028b" defer></script>');
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
  assert.ok(uj.includes('if (g.k === "tools" && owner()) items = items.concat([ADMIN]);') && uj.includes('var ADMIN = ["admin" + ".html"'), 'admin for the owner only');
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
    assert.strictEqual((h.match(/<script src="assets\/highlight\.js\?v=20261028b" defer><\/script>/g) || []).length, 1, p + ' highlight.js once');
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
  const tools = U.ALL.find(g => g.k === 'tools').items.map(x => x[0]);
  assert.ok(tools.indexOf('highlights.html') === tools.indexOf('notes.html') + 1, 'under أدواتي, after ملاحظاتي');
  assert.strictEqual(U.info('highlights.html').ar, 'تعليماتي');
  for (const p of fs.readdirSync(SITE).filter(f => f.endsWith('.html'))) if (read(p).includes('<nav id="nav"')) assert.ok(read(p).includes('<li><a href="highlights.html"><span aria-hidden="true">🖍️</span> <bdi>تعليماتي</bdi>'), p + ' ☰');
  assert.ok(read('assets/me.js').includes('r("highlights.html", "🖍️"') && read('hifzi.html').includes('href="highlights.html"'), '👤 أنا + 🗺️ حفظي');
  assert.ok(read('assets/account.js').includes("page==='highlights.html'"), 'Firebase loads there (sync + sign-in)');
  assert.ok(read('assets/lang.js').includes('highlights: 1') && fs.existsSync(path.join(SITE, 'assets/fr/p-highlights.js')), 'French page dictionary');
  const js = read('assets/highlight.js');
  for (const k of ['hlgrp', 'hlles', 'data-f=', 'hldel', 'hlempty', 'hlrev', '"?hl="', 'hlflash', 'users", uid, "highlights"']) assert.ok(js.includes(k), k);
});
