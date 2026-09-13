// firebase-messaging-sw.js — à placer À LA RACINE du repo (à côté de index.html)
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBxZuaZjKcnIzxflfsH092OxUsF4Ly4Nss",
  authDomain: "planner-bayt-al-sakina-cbcf4.firebaseapp.com",
  projectId: "planner-bayt-al-sakina-cbcf4",
  storageBucket: "planner-bayt-al-sakina-cbcf4.firebasestorage.app",
  messagingSenderId: "197612914658",
  appId: "1:197612914658:web:304a5fe1e06db2383bdbbb",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Bayt Al Sakina";
  const options = {
    body: payload.notification?.body || "",
    icon: "https://sakina648.gumroad.com/favicon.ico",
  };
  self.registration.showNotification(title, options);
});
