// nursin service worker: 🔔 chat notifications only. No fetch handler and no cache, so the site is always fresh from the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (x) { m = { body: e.data ? e.data.text() : "" }; }
  const c = String(m.c || "");
  e.waitUntil(self.registration.showNotification(String(m.title || "💬 رسالة جديدة").slice(0, 80), {
    body: String(m.body || "").slice(0, 200), icon: "/assets/icon-192.png", badge: "/assets/badge-96.png",
    tag: "chat-" + c, renotify: true, dir: "rtl", lang: "ar", data: { c }
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const c = e.notification.data && e.notification.data.c, url = new URL(c ? "/chat.html?c=" + encodeURIComponent(c) : "/chat.html", self.location.origin).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const same = all.find(w => w.url === url);
    if (same) return same.focus();
    const any = all.find(w => new URL(w.url).origin === self.location.origin);
    if (any && "navigate" in any) { try { await any.navigate(url); return any.focus(); } catch (x) {} }
    return self.clients.openWindow(url);
  })());
});
