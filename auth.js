// ── auth.js — Authentification Firebase ──

// 1. Configuration Firebase (Projet scolaire)
const firebaseConfig = {
  apiKey: "AIzaSyB-UtY84sUQP7u81DkaQWfNoOwzAg20994",
  authDomain: "planner-sakina-scolaire.firebaseapp.com",
  projectId: "planner-sakina-scolaire",
  storageBucket: "planner-sakina-scolaire.firebasestorage.app",
  messagingSenderId: "853795601825",
  appId: "1:853795601825:web:2708e52e9ffe1052e81fe0",
  measurementId: "G-QC29DTMB89"
};

// Initialisation
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// Page vers laquelle rediriger une fois connectée
const REDIRECT_URL = "planner-sakina-pro.html";

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

// ── Gestion de l'état du bouton ──
function setLoading(isLoading, submitBtn, defaultLabel) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Un instant…" : defaultLabel;
}

document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("authForm");
  const submitBtn = document.getElementById("submitBtn");

  if (authForm && submitBtn) {
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
            if (firstname) {
              return userCredential.user.updateProfile({ displayName: firstname });
            }
          })
          .then(() => {
            window.location.href = REDIRECT_URL;
          })
          .catch((error) => {
            setLoading(false, submitBtn, defaultLabel);
            alert(traduireErreur(error));
          });

      } else {
        // Connexion
        auth.signInWithEmailAndPassword(email, password)
          .then(() => {
            window.location.href = REDIRECT_URL;
          })
          .catch((error) => {
            setLoading(false, submitBtn, defaultLabel);
            alert(traduireErreur(error));
          });
      }
    });
  }

  // Redirection automatique si déjà connecté
  auth.onAuthStateChanged((user) => {
    if (user) {
      window.location.href = REDIRECT_URL;
    }
  });
});
