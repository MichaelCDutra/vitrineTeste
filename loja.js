// =============================================================
// CONFIGURAÇÕES GERAIS
// =============================================================

// Detecta se é localhost ou produção (para a API)
const IS_LOCALHOST = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = IS_LOCALHOST 
    ? "http://localhost:3000/api" 
    : "https://site-de-roupas-production.up.railway.app/api";

// Estado Global
let lojaConfig = null;
let produtos = [];
let carrinho = [];

// =============================================================
// INICIALIZAÇÃO
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    carregarLoja();
});

async function carregarLoja() {
    try {
        // LÓGICA DE IDENTIFICAÇÃO INTELIGENTE 🧠
        
        // 1. Tenta pegar o parametro ?loja=... (Prioridade para testes ou links diretos)
        const urlParams = new URLSearchParams(window.location.search);
        const slugParam = urlParams.get('loja');
        
        // 2. Tenta pegar o domínio atual (ex: michaelcdutra.github.io ou paulosotre.com.br)
        const dominioAtual = window.location.hostname;

        // Decisão: Se tem slug na URL, usa o slug. Se não, usa o domínio.
        const identificador = slugParam ? slugParam : dominioAtual;

        console.log("Enviando identificador para API:", identificador);

        // Chama a rota inteligente que busca por Slug OU Domínio
        const res = await fetch(`${API_BASE}/loja/vitrine/dados?host=${identificador}`);
        
        if (!res.ok) throw new Error("Loja não encontrada");

        const dados = await res.json();
        lojaConfig = dados.loja;
        produtos = dados.produtos;

        aplicarIdentidadeVisual();
        renderizarProdutos();

    } catch (err) {
        console.error(err);
        document.body.innerHTML = `
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h1>Ops! Loja não encontrada.</h1>
                <p>Tentamos acessar via: <strong>${window.location.hostname}</strong></p>
                <p>Verifique se o domínio foi cadastrado corretamente no painel Admin.</p>
                <br>
                <small style="color:gray">Erro técnico: ${err.message}</small>
            </div>`;
    }
}

// =============================================================
// FUNÇÕES DE UI (Visual)
// =============================================================

// 1. Aplica Cor e Logo
function aplicarIdentidadeVisual() {
    document.title = lojaConfig.nomeLoja;
    document.getElementById('store-name').innerText = lojaConfig.nomeLoja;
    
    // Atualiza a cor principal (CSS Variable)
    document.documentElement.style.setProperty('--primary', lojaConfig.corPrimaria || '#000');
    
    if (lojaConfig.logoUrl) {
        const logo = document.getElementById('store-logo');
        logo.src = lojaConfig.logoUrl;
        logo.style.display = 'block';
    } else {
        document.getElementById('store-logo').style.display = 'none';
    }
}

