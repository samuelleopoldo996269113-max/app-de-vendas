// ===================== LOJA (parte das clientes) =====================
import { auth, db, configurado } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection, onSnapshot, doc, getDoc, setDoc, addDoc, query, where, getDocs, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  $, $$, euro, esc, norm, toast, STATUS, dataBR, linkWhats, erroAuth, registrarSW
} from './util.js';

const TEXTO_PRIVACIDADE_PADRAO =
  'Seus dados (nome, WhatsApp, e-mail e endereço) são usados apenas para processar e entregar ' +
  'seus pedidos e para entrar em contato sobre eles. Não são vendidos nem repassados a terceiros. ' +
  'Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados falando com a loja.';

// ---------- estado ----------
let produtos = [];
let categoria = 'Todas';
let busca = '';
let usuario = null;
let perfil = null;
let loja = { nome: 'Loja', whatsapp: '', pagamento: '', privacidade: '' };
let depoisDoLogin = null; // ação para continuar depois de entrar
let carrinho = lerCarrinho(); // { idProduto: quantidade }

function lerCarrinho() {
  try { return JSON.parse(localStorage.getItem('carrinho') || '{}'); } catch { return {}; }
}
function salvarCarrinho() {
  try { localStorage.setItem('carrinho', JSON.stringify(carrinho)); } catch {}
  atualizarContador();
}

// ---------- janelas ----------
const abrir = (id) => { const d = $('#' + id); if (!d.open) d.showModal(); };
const fechar = (id) => $('#' + id).close();
$$('[data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

// ---------- produtos ----------
const PRODUTOS_DEMO = [
  { id: 'd1', nome: 'Perfume exemplo 100ml', codigo: '0001', categoria: 'Perfumaria', preco: 49.9, estoque: 3, descricao: 'Produto de demonstração.' },
  { id: 'd2', nome: 'Hidratante corporal exemplo', codigo: '0002', categoria: 'Corpo e banho', preco: 18.5, estoque: 0, descricao: 'Produto de demonstração.' },
  { id: 'd3', nome: 'Batom exemplo', codigo: '0003', categoria: 'Maquiagem', preco: 12, estoque: 5, descricao: 'Produto de demonstração.' }
];

function iniciarProdutos() {
  if (!configurado) {
    $('#aviso-demo').hidden = false;
    produtos = PRODUTOS_DEMO;
    renderizar();
    return;
  }
  onSnapshot(collection(db, 'produtos'), (snap) => {
    produtos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.ativo !== false)
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
    renderizar();
    atualizarContador();
  }, (e) => {
    $('#grade').innerHTML = `<p class="vazio">Não foi possível carregar os produtos.<br><small>${esc(e.message)}</small></p>`;
  });

  onSnapshot(doc(db, 'config', 'loja'), (d) => {
    if (d.exists()) loja = { ...loja, ...d.data() };
    $('#nome-loja').textContent = loja.nome || 'Loja';
    document.title = loja.nome || 'Loja';
    if (loja.pagamento) $('#ck-pagamento').textContent = loja.pagamento;
  });
}

