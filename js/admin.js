// ===================== PAINEL (parte da dona da loja) =====================
import { auth, db, configurado, isAdmin } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  sendEmailVerification, sendPasswordResetEmail, reload
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch,
  runTransaction, serverTimestamp, query, orderBy, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  $, $$, euro, esc, norm, parsePreco, parseInteiro, comprimirImagem, toast, STATUS, dataBR,
  linkWhats, erroAuth, registrarSW, problemasSenha, baixarArquivo
} from './util.js';

let produtos = [];
let pedidos = [];
let clientes = [];
let editandoId = null;
let fotoNova = null; // dataURL da foto escolhida no formulário
let linhasPlanilha = [];
const cancelar = []; // funções para parar de ouvir o banco ao sair

// ---------- telas ----------
function mostrarTela(id) {
  ['tela-login', 'tela-sem-acesso', 'tela-demo', 'tela-painel', 'tela-verificar'].forEach((t) => ($('#' + t).hidden = t !== id));
  $('#btn-sair').hidden = !['tela-painel', 'tela-sem-acesso', 'tela-verificar'].includes(id);
}

$$('.aba').forEach((b) => b.addEventListener('click', () => {
  $$('.aba').forEach((x) => x.classList.toggle('ativa', x === b));
  $$('.painel').forEach((p) => p.classList.toggle('ativo', p.id === 'aba-' + b.dataset.aba));
}));

// ---------- login ----------
let acao = 'entrar';
$$('#form-login [data-acao]').forEach((b) => b.addEventListener('click', () => (acao = b.dataset.acao)));
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#adm-erro').textContent = '';
  const email = $('#adm-email').value.trim();
  const senha = $('#adm-senha').value;
  try {
    if (acao === 'criar') {
      const falta = problemasSenha(senha, 10, true);
      if (falta.length) throw new Error('Senha fraca. Falta: ' + falta.join(', ') + '.');
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await sendEmailVerification(cred.user);
    } else {
      await signInWithEmailAndPassword(auth, email, senha);
    }
    $('#adm-senha').value = '';
  } catch (err) { $('#adm-erro').textContent = err.code ? erroAuth(err) : err.message; }
});
$('#btn-sair').addEventListener('click', () => signOut(auth));
$('#btn-sair-todos').addEventListener('click', () => signOut(auth));

async function enviarReset(email) {
  if (!email) throw new Error('Digite o e-mail da loja no campo acima.');
  await sendPasswordResetEmail(auth, email);
  toast('Link para criar nova senha enviado para ' + email);
}
$('#adm-esqueci').addEventListener('click', async () => {
  try { await enviarReset($('#adm-email').value.trim()); }
  catch (err) { $('#adm-erro').textContent = err.code ? erroAuth(err) : err.message; }
});
$('#btn-trocar-senha').addEventListener('click', async () => {
  try { await enviarReset(auth.currentUser?.email); }
  catch (err) { toast('Erro: ' + err.message, 'erro'); }
});

// ---------- verificação de e-mail ----------
$('#btn-reenviar').addEventListener('click', async () => {
  try { await sendEmailVerification(auth.currentUser); toast('E-mail reenviado!'); }
  catch (err) { toast(erroAuth(err), 'erro'); }
});
$('#btn-ja-confirmei').addEventListener('click', async () => {
  await reload(auth.currentUser);
  await auth.currentUser.getIdToken(true); // atualiza a permissão no banco
  if (auth.currentUser.emailVerified) entrarNoPainel(auth.currentUser);
  else toast('Ainda não confirmado. Abra o link do e-mail.', 'erro');
});

// ---------- sair sozinho depois de 30 min sem uso ----------
const LIMITE_INATIVO = 30 * 60 * 1000;
let timerInativo = null;
function reiniciarTimer() {
  clearTimeout(timerInativo);
  if (!auth?.currentUser) return;
  timerInativo = setTimeout(async () => {
    await signOut(auth);
    toast('Você saiu por segurança (30 min sem uso).');
  }, LIMITE_INATIVO);
}
['click', 'keydown', 'touchstart', 'scroll'].forEach((ev) =>
  document.addEventListener(ev, reiniciarTimer, { passive: true }));

