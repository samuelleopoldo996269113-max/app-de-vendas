// Textos da loja em português e italiano
const TEXTOS = {
  pt: {
    entrar: 'Entrar', conta: 'Conta', buscar: 'Buscar produto...', todas: 'Todas',
    carregando: 'Carregando produtos...', nenhum: 'Nenhum produto encontrado.',
    erroProdutos: 'Não foi possível carregar os produtos.',
    adicionar: 'Adicionar', adicionarCarrinho: 'Adicionar ao carrinho', adicionado: 'Adicionado ao carrinho',
    pronta: 'Pronta entrega · {n} un.', encomenda: 'Sob encomenda', cod: 'Cód.', codigo: 'Código',
    demo: 'Modo demonstração: o Firebase ainda não foi configurado (veja o README).',
    demoPedido: 'Modo demonstração: configure o Firebase para fazer pedidos.',
    carrinho: 'Seu carrinho', total: 'Total', carrinhoVazio: 'Seu carrinho está vazio.',
    dicaEncomenda: 'Itens acima do estoque disponível entram como <b>sob encomenda</b>.',
    finalizar: 'Finalizar pedido',
    loginTitulo: 'Entrar ou criar conta', loginDica: 'Para fazer pedidos você precisa de uma conta.',
    email: 'E-mail', senha: 'Senha', criarConta: 'Criar conta', ou: 'ou', google: 'Entrar com Google',
    esqueci: 'Esqueci minha senha', digiteEmail: 'Digite seu e-mail acima primeiro.',
    emailReset: 'Enviamos um e-mail para redefinir a senha.',
    seusDados: 'Seus dados', nome: 'Nome completo', whats: 'WhatsApp (com código do país)',
    rua: 'Endereço (rua e número)', cidade: 'Cidade', cap: 'CAP (CEP)', comp: 'Complemento / referência',
    aceito: 'Li e aceito o', avisoPriv: 'aviso de privacidade', salvar: 'Salvar', dadosSalvos: 'Dados salvos!',
    erroSalvar: 'Erro ao salvar: ',
    finalizarTitulo: 'Finalizar pedido', entrega: '🚚 Entrega', retirar: '🏠 Retirar',
    enderecoEntrega: 'Endereço de entrega', obs: 'Observação (opcional)', obsPh: 'Ex.: melhor horário, presente...',
    pagamento: 'Pagamento', pagDinheiro: '💶 Dinheiro', pagPaypal: '🅿️ PayPal',
    pagDinheiroDica: 'Pagamento em dinheiro na entrega ou na retirada.',
    pagPaypalDica: 'Depois de confirmar, aparece o botão para pagar pelo PayPal.',
    confirmar: 'Confirmar pedido', erroPedido: 'Não foi possível enviar o pedido: ',
    sucessoTitulo: 'Pedido enviado! 🎉',
    sucessoTexto: 'Recebemos seu pedido. Você pode acompanhar o andamento em <b>Meus pedidos</b>.',
    pagarPaypal: 'Pagar {v} com PayPal', falarWhats: 'Falar com a loja no WhatsApp', verPedidos: 'Ver meus pedidos',
    minhaConta: 'Minha conta', meusPedidos: '📦 Meus pedidos', meusDados: '✏️ Meus dados', sair: 'Sair', saiu: 'Você saiu.',
    privTitulo: 'Aviso de privacidade', semPedidos: 'Você ainda não fez pedidos.', carregandoP: 'Carregando...',
    erroCarregar: 'Erro ao carregar: ', retiradaTxt: 'Retirada', entregaTxt: 'Entrega', sobEncomenda: 'sob encomenda',
    whatsMsg: 'Olá! Acabei de fazer o pedido #{id} no site.',
    compartilhar: 'Compartilhar', linkCopiado: 'Link copiado!', destaque: '⭐ Destaque', promocao: '🔥 Promoção',
    senhaFraca: 'Senha fraca. Falta: {f}.', faltaMin: '{n} caracteres', faltaMinusc: 'letra minúscula',
    faltaMaiusc: 'letra maiúscula', faltaNum: 'número', dicaSenha: 'Mínimo 8 caracteres, com maiúscula, minúscula e número.',
    status: { recebido: 'Recebido', separando: 'Separando', saiu: 'Saiu para entrega', pronto: 'Pronto para retirar', entregue: 'Entregue', cancelado: 'Cancelado' },
    privacidade: 'Seus dados (nome, WhatsApp, e-mail e endereço) são usados apenas para processar e entregar seus pedidos e para entrar em contato sobre eles. Não são vendidos nem repassados a terceiros. Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados falando com a loja.'
  },
  it: {
    entrar: 'Accedi', conta: 'Account', buscar: 'Cerca prodotto...', todas: 'Tutti',
    carregando: 'Caricamento prodotti...', nenhum: 'Nessun prodotto trovato.',
    erroProdutos: 'Impossibile caricare i prodotti.',
    adicionar: 'Aggiungi', adicionarCarrinho: 'Aggiungi al carrello', adicionado: 'Aggiunto al carrello',
    pronta: 'Disponibile subito · {n} pz.', encomenda: 'Su ordinazione', cod: 'Cod.', codigo: 'Codice',
    demo: 'Modalità demo: Firebase non è ancora configurato.',
    demoPedido: 'Modalità demo: configura Firebase per fare ordini.',
    carrinho: 'Il tuo carrello', total: 'Totale', carrinhoVazio: 'Il carrello è vuoto.',
    dicaEncomenda: 'Gli articoli oltre la disponibilità vengono <b>ordinati su richiesta</b>.',
    finalizar: 'Concludi l\'ordine',
    loginTitulo: 'Accedi o crea un account', loginDica: 'Per ordinare devi avere un account.',
    email: 'E-mail', senha: 'Password', criarConta: 'Crea account', ou: 'oppure', google: 'Accedi con Google',
    esqueci: 'Password dimenticata', digiteEmail: 'Scrivi prima la tua e-mail qui sopra.',
    emailReset: 'Ti abbiamo inviato un\'e-mail per reimpostare la password.',
    seusDados: 'I tuoi dati', nome: 'Nome e cognome', whats: 'WhatsApp (con prefisso internazionale)',
    rua: 'Indirizzo (via e numero civico)', cidade: 'Città', cap: 'CAP', comp: 'Interno / indicazioni',
    aceito: 'Ho letto e accetto l\'', avisoPriv: 'informativa sulla privacy', salvar: 'Salva', dadosSalvos: 'Dati salvati!',
    erroSalvar: 'Errore durante il salvataggio: ',
    finalizarTitulo: 'Concludi l\'ordine', entrega: '🚚 Consegna', retirar: '🏠 Ritiro',
    enderecoEntrega: 'Indirizzo di consegna', obs: 'Note (facoltativo)', obsPh: 'Es.: orario preferito, regalo...',
    pagamento: 'Pagamento', pagDinheiro: '💶 Contanti', pagPaypal: '🅿️ PayPal',
    pagDinheiroDica: 'Pagamento in contanti alla consegna o al ritiro.',
    pagPaypalDica: 'Dopo la conferma apparirà il pulsante per pagare con PayPal.',
    confirmar: 'Conferma ordine', erroPedido: 'Impossibile inviare l\'ordine: ',
    sucessoTitulo: 'Ordine inviato! 🎉',
    sucessoTexto: 'Abbiamo ricevuto il tuo ordine. Puoi seguirlo in <b>I miei ordini</b>.',
    pagarPaypal: 'Paga {v} con PayPal', falarWhats: 'Scrivi al negozio su WhatsApp', verPedidos: 'I miei ordini',
    minhaConta: 'Il mio account', meusPedidos: '📦 I miei ordini', meusDados: '✏️ I miei dati', sair: 'Esci', saiu: 'Sei uscita.',
    privTitulo: 'Informativa sulla privacy', semPedidos: 'Non hai ancora fatto ordini.', carregandoP: 'Caricamento...',
    erroCarregar: 'Errore di caricamento: ', retiradaTxt: 'Ritiro', entregaTxt: 'Consegna', sobEncomenda: 'su ordinazione',
    whatsMsg: 'Ciao! Ho appena fatto l\'ordine #{id} sul sito.',
    compartilhar: 'Condividi', linkCopiado: 'Link copiato!', destaque: '⭐ In evidenza', promocao: '🔥 Offerta',
    senhaFraca: 'Password debole. Manca: {f}.', faltaMin: '{n} caratteri', faltaMinusc: 'lettera minuscola',
    faltaMaiusc: 'lettera maiuscola', faltaNum: 'numero', dicaSenha: 'Minimo 8 caratteri, con maiuscola, minuscola e numero.',
    status: { recebido: 'Ricevuto', separando: 'In preparazione', saiu: 'In consegna', pronto: 'Pronto per il ritiro', entregue: 'Consegnato', cancelado: 'Annullato' },
    privacidade: 'I tuoi dati (nome, WhatsApp, e-mail e indirizzo) sono usati solo per gestire e consegnare i tuoi ordini e per contattarti in merito. Non vengono venduti né ceduti a terzi. Puoi chiedere in qualsiasi momento di vedere, correggere o cancellare i tuoi dati contattando il negozio.'
  }
};

function idiomaInicial() {
  try {
    const salvo = localStorage.getItem('idioma');
    if (salvo === 'pt' || salvo === 'it') return salvo;
  } catch {}
  return (navigator.language || '').toLowerCase().startsWith('it') ? 'it' : 'pt';
}

export let idioma = idiomaInicial();

export function setIdioma(novo) {
  idioma = novo;
  try { localStorage.setItem('idioma', novo); } catch {}
}

export function t(chave, vars = {}) {
  let txt = TEXTOS[idioma]?.[chave] ?? TEXTOS.pt[chave] ?? chave;
  if (typeof txt === 'string') for (const [k, v] of Object.entries(vars)) txt = txt.replace('{' + k + '}', v);
  return txt;
}

// Aplica nos elementos com data-i18n (texto), data-i18n-html (com negrito etc.) e data-i18n-ph (placeholder)
export function traduzirPagina() {
  document.documentElement.lang = idioma === 'it' ? 'it' : 'pt-BR';
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
}

// Nome/descrição do produto no idioma escolhido (se não tiver em italiano, usa o português)
export const nomeProduto = (p) => (idioma === 'it' && p.nome_it) || p.nome || '';
export const descProduto = (p) => (idioma === 'it' && p.descricao_it) || p.descricao || '';