function renderizar() {
  const cats = [...new Set(produtos.map((p) => p.categoria || 'Geral'))].sort((a, b) => a.localeCompare(b, 'pt'));
  $('#categorias').innerHTML = ['Todas', ...cats]
    .map((c) => `<button class="chip ${c === categoria ? 'ativo' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join('');

  const termo = norm(busca);
  const lista = produtos.filter((p) =>
    (categoria === 'Todas' || (p.categoria || 'Geral') === categoria) &&
    (!termo || norm(`${p.nome} ${p.codigo} ${p.descricao} ${p.categoria}`).includes(termo)));

  $('#grade').innerHTML = lista.length
    ? lista.map(cardProduto).join('')
    : '<p class="vazio">Nenhum produto encontrado.</p>';
}

const seloEstoque = (p) => (Number(p.estoque) > 0
  ? `<span class="selo pronta">Pronta entrega · ${Number(p.estoque)} un.</span>`
  : '<span class="selo encomenda">Sob encomenda</span>');

const fotoHTML = (p) => (p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nome)}" loading="lazy">` : '<span>🧴</span>');

function cardProduto(p) {
  return `<article class="card">
    <div class="foto" data-ver="${esc(p.id)}">${fotoHTML(p)}</div>
    <div class="info">
      <h3>${esc(p.nome)}</h3>
      ${p.codigo ? `<small>Cód. ${esc(p.codigo)}</small>` : ''}
      ${seloEstoque(p)}
      <div class="linha"><strong>${euro(p.preco)}</strong>
        <button class="btn peq" data-add="${esc(p.id)}">Adicionar</button></div>
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
  $('#det-nome').textContent = p.nome;
  $('#det-corpo').innerHTML = `
    ${p.foto ? `<img src="${esc(p.foto)}" alt="" style="border-radius:12px">` : ''}
    ${p.codigo ? `<small>Código ${esc(p.codigo)} · ${esc(p.categoria || 'Geral')}</small>` : ''}
    ${seloEstoque(p)}
    ${p.descricao ? `<p style="white-space:pre-line;margin:0">${esc(p.descricao)}</p>` : ''}
    <div class="total"><span>${euro(p.preco)}</span>
      <button class="btn" id="det-add">Adicionar ao carrinho</button></div>`;
  $('#det-add').onclick = () => { adicionar(p.id); fechar('dlg-produto'); };
  abrir('dlg-produto');
}

// ---------- carrinho ----------
function adicionar(id) {
  carrinho[id] = (carrinho[id] || 0) + 1;
  salvarCarrinho();
  toast('Adicionado ao carrinho');
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
        <div class="nome">${esc(p.nome)}<br><small>${euro(p.preco)}</small></div>
        <div class="qtd">
          <button data-menos="${esc(p.id)}">−</button><b>${qtd}</b><button data-mais="${esc(p.id)}">+</button>
        </div>
      </div>`).join('')
    : '<p class="vazio">Seu carrinho está vazio.</p>';
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
  if (!configurado) return toast('Modo demonstração: configure o Firebase para fazer pedidos.', 'erro');
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
  if (!email) return ($('#login-erro').textContent = 'Digite seu e-mail acima primeiro.');
  try { await sendPasswordResetEmail(auth, email); toast('Enviamos um e-mail para redefinir a senha.'); }
  catch (err) { $('#login-erro').textContent = erroAuth(err); }
});

$('#btn-conta').addEventListener('click', () => {
  if (!configurado) return toast('Modo demonstração: configure o Firebase.', 'erro');
  if (!usuario) { depoisDoLogin = null; return abrir('dlg-login'); }
  $('#conta-titulo').textContent = perfil?.nome || usuario.email;
  abrir('dlg-conta');
});
$('#btn-sair').addEventListener('click', async () => { await signOut(auth); fechar('dlg-conta'); toast('Você saiu.'); });
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
      $('#txt-conta').textContent = (perfil?.nome || u.email || '').split(' ')[0] || 'Conta';
      if (depoisDoLogin) { const f = depoisDoLogin; depoisDoLogin = null; f(); }
    } else {
      $('#txt-conta').textContent = 'Entrar';
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
    privacidadeAceita: true,
    atualizadoEm: serverTimestamp()
  };
  if (!perfil) dados.criadoEm = serverTimestamp();
  try {
    await setDoc(doc(db, 'clientes', usuario.uid), dados, { merge: true });
    perfil = { ...perfil, ...dados };
    $('#txt-conta').textContent = dados.nome.split(' ')[0];
    fechar('dlg-perfil');
    toast('Dados salvos!');
    if (depoisDoLogin) { const f = depoisDoLogin; depoisDoLogin = null; f(); }
  } catch (err) { $('#pf-erro').textContent = 'Erro ao salvar: ' + err.message; }
});

