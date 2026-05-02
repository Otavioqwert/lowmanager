// js/MLO/paragraph-navigator.js
window.ParagraphNavigator = {
    resultados: [],
    indiceAtual: 0,
    termo: '',

    iniciar(termo, resultados) {
        this.resultados = resultados;
        this.indiceAtual = 0;
        this.termo = termo;
        this._injetarEstilos();
        this._criarPainel();   // garante que o contêiner existe
        this.renderizar();
        document.addEventListener('keydown', this._keyHandler);
    },

    _criarPainel() {
        // Se já existe, remove e recria
        const old = document.getElementById('navigatorPanel');
        if (old) old.remove();

        const painel = document.createElement('div');
        painel.id = 'navigatorPanel';
        document.body.appendChild(painel);
    },

    avancar() {
        if (this.indiceAtual < this.resultados.length - 1) {
            this.indiceAtual++;
            this.renderizar();
        }
    },

    voltar() {
        if (this.indiceAtual > 0) {
            this.indiceAtual--;
            this.renderizar();
        }
    },

    fechar() {
        const painel = document.getElementById('navigatorPanel');
        if (painel) painel.remove();
        document.removeEventListener('keydown', this._keyHandler);
    },

    _keyHandler(e) {
        if (e.key === 'ArrowRight' || e.key === 'd') {
            window.ParagraphNavigator.avancar();
        } else if (e.key === 'ArrowLeft' || e.key === 'a') {
            window.ParagraphNavigator.voltar();
        } else if (e.key === 'Escape') {
            window.ParagraphNavigator.fechar();
        }
    },

    renderizar() {
        const painel = document.getElementById('navigatorPanel');
        if (!painel) return;

        const total = this.resultados.length;
        const atual = this.resultados[this.indiceAtual];
        const porcentagem = total > 0 ? Math.round(((this.indiceAtual + 1) / total) * 100) : 0;

        painel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:600; color:var(--accent);">🔍 "${this.termo}"</span>
        <span style="font-size:0.8rem; color:var(--text-mid);">${this.indiceAtual + 1} de ${total}</span>
        </div>
        <div style="background:var(--bg-surface); border-radius:6px; padding:10px; margin-bottom:8px; min-height:80px; font-size:0.9rem; line-height:1.5;">
        <strong>${atual.docTitle}</strong><br><br>
        <span style="color:var(--text-primary);">${this._destacarTermo(atual.paragraph, this.termo)}</span>
        </div>
        <div style="display:flex; gap:8px; justify-content:center;">
        <button id="navAnterior" ${this.indiceAtual === 0 ? 'disabled' : ''} style="background:var(--bg-surface); border:1px solid var(--border-mid); color:var(--text-primary); padding:4px 12px; border-radius:4px; cursor:pointer;">← Anterior</button>
        <button id="navProximo" ${this.indiceAtual === total - 1 ? 'disabled' : ''} style="background:var(--bg-surface); border:1px solid var(--border-mid); color:var(--text-primary); padding:4px 12px; border-radius:4px; cursor:pointer;">Próximo →</button>
        <button id="navFechar" style="background:none; border:1px solid var(--danger); color:var(--danger); padding:4px 12px; border-radius:4px; cursor:pointer;">Fechar</button>
        </div>
        <div style="margin-top:8px; background:var(--bg-surface); border-radius:4px; height:4px; overflow:hidden;">
        <div style="width:${porcentagem}%; height:100%; background:var(--accent); transition: width 0.2s;"></div>
        </div>
        `;

        document.getElementById('navAnterior').onclick = () => this.voltar();
        document.getElementById('navProximo').onclick = () => this.avancar();
        document.getElementById('navFechar').onclick = () => this.fechar();
    },

    _destacarTermo(texto, termo) {
        const regex = new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return texto.replace(regex, '<mark style="background:var(--accent-dim); color:var(--accent); padding:0 2px;">$1</mark>');
    },

    _injetarEstilos() {
        if (document.getElementById('navigatorStyles')) return;
        const style = document.createElement('style');
        style.id = 'navigatorStyles';
        style.textContent = `
        #navigatorPanel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 380px;
        max-height: 70vh;
        background: var(--bg-panel);
        border: 1px solid var(--accent);
        border-radius: 8px;
        padding: 12px;
        z-index: 1000;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
        overflow-y: auto;
        }
        #navigatorPanel button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        }
        `;
        document.head.appendChild(style);
    },

    // Retorna um resumo textual de um lote (para a IA usar)
    async buscarLote(termo, lote, tamanhoLote = 50) {
        const todos = await window.RawStorage.search(termo);
        if (todos.length === 0) return null;

        const inicio = (lote - 1) * tamanhoLote;
        const fim = Math.min(inicio + tamanhoLote, todos.length);
        if (inicio >= todos.length) return null;

        const loteParagrafos = todos.slice(inicio, fim);
        const totalLotes = Math.ceil(todos.length / tamanhoLote);

        // Monta um resumo: primeiras 5 palavras de cada parágrafo
        const linhas = loteParagrafos.map((p, i) => {
            const palavras = p.paragraph.split(/\s+/).slice(0, 5).join(' ');
            return `${inicio + i + 1}. ${palavras}... (${p.docTitle})`;
        }).join('\n');

        return `🔍 Lote ${lote}/${totalLotes} ("${termo}") – parágrafos ${inicio + 1} a ${fim} de ${todos.length}\n${linhas}`;
    }
};
