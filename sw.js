const CACHE="ca-audit-202611201247";
const PAGES=["./","./map-creator/"];
const FILES=PAGES.concat(["./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./icons/apple-touch-180.png","./icons/favicon-48.png","./icons/favicon-32.png"]);
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:"reload"})))))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("ca-audit-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// each page is kept under its own address: network first, the saved copy when offline
const key=u=>{const p=new URL(u);p.search="";p.hash="";if(p.pathname.endsWith("/index.html"))p.pathname=p.pathname.slice(0,-10);return p.href;};
self.addEventListener("fetch",e=>{
 const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin)return;
 if(e.request.mode==="navigate"){const k=key(e.request.url);
  e.respondWith(fetch(e.request.url,{cache:"no-cache",credentials:"same-origin"}).then(r=>{if(!r.ok)throw r;const c=r.clone();caches.open(CACHE).then(ca=>ca.put(k,c));return r}).catch(()=>caches.match(k)));return}
 e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request)));
});
