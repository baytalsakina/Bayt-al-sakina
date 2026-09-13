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

// 3. Après connexion réussie : accès libre et gratuit à tous les planners
//    pour n'importe quel compte, sans vérification d'achat.
function redirigerVersPlanner(user) {
  const all = Object.keys(PLANNERS);
  sessionStorage.setItem("plannersDisponibles", JSON.stringify(all));
  window.location.href = "choix.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("authForm");
  const submitBtn = document.getElementById("submitBtn");

  // ── Mot de passe oublié ──
  const forgotLink = document.getElementById("forgotLink");
  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      const email = authForm.elements["email"].value.trim();

      if (!email) {
        alert("Renseigne d'abord ton email dans le champ ci-dessus, puis reclique sur \"Mot de passe oublié ?\".");
        return;
      }

      auth.sendPasswordResetEmail(email)
        .then(() => {
          alert("Un email de réinitialisation vient de t'être envoyé à " + email + ". Vérifie aussi tes spams.");
        })
        .catch((error) => {
          alert(traduireErreur(error));
        });
    });
  }

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

      let createdUser = null;

      auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          createdUser = userCredential.user;
          if (firstname) {
            return userCredential.user.updateProfile({ displayName: firstname });
          }
        })
        .then(() => {
          setLoading(false, submitBtn, defaultLabel);
          redirigerVersPlanner(createdUser);
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