function entrarNoPainel(u) {
  if (!u.emailVerified) {
    $('#email-verificar').textContent = u.email;
    return mostrarTela('tela-verificar');
  }
  mostrarTela('tela-painel');
  reiniciarTimer();
  iniciarPainel();
}

if (!configurado) {
  mostrarTela('tela-demo');
} else {
  onAuthStateChanged(auth, (u) => {
    cancelar.splice(0).forEach((f) => f());
    clearTimeout(timerInativo);
    if (!u) return mostrarTela('tela-login');
    if (!isAdmin(u)) return mostrarTela('tela-sem-acesso');
    entrarNoPainel(u);
  });
}

function iniciarPainel() {
  cancelar.push(onSnapshot(collection(db, 'produtos'), (s) => {
    produtos = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
    renderProdutos();
  }));
  cancelar.push(onSnapshot(query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc')), (s) => {
    pedidos = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderPedidos();
    renderClientes();
  }));
  cancelar.push(onSnapshot(collection(db, 'clientes'), (s) => {
    clientes = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
    renderClientes();
  }));
  carregarConfig();
  verificarBackup();
}

// ================= PEDIDOS =================
$('#filtro-status').innerHTML += Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('#filtro-status').addEventListener('change', renderPedidos);
$('#busca-pedidos').addEventListener('input', renderPedidos);

