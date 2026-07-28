/**
 * VocabMastery · Service Worker
 * v6: 修复 Cache-First 导致 JS 缓存陈旧的问题
 * - JS/CSS/HTML:Network-First(始终拿最新,失败 fallback 缓存)
 * - 数据词库:Cache-First(词库改动少,加速加载)
 */
const CACHE_VERSION = 'vocabmastery-v6';

self.addEventListener('install', (event) => {
  // 立刻激活,不等旧 SW 处理未完成的请求
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 判断资源类型:JS/CSS/HTML 用 Network-First,数据用 Cache-First
function isCodeAsset(url) {
  return url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname === '/' ||
         url.pathname.endsWith('.html') ||
         url.pathname.endsWith('manifest.json');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== self.location.origin) return;

  // 导航请求:网络优先,失败回退 index.html 缓存
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // JS / CSS / HTML:Network-First(每次拉最新,断网才用缓存)
  if (isCodeAsset(url)) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request).then((c) => c || new Response('', { status: 504 })))
    );
    return;
  }

  // 数据词库/图片:Cache-First(改动少,加速)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        if (request.destination === 'image') {
          return new Response('', { status: 503 });
        }
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
