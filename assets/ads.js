/* Adsterra banners (iframe sync), added Oct 2026.
   Each unit renders inside its own srcdoc iframe of its exact size, so every unit has its own
   atOptions set immediately before its own invoke script (no clash between units on one page).
   Only the unit that matches the viewport is created, so hidden units never load.
   A slot whose ad does not come back collapses, so no empty box stays on the page;
   an .adx-keep slot (result screens, mid-lesson) keeps its reserved size instead, so the page never jumps. */
(function () {
  var SIZE = {
    '735f5c76ee5abde951ff9d70e2263fab': [320, 50],
    'f0cd90c85278798fba5a155236050d61': [728, 90],
    '9892bba2f704f8ea66787de07f9f7be3': [300, 250]
  };
  var desktop = !!(window.matchMedia && window.matchMedia('(min-width: 769px)').matches);
  scan(document);
  // result screens are drawn later by JS: a new .adx slot is filled the moment it is added (Oct 25)
  if (window.MutationObserver) new MutationObserver(function () { scan(document); }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  window.NursinAds = { scan: scan };

  function scan(root) {
    var slots = root.querySelectorAll('.adx:not([data-adx])');
    for (var i = 0; i < slots.length; i++) { slots[i].setAttribute('data-adx', '1'); render(slots[i]); }
  }

  function render(slot) {
    var key = slot.getAttribute('data-key') || slot.getAttribute(desktop ? 'data-desktop' : 'data-mobile');
    var size = key && SIZE[key];
    if (!size) { slot.parentNode.removeChild(slot); return; }
    var w = size[0], h = size[1];
    var label = document.createElement('div');
    label.className = 'adx-lbl';
    label.textContent = 'إعلان';
    var f = document.createElement('iframe');
    f.width = w; f.height = h;
    f.title = 'إعلان';
    f.setAttribute('scrolling', 'no');
    f.setAttribute('frameborder', '0');
    f.setAttribute('loading', 'eager');
    f.style.width = w + 'px'; f.style.height = h + 'px';
    f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' +
      '<script>atOptions = {\'key\' : \'' + key + '\', \'format\' : \'iframe\', \'height\' : ' + h + ', \'width\' : ' + w + ', \'params\' : {}};<\/script>' +
      '<script src="https://bauval.org/22/' + key + '" onerror="window.__adxErr=1"><\/script>' +
      '</body></html>';
    slot.appendChild(label);
    slot.appendChild(f);
    slot.classList.add('adx-on');
    watch(slot, f);
  }

  function watch(slot, f) {
    var t0 = Date.now();
    var timer = setInterval(function () {
      var win, doc;
      try { win = f.contentWindow; doc = f.contentDocument; } catch (e) { clearInterval(timer); return; }
      var filled = doc && doc.body && doc.body.querySelector('iframe,img,a,ins,object,embed,canvas');
      if (filled) { slot.classList.add('adx-filled'); clearInterval(timer); return; }
      var waited = Date.now() - t0;
      if ((win && win.__adxErr && waited > 1500) || waited > 20000) {
        // .adx-keep (result screens, mid-lesson) keeps its reserved box so nothing jumps; others collapse
        slot.classList.add(slot.classList.contains('adx-keep') ? 'adx-empty' : 'adx-off');
        clearInterval(timer);
      }
    }, 500);
  }
})();
