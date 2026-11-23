// Service worker: permite instalar o app e abrir mais rápido.
// Ao mudar arquivos do app, aumente a versão abaixo.
const VERSAO = 'vendas-v6';
const ARQUIVOS = [
  './', 'index.html', 'admin.html', 'css/style.css', 'js/loja.js', 'js/admin.js',
  'js/util.js', 'js/i18n.js', 'js/firebase.js', 'js/firebase-config.js', 'manifest.json', 'manifest-admin.json', 'icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Arquivos do próprio site: tenta a internet primeiro (pega sempre a versão nova),
// se estiver sem internet usa a cópia guardada. Firebase e outros sites passam direto.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copia = r.clone();
        caches.open(VERSAO).then((c) => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
