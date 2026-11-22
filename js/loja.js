// ===================== LOJA (parte das clientes) =====================
import { auth, db, configurado } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection, onSnapshot, doc, getDoc, setDoc, addDoc, query, where, getDocs, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { $, $$, euro, esc, norm, toast, dataBR, linkWhats, erroAuth, registrarSW } from './util.js';
import { t, idioma, setIdioma, traduzirPagina, nomeProduto, descProduto } from './i18n.js';

// ---------- estado ----------
let produtos = [];
let carregado = false;
let categoria = '*'; // '*' = todas
let busca = '';
let usuario = null;
let perfil = null;
let loja = { nome: 'Loja', whatsapp: '', paypal: '', privacidade: '', privacidade_it: '' };
let depoisDoLogin = null; // ação para continuar depois de entrar
let carrinho = lerCarrinho(); // { idProduto: quantidade }

function lerCarrinho() {
  try { return JSON.parse(localStorage.getItem('carrinho') || '{}'); } catch { return {}; }
}
function salvarCarrinho() {
  try { localStorage.setItem('carrinho', JSON.stringify(carrinho)); } catch {}
  atualizarContador();
}

// ---------- idioma ----------
function aplicarIdioma() {
  traduzirPagina();
  $('#btn-idioma').textContent = idioma === 'it' ? '🇧🇷' : '🇮🇹';
  $('#btn-idioma').title = idioma === 'it' ? 'Português' : 'Italiano';
  atualizarBotaoConta();
  renderizar();
}
$('#btn-idioma').addEventListener('click', () => { setIdioma(idioma === 'it' ? 'pt' : 'it'); aplicarIdioma(); });

// ---------- janelas ----------
const abrir = (id) => { const d = $('#' + id); if (!d.open) d.showModal(); };
const fechar = (id) => $('#' + id).close();
$$('[data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

// ---------- produtos ----------
const PRODUTOS_DEMO = [
  { id: 'd1', nome: 'Perfume exemplo 100ml', nome_it: 'Profumo esempio 100ml', codigo: '0001', categoria: 'Perfumaria', preco: 49.9, estoque: 3, descricao: 'Produto de demonstração.', descricao_it: 'Prodotto dimostrativo.' },
  { id: 'd2', nome: 'Hidratante corporal exemplo', nome_it: 'Crema corpo esempio', codigo: '0002', categoria: 'Corpo e banho', preco: 18.5, estoque: 0, descricao: 'Produto de demonstração.' },
  { id: 'd3', nome: 'Batom exemplo', nome_it: 'Rossetto esempio', codigo: '0003', categoria: 'Maquiagem', preco: 12, estoque: 5, descricao: 'Produto de demonstração.' }
];

function iniciarProdutos() {
  if (!configurado) {
    $('#aviso-demo').hidden = false;
    produtos = PRODUTOS_DEMO;
    carregado = true;
    renderizar();
    return;
  }
  onSnapshot(collection(db, 'produtos'), (snap) => {
    produtos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.ativo !== false);
    carregado = true;
    renderizar();
    atualizarContador();
  }, (e) => {
    $('#grade').innerHTML = `<p class="vazio">${esc(t('erroProdutos'))}<br><small>${esc(e.message)}</small></p>`;
  });

  onSnapshot(doc(db, 'config', 'loja'), (d) => {
    if (d.exists()) loja = { ...loja, ...d.data() };
    $('#nome-loja').textContent = loja.nome || 'Loja';
    document.title = loja.nome || 'Loja';
    $('#op-paypal').hidden = !loja.paypal;
  });
}

