// nursin service worker: 🔔 notifications only (chat messages + 📢 news from admin.html). No fetch handler and no cache, so the site is always fresh from the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (x) { m = { body: e.data ? e.data.text() : "" }; }
  const c = String(m.c || ""), u = m.url ? String(m.url) : "";       // u: a news broadcast's page on this site
  e.waitUntil(self.registration.showNotification(String(m.title || (u ? "📢 Nursin" : "💬 رسالة جديدة")).slice(0, 80), {
    body: String(m.body || "").slice(0, 200), icon: "/assets/icon-192.png", badge: "/assets/badge-96.png",
    tag: u ? String(m.tag || "news").slice(0, 60) : "chat-" + c, renotify: true, dir: "rtl", lang: "ar", data: u ? { u } : { c }
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const dt = e.notification.data || {}, c = dt.c;
  let url = new URL(c ? "/chat.html?c=" + encodeURIComponent(c) : "/chat.html", self.location.origin).href;
  if (dt.u) { const n = new URL(dt.u, self.location.origin); url = n.origin === self.location.origin ? n.href : self.location.origin + "/"; }
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const same = all.find(w => w.url === url);
    if (same) return same.focus();
    const any = all.find(w => new URL(w.url).origin === self.location.origin);
    if (any && "navigate" in any) { try { await any.navigate(url); return any.focus(); } catch (x) {} }
    return self.clients.openWindow(url);
  })());
});
