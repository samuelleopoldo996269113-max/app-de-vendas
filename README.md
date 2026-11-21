# App de Vendas

Loja online com catálogo para as clientes e painel para a dona da loja.

- **Loja (clientes):** `index.html`. Qualquer pessoa vê os produtos e o estoque. Para pedir, a cliente cria a conta (e-mail/senha ou Google), preenche os dados e escolhe entre entrega e retirada.
- **Painel (loja):** `admin.html`. Pedidos, produtos, estoque, importação de planilha e fotos, clientes e configurações.

Feito em HTML, CSS e JavaScript puro, com Firebase (login e banco de dados) e publicado no GitHub Pages.

## Estrutura

```
index.html            loja das clientes
admin.html            painel da loja
css/style.css         visual
js/firebase-config.js ← AQUI vão as chaves do Firebase e o e-mail da loja
js/firebase.js        conexão com o Firebase
js/loja.js            lógica da loja
js/admin.js           lógica do painel
js/util.js            funções em comum
firestore.rules       regras de segurança (copiar para o Firebase)
manifest.json, sw.js, icon.svg   app instalável (PWA)
```

Sem o Firebase configurado, a loja abre em **modo demonstração**, com 3 produtos de exemplo.

## Configurar o Firebase (uma vez só)

1. Acesse https://console.firebase.google.com e clique em **Criar projeto**. O Google Analytics pode ficar desligado.
2. **Authentication** > Começar > ative **E-mail/senha** e **Google**.
3. **Firestore Database** > Criar banco de dados > escolha a região `europe-west` > modo de produção.
4. Em **Firestore > Regras**, cole o conteúdo de `firestore.rules`, **troque o e-mail** pelo da loja e clique em Publicar.
5. **Configurações do projeto** (engrenagem) > Seus apps > ícone **</>** (Web) > registre o app. Copie os valores do `firebaseConfig` para `js/firebase-config.js` e coloque o e-mail da loja em `ADMIN_EMAIL`.
6. **Authentication > Configurações > Domínios autorizados** > adicione `samuelleopoldo996269113-max.github.io`.
7. Abra `admin.html`, clique em **Criar conta da loja (primeira vez)** com o e-mail da loja e preencha a aba **⚙️ Loja**.

> As chaves do `firebaseConfig` podem ficar públicas. Quem protege os dados são as regras do passo 4.

## Publicar no GitHub Pages

Settings > Pages > Branch `main` / pasta `/ (root)` > Save.
No plano gratuito do GitHub, o Pages só funciona com o repositório **público**.

- Loja: `https://samuelleopoldo996269113-max.github.io/app-de-vendas/`
- Painel: `https://samuelleopoldo996269113-max.github.io/app-de-vendas/admin.html`

## Importar produtos

- **Planilha** (.xlsx, .xls, .csv, .ods): colunas `nome`, `codigo`, `categoria`, `descricao`, `preco`, `estoque`. Tem um modelo para baixar no painel. Se o código já existir, o produto é atualizado.
- **Fotos em lote:** o nome do arquivo deve ser o código do produto (ex.: `12345.jpg`).
- **Catálogo PDF ou foto:** abre ao lado do formulário de cadastro.

As fotos são reduzidas e guardadas no próprio banco, para continuar no plano gratuito.

## Próximas etapas (a decidir)

- Pagamento online (Stripe, PayPal, Satispay) ou só na entrega
- Aviso automático do pedido no WhatsApp da loja
- Leitura automática do catálogo em PDF por IA
- Catálogo em italiano
- Domínio próprio
