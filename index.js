const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ⚠️ IMPORTANT : Gumroad envoie toujours le permalink INTERNE et FIXE du produit
// (assigné à sa création), jamais le permalink personnalisé qu'on voit/modifie
// dans l'interface. Ces codes ont été vérifiés un par un en conditions réelles
// (achat test → lecture du code exact dans les logs Cloud Function).
//
// Gamme Sakina
//   elqthw → Sakina Vie Scolaire
//   viobrc → Sakina Travail
//   xtvdzz → Bundle Sakina (débloque les deux)
// Gamme Bloom
//   jkgvw  → Bloom Pro
//   vfzkm  → Bloom Études
//   pksksl → Bundle Bloom (débloque les deux)
const BUNDLE_MAP = {
  "elqthw": ["sakina-vie-scolaire"],
  "viobrc": ["sakina-travail"],
  "xtvdzz": ["sakina-travail", "sakina-vie-scolaire"],
  "jkgvw": ["bloom-pro"],
  "vfzkm": ["bloom-etudes"],
  "pksksl": ["bloom-pro", "bloom-etudes"],
};

const PLANNERS_VALID = new Set(Object.keys(BUNDLE_MAP));

exports.gumroadWebhook = onRequest(
  { secrets: ["GUMROAD_ACCESS_TOKEN", "GUMROAD_SELLER_ID"] },
  async (req, res) => {
    try {
      const body = req.body || {};
      const saleId = body.sale_id;
      const sellerId = body.seller_id;

      if (!saleId) {
        return res.status(200).send("Pas de sale_id");
      }

      // Vérification 1 : le seller_id doit être le tien
      if (sellerId !== process.env.GUMROAD_SELLER_ID) {
        console.error("seller_id ne correspond pas à ton compte.");
        return res.status(401).send("Seller mismatch");
      }

      // Vérification 2 : on revérifie la vente directement auprès de l'API Gumroad
      // (empêche quelqu'un d'appeler cette URL avec de fausses données)
      const verifyRes = await fetch(
        `https://api.gumroad.com/v2/sales/${saleId}?access_token=${process.env.GUMROAD_ACCESS_TOKEN}`
      );
      const verifyData = await verifyRes.json();

      if (!verifyData.success || !verifyData.sale) {
        console.error("Vente introuvable ou invalide sur Gumroad.");
        return res.status(401).send("Sale not verified");
      }

      const sale = verifyData.sale;
      const permalink = sale.product_permalink || sale.permalink || "";
      const email = (sale.email || "").toLowerCase().trim();
      const isRefund = body.resource_name === "refund" || sale.refunded === true;

      if (!PLANNERS_VALID.has(permalink)) {
        console.error("Permalink Gumroad inconnu :", permalink);
        return res.status(200).send("Produit inconnu");
      }
      if (!email) {
        return res.status(200).send("Pas d'email");
      }

      const plannerIds = BUNDLE_MAP[permalink];

      let userRecord = null;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (e) {
        userRecord = null;
      }

      if (isRefund) {
        // ── Remboursement : on retire le(s) planner(s) ──
        if (userRecord) {
          await db.collection("users").doc(userRecord.uid).set(
            {
              planners: admin.firestore.FieldValue.arrayRemove(...plannerIds),
            },
            { merge: true }
          );
          console.log(`Planner(s) ${plannerIds.join(", ")} retiré(s) à ${email} (remboursement)`);
        } else {
          // Elle n'avait pas encore créé de compte : on nettoie l'achat en attente
          await db.collection("pendingPurchases").doc(email).set(
            { planners: admin.firestore.FieldValue.arrayRemove(...plannerIds) },
            { merge: true }
          );
          console.log(`Achat en attente nettoyé pour ${email} (remboursement)`);
        }
        return res.status(200).send("OK (remboursement traité)");
      }

      // ── Vente normale : on ajoute le(s) planner(s) ──
      if (userRecord) {
        await db.collection("users").doc(userRecord.uid).set(
          {
            email,
            planners: admin.firestore.FieldValue.arrayUnion(...plannerIds),
          },
          { merge: true }
        );
        console.log(`Planner(s) ${plannerIds.join(", ")} ajouté(s) à ${email}`);
      } else {
        await db.collection("pendingPurchases").doc(email).set(
          { planners: admin.firestore.FieldValue.arrayUnion(...plannerIds) },
          { merge: true }
        );
        console.log(`Achat en attente enregistré pour ${email}`);
      }

      return res.status(200).send("OK");
    } catch (err) {
      console.error("Erreur webhook Gumroad :", err);
      return res.status(500).send("Server error");
    }
  }
);