function renderizar() {
  const cats = [...new Set(produtos.map((p) => p.categoria || 'Geral'))].sort((a, b) => a.localeCompare(b, 'pt'));
  $('#categorias').innerHTML = [['*', t('todas')], ...cats.map((c) => [c, c])]
    .map(([v, txt]) => `<button class="chip ${v === categoria ? 'ativo' : ''}" data-cat="${esc(v)}">${esc(txt)}</button>`)
    .join('');

  const termo = norm(busca);
  const lista = produtos
    .filter((p) =>
      (categoria === '*' || (p.categoria || 'Geral') === categoria) &&
      (!termo || norm(`${p.nome} ${p.nome_it} ${p.codigo} ${p.descricao} ${p.descricao_it} ${p.categoria}`).includes(termo)))
    .sort((a, b) => nomeProduto(a).localeCompare(nomeProduto(b), idioma));

  $('#grade').innerHTML = lista.length
    ? lista.map(cardProduto).join('')
    : `<p class="vazio">${esc(t(carregado ? 'nenhum' : 'carregando'))}</p>`;
}

const seloEstoque = (p) => (Number(p.estoque) > 0
  ? `<span class="selo pronta">${esc(t('pronta', { n: Number(p.estoque) }))}</span>`
  : `<span class="selo encomenda">${esc(t('encomenda'))}</span>`);

const fotoHTML = (p) => (p.foto ? `<img src="${esc(p.foto)}" alt="${esc(nomeProduto(p))}" loading="lazy">` : '<span>🧴</span>');

function cardProduto(p) {
  return `<article class="card">
    <div class="foto" data-ver="${esc(p.id)}">${fotoHTML(p)}</div>
    <div class="info">
      <h3>${esc(nomeProduto(p))}</h3>
      ${p.codigo ? `<small>${esc(t('cod'))} ${esc(p.codigo)}</small>` : ''}
      ${seloEstoque(p)}
      <div class="linha"><strong>${euro(p.preco)}</strong>
        <button class="btn peq" data-add="${esc(p.id)}">${esc(t('adicionar'))}</button></div>
    </div></article>`;
}

$('#categorias').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (b) { categoria = b.dataset.cat; renderizar(); }
});
$('#busca').addEventListener('input', (e) => { busca = e.target.value; renderizar(); });

$('#grade').addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) return adicionar(add.dataset.add);
  const ver = e.target.closest('[data-ver]');
  if (ver) verProduto(ver.dataset.ver);
});

function verProduto(id) {
  const p = produtos.find((x) => x.id === id);
  if (!p) return;
  $('#det-nome').textContent = nomeProduto(p);
  const desc = descProduto(p);
  $('#det-corpo').innerHTML = `
    ${p.foto ? `<img src="${esc(p.foto)}" alt="" style="border-radius:12px">` : ''}
    ${p.codigo ? `<small>${esc(t('codigo'))} ${esc(p.codigo)} · ${esc(p.categoria || 'Geral')}</small>` : ''}
    ${seloEstoque(p)}
    ${desc ? `<p style="white-space:pre-line;margin:0">${esc(desc)}</p>` : ''}
    <div class="total"><span>${euro(p.preco)}</span>
      <button class="btn" id="det-add">${esc(t('adicionarCarrinho'))}</button></div>`;
  $('#det-add').onclick = () => { adicionar(p.id); fechar('dlg-produto'); };
  abrir('dlg-produto');
}

// ---------- carrinho ----------
function adicionar(id) {
  carrinho[id] = (carrinho[id] || 0) + 1;
  salvarCarrinho();
  toast(t('adicionado'));
}

function itensCarrinho() {
  return Object.entries(carrinho)
    .map(([id, qtd]) => ({ p: produtos.find((x) => x.id === id), qtd }))
    .filter((i) => i.p && i.qtd > 0);
}

function atualizarContador() {
  const n = itensCarrinho().reduce((s, i) => s + i.qtd, 0);
  $('#contador').textContent = n || '';
}

function renderCarrinho() {
  const itens = itensCarrinho();
  $('#itens-carrinho').innerHTML = itens.length
    ? itens.map(({ p, qtd }) => `
      <div class="item-carrinho">
        ${p.foto ? `<img src="${esc(p.foto)}" alt="">` : '<div class="mini">🧴</div>'}
        <div class="nome">${esc(nomeProduto(p))}<br><small>${euro(p.preco)}</small></div>
        <div class="qtd">
          <button data-menos="${esc(p.id)}">−</button><b>${qtd}</b><button data-mais="${esc(p.id)}">+</button>
        </div>
      </div>`).join('')
    : `<p class="vazio">${esc(t('carrinhoVazio'))}</p>`;
  $('#total-carrinho').textContent = euro(totalCarrinho());
  $('#btn-finalizar').disabled = !itens.length;
}

