import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, ADMIN_EMAILS } from './firebase-config.js';

// Enquanto o firebase-config.js não for preenchido, o app roda em "modo demonstração".
export const configurado = !String(firebaseConfig.apiKey || '').startsWith('COLE');

export const app = configurado ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export const isAdmin = (u) =>
  !!u && ADMIN_EMAILS.map((e) => String(e).toLowerCase().trim()).includes((u.email || '').toLowerCase());