// 2. Renderiza Produtos na Tela
function renderizarProdutos() {
    const grid = document.getElementById('products-grid');
    document.getElementById('loading').style.display = 'none';

    if (produtos.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center">Nenhum produto cadastrado nesta loja ainda.</p>';
        return;
    }

    grid.innerHTML = produtos.map(p => {
        const imagem = p.image || 'https://via.placeholder.com/300?text=Sem+Foto';
        // JSON Seguro para passar na função onclick
        const prodString = JSON.stringify(p).replace(/"/g, "&quot;");

        return `
            <div class="product-card">
                <div class="img-container">
                    <img src="${imagem}" class="product-img" loading="lazy">
                </div>
                <div class="info">
                    <span class="price">R$ ${parseFloat(p.preco).toFixed(2)}</span>
                    <h3 class="title">${p.titulo}</h3>
                    <button class="btn-add" onclick="adicionarAoCarrinho(${prodString})">
                        <i class="fas fa-shopping-bag"></i> Comprar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================================
// LÓGICA DO CARRINHO
// =============================================================

function toggleCart() {
    document.getElementById('cart-modal').classList.toggle('open');
}

function adicionarAoCarrinho(produto) {
    // Verifica se já está no carrinho
    const itemExistente = carrinho.find(item => item.id === produto.id);

    if (itemExistente) {
        itemExistente.qtd++;
    } else {
        carrinho.push({
            id: produto.id,
            titulo: produto.titulo,
            preco: parseFloat(produto.preco),
            img: produto.image,
            qtd: 1,
            variacao: produto.variacoes && produto.variacoes.length > 0 ? produto.variacoes[0].tamanho : 'Único' 
        });
    }

    atualizarCarrinhoUI();
    toggleCart(); // Abre o carrinho automaticamente
    
    // Notificação Toastify
    if(typeof Toastify === 'function'){
        Toastify({
            text: "Produto adicionado!",
            duration: 2000,
            style: { background: lojaConfig.corPrimaria || "#000" }
        }).showToast();
    }
}

function removerItem(id) {
    carrinho = carrinho.filter(i => i.id !== id);
    atualizarCarrinhoUI();
}

function alterarQtd(id, delta) {
    const item = carrinho.find(i => i.id === id);
    if (item) {
        item.qtd += delta;
        if (item.qtd <= 0) removerItem(id);
        else atualizarCarrinhoUI();
    }
}

function atualizarCarrinhoUI() {
    const container = document.getElementById('cart-items');
    const contador = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total-price');

    // Contador
    const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    contador.innerText = totalItens;

    // Total em Reais
    const totalValor = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    totalEl.innerText = totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Renderiza Lista
    if (carrinho.length === 0) {
        container.innerHTML = '<div class="empty-cart">Carrinho vazio :(</div>';
        return;
    }

    container.innerHTML = carrinho.map(item => `
        <div class="cart-item">
            <img src="${item.img || 'https://via.placeholder.com/50'}" alt="img">
            <div class="cart-details">
                <h4>${item.titulo}</h4>
                <small>Tam: ${item.variacao}</small>
                <div class="cart-controls">
                    <button class="qtd-btn" onclick="alterarQtd('${item.id}', -1)">-</button>
                    <span>${item.qtd}</span>
                    <button class="qtd-btn" onclick="alterarQtd('${item.id}', 1)">+</button>
                    <button class="qtd-btn" onclick="removerItem('${item.id}')" style="color:red; margin-left:auto"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div style="font-weight:bold;">
                R$ ${(item.preco * item.qtd).toFixed(2)}
            </div>
        </div>
    `).join('');
}

// =============================================================
// CHECKOUT WHATSAPP
// =============================================================

async function finalizarCompraWhatsApp() {
    if (carrinho.length === 0) return alert("Seu carrinho está vazio!");
    
    const nome = document.getElementById('cliente-nome').value;
    const zapCliente = document.getElementById('cliente-zap').value; // Novo campo

    if (!nome || !zapCliente) return alert("Por favor, preencha seu nome e WhatsApp.");

    // Trava o botão para evitar duplo clique
    const btn = document.getElementById('btn-checkout');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    btn.disabled = true;

    try {
        // 1. Prepara os dados para a API
        const payload = {
            // Usa o identificador que já descobrimos ao carregar a loja
            slug: new URLSearchParams(window.location.search).get('loja') || window.location.hostname,
            clienteNome: nome,
            clienteWhatsapp: zapCliente,
            itens: carrinho.map(item => ({
                produtoId: item.id,
                quantidade: item.qtd,
                tamanho: item.variacao
            }))
        };

        // 2. Envia para o Backend salvar (Desconta estoque e cria pedido)
        const res = await fetch(`${API_BASE}/loja/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const erro = await res.json();
            throw new Error(erro.error || "Erro ao processar pedido.");
        }

        const data = await res.json(); // Sucesso! Recebemos o ID do pedido

        // 3. Monta a mensagem do WhatsApp (Agora com número do pedido!)
        let msg = `*NOVO PEDIDO #${data.pedidoId} - ${lojaConfig.nomeLoja}*\n`;
        msg += `👤 Cliente: ${nome}\n`;
        msg += `📱 Contato: ${zapCliente}\n\n`;
        msg += `*Resumo da Compra:*\n`;

        carrinho.forEach(item => {
            msg += `▪ ${item.qtd}x ${item.titulo} (${item.variacao}) - R$ ${(item.preco * item.qtd).toFixed(2)}\n`;
        });

        msg += `\n*TOTAL: R$ ${data.total.toFixed(2)}*`;
        msg += `\n\nAguardo confirmação e chave Pix!`;

        // 4. Limpa o carrinho local
        carrinho = [];
        atualizarCarrinhoUI();
        toggleCart(); // Fecha modal
        alert("Pedido realizado com sucesso! Vamos te redirecionar para o WhatsApp.");

        // 5. Abre o WhatsApp
        const link = `https://wa.me/${lojaConfig.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(link, '_blank');

    } catch (err) {
        console.error(err);
        alert("Ops: " + err.message);
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}