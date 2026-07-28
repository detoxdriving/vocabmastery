/**
 * VocabMastery · Service Worker v7 (no-op)
 * 紧急策略:不再接管资源,所有 fetch 透传给浏览器,走原生 HTTP 缓存
 * 这样网页能正确通过 ?v= 时间戳拿最新代码
 */
self.addEventListener('install', function (event) {
  // 立刻 activate,不等待旧 SW 关闭
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // 清理所有旧缓存(包括 v5/v6 时代的)
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () {
      // 立即接管所有客户端
      return self.clients.claim();
    }).then(function () {
      // 给所有客户端发消息,告诉它们 reload
      return self.clients.matchAll({ includeUncontrolled: true }).then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: 'SW_NOOP_NOW_ACTIVE' });
        });
      });
    })
  );
});

// fetch 完全不拦截,直接走网络
self.addEventListener('fetch', function (event) {
  // 显式 return,让浏览器用默认 HTTP 缓存逻辑
  return;
});

// 收到客户端消息:跳过等待,立刻接管
self.addEventListener('message', function (event) {
  try {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  } catch (e) {}
});
