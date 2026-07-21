// ── auth.js — Authentification Firebase + redirection vers le(s) planner(s) ──

// 1. Configuration Firebase (projet planner-bayt-al-sakina-cbcf4)
const firebaseConfig = {
  apiKey: "AIzaSyBxZuaZjKcnIzxflfsH092OxUsF4Ly4Nss",
  authDomain: "planner-bayt-al-sakina-cbcf4.firebaseapp.com",
  projectId: "planner-bayt-al-sakina-cbcf4",
  storageBucket: "planner-bayt-al-sakina-cbcf4.firebasestorage.app",
  messagingSenderId: "197612914658",
  appId: "1:197612914658:web:304a5fe1e06db2383bdbbb",
  measurementId: "G-90TDC3EZ6V"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. Correspondance entre l'identifiant du planner (stocké dans Firestore)
//    et le fichier HTML réel vers lequel rediriger.
const PLANNERS = {
  "sakina-travail":      { url: "sakina-travail.html",      label: "Bayt Al Sakina — Travail" },
  "sakina-vie-scolaire": { url: "sakina-vie-scolaire.html", label: "Bayt Al Sakina — Vie Scolaire" },
  "bloom-pro":           { url: "bloom-pro.html",           label: "Bloom — Pro" },
  "bloom-etudes":        { url: "bloom-etudes.html",        label: "Bloom — Études" },
};

// ── Traduction des erreurs Firebase en messages clairs (FR) ──
function traduireErreur(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Cette adresse email n'est pas valide.";
    case "auth/user-not-found":
      return "Aucun compte n'existe avec cet email.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email ou mot de passe incorrect.";
    case "auth/email-already-in-use":
      return "Un compte existe déjà avec cet email.";
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères.";
    case "auth/missing-password":
      return "Merci de renseigner un mot de passe.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessaie dans quelques minutes.";
    case "auth/network-request-failed":
      return "Problème de connexion internet. Réessaie.";
    default:
      return "Une erreur est survenue. Réessaie.";
  }
}

// ── Petit état de chargement sur le bouton, le temps de la requête Firebase ──
function setLoading(isLoading, submitBtn, defaultLabel) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Un instant…" : defaultLabel;
}

// 2bis. Emails à accès gratuit et illimité (accès à tous les planners,
//       sans passer par Firestore ni par un achat).
const FREE_ACCESS_EMAILS = [
  "bouroubalyliaa@gmail.com",
  "lyliabourouba94@gmail.com",
];

// 3. Après connexion réussie : on va chercher la liste des planners
//    achetés par ce client dans Firestore (collection "users", champ "planners")
//    et on redirige en conséquence.
function redirigerVersPlanner(user) {
  const email = (user.email || "").toLowerCase();

  // Accès gratuit : on saute directement à la logique multi-planners
  // avec l'ensemble des planners existants, sans toucher Firestore.
  if (FREE_ACCESS_EMAILS.includes(email)) {
    const all = Object.keys(PLANNERS);
    sessionStorage.setItem("plannersDisponibles", JSON.stringify(all));
    window.location.href = "choix.html";
    return;
  }

  db.collection("users").doc(user.uid).get()
    .then((doc) => {
      const owned = (doc.exists && Array.isArray(doc.data().planners)) ? doc.data().planners : [];
      const valid = owned.filter((id) => PLANNERS[id]);

      if (valid.length === 1) {
        // Un seul planner acheté → redirection directe, pas de choix à faire
        window.location.href = PLANNERS[valid[0]].url;
      } else if (valid.length > 1) {
        // Plusieurs planners → on passe la liste à la page de choix via sessionStorage
        sessionStorage.setItem("plannersDisponibles", JSON.stringify(valid));
        window.location.href = "choix.html";
      } else {
        // Aucun planner associé au compte
        alert("Aucun planner n'est associé à ton compte pour le moment. Contacte le support si tu penses qu'il s'agit d'une erreur.");
        auth.signOut();
      }
    })
    .catch((error) => {
      console.error("Erreur de lecture Firestore :", error);
      alert("Impossible de vérifier ton accès aux planners. Réessaie dans un instant.");
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("authForm");
  const submitBtn = document.getElementById("submitBtn");

  authForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = authForm.elements["email"].value.trim();
    const password = authForm.elements["password"].value;
    const isSignup = document.body.classList.contains("signup-mode");
    const defaultLabel = submitBtn.textContent;

    setLoading(true, submitBtn, defaultLabel);

    if (isSignup) {
      // Inscription
      const firstname = authForm.elements["firstname"]
        ? authForm.elements["firstname"].value.trim()
        : "";

      auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const updates = [];
          if (firstname) {
            updates.push(userCredential.user.updateProfile({ displayName: firstname }));
          }
          // On crée le document Firestore du client (sans planner pour l'instant —
          // à toi de lui attribuer son planner après son achat, voir instructions).
          updates.push(
            db.collection("users").doc(userCredential.user.uid).set(
              { email, planners: [] },
              { merge: true }
            )
          );
          return Promise.all(updates);
        })
        .then(() => {
          setLoading(false, submitBtn, defaultLabel);
          alert("Compte créé ! Ton accès sera activé dès que ton planner sera associé à ton compte.");
        })
        .catch((error) => {
          setLoading(false, submitBtn, defaultLabel);
          alert(traduireErreur(error));
        });

    } else {
      // Connexion
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          redirigerVersPlanner(userCredential.user);
        })
        .catch((error) => {
          setLoading(false, submitBtn, defaultLabel);
          alert(traduireErreur(error));
        });
    }
  });

  // Si l'utilisateur est déjà connecté, on le redirige directement (sauf en plein signup)
  auth.onAuthStateChanged((user) => {
    if (user && !document.body.classList.contains("signup-mode")) {
      redirigerVersPlanner(user);
    }
  });
});