const totalCarrinho = () => itensCarrinho().reduce((s, i) => s + i.qtd * Number(i.p.preco || 0), 0);

$('#itens-carrinho').addEventListener('click', (e) => {
  const mais = e.target.closest('[data-mais]');
  const menos = e.target.closest('[data-menos]');
  if (mais) carrinho[mais.dataset.mais]++;
  if (menos) {
    const id = menos.dataset.menos;
    carrinho[id]--;
    if (carrinho[id] <= 0) delete carrinho[id];
  }
  if (mais || menos) { salvarCarrinho(); renderCarrinho(); }
});

$('#btn-carrinho').addEventListener('click', () => { renderCarrinho(); abrir('dlg-carrinho'); });
$('#btn-finalizar').addEventListener('click', () => { fechar('dlg-carrinho'); irParaCheckout(); });

function irParaCheckout() {
  if (!configurado) return toast(t('demoPedido'), 'erro');
  if (!usuario) { depoisDoLogin = irParaCheckout; return abrir('dlg-login'); }
  if (!perfil) { depoisDoLogin = irParaCheckout; return abrirPerfil(); }
  abrirCheckout();
}

// ---------- login ----------
let acaoLogin = 'entrar';
$$('#form-login [data-acao]').forEach((b) => b.addEventListener('click', () => (acaoLogin = b.dataset.acao)));

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  const senha = $('#login-senha').value;
  $('#login-erro').textContent = '';
  try {
    if (acaoLogin === 'criar') await createUserWithEmailAndPassword(auth, email, senha);
    else await signInWithEmailAndPassword(auth, email, senha);
    fechar('dlg-login');
  } catch (err) { $('#login-erro').textContent = erroAuth(err); }
});

$('#btn-google').addEventListener('click', async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); fechar('dlg-login'); }
  catch (err) { $('#login-erro').textContent = erroAuth(err); }
});

$('#btn-esqueci').addEventListener('click', async () => {
  const email = $('#login-email').value.trim();
  if (!email) return ($('#login-erro').textContent = t('digiteEmail'));
  try { await sendPasswordResetEmail(auth, email); toast(t('emailReset')); }
  catch (err) { $('#login-erro').textContent = erroAuth(err); }
});

function atualizarBotaoConta() {
  $('#txt-conta').textContent = usuario
    ? (perfil?.nome || usuario.email || '').split(/[ @]/)[0] || t('conta')
    : t('entrar');
}

$('#btn-conta').addEventListener('click', () => {
  if (!configurado) return toast(t('demoPedido'), 'erro');
  if (!usuario) { depoisDoLogin = null; return abrir('dlg-login'); }
  $('#conta-titulo').textContent = perfil?.nome || usuario.email || t('minhaConta');
  abrir('dlg-conta');
});
$('#btn-sair').addEventListener('click', async () => { await signOut(auth); fechar('dlg-conta'); toast(t('saiu')); });
$('#btn-meus-dados').addEventListener('click', () => { fechar('dlg-conta'); depoisDoLogin = null; abrirPerfil(); });
$('#btn-meus-pedidos').addEventListener('click', () => { fechar('dlg-conta'); abrirPedidos(); });
$('#btn-ver-pedidos').addEventListener('click', () => { fechar('dlg-sucesso'); abrirPedidos(); });

function iniciarAuth() {
  if (!configurado) return;
  onAuthStateChanged(auth, async (u) => {
    usuario = u;
    perfil = null;
    if (u) {
      try {
        const d = await getDoc(doc(db, 'clientes', u.uid));
        if (d.exists()) perfil = d.data();
      } catch {}
      atualizarBotaoConta();
      if (depoisDoLogin) { const f = depoisDoLogin; depoisDoLogin = null; f(); }
    } else {
      atualizarBotaoConta();
    }
  });
}