// ── Notifications planifiées (prières + tâches) ──
const { onSchedule } = require("firebase-functions/v2/scheduler");

// Messages envoyés pour chaque type de rappel
const NOTIF_MESSAGES = {
  fajr: { title: "🕌 Fajr", body: "C'est l'heure de la prière de Fajr." },
  dhuhr: { title: "🕌 Dhuhr", body: "C'est l'heure de la prière de Dhuhr." },
  asr: { title: "🕌 Asr", body: "C'est l'heure de la prière d'Asr." },
  maghrib: { title: "🕌 Maghrib", body: "C'est l'heure de la prière de Maghrib." },
  isha: { title: "🕌 Isha", body: "C'est l'heure de la prière d'Isha." },
  dailyReminder: { title: "🌸 Bayt Al Sakina", body: "N'oublie pas ton planner aujourd'hui." },
  tachesAllah: { title: "🤲 Un instant pour ton âme", body: "Le jour avance, et ton cœur t'appelle doucement vers ce que tu dois à Allah." },
  tachesPerso: { title: "🌸 Le temps qui passe", body: "N'oublie pas les petites tâches qui t'attendent — chaque pas compte, à ton rythme." },
  bilan: { title: "🌙 L'heure du bilan", body: "La journée se referme... prends un instant pour la relire avec un cœur reconnaissant." },
};

function currentTimeParis() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour").value;
  const m = parts.find((p) => p.type === "minute").value;
  return `${h}:${m}`;
}

function todayParis() {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

async function sendIfDue(token, times, sentDates, nowHM, today) {
  const updatedSentDates = { ...sentDates };
  let changed = false;

  for (const key of Object.keys(times)) {
    const scheduled = times[key];
    if (!scheduled) continue;
    if (scheduled !== nowHM) continue;
    if (updatedSentDates[key] === today) continue;

    const msg = NOTIF_MESSAGES[key];
    if (!msg) continue;

    try {
      await admin.messaging().send({
        token,
        notification: { title: msg.title, body: msg.body },
      });
      updatedSentDates[key] = today;
      changed = true;
      console.log(`Notification "${key}" envoyée`);
    } catch (e) {
      console.error(`Erreur envoi notification "${key}"`, e);
    }
  }
  return { updatedSentDates, changed };
}

exports.sendReminderNotifications = onSchedule(
  { schedule: "every 5 minutes", timeZone: "Europe/Paris" },
  async () => {
    const nowHM = currentTimeParis();
    const today = todayParis();

    // 1. Collection notifPrefs (page rattrapage-prieres)
    const prefsSnap = await db.collection("notifPrefs").get();
    for (const doc of prefsSnap.docs) {
      const data = doc.data();
      if (!data.fcmToken || !data.times) continue;
      const { updatedSentDates, changed } = await sendIfDue(
        data.fcmToken, data.times, data.sentDates || {}, nowHM, today
      );
      if (changed) {
        await doc.ref.set({ sentDates: updatedSentDates }, { merge: true });
      }
    }

    // 2. Sous-collections users/{uid}/data/notif_prefs (planners principaux)
    const dataSnap = await db.collectionGroup("data").get();
    for (const doc of dataSnap.docs) {
      if (doc.id !== "notif_prefs") continue;
      const raw = doc.data();
      if (!raw.value) continue;
      let parsed;
      try { parsed = JSON.parse(raw.value); } catch (e) { continue; }
      if (!parsed.fcmToken || !parsed.times) continue;

      const { updatedSentDates, changed } = await sendIfDue(
        parsed.fcmToken, parsed.times, parsed.sentDates || {}, nowHM, today
      );
      if (changed) {
        parsed.sentDates = updatedSentDates;
        await doc.ref.set(
          { value: JSON.stringify(parsed), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
    }
  }
);
