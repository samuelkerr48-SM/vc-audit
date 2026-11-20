# Builds the combined VC Curriculum Audit app (GitHub Pages, repo vc-audit):
#   index.html               VC Curriculum Audit
#   map-creator/index.html   Curriculum Area Map Creator (same app, same install, same offline worker)
# Usage: build_site.py <audit.html> <map-creator.html> <site folder>
import sys,time,os
audit,creator,site=sys.argv[1:4]
NAVCSS='<style>.toolnav{display:inline-flex;align-items:center;gap:6px;color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.55);border-radius:6px;padding:4px 10px;font-size:13px;font-weight:600;white-space:nowrap}.toolnav:hover{background:rgba(255,255,255,.12)}</style>\n'
def head(prefix):
    return f'''<link rel="manifest" href="{prefix}manifest.webmanifest">
<meta name="theme-color" content="#1F1646">
<link rel="icon" type="image/png" sizes="48x48" href="{prefix}icons/favicon-48.png">
<link rel="icon" type="image/png" sizes="32x32" href="{prefix}icons/favicon-32.png">
<link rel="apple-touch-icon" href="{prefix}icons/apple-touch-180.png">
'''+NAVCSS
def nav(href,label,title,before):
    # put a link to the other tool in the header, just before the given button (or at the end of the header row)
    return f'''<script>(function(){{function add(){{var r=document.querySelector('header.top .brandrow');if(!r||document.getElementById('toolnav'))return;var a=document.createElement('a');a.id='toolnav';a.className='toolnav';a.href='{href}';a.textContent='{label}';a.title='{title}';var b=document.getElementById('{before}');if(b&&b.parentNode)b.parentNode.insertBefore(a,b);else r.appendChild(a);}}if(document.readyState!=='loading')add();else document.addEventListener('DOMContentLoaded',add);}})();</script>
'''
def reg(sw,scope):return f'<script>if("serviceWorker" in navigator){{addEventListener("load",()=>navigator.serviceWorker.register("{sw}",{{scope:"{scope}"}}).catch(()=>{{}}));}}</script>\n'
def build(src,out,prefix,navhtml,swpath,scope,css=''):
    h=open(src,encoding='utf-8').read();i=h.index('</head>');h=h[:i]+head(prefix)+css+h[i:]
    j=h.rindex('</body>');h=h[:j]+navhtml+reg(swpath,scope)+h[j:]
    os.makedirs(os.path.dirname(out),exist_ok=True);open(out,'w',encoding='utf-8').write(h);return len(h)
AUD_CSS='<style>@media(max-width:1440px){header.top .brandrow .sub{display:none}}</style>\n'
a=build(audit,site+'/index.html','',nav('map-creator/','Create a map','Curriculum Area Map Creator: build a curriculum area map from your plans','setBtn'),'sw.js','./',AUD_CSS)
c=build(creator,site+'/map-creator/index.html','../',nav('../','← Audit','VC Curriculum Audit: audit plans and maps against the curriculum','helpBtn'),'../sw.js','../')
v=time.strftime('%Y%m%d%H%M')
sw='''const CACHE="ca-audit-%s";
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
'''%v
open(site+'/sw.js','w').write(sw)
print('ok',v,a//1024,'KB +',c//1024,'KB')