// ---------- perfil ----------
function abrirPerfil() {
  const p = perfil || {};
  $('#pf-nome').value = p.nome || usuario?.displayName || '';
  $('#pf-whats').value = p.whatsapp || '';
  $('#pf-rua').value = p.endereco?.rua || '';
  $('#pf-cidade').value = p.endereco?.cidade || '';
  $('#pf-cap').value = p.endereco?.cap || '';
  $('#pf-comp').value = p.endereco?.complemento || '';
  $('#pf-priv').checked = !!p.privacidadeAceita;
  $('#pf-erro').textContent = '';
  abrir('dlg-perfil');
}

$('#form-perfil').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = {
    nome: $('#pf-nome').value.trim(),
    whatsapp: $('#pf-whats').value.trim(),
    email: usuario.email || '',
    endereco: {
      rua: $('#pf-rua').value.trim(),
      cidade: $('#pf-cidade').value.trim(),
      cap: $('#pf-cap').value.trim(),
      complemento: $('#pf-comp').value.trim()
    },
    idioma,
    privacidadeAceita: true,
    atualizadoEm: serverTimestamp()
  };
  if (!perfil) dados.criadoEm = serverTimestamp();
  try {
    await setDoc(doc(db, 'clientes', usuario.uid), dados, { merge: true });
    perfil = { ...perfil, ...dados };
    atualizarBotaoConta();
    fechar('dlg-perfil');
    toast(t('dadosSalvos'));
    if (depoisDoLogin) { const f = depoisDoLogin; depoisDoLogin = null; f(); }
  } catch (err) { $('#pf-erro').textContent = t('erroSalvar') + err.message; }
});

$('#btn-ver-priv').addEventListener('click', () => {
  const texto = (idioma === 'it' && loja.privacidade_it) || (idioma === 'pt' && loja.privacidade) || t('privacidade');
  $('#texto-priv').innerHTML = `<p style="white-space:pre-line;margin:0">${esc(texto)}</p>`;
  abrir('dlg-priv');
});

// ---------- checkout ----------
const enderecoTexto = (e = {}) =>
  [e.rua, [e.cap, e.cidade].filter(Boolean).join(' '), e.complemento].filter(Boolean).join('\n');

const valorRadio = (nome) => $(`#form-checkout [name=${nome}]:checked`).value;

function abrirCheckout() {
  $('#ck-endereco').value = enderecoTexto(perfil?.endereco);
  $('#ck-obs').value = '';
  $('#ck-erro').textContent = '';
  $('#form-checkout [name=entrega][value=entrega]').checked = true;
  $('#form-checkout [name=pagamento][value=dinheiro]').checked = true;
  atualizarCheckout();
  $('#ck-resumo').innerHTML = itensCarrinho()
    .map(({ p, qtd }) => `${qtd}× ${esc(nomeProduto(p))} — ${euro(qtd * p.preco)}`).join('<br>') +
    `<hr style="border:0;border-top:1px solid var(--borda)"><b>${esc(t('total'))}: ${euro(totalCarrinho())}</b>`;
  abrir('dlg-checkout');
}

function atualizarCheckout() {
  const entrega = valorRadio('entrega') === 'entrega';
  $('#campo-endereco').hidden = !entrega;
  $('#ck-endereco').required = entrega;
  $('#ck-pag-dica').textContent = valorRadio('pagamento') === 'paypal' ? t('pagPaypalDica') : t('pagDinheiroDica');
}
$$('#form-checkout [type=radio]').forEach((r) => r.addEventListener('change', atualizarCheckout));

