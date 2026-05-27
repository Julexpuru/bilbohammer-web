self.addEventListener("push", function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {};
  }

  var title = data.title || "Bilbohammer";
  var options = {
    body: data.body || "Tienes una nueva notificacion.",
    icon: "/assets/img/favicon.png",
    badge: "/assets/img/favicon.png",
    tag: data.tag || data.url || "bilbohammer-notification",
    renotify: true,
    requireInteraction: Boolean(data.requireInteraction),
    silent: false,
    vibrate: Array.isArray(data.vibrate) ? data.vibrate : [120, 50, 120],
    timestamp: data.timestamp || Date.now(),
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var url = event.notification && event.notification.data ? event.notification.data.url || "/" : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i += 1) {
        var client = clients[i];
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
