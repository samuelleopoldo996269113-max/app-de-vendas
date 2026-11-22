// ================================================================
//  CONFIGURAÇÃO DO FIREBASE
//  1. No console do Firebase: Configurações do projeto > Seus apps > Web (</>)
//  2. Copie os valores do "firebaseConfig" e cole aqui embaixo.
//  3. Em ADMIN_EMAILS coloque os e-mails que podem entrar no painel da loja.
//     (Os mesmos e-mails precisam estar no arquivo firestore.rules)
// ================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyBh_z9B-0ALKoH7hvwuuFRcB9hXeAbx5lc",
  authDomain: "loja-da-suelen-336b3.firebaseapp.com",
  projectId: "loja-da-suelen-336b3",
  storageBucket: "loja-da-suelen-336b3.firebasestorage.app",
  messagingSenderId: "245237975721",
  appId: "1:245237975721:web:d720880757c46f8b8837b8"
};

export const ADMIN_EMAILS = [
  "email.da.loja@exemplo.com"
];