function linkPaypal(valor) {
  const usuarioPP = String(loja.paypal || '').trim()
    .replace(/^https?:\/\/(www\.)?paypal\.me\//i, '').replace(/^@/, '').split('/')[0];
  return `https://www.paypal.me/${encodeURIComponent(usuarioPP)}/${valor.toFixed(2)}EUR`;
}

$('#form-checkout').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#btn-confirmar');
  btn.disabled = true;
  const tipoEntrega = valorRadio('entrega');
  const pagamento = loja.paypal ? valorRadio('pagamento') : 'dinheiro';
  const itens = itensCarrinho().map(({ p, qtd }) => {
    const pronta = Math.min(qtd, Math.max(0, Number(p.estoque) || 0));
    return {
      id: p.id, nome: p.nome, codigo: p.codigo || '', preco: Number(p.preco) || 0, qtd,
      prontaEntrega: pronta, encomenda: qtd - pronta
    };
  });
  const pedido = {
    clienteId: usuario.uid,
    clienteNome: perfil.nome,
    clienteWhatsapp: perfil.whatsapp,
    clienteEmail: usuario.email || '',
    idioma,
    itens,
    total: Math.round(totalCarrinho() * 100) / 100,
    entrega: tipoEntrega,
    endereco: tipoEntrega === 'entrega' ? $('#ck-endereco').value.trim() : '',
    observacao: $('#ck-obs').value.trim(),
    pagamento,
    pago: false,
    status: 'recebido',
    estoqueBaixado: false,
    criadoEm: serverTimestamp()
  };
  try {
    const ref = await addDoc(collection(db, 'pedidos'), pedido);
    carrinho = {};
    salvarCarrinho();
    fechar('dlg-checkout');
    const pp = $('#sucesso-paypal');
    if (pagamento === 'paypal') {
      pp.href = linkPaypal(pedido.total);
      pp.textContent = t('pagarPaypal', { v: euro(pedido.total) });
      pp.hidden = false;
    } else pp.hidden = true;
    const wa = $('#sucesso-whats');
    if (loja.whatsapp) {
      const texto = t('whatsMsg', { id: ref.id.slice(0, 6).toUpperCase() }) + '\n' +
        itens.map((i) => `${i.qtd}× ${i.nome}`).join('\n') + `\n${t('total')}: ${euro(pedido.total)}`;
      wa.href = linkWhats(loja.whatsapp, texto);
      wa.hidden = false;
    } else wa.hidden = true;
    abrir('dlg-sucesso');
  } catch (err) {
    $('#ck-erro').textContent = t('erroPedido') + err.message;
  } finally { btn.disabled = false; }
});

// ---------- meus pedidos ----------
async function abrirPedidos() {
  $('#lista-pedidos').innerHTML = `<p class="vazio">${esc(t('carregandoP'))}</p>`;
  abrir('dlg-pedidos');
  try {
    const snap = await getDocs(query(collection(db, 'pedidos'), where('clienteId', '==', usuario.uid)));
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
    const nomeItem = (i) => nomeProduto(produtos.find((p) => p.id === i.id) || i);
    $('#lista-pedidos').innerHTML = lista.length ? lista.map((p) => `
      <div class="pedido">
        <div class="cab"><b>#${p.id.slice(0, 6).toUpperCase()}</b>
          <span class="status ${esc(p.status)}">${esc(t('status')[p.status] || p.status)}</span></div>
        <small>${dataBR(p.criadoEm)} · ${esc(p.entrega === 'entrega' ? t('entregaTxt') : t('retiradaTxt'))}</small>
        <ul>${(p.itens || []).map((i) => `<li>${i.qtd}× ${esc(nomeItem(i))}${i.encomenda ? ` <small>(${i.encomenda} ${esc(t('sobEncomenda'))})</small>` : ''}</li>`).join('')}</ul>
        <b>${esc(t('total'))}: ${euro(p.total)}</b>
      </div>`).join('') : `<p class="vazio">${esc(t('semPedidos'))}</p>`;
  } catch (err) {
    $('#lista-pedidos').innerHTML = `<p class="erro">${esc(t('erroCarregar'))}${esc(err.message)}</p>`;
  }
}

// ---------- início ----------
aplicarIdioma();
iniciarProdutos();
iniciarAuth();
atualizarContador();
registrarSW();
