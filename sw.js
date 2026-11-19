const CACHE="ca-audit-202611200958";
const FILES=["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./icons/apple-touch-180.png","./icons/favicon-48.png","./icons/favicon-32.png"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:"reload"})))))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("ca-audit-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin)return;
 if(e.request.mode==="navigate"){
  e.respondWith(fetch(e.request.url,{cache:"no-cache",credentials:"same-origin"}).then(r=>{if(!r.ok)throw r;const c=r.clone();caches.open(CACHE).then(ca=>ca.put("./index.html",c));return r}).catch(()=>caches.match("./index.html")));return}
 e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request)));
});
