// Detecta se é localhost ou produção (para a API)
const IS_LOCALHOST = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = IS_LOCALHOST 
    ? "http://localhost:3000/api" 
    : "https://site-de-roupas-production.up.railway.app/api";

// Estado Global
let lojaConfig = null;
let produtos = [];
let carrinho = [];

// 1. Descobrir qual loja carregar
// O usuário acessa: site.com/loja/?loja=minha-loja-top
const urlParams = new URLSearchParams(window.location.search);
const slugLoja = urlParams.get('loja'); // Pega "minha-loja-top"

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (!slugLoja) {
        document.body.innerHTML = "<h1 style='text-align:center; margin-top:50px'>Loja não encontrada na URL.<br><small>Use: ?loja=slug-da-loja</small></h1>";
        return;
    }
    carregarLoja();
});

// 2. Busca dados da Loja e Produtos
async function carregarLoja() {
    try {
        // Busca Configuração da Loja (Rota pública que precisamos criar/verificar)
        // Nota: Vamos usar a rota de produtos que já deve trazer dados da loja ou fazer uma específica
        // Para simplificar, vamos assumir que a rota de vitrine traz tudo
        
        const res = await fetch(`${API_BASE}/loja/vitrine/${slugLoja}`);
        if (!res.ok) throw new Error("Loja não encontrada");

        const dados = await res.json();
        lojaConfig = dados.loja;
        produtos = dados.produtos;

        aplicarIdentidadeVisual();
        renderizarProdutos();

    } catch (err) {
        console.error(err);
        document.getElementById('loading').innerHTML = `
            <div style="color:red">
                <i class="fas fa-store-slash"></i><br>
                Não conseguimos carregar a loja <strong>"${slugLoja}"</strong>.
            </div>`;
    }
}

// 3. Aplica Cor e Logo
function aplicarIdentidadeVisual() {
    document.title = lojaConfig.nomeLoja;
    document.getElementById('store-name').innerText = lojaConfig.nomeLoja;
    
    // Atualiza a cor principal (CSS Variable)
    document.documentElement.style.setProperty('--primary', lojaConfig.corPrimaria || '#000');
    
    if (lojaConfig.logoUrl) {
        document.getElementById('store-logo').src = lojaConfig.logoUrl;
    } else {
        document.getElementById('store-logo').style.display = 'none';
    }
}

// 4. Renderiza Produtos na Tela
function renderizarProdutos() {
    const grid = document.getElementById('products-grid');
    document.getElementById('loading').style.display = 'none';

    if (produtos.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center">Nenhum produto cadastrado nesta loja ainda.</p>';
        return;
    }

    grid.innerHTML = produtos.map(p => {
        // Se tiver variações, pega o menor preço ou padrão
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

// 5. Lógica do Carrinho
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
            // Se tiver variação, teria que abrir modal de escolha, vamos simplificar:
            variacao: produto.variacoes && produto.variacoes.length > 0 ? produto.variacoes[0].tamanho : 'Único' 
        });
    }

    atualizarCarrinhoUI();
    toggleCart(); // Abre o carrinho automaticamente
    
    Toastify({
        text: "Produto adicionado!",
        duration: 2000,
        style: { background: lojaConfig.corPrimaria || "#000" }
    }).showToast();
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

// 6. Finalizar no WhatsApp
function finalizarCompraWhatsApp() {
    if (carrinho.length === 0) return alert("Seu carrinho está vazio!");
    
    const nome = document.getElementById('cliente-nome').value;
    if (!nome) return alert("Por favor, digite seu nome.");

    if (!lojaConfig.whatsapp) return alert("Esta loja não configurou um WhatsApp para vendas.");

    // Monta a mensagem
    let msg = `*NOVO PEDIDO - ${lojaConfig.nomeLoja}*\n`;
    msg += `👤 Cliente: ${nome}\n\n`;
    msg += `*Itens do Pedido:*\n`;

    carrinho.forEach(item => {
        msg += `▪ ${item.qtd}x ${item.titulo} (${item.variacao}) - R$ ${(item.preco * item.qtd).toFixed(2)}\n`;
    });

    const total = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    msg += `\n*TOTAL: R$ ${total.toFixed(2)}*`;
    msg += `\n\nAguardo confirmação!`;

    // Cria o link e abre
    const link = `https://wa.me/${lojaConfig.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
}