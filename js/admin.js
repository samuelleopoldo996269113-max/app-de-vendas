// ===================== PAINEL (parte da dona da loja) =====================
import { auth, db, configurado, isAdmin } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch,
  runTransaction, serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  $, $$, euro, esc, norm, parsePreco, parseInteiro, comprimirImagem, toast, STATUS, dataBR,
  linkWhats, erroAuth, registrarSW
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
  ['tela-login', 'tela-sem-acesso', 'tela-demo', 'tela-painel'].forEach((t) => ($('#' + t).hidden = t !== id));
  $('#btn-sair').hidden = !(id === 'tela-painel' || id === 'tela-sem-acesso');
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
    if (acao === 'criar') await createUserWithEmailAndPassword(auth, email, senha);
    else await signInWithEmailAndPassword(auth, email, senha);
  } catch (err) { $('#adm-erro').textContent = erroAuth(err); }
});
$('#btn-sair').addEventListener('click', () => signOut(auth));

if (!configurado) {
  mostrarTela('tela-demo');
} else {
  onAuthStateChanged(auth, (u) => {
    cancelar.splice(0).forEach((f) => f());
    if (!u) return mostrarTela('tela-login');
    if (!isAdmin(u)) return mostrarTela('tela-sem-acesso');
    mostrarTela('tela-painel');
    iniciarPainel();
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
  }));
  cancelar.push(onSnapshot(collection(db, 'clientes'), (s) => {
    clientes = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
    renderClientes();
  }));
  carregarConfig();
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
      <small>${dataBR(p.criadoEm)} · ${p.entrega === 'entrega' ? '🚚 Entrega' : '🏠 Retirada'} · ${p.pago ? '✅ Pago' : '⏳ Não pago'}</small>
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
      <div class="dados"><b>${esc(p.nome)}</b>
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
  $('#p-ativo').checked = p.ativo !== false;
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
    ativo: $('#p-ativo').checked,
    atualizadoEm: serverTimestamp()
  };
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
  estoque: ['estoque', 'quantidade', 'qtd', 'qtde']
};

function mapearLinha(linha) {
  const out = {};
  for (const [chave, valor] of Object.entries(linha)) {
    const k = norm(chave).replace(/[€()]/g, '').trim();
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
    estoque: parseInteiro(out.estoque)
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
  const csv = '﻿nome;codigo;categoria;descricao;preco;estoque\n' +
    'Perfume exemplo 100ml;12345;Perfumaria;Fragrância floral;49,90;2\n' +
    'Hidratante exemplo 200ml;67890;Corpo e banho;Pele macia;18,50;0\n';
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
    const qtdPed = pedidos.filter((p) => p.clienteId === c.id).length;
    const e = c.endereco || {};
    return `<div class="pedido">
      <div class="cab"><b>${esc(c.nome)}</b><small>${qtdPed} pedido(s)</small></div>
      <small>${esc(c.email)} · ${esc(c.whatsapp)}</small>
      ${e.rua ? `<small>${esc(e.rua)}, ${esc(e.cap)} ${esc(e.cidade)} ${e.complemento ? '· ' + esc(e.complemento) : ''}</small>` : ''}
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
  $('#cfg-pagamento').value = c.pagamento || '';
  $('#cfg-priv').value = c.privacidade || '';
}
$('#form-loja').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await setDoc(doc(db, 'config', 'loja'), {
      nome: $('#cfg-nome').value.trim(),
      whatsapp: $('#cfg-whats').value.trim(),
      pagamento: $('#cfg-pagamento').value.trim(),
      privacidade: $('#cfg-priv').value.trim()
    }, { merge: true });
    toast('Dados da loja salvos');
  } catch (err) { toast('Erro: ' + err.message, 'erro'); }
});

registrarSW();