function renderPedidos() {
  const st = $('#filtro-status').value;
  const termo = norm($('#busca-pedidos').value);
  const lista = pedidos.filter((p) => (!st || p.status === st) &&
    (!termo || norm(`${p.clienteNome} ${p.clienteWhatsapp} ${(p.itens || []).map((i) => i.nome).join(' ')}`).includes(termo)));

  $('#lista-pedidos').innerHTML = lista.length ? lista.map((p) => `
    <div class="pedido">
      <div class="cab">
        <b>#${p.id.slice(0, 6).toUpperCase()} · ${esc(p.clienteNome)}</b>
        <span class="status ${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span>
      </div>
      <small>${dataBR(p.criadoEm)} · ${p.entrega === 'entrega' ? '🚚 Entrega' : '🏠 Retirada'} ·
        ${p.pagamento === 'paypal' ? '🅿️ PayPal' : '💶 Dinheiro'} · ${p.pago ? '✅ Pago' : '⏳ Não pago'}
        ${p.idioma === 'it' ? ' · 🇮🇹' : ''}</small>
      ${p.endereco ? `<div class="caixa" style="white-space:pre-line">${esc(p.endereco)}</div>` : ''}
      <ul>${(p.itens || []).map((i) => `<li>${i.qtd}× ${esc(i.nome)} ${i.codigo ? `<small>(${esc(i.codigo)})</small>` : ''} — ${euro(i.qtd * i.preco)}
        ${i.encomenda ? `<br><small>➜ ${i.prontaEntrega} pronta entrega, <b>${i.encomenda} sob encomenda</b></small>` : ''}</li>`).join('')}</ul>
      ${p.observacao ? `<p class="dica" style="margin:0">Obs.: ${esc(p.observacao)}</p>` : ''}
      <b>Total: ${euro(p.total)}</b>
      <div class="filtros">
        <select data-status="${p.id}">${Object.entries(STATUS).map(([k, v]) =>
          `<option value="${k}" ${k === p.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <button class="btn peq sec" data-pago="${p.id}">${p.pago ? 'Marcar como não pago' : 'Marcar como pago'}</button>
        ${p.clienteWhatsapp ? `<a class="btn peq" style="text-align:center;text-decoration:none" target="_blank" rel="noopener"
          href="${esc(linkWhats(p.clienteWhatsapp, `Olá ${p.clienteNome?.split(' ')[0] || ''}! Sobre seu pedido #${p.id.slice(0, 6).toUpperCase()}:`))}">WhatsApp</a>` : ''}
      </div>
      ${p.estoqueBaixado ? '<small class="dica">Estoque já descontado.</small>' : ''}
    </div>`).join('') : '<p class="vazio">Nenhum pedido.</p>';
}

$('#lista-pedidos').addEventListener('change', async (e) => {
  const sel = e.target.closest('[data-status]');
  if (!sel) return;
  const id = sel.dataset.status;
  const novo = sel.value;
  try {
    if (novo === 'entregue') await entregarEBaixarEstoque(id);
    else await updateDoc(doc(db, 'pedidos', id), { status: novo, atualizadoEm: serverTimestamp() });
    toast('Status atualizado');
  } catch (err) { toast('Erro: ' + err.message, 'erro'); }
});

$('#lista-pedidos').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pago]');
  if (!b) return;
  const p = pedidos.find((x) => x.id === b.dataset.pago);
  await updateDoc(doc(db, 'pedidos', p.id), { pago: !p.pago, atualizadoEm: serverTimestamp() });
});

// Quando o pedido é entregue, desconta do estoque os itens de pronta entrega (uma vez só)
async function entregarEBaixarEstoque(pedidoId) {
  await runTransaction(db, async (t) => {
    const refPed = doc(db, 'pedidos', pedidoId);
    const ped = (await t.get(refPed)).data();
    const atualizacoes = [];
    if (!ped.estoqueBaixado) {
      for (const i of ped.itens || []) {
        if (!i.prontaEntrega) continue;
        const refProd = doc(db, 'produtos', i.id);
        const prod = await t.get(refProd);
        if (prod.exists()) {
          const atual = Number(prod.data().estoque) || 0;
          atualizacoes.push([refProd, Math.max(0, atual - i.prontaEntrega)]);
        }
      }
    }
    atualizacoes.forEach(([ref, estoque]) => t.update(ref, { estoque }));
    t.update(refPed, { status: 'entregue', estoqueBaixado: true, atualizadoEm: serverTimestamp() });
  });
}

// ================= PRODUTOS =================
$('#busca-produtos').addEventListener('input', renderProdutos);
$('#filtro-categoria').addEventListener('change', renderProdutos);

function renderProdutos() {
  const cats = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
  const catSel = $('#filtro-categoria').value;
  $('#filtro-categoria').innerHTML = '<option value="">Todas as categorias</option>' +
    cats.map((c) => `<option ${c === catSel ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('#lista-categorias').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');

  const termo = norm($('#busca-produtos').value);
  const lista = produtos.filter((p) => (!catSel || p.categoria === catSel) &&
    (!termo || norm(`${p.nome} ${p.codigo} ${p.categoria}`).includes(termo)));

  const emEstoque = produtos.filter((p) => Number(p.estoque) > 0).length;
  $('#resumo-produtos').textContent = `${produtos.length} produtos · ${emEstoque} com pronta entrega`;

  $('#lista-produtos').innerHTML = lista.length ? lista.map((p) => `
    <div class="prod-adm" style="${p.ativo === false ? 'opacity:.55' : ''}">
      ${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy">` : '<div class="mini">🧴</div>'}
      <div class="dados"><b>${p.destaque ? '⭐ ' : ''}${esc(p.nome)}</b>
        <small>${esc(p.codigo || 's/ código')} · ${esc(p.categoria || 'Geral')} · ${euro(p.preco)}${p.ativo === false ? ' · oculto' : ''}</small></div>
      <div class="acoes">
        <div class="qtd"><button data-est="-1" data-id="${p.id}">−</button>
          <span class="estoque-num">${Number(p.estoque) || 0}</span>
          <button data-est="1" data-id="${p.id}">+</button></div>
        <button class="btn peq sec" data-editar="${p.id}">Editar</button>
        <button class="btn peq perigo" data-excluir="${p.id}">🗑</button>
      </div>
    </div>`).join('') : '<p class="vazio">Nenhum produto cadastrado ainda.</p>';
}

$('#lista-produtos').addEventListener('click', async (e) => {
  const est = e.target.closest('[data-est]');
  const ed = e.target.closest('[data-editar]');
  const ex = e.target.closest('[data-excluir]');
  try {
    if (est) {
      const p = produtos.find((x) => x.id === est.dataset.id);
      const novo = Math.max(0, (Number(p.estoque) || 0) + Number(est.dataset.est));
      await updateDoc(doc(db, 'produtos', p.id), { estoque: novo });
    }
    if (ed) editarProduto(ed.dataset.editar);
    if (ex) {
      const p = produtos.find((x) => x.id === ex.dataset.excluir);
      if (confirm(`Excluir "${p.nome}"?`)) { await deleteDoc(doc(db, 'produtos', p.id)); toast('Produto excluído'); }
    }
  } catch (err) { toast('Erro: ' + err.message, 'erro'); }
});

function limparForm() {
  editandoId = null;
  fotoNova = null;
  $('#form-produto').reset();
  $('#p-estoque').value = 0;
  $('#p-ativo').checked = true;
  $('#p-prev').hidden = true;
  $('#titulo-form').textContent = 'Novo produto';
  $('#btn-cancelar-edicao').hidden = true;
  $('#p-erro').textContent = '';
}

function editarProduto(id) {
  const p = produtos.find((x) => x.id === id);
  if (!p) return;
  limparForm();
  editandoId = id;
  $('#p-nome').value = p.nome || '';
  $('#p-codigo').value = p.codigo || '';
  $('#p-categoria').value = p.categoria || '';
  $('#p-preco').value = String(p.preco ?? '').replace('.', ',');
  $('#p-estoque').value = Number(p.estoque) || 0;
  $('#p-descricao').value = p.descricao || '';
  $('#p-nome-it').value = p.nome_it || '';
  $('#p-descricao-it').value = p.descricao_it || '';
  $('#p-ativo').checked = p.ativo !== false;
  $('#p-destaque').checked = !!p.destaque;
  $('#p-preco-antigo').value = p.precoAntigo ? String(p.precoAntigo).replace('.', ',') : '';
  if (p.foto) { $('#p-prev').src = p.foto; $('#p-prev').hidden = false; }
  $('#titulo-form').textContent = 'Editar produto';
  $('#btn-cancelar-edicao').hidden = false;
  $('#form-produto').scrollIntoView({ behavior: 'smooth' });
}
$('#btn-cancelar-edicao').addEventListener('click', limparForm);

$('#p-foto').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    fotoNova = await comprimirImagem(f);
    $('#p-prev').src = fotoNova;
    $('#p-prev').hidden = false;
  } catch (err) { toast(err.message, 'erro'); }
});

$('#form-produto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#btn-salvar-prod');
  btn.disabled = true;
  const dados = {
    nome: $('#p-nome').value.trim(),
    codigo: $('#p-codigo').value.trim(),
    categoria: $('#p-categoria').value.trim() || 'Geral',
    preco: parsePreco($('#p-preco').value),
    estoque: parseInteiro($('#p-estoque').value),
    descricao: $('#p-descricao').value.trim(),
    nome_it: $('#p-nome-it').value.trim(),
    descricao_it: $('#p-descricao-it').value.trim(),
    ativo: $('#p-ativo').checked,
    destaque: $('#p-destaque').checked,
    precoAntigo: parsePreco($('#p-preco-antigo').value) || null,
    atualizadoEm: serverTimestamp()
  };
  if (dados.precoAntigo && dados.precoAntigo <= dados.preco) dados.precoAntigo = null;
  if (fotoNova) dados.foto = fotoNova;
  try {
    if (dados.codigo && produtos.some((p) => p.codigo === dados.codigo && p.id !== editandoId))
      throw new Error('Já existe um produto com esse código.');
    if (editandoId) await updateDoc(doc(db, 'produtos', editandoId), dados);
    else await addDoc(collection(db, 'produtos'), { ...dados, criadoEm: serverTimestamp() });
    toast(editandoId ? 'Produto atualizado' : 'Produto cadastrado');
    limparForm();
  } catch (err) { $('#p-erro').textContent = err.message; }
  finally { btn.disabled = false; }
});

// ---------- catálogo ao lado (PDF / imagem) ----------
let urlCatalogo = null;
$('#arquivo-catalogo').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (urlCatalogo) URL.revokeObjectURL(urlCatalogo);
  urlCatalogo = URL.createObjectURL(f);
  $('#visor-conteudo').innerHTML = f.type === 'application/pdf'
    ? `<iframe class="visor" src="${urlCatalogo}" title="Catálogo"></iframe>
       <a class="link" href="${urlCatalogo}" target="_blank">Abrir em tela cheia</a>`
    : `<div class="visor-img"><img src="${urlCatalogo}" alt="Página do catálogo"></div>`;
  $('#visor-catalogo').hidden = false;
  $('#area-cadastro').classList.add('com-catalogo');
});
$('#btn-fechar-catalogo').addEventListener('click', () => {
  $('#visor-catalogo').hidden = true;
  $('#area-cadastro').classList.remove('com-catalogo');
  $('#arquivo-catalogo').value = '';
});

// ================= IMPORTAR PLANILHA =================
const COLUNAS = {
  nome: ['nome', 'produto', 'nome do produto', 'descricao do produto'],
  codigo: ['codigo', 'cod', 'cod.', 'sku', 'referencia', 'ref'],
  categoria: ['categoria', 'linha', 'tipo'],
  descricao: ['descricao', 'detalhes', 'obs'],
  preco: ['preco', 'valor', 'preco (eur)', 'preco eur', 'prezzo'],
  estoque: ['estoque', 'quantidade', 'qtd', 'qtde'],
  nome_it: ['nome_it', 'nome it', 'nome italiano', 'nome em italiano', 'nome (italiano)'],
  descricao_it: ['descricao_it', 'descricao it', 'descricao italiano', 'descricao em italiano']
};

function mapearLinha(linha) {
  const out = {};
  for (const [chave, valor] of Object.entries(linha)) {
    const k = norm(chave).replace(/[€]/g, '').replace(/\s+/g, ' ').trim();
    for (const [campo, nomes] of Object.entries(COLUNAS)) {
      if (out[campo] === undefined && nomes.includes(k)) out[campo] = valor;
    }
  }
  return {
    nome: String(out.nome ?? '').trim(),
    codigo: String(out.codigo ?? '').trim(),
    categoria: String(out.categoria ?? '').trim() || 'Geral',
    descricao: String(out.descricao ?? '').trim(),
    preco: parsePreco(out.preco),
    estoque: parseInteiro(out.estoque),
    nome_it: String(out.nome_it ?? '').trim(),
    descricao_it: String(out.descricao_it ?? '').trim()
  };
}

let XLSX = null;
async function carregarXLSX() {
  if (!XLSX) XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs');
  return XLSX;
}

$('#arquivo-planilha').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  $('#previa-planilha').innerHTML = '<p class="dica">Lendo planilha...</p>';
  try {
    const X = await carregarXLSX();
    const wb = X.read(await f.arrayBuffer());
    const linhas = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    linhasPlanilha = linhas.map(mapearLinha).filter((l) => l.nome);
    if (!linhasPlanilha.length) throw new Error('Nenhum produto encontrado. Confira se a primeira linha tem os nomes das colunas (nome, preco...).');
    const novos = linhasPlanilha.filter((l) => !l.codigo || !produtos.some((p) => p.codigo === l.codigo)).length;
    $('#previa-planilha').innerHTML = `
      <p><b>${linhasPlanilha.length}</b> produtos encontrados — ${novos} novos, ${linhasPlanilha.length - novos} serão atualizados.</p>
      <div class="tabela-wrap"><table><tr><th>Nome</th><th>Código</th><th>Categoria</th><th>Preço</th><th>Estoque</th></tr>
      ${linhasPlanilha.slice(0, 50).map((l) => `<tr><td>${esc(l.nome)}</td><td>${esc(l.codigo)}</td><td>${esc(l.categoria)}</td>
        <td>${euro(l.preco)}</td><td>${l.estoque}</td></tr>`).join('')}</table></div>
      ${linhasPlanilha.length > 50 ? `<p class="dica">Mostrando 50 de ${linhasPlanilha.length}.</p>` : ''}`;
    $('#btn-importar').hidden = false;
  } catch (err) {
    linhasPlanilha = [];
    $('#btn-importar').hidden = true;
    $('#previa-planilha').innerHTML = `<p class="erro">${esc(err.message)}</p>`;
  }
});

$('#btn-importar').addEventListener('click', async () => {
  const btn = $('#btn-importar');
  btn.disabled = true;
  try {
    const porCodigo = new Map(produtos.filter((p) => p.codigo).map((p) => [p.codigo, p.id]));
    for (let i = 0; i < linhasPlanilha.length; i += 400) {
      const lote = writeBatch(db);
      for (const l of linhasPlanilha.slice(i, i + 400)) {
        const existente = l.codigo && porCodigo.get(l.codigo);
        if (existente) {
          lote.update(doc(db, 'produtos', existente), { ...l, atualizadoEm: serverTimestamp() });
        } else {
          const ref = doc(collection(db, 'produtos'));
          lote.set(ref, { ...l, ativo: true, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
          if (l.codigo) porCodigo.set(l.codigo, ref.id);
        }
      }
      btn.textContent = `Importando... ${Math.min(i + 400, linhasPlanilha.length)}/${linhasPlanilha.length}`;
      await lote.commit();
    }
    toast(`${linhasPlanilha.length} produtos importados!`);
    linhasPlanilha = [];
    $('#previa-planilha').innerHTML = '';
    $('#arquivo-planilha').value = '';
    btn.hidden = true;
  } catch (err) { toast('Erro na importação: ' + err.message, 'erro'); }
  finally { btn.disabled = false; btn.textContent = 'Importar produtos'; }
});

$('#btn-modelo').addEventListener('click', () => {
  const csv = '\uFEFFnome;codigo;categoria;descricao;preco;estoque;nome_it;descricao_it\n' +
    'Perfume exemplo 100ml;12345;Perfumaria;Fragrância floral;49,90;2;Profumo esempio 100ml;Fragranza floreale\n' +
    'Hidratante exemplo 200ml;67890;Corpo e banho;Pele macia;18,50;0;;\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'modelo-produtos.csv';
  a.click();
});

// ================= FOTOS EM LOTE =================
$('#arquivo-fotos').addEventListener('change', async (e) => {
  const arquivos = [...e.target.files];
  if (!arquivos.length) return;
  const res = $('#resultado-fotos');
  const semProduto = [];
  let ok = 0;
  for (const [n, f] of arquivos.entries()) {
    res.textContent = `Processando ${n + 1} de ${arquivos.length}...`;
    const codigo = f.name.replace(/\.[^.]+$/, '').trim();
    const p = produtos.find((x) => x.codigo && norm(x.codigo) === norm(codigo));
    if (!p) { semProduto.push(f.name); continue; }
    try {
      await updateDoc(doc(db, 'produtos', p.id), { foto: await comprimirImagem(f) });
      ok++;
    } catch { semProduto.push(f.name); }
  }
  res.innerHTML = `✅ ${ok} fotos associadas.` +
    (semProduto.length ? `<br>⚠️ Sem produto com esse código: ${semProduto.map(esc).join(', ')}` : '');
  e.target.value = '';
});

// ================= CLIENTES =================
$('#busca-clientes').addEventListener('input', renderClientes);
function renderClientes() {
  const termo = norm($('#busca-clientes').value);
  const lista = clientes.filter((c) => !termo || norm(`${c.nome} ${c.whatsapp} ${c.email} ${c.endereco?.cidade}`).includes(termo));
  $('#lista-clientes').innerHTML = lista.length ? lista.map((c) => {
    const peds = pedidos.filter((p) => p.clienteId === c.id && p.status !== 'cancelado');
    const gasto = peds.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const e = c.endereco || {};
    const historico = peds.length ? `<details><summary>Histórico de compras</summary>
      ${peds.map((p) => `<div class="caixa">
        <b>${dataBR(p.criadoEm)}</b> · ${esc(STATUS[p.status] || p.status)} · ${euro(p.total)}
        <ul>${(p.itens || []).map((i) => `<li>${i.qtd}× ${esc(i.nome)}</li>`).join('')}</ul></div>`).join('')}
      </details>` : '';
    return `<div class="pedido">
      <div class="cab"><b>${esc(c.nome)} ${c.idioma === 'it' ? '🇮🇹' : ''}</b>
        <small>${peds.length} pedido(s) · ${euro(gasto)}</small></div>
      <small>${esc(c.email)} · ${esc(c.whatsapp)}</small>
      ${e.rua ? `<small>${esc(e.rua)}, ${esc(e.cap)} ${esc(e.cidade)} ${e.complemento ? '· ' + esc(e.complemento) : ''}</small>` : ''}
      ${historico}
      ${c.whatsapp ? `<a class="btn peq" style="align-self:flex-start;text-decoration:none" target="_blank" rel="noopener" href="${esc(linkWhats(c.whatsapp))}">WhatsApp</a>` : ''}
    </div>`;
  }).join('') : '<p class="vazio">Nenhum cliente ainda.</p>';
}

// ================= CONFIGURAÇÕES DA LOJA =================
async function carregarConfig() {
  const d = await getDoc(doc(db, 'config', 'loja'));
  const c = d.exists() ? d.data() : {};
  $('#cfg-nome').value = c.nome || '';
  $('#cfg-whats').value = c.whatsapp || '';
  $('#cfg-paypal').value = c.paypal || '';
  $('#cfg-priv').value = c.privacidade || '';
  $('#cfg-priv-it').value = c.privacidade_it || '';
}
$('#form-loja').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await setDoc(doc(db, 'config', 'loja'), {
      nome: $('#cfg-nome').value.trim(),
      whatsapp: $('#cfg-whats').value.trim(),
      paypal: $('#cfg-paypal').value.trim(),
      privacidade: $('#cfg-priv').value.trim(),
      privacidade_it: $('#cfg-priv-it').value.trim()
    }, { merge: true });
    toast('Dados da loja salvos');
  } catch (err) { toast('Erro: ' + err.message, 'erro'); }
});

// ================= BACKUP =================
// Datas do Firebase viram { __ts: milissegundos } no arquivo e voltam a ser datas na restauração
function serializar(v) {
  if (v && typeof v.toMillis === 'function') return { __ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(serializar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializar(x)]));
  return v;
}
function desserializar(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.__ts === 'number')
    return Timestamp.fromMillis(v.__ts);
  if (Array.isArray(v)) return v.map(desserializar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, desserializar(x)]));
  return v;
}
const semId = ({ id, ...resto }) => resto;
const hoje = () => new Date().toISOString().slice(0, 10);

async function verificarBackup() {
  try {
    const d = await getDoc(doc(db, 'config', 'backup'));
    const ms = d.exists() && d.data().em?.toMillis ? d.data().em.toMillis() : 0;
    const dias = ms ? Math.floor((Date.now() - ms) / 86400000) : null;
    $('#info-backup').textContent = ms
      ? `Último backup: ${dataBR(d.data().em)} (${dias === 0 ? 'hoje' : dias + ' dia(s) atrás'})`
      : 'Nenhum backup feito ainda.';
    const aviso = $('#aviso-backup');
    aviso.hidden = !(dias === null || dias >= 7);
    aviso.textContent = dias === null
      ? '💾 Você ainda não fez nenhum backup. Vá na aba Backup e baixe uma cópia.'
      : `💾 Seu último backup foi há ${dias} dias. Faça um novo na aba Backup.`;
  } catch {}
}

$('#btn-backup').addEventListener('click', async () => {
  const btn = $('#btn-backup');
  btn.disabled = true;
  try {
    const comFotos = $('#bk-fotos').checked;
    const loja = await getDoc(doc(db, 'config', 'loja'));
    const dados = {
      app: 'app-de-vendas',
      versao: 1,
      criadoEm: new Date().toISOString(),
      comFotos,
      produtos: produtos.map((p) => serializar(comFotos ? p : { ...p, foto: undefined })),
      pedidos: pedidos.map(serializar),
      clientes: clientes.map(serializar),
      config: { loja: loja.exists() ? serializar(loja.data()) : {} }
    };
    baixarArquivo(`backup-loja-${hoje()}.json`, JSON.stringify(dados));
    await setDoc(doc(db, 'config', 'backup'), { em: serverTimestamp() });
    toast(`Backup baixado: ${produtos.length} produtos, ${pedidos.length} pedidos, ${clientes.length} clientes`);
    verificarBackup();
  } catch (err) { toast('Erro no backup: ' + err.message, 'erro'); }
  finally { btn.disabled = false; }
});

let backupLido = null;
$('#arquivo-backup').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  backupLido = null;
  $('#btn-restaurar').hidden = true;
  if (!f) return;
  try {
    const dados = JSON.parse(await f.text());
    if (dados.app !== 'app-de-vendas' || !Array.isArray(dados.produtos)) throw new Error('Este arquivo não é um backup da loja.');
    backupLido = dados;
    $('#previa-backup').innerHTML = `<div class="caixa">Backup de <b>${dataBR(dados.criadoEm)}</b><br>
      ${dados.produtos.length} produtos · ${(dados.pedidos || []).length} pedidos · ${(dados.clientes || []).length} clientes
      ${dados.comFotos ? '' : '<br><small>(sem fotos — as fotos atuais serão mantidas)</small>'}</div>`;
    $('#btn-restaurar').hidden = false;
  } catch (err) {
    $('#previa-backup').innerHTML = `<p class="erro">${esc(err.message === 'Unexpected end of JSON input' ? 'Arquivo inválido.' : err.message)}</p>`;
  }
});

$('#btn-restaurar').addEventListener('click', async () => {
  if (!backupLido) return;
  if (!confirm('Restaurar este backup? Produtos, pedidos e clientes do arquivo vão substituir as versões atuais com o mesmo código interno.')) return;
  const btn = $('#btn-restaurar');
  btn.disabled = true;
  try {
    const operacoes = [];
    for (const [col, lista] of [['produtos', backupLido.produtos], ['pedidos', backupLido.pedidos || []], ['clientes', backupLido.clientes || []]]) {
      for (const item of lista) {
        if (!item.id) continue;
        const dados = desserializar(semId(item));
        // backup sem fotos: não apaga a foto que já existe
        operacoes.push([doc(db, col, item.id), dados, col === 'produtos' && !backupLido.comFotos]);
      }
    }
    if (backupLido.config?.loja) operacoes.push([doc(db, 'config', 'loja'), desserializar(backupLido.config.loja), true]);
    for (let i = 0; i < operacoes.length; i += 400) {
      const lote = writeBatch(db);
      operacoes.slice(i, i + 400).forEach(([ref, dados, merge]) => lote.set(ref, dados, merge ? { merge: true } : {}));
      btn.textContent = `Restaurando... ${Math.min(i + 400, operacoes.length)}/${operacoes.length}`;
      await lote.commit();
    }
    toast('Backup restaurado!');
    backupLido = null;
    $('#previa-backup').innerHTML = '';
    $('#arquivo-backup').value = '';
    btn.hidden = true;
  } catch (err) { toast('Erro ao restaurar: ' + err.message, 'erro'); }
  finally { btn.disabled = false; btn.textContent = 'Restaurar agora'; }
});

$('#btn-exportar').addEventListener('click', async () => {
  try {
    const X = await carregarXLSX();
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(produtos.map((p) => ({
      Nome: p.nome, Código: p.codigo, Categoria: p.categoria, Preço: p.preco, Estoque: p.estoque,
      'Nome (IT)': p.nome_it || '', Visível: p.ativo === false ? 'não' : 'sim', Destaque: p.destaque ? 'sim' : ''
    }))), 'Produtos');
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(pedidos.map((p) => ({
      Data: dataBR(p.criadoEm), Pedido: p.id.slice(0, 6).toUpperCase(), Cliente: p.clienteNome, WhatsApp: p.clienteWhatsapp,
      Itens: (p.itens || []).map((i) => `${i.qtd}x ${i.nome}`).join(', '), Total: p.total,
      Entrega: p.entrega, Pagamento: p.pagamento || '', Pago: p.pago ? 'sim' : 'não', Status: STATUS[p.status] || p.status
    }))), 'Pedidos');
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(clientes.map((c) => {
      const peds = pedidos.filter((p) => p.clienteId === c.id && p.status !== 'cancelado');
      const e = c.endereco || {};
      return {
        Nome: c.nome, 'E-mail': c.email, WhatsApp: c.whatsapp,
        Endereço: [e.rua, e.cap, e.cidade, e.complemento].filter(Boolean).join(', '),
        Pedidos: peds.length, 'Total gasto': peds.reduce((s, p) => s + (Number(p.total) || 0), 0)
      };
    })), 'Clientes');
    X.writeFile(wb, `loja-${hoje()}.xlsx`);
  } catch (err) { toast('Erro ao exportar: ' + err.message, 'erro'); }
});

registrarSW();
