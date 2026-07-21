// ── auth.js — Authentification Firebase pour Bayt Al Sakina ──

// 1. Configuration Firebase (Projet Bayt Al Sakina)
const firebaseConfig = {
  apiKey: "AIzaSyAwjwbiDh3wUD2XI03oQ1ugVXKB2KhpssA",
  authDomain: "planner-bayt-al-sakina.firebaseapp.com",
  projectId: "planner-bayt-al-sakina",
  storageBucket: "planner-bayt-al-sakina.firebasestorage.app",
  messagingSenderId: "747387910210",
  appId: "1:747387910210:web:ab5abb054264c3eba915db",
  measurementId: "G-FF3Q4MDJ3Y"
};

// Initialisation de Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// Page vers laquelle rediriger une fois connectée
const REDIRECT_URL = "bayt-al-sakina-v3-2.html";

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

// ── Petit état de chargement sur le bouton ──
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