$('#btn-ver-priv').addEventListener('click', () => {
  $('#texto-priv').innerHTML = `<p style="white-space:pre-line;margin:0">${esc(loja.privacidade || TEXTO_PRIVACIDADE_PADRAO)}</p>`;
  abrir('dlg-priv');
});

// ---------- checkout ----------
const enderecoTexto = (e = {}) =>
  [e.rua, [e.cap, e.cidade].filter(Boolean).join(' '), e.complemento].filter(Boolean).join('\n');

function abrirCheckout() {
  $('#ck-endereco').value = enderecoTexto(perfil?.endereco);
  $('#ck-obs').value = '';
  $('#ck-erro').textContent = '';
  $('#form-checkout').querySelector('[value=entrega]').checked = true;
  mostrarEndereco();
  $('#ck-resumo').innerHTML = itensCarrinho()
    .map(({ p, qtd }) => `${qtd}× ${esc(p.nome)} — ${euro(qtd * p.preco)}`).join('<br>') +
    `<hr style="border:0;border-top:1px solid var(--borda)"><b>Total: ${euro(totalCarrinho())}</b>`;
  abrir('dlg-checkout');
}

function mostrarEndereco() {
  const entrega = $('#form-checkout').querySelector('[name=entrega]:checked').value === 'entrega';
  $('#campo-endereco').hidden = !entrega;
  $('#ck-endereco').required = entrega;
}
$$('#form-checkout [name=entrega]').forEach((r) => r.addEventListener('change', mostrarEndereco));

$('#form-checkout').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#btn-confirmar');
  btn.disabled = true;
  const tipoEntrega = $('#form-checkout').querySelector('[name=entrega]:checked').value;
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
    itens,
    total: Math.round(totalCarrinho() * 100) / 100,
    entrega: tipoEntrega,
    endereco: tipoEntrega === 'entrega' ? $('#ck-endereco').value.trim() : '',
    observacao: $('#ck-obs').value.trim(),
    pagamento: 'combinar',
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
    const a = $('#sucesso-whats');
    if (loja.whatsapp) {
      const texto = `Olá! Acabei de fazer o pedido #${ref.id.slice(0, 6).toUpperCase()} no site.\n` +
        itens.map((i) => `${i.qtd}× ${i.nome}`).join('\n') + `\nTotal: ${euro(pedido.total)}`;
      a.href = linkWhats(loja.whatsapp, texto);
      a.hidden = false;
    } else a.hidden = true;
    abrir('dlg-sucesso');
  } catch (err) {
    $('#ck-erro').textContent = 'Não foi possível enviar o pedido: ' + err.message;
  } finally { btn.disabled = false; }
});

// ---------- meus pedidos ----------
async function abrirPedidos() {
  $('#lista-pedidos').innerHTML = '<p class="vazio">Carregando...</p>';
  abrir('dlg-pedidos');
  try {
    const snap = await getDocs(query(collection(db, 'pedidos'), where('clienteId', '==', usuario.uid)));
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
    $('#lista-pedidos').innerHTML = lista.length ? lista.map((p) => `
      <div class="pedido">
        <div class="cab"><b>#${p.id.slice(0, 6).toUpperCase()}</b>
          <span class="status ${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span></div>
        <small>${dataBR(p.criadoEm)} · ${p.entrega === 'entrega' ? 'Entrega' : 'Retirada'}</small>
        <ul>${(p.itens || []).map((i) => `<li>${i.qtd}× ${esc(i.nome)}${i.encomenda ? ` <small>(${i.encomenda} sob encomenda)</small>` : ''}</li>`).join('')}</ul>
        <b>Total: ${euro(p.total)}</b>
      </div>`).join('') : '<p class="vazio">Você ainda não fez pedidos.</p>';
  } catch (err) {
    $('#lista-pedidos').innerHTML = `<p class="erro">Erro ao carregar: ${esc(err.message)}</p>`;
  }
}

// ---------- início ----------
iniciarProdutos();
iniciarAuth();
atualizarContador();
registrarSW();
