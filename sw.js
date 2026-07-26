/**
 * VocabMastery · Service Worker
 * 离线缓存策略:Cache-First(资源)+ Network-First(导航)
 */
const CACHE_VERSION = 'vocabmastery-v4';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // 数据词库
  '/data/junior.json',
  '/data/senior.json',
  '/data/college.json',
  '/data/ielts.json',
  '/data/collocations.json',
  '/data/reading.json',
  '/data/chuyi-shang.json',
  '/data/chuyi-xia.json',
  '/data/chuer-shang.json',
  '/data/chuer-xia.json',
  '/data/chusan-shang.json',
  '/data/chusan-xia.json',
  '/data/chuzhong-supplement.json',
  '/data/gaoyi-shang.json',
  '/data/gaoyi-xia.json',
  '/data/gaoer-shang.json',
  '/data/gaoer-xia.json',
  '/data/gaosan-shang.json',
  '/data/gaosan-xia.json',
  // JS 模块
  '/js/api-client.js',
  '/js/backend-sync.js',
  '/js/auth.js',
  '/js/login-view.js',
  '/js/word-detail-data.js',
  '/js/study-lists.js',
  '/js/study-lists-view.js',
  '/js/word-browser.js',
  '/js/storage.js',
  '/js/srs.js',
  '/js/wrong-book.js',
  '/js/recite-modes.js',
  '/js/test-modes.js',
  '/js/memory-palace.js',
  '/js/reading.js',
  '/js/feynman.js',
  '/js/collocations.js',
  '/js/stats.js',
  '/js/dashboard.js',
  '/js/app.js'
];

// 安装:预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[SW] 预缓存核心资源');
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 激活:清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== self.location.origin) return;

  // 导航请求:Network-First
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

  // 静态资源:Cache-First
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
        // 离线 fallback
        if (request.destination === 'image') {
          return new Response('', { status: 503 });
        }
      });
    })
  );
});

// 消息:跳过等待(用于热更新)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
