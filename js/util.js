// Funções usadas tanto na loja (clientes) quanto no painel (admin)

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export const euro = (v) =>
  (Number(v) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// tira acentos e deixa minúsculo (para busca e para ler cabeçalhos de planilha)
export const norm = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Aceita "12,90", "12.90", "€ 1.234,50", 12.9 ...
export function parsePreco(v) {
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  let s = String(v ?? '').replace(/[^\d,.-]/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

export const parseInteiro = (v) => {
  const n = parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10);
  return isNaN(n) || n < 0 ? 0 : n;
};

// Reduz a foto (tamanho e qualidade) para caber no plano gratuito do Firebase
export function comprimirImagem(file, max = 600, qualidade = 0.7) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * k), h = Math.round(img.height * k);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

export function toast(msg, tipo = '') {
  let box = document.getElementById('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    document.body.appendChild(box);
  }
  box.textContent = msg;
  box.className = 'mostrar ' + tipo;
  clearTimeout(box._t);
  box._t = setTimeout(() => (box.className = ''), 3000);
}

export const STATUS = {
  recebido: 'Recebido',
  separando: 'Separando',
  saiu: 'Saiu para entrega',
  pronto: 'Pronto para retirar',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

export function dataBR(ts) {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  return d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
}

export const soNumeros = (s) => String(s ?? '').replace(/\D/g, '');

export const linkWhats = (numero, texto = '') =>
  `https://wa.me/${soNumeros(numero)}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;

export function erroAuth(e) {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found'))
    return 'E-mail ou senha incorretos.';
  if (c.includes('email-already-in-use')) return 'Este e-mail já tem conta. Use "Entrar".';
  if (c.includes('weak-password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (c.includes('invalid-email')) return 'E-mail inválido.';
  if (c.includes('popup-closed')) return 'Login cancelado.';
  if (c.includes('too-many-requests')) return 'Muitas tentativas. Espere um pouco.';
  return 'Erro: ' + (e?.message || e);
}

export function registrarSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}

// Diz o que falta para a senha ser forte (lista vazia = senha ok)
export function problemasSenha(senha, minimo = 8, exigirSimbolo = false) {
  const s = String(senha || '');
  const falta = [];
  if (s.length < minimo) falta.push(`${minimo} caracteres`);
  if (!/[a-z]/.test(s)) falta.push('letra minúscula');
  if (!/[A-Z]/.test(s)) falta.push('letra maiúscula');
  if (!/\d/.test(s)) falta.push('número');
  if (exigirSimbolo && !/[^A-Za-z0-9]/.test(s)) falta.push('símbolo (ex.: ! @ # $)');
  return falta;
}

export function baixarArquivo(nome, conteudo, tipo = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo }));
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
