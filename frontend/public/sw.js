// ponytail: خدمة تشغيل مبسطة وأصيلة لتلبية شروط الـ PWA وتوفير سرعة تحميل دون تعقيد
const CACHE_NAME = 'arwa-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

// تثبيت الـ Service Worker وحفظ الأصول الأساسية في الكاش
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('تم فتح الكاش وحفظ الأصول الأساسية.');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// تفعيل وتحديث الكاشات القديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('حذف الكاش القديم:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// استدعاء الطلبات والاعتماد على الكاش عند انقطاع الاتصال
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // ponytail: تجنب استخدام الكاش في بيئة التطوير المحلية لضمان عمل التحديث اللحظي (HMR)
  if (requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1') {
    return;
  }

  // ponytail: عدم كاش طلبات الـ API لضمان أن البيانات لحظية ومحدثة من قاعدة البيانات دائماً
  if (requestUrl.pathname.startsWith('/api/')) {
    return; // دع الطلب يمر عبر الشبكة بشكل طبيعي دون تدخل
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // التحقق من صحة الاستجابة قبل إضافتها للكاش
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // حفظ الصفحات الثابتة الجديدة في الكاش ديناميكياً
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // في حال انقطاع الشبكة تماماً
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
