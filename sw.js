/* Nidra service worker: the app opens and works without internet once it has been opened online one time. */
const V="nidra-v1";
const SHELL=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png"];
const FONTS=["fonts.googleapis.com","fonts.gstatic.com"];

/* each file is saved on its own, so one missing icon can't stop the install */
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:"reload"})).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;
  const u=new URL(r.url);
  if(r.mode==="navigate"&&u.origin===location.origin)return page(e,r);
  if(u.origin===location.origin||FONTS.includes(u.hostname))return swr(e,r);
});

/* The app page: fresh from the network when it answers within 3 s, else the saved copy.
   A weak signal never leaves you on a blank screen, and a server error page never replaces the working app. */
function page(e,r){
  const key=new URL(r.url);key.search="";key.hash="";
  const net=fetch(r);
  e.waitUntil(net.then(res=>{if(res.ok&&res.type==="basic"&&!res.redirected){const cp=res.clone();return caches.open(V).then(c=>c.put(key.href,cp))}}).catch(()=>{}));
  const saved=async()=>{const c=await caches.open(V);return (await c.match(key.href))||(await c.match("./"))||(await c.match("index.html"))};
  e.respondWith((async()=>{
    try{
      const res=await Promise.race([net,new Promise((_,j)=>setTimeout(()=>j(new Error("slow")),3000))]);
      return res.status>=400?((await saved())||res):res;
    }catch(x){return (await saved())||net}
  })());
}
/* Icons, manifest and fonts: answer from the saved copy at once, refresh it in the background */
function swr(e,r){
  const net=fetch(r);
  e.waitUntil(net.then(res=>{if(res.ok||res.type==="opaque"){const cp=res.clone();return caches.open(V).then(c=>c.put(r,cp))}}).catch(()=>{}));
  e.respondWith(caches.match(r).then(hit=>hit||net.catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||Response.error()))));
}
