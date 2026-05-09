// app.js
// ============================================================
// Interface visual do lowmanager
// Responsável apenas por DOM, eventos e animações
// ============================================================

window.App = {
    isTyping: false,

    dom: {
        historyList: document.getElementById('historyContainer'),
        chatArea: document.getElementById('chatMessages'),
        input: document.getElementById('chatInput'),
        sendBtn: document.getElementById('sendBtn'),
        newChatBtn: document.getElementById('newChatBtn'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        chatTitle: document.getElementById('chatTitle'),
        modelBadge: document.getElementById('modelBadge'),
        modelInput: document.getElementById('modelInput'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        modelSetBtn: document.getElementById('modelSetBtn'),
        apiKeyBtn: document.getElementById('apiKeyBtn'),
        sidebar: document.getElementById('sidebar'),
        menuToggleBtn: document.getElementById('menuToggleBtn')
    },

    init() {
        this.setupConfig();
        this.bindEvents();

        // Inicializa o Core (lógica) e carrega o chat inicial
        const chatId = window.Core.init();
        // Atualiza UI com o chat carregado
        this.refreshAfterLoad(chatId);

        // Listener para reprocessamento (overlay gerenciado aqui)
        window.addEventListener('reprocessarIniciar', (e) => {
            const { intervaloMs } = e.detail;
            this.criarOverlayProgresso();
            window._cancelarReprocesso = false;

            window.Core.reprocessar(intervaloMs, (progresso) => {
                if (window._cancelarReprocesso) {
                    throw new Error('CANCELADO');
                }
                this.atualizarProgresso(progresso);
            }).then(result => {
                const overlay = document.getElementById('progressoOverlay');
                if (overlay) overlay.remove();
                console.log(`✅ Reprocessamento concluído: ${result.processados} chunks.`);
            }).catch(err => {
                if (err.message !== 'CANCELADO') console.error(err);
                const overlay = document.getElementById('progressoOverlay');
                if (overlay) overlay.remove();
            });
        });
    },

    /**
     * Atualiza toda a UI com base no chat ativo (vindo do Core)
     */
    refreshAfterLoad(chatId) {
        const state = window.Core.getCurrentChatState();
        this.renderHistory();
        this.renderMessages(state.messages);
    },

    bindEvents() {
        this.dom.newChatBtn.onclick = () => {
            const chats = window.Core.getChatList();
            const newChat = window.Core.createChat(`Chat ${chats.length + 1}`);
            window.Core.loadChat(newChat.id);
            this.refreshAfterLoad(newChat.id);
            this.dom.sidebar.classList.remove('open');
        };

        this.dom.clearAllBtn.onclick = () => {
            if (confirm('⚠️ Apagar TODAS as conversas?')) {
                window.Storage.clearAll();
                // Re-inicializa
                const id = window.Core.init();
                this.refreshAfterLoad(id);
            }
        };

        this.dom.sendBtn.onclick = () => this.handleSend();

        this.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        this.dom.input.addEventListener('input', () => {
            this.dom.input.style.height = 'auto';
            this.dom.input.style.height = Math.min(this.dom.input.scrollHeight, 140) + 'px';
        });

        this.dom.menuToggleBtn.onclick = () => this.dom.sidebar.classList.toggle('open');
    },

    setupConfig() {
        const conf = window.Storage.getConfig();
        this.dom.modelInput.value = conf.model;
        this.dom.apiKeyInput.value = conf.apiKey ? '••••••••' : '';
        this.dom.modelBadge.textContent = conf.model.split('/').pop();

        const saveFn = (btn) => {
            const m = this.dom.modelInput.value.trim();
            const k = this.dom.apiKeyInput.value.trim();
            const finalKey = (k && k !== '••••••••') ? k : window.Storage.getConfig().apiKey;

            window.Storage.setConfig(finalKey, m);
            this.dom.apiKeyInput.value = finalKey ? '••••••••' : '';
            this.dom.modelBadge.textContent = m.split('/').pop();

            btn.textContent = '✓';
            btn.classList.add('saved');
            setTimeout(() => { btn.textContent = 'ok'; btn.classList.remove('saved'); }, 1000);
        };

        this.dom.modelSetBtn.onclick = () => saveFn(this.dom.modelSetBtn);
        this.dom.apiKeyBtn.onclick = () => saveFn(this.dom.apiKeyBtn);
    },

    renderHistory() {
        const chats = window.Core.getChatList();
        this.dom.historyList.innerHTML = '';

        if (!chats.length) {
            this.dom.historyList.innerHTML = '<div class="history-empty">Nenhum chat.<br>Clique em + novo chat</div>';
            return;
        }

        const currentId = window.Core.getCurrentChatState().chatId;

        chats.forEach(chat => {
            if (chat.id === currentId) this.dom.chatTitle.textContent = chat.title;

            const div = document.createElement('div');
            div.className = `history-item ${chat.id === currentId ? 'active' : ''}`;
            div.innerHTML = `<span class="item-text">${this.escapeHTML(chat.title)}</span><button class="delete-history" title="Apagar">✕</button>`;

            div.onclick = () => {
                if (currentId !== chat.id) {
                    window.Core.loadChat(chat.id);
                    this.refreshAfterLoad(chat.id);
                    if (window.innerWidth <= 640) this.dom.sidebar.classList.remove('open');
                }
            };

            div.querySelector('.delete-history').onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Excluir "${chat.title}"?`)) {
                    const remaining = window.Core.deleteChat(chat.id);
                    this.refreshAfterLoad(remaining);
                }
            };
            this.dom.historyList.appendChild(div);
        });
    },

    renderMessages(messages) {
        this.dom.chatArea.innerHTML = '';
        if (!messages || messages.length === 0) {
            this.appendMessageUI('bot', 'Olá! Eu sou o lowmanager. Como posso ajudar?');
            return;
        }
        messages.forEach(msg => this.appendMessageUI(msg.role, msg.content));
        this.scrollToBottom();
    },

    appendMessageUI(role, content) {
        const div = document.createElement('div');
        div.className = `message ${role === 'user' ? 'user' : ''}`;
        div.innerHTML = `
        <div class="message-avatar">${role === 'bot' ? 'lm' : 'vc'}</div>
        <div class="message-content">
        <div class="message-name">${role === 'bot' ? 'lowmanager' : 'você'}</div>
        <div class="message-text ${role === 'bot' ? 'bot-msg' : ''}">${this.escapeHTML(content)}</div>
        </div>`;
        this.dom.chatArea.appendChild(div);
    },

    async handleSend() {
        const text = this.dom.input.value.trim();
        if (!text || this.isTyping) return;

        this.dom.input.value = '';
        this.dom.input.style.height = 'auto';
        this.dom.input.disabled = true;
        this.dom.sendBtn.disabled = true;
        this.isTyping = true;

        // Mostra a mensagem do usuário imediatamente na tela
        this.appendMessageUI('user', text);
        this.scrollToBottom();

        this.showTypingIndicator();

        // Envia para processamento lógico
        const result = await window.Core.processUserMessage(text);

        this.removeTypingIndicator();

        if (result && result.reply) {
            const botEl = this.createBotMsgPlaceholder();

            // ───── DIGITAÇÃO DINÂMICA (resolvendo o problema do $web) ─────
            await this.typewriterDinamico(botEl, result.reply, {
                baseSpeed: 30,
                maxTime: 45000
            });
            // ──────────────────────────────────────────────────────────────

            // Memorização automática (caso exista)
            window.Core.autoMemorizeIfNeeded(text, result.reply);

            // Atualiza título se necessário
            if (result.shouldUpdateTitle && result.newTitle) {
                this.dom.chatTitle.textContent = result.newTitle;
                this.renderHistory();
            }
        } else {
            // fallback caso dê erro
            const botEl = this.createBotMsgPlaceholder();
            botEl.textContent = 'Sem resposta.';
        }

        this.isTyping = false;
        this.dom.input.disabled = false;
        this.dom.sendBtn.disabled = false;
        this.dom.input.focus();
    },

    // =================== EFEITOS VISUAIS ===================

    showTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'message';
        div.id = 'typingIndicator';
        div.innerHTML = `
        <div class="message-avatar">lm</div>
        <div class="message-content">
        <div class="message-name">lowmanager</div>
        <div class="message-text bot-msg typing-indicator"><span></span><span></span><span></span></div>
        </div>`;
        this.dom.chatArea.appendChild(div);
        this.scrollToBottom();
    },

    removeTypingIndicator() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    },

    createBotMsgPlaceholder() {
        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = `
        <div class="message-avatar">lm</div>
        <div class="message-content">
        <div class="message-name">lowmanager</div>
        <div class="message-text bot-msg"></div>
        </div>`;
        this.dom.chatArea.appendChild(div);
        return div.querySelector('.message-text');
    },

    /**
     * Digitação adaptativa – velocidade cresce se o texto for muito longo.
     * @param {HTMLElement} element - container do texto
     * @param {string} text - texto completo
     * @param {Object} options - { baseSpeed: ms/caractere, maxTime: tempo máximo total }
     */
    async typewriterDinamico(element, text, options = {}) {
        const { baseSpeed = 30, maxTime = 45000 } = options;

        element.textContent = '';
        const totalChars = text.length;
        if (totalChars === 0) return;

        const startTime = Date.now();
        let index = 0;

        return new Promise(resolve => {
            const tick = () => {
                if (index >= totalChars) {
                    this.scrollToBottom();
                    resolve();
                    return;
                }

                const remaining = totalChars - index;
                const elapsed = Date.now() - startTime;
                const timeLeft = maxTime - elapsed;

                if (timeLeft <= 0) {
                    // Estourou o tempo: exibe o restante de uma vez
                    element.textContent += text.slice(index);
                    this.scrollToBottom();
                    resolve();
                    return;
                }

                // Ajusta velocidade para terminar dentro do tempo restante
                let speed = Math.min(baseSpeed, timeLeft / remaining);
                speed = Math.max(5, speed); // não mais rápido que 5ms

                element.textContent += text[index];
                index++;

                if (index % 6 === 0) this.scrollToBottom();

                setTimeout(tick, speed);
            };
            tick();
        });
    },

    criarOverlayProgresso() { /* ... igual ao original ... */ },
    atualizarProgresso(data) { /* ... igual ao original ... */ },

    // =================== UTILITÁRIOS ===================
    scrollToBottom() {
        this.dom.chatArea.scrollTop = this.dom.chatArea.scrollHeight;
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Inicialização segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.App.init());
} else {
    window.App.init();
}