// ── auth.js — Authentification Firebase pour Bayt Al Sakina ──

// 1. Ta NOUVELLE configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBxZuaZjKcnIzxflfsH092OxUsF4Ly4Nss",
  authDomain: "planner-bayt-al-sakina-cbcf4.firebaseapp.com",
  projectId: "planner-bayt-al-sakina-cbcf4",
  storageBucket: "planner-bayt-al-sakina-cbcf4.firebasestorage.app",
  messagingSenderId: "197612914658",
  appId: "1:197612914658:web:304a5fe1e06db2383bdbbb",
  measurementId: "G-90TDC3EZ6V"
};

// Initialisation de Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// Page vers laquelle rediriger une fois connectée
const REDIRECT_URL = "bayt-al-sakina-v3-2.html";

// ── Traduction des erreurs ──
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
