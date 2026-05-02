// app.js
window.App = {
    currentChatId: null,
    messages: [],
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

        const chats = window.Storage.getChats();
        if (chats.length === 0) {
            this.loadChat(window.Storage.createChat('Novo chat'));
        } else {
            this.loadChat(chats[0].id);
        }

        window.addEventListener('reprocessarIniciar', (e) => {
            const { intervaloMs } = e.detail;
            this.criarOverlayProgresso();
            window._cancelarReprocesso = false;

            window.Library.reprocessarEmLotes(1, intervaloMs, (progresso) => {
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

    bindEvents() {
        this.dom.newChatBtn.onclick = () => {
            const chats = window.Storage.getChats();
            this.loadChat(window.Storage.createChat(`Chat ${chats.length + 1}`));
            this.dom.sidebar.classList.remove('open');
        };

        this.dom.clearAllBtn.onclick = () => {
            if (confirm('⚠️ Apagar TODAS as conversas?')) {
                window.Storage.clearAll();
                this.init();
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

    loadChat(id) {
        this.currentChatId = id;
        this.messages = window.Storage.getMessages(id);
        this.renderHistory();
        this.renderMessages();
    },

    updateTitleUI(chatId, newTitle) {
        window.Storage.updateChatTitle(chatId, newTitle);
        if (this.currentChatId === chatId) {
            this.dom.chatTitle.textContent = newTitle;
        }
        this.renderHistory();
    },

    renderHistory() {
        const chats = window.Storage.getChats();
        this.dom.historyList.innerHTML = '';

        if (!chats.length) {
            this.dom.historyList.innerHTML = '<div class="history-empty">Nenhum chat.<br>Clique em + novo chat</div>';
            return;
        }

        chats.forEach(chat => {
            if (chat.id === this.currentChatId) this.dom.chatTitle.textContent = chat.title;

            const div = document.createElement('div');
            div.className = `history-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            div.innerHTML = `<span class="item-text">${this.escapeHTML(chat.title)}</span><button class="delete-history" title="Apagar">✕</button>`;

            div.onclick = () => {
                if (this.currentChatId !== chat.id) {
                    this.loadChat(chat.id);
                    if (window.innerWidth <= 640) this.dom.sidebar.classList.remove('open');
                }
            };

            div.querySelector('.delete-history').onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Excluir "${chat.title}"?`)) {
                    window.Storage.deleteChat(chat.id);
                    if (this.currentChatId === chat.id) this.init();
                    else this.renderHistory();
                }
            };
            this.dom.historyList.appendChild(div);
        });
    },

    renderMessages() {
        this.dom.chatArea.innerHTML = '';
        if (this.messages.length === 0) {
            this.appendMessageUI('bot', 'Olá! Eu sou o lowmanager. Como posso ajudar?');
            return;
        }
        this.messages.forEach(msg => this.appendMessageUI(msg.role, msg.content));
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

        const currentChat = window.Storage.getChats().find(c => c.id === this.currentChatId);
        const isDefaultTitle = currentChat && (currentChat.title.startsWith('Novo chat') || currentChat.title.startsWith('Chat '));

        this.messages.push({ role: 'user', content: text });
        window.Storage.saveMessages(this.currentChatId, this.messages);

        if (this.messages.length <= 2) this.renderMessages();
        else this.appendMessageUI('user', text);

        this.scrollToBottom();
        this.showTypingIndicator();

        // Usa o ErrorHandler para proteger a resposta
        const botReply = await this.getBotReply(text, isDefaultTitle);

        this.removeTypingIndicator();
        const botEl = this.createBotMsgPlaceholder();
        await this.typeEffect(botEl, botReply, 15);

        this.messages.push({ role: 'bot', content: botReply });
        window.Storage.saveMessages(this.currentChatId, this.messages);

        this.isTyping = false;
        this.dom.input.disabled = false;
        this.dom.sendBtn.disabled = false;
        this.dom.input.focus();
    },

    /**
     * Obtém a resposta do bot (comando ou orquestrador), com proteção contra null.
     * @param {string} text - mensagem do usuário
     * @param {boolean} isDefaultTitle - se o título ainda é padrão
     * @returns {Promise<string>} resposta final segura
     */
    async getBotReply(text, isDefaultTitle) {
        // Comandos diretos ($)
        if (text.startsWith('$')) {
            const reply = text.trim().startsWith('$memorizar')
            ? await window.Memorizer.memorize(this.messages)
            : await window.Commands.execute(text);

            if (text.startsWith('$wiki') && isDefaultTitle) {
                const term = text.replace('$wiki', '').trim() || 'Busca livre';
                this.updateTitleUI(this.currentChatId, `Wiki: ${term}`);
            }

            return window.ErrorHandler.safeString(reply);
        }

        // Fluxo normal com orquestrador
        const reply = await window.Orchestrator.process(text, this.messages);

        if (isDefaultTitle) {
            window.API.generateTitle(text).then(newTitle => {
                if (newTitle) this.updateTitleUI(this.currentChatId, newTitle);
            });
        }

        return window.ErrorHandler.safeString(reply);
    },

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

    async typeEffect(element, text, speed) {
        element.textContent = '';
        for (let i = 0; i < text.length; i++) {
            element.textContent += text[i];
            if (i % 6 === 0) this.scrollToBottom();
            await new Promise(r => setTimeout(r, speed));
        }
        this.scrollToBottom();
    },

    scrollToBottom() {
        this.dom.chatArea.scrollTop = this.dom.chatArea.scrollHeight;
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    criarOverlayProgresso() {
        const old = document.getElementById('progressoOverlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'progressoOverlay';
        overlay.style.cssText = `
        position: fixed; bottom: 80px; right: 20px;
        background: var(--bg-panel); border: 1px solid var(--accent);
        border-radius: 8px; padding: 10px 16px;
        font-family: var(--font-mono); font-size: 0.8rem;
        color: var(--text-primary); z-index: 1000;
        min-width: 220px; box-shadow: 0 0 12px rgba(0,212,168,0.2);
        `;

        overlay.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span>🔄 Reprocessando...</span>
        <span id="progressoPorcentagem">0%</span>
        </div>
        <div style="background:var(--bg-surface); border-radius:4px; height:6px; overflow:hidden;">
        <div id="progressoBarra" style="width:0%; height:100%; background:var(--accent); transition: width 0.3s;"></div>
        </div>
        <div id="progressoTexto" style="margin-top:4px; font-size:0.7rem; color:var(--text-mid);">0 de 0 chunks</div>
        <button id="cancelarReprocesso" style="margin-top:6px; background:none; border:1px solid var(--danger); color:var(--danger); border-radius:4px; padding:2px 8px; cursor:pointer; font-size:0.7rem;">Cancelar</button>
        `;

        document.body.appendChild(overlay);

        document.getElementById('cancelarReprocesso').onclick = () => {
            window._cancelarReprocesso = true;
            overlay.remove();
        };
    },

    atualizarProgresso(data) {
        const barra = document.getElementById('progressoBarra');
        const porcentagem = document.getElementById('progressoPorcentagem');
        const texto = document.getElementById('progressoTexto');
        if (barra && porcentagem && texto) {
            barra.style.width = `${data.porcentagem}%`;
            porcentagem.textContent = `${data.porcentagem}%`;
            texto.textContent = `${data.processados} de ${data.total} chunks`;
        }
    }
};

// Inicialização segura (fora do objeto)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.App.init());
} else {
    window.App.init();
}
