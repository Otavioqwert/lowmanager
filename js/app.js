// app.js
window.App = {
    currentChatId: null,
    messages:[],
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
                    if(window.innerWidth <= 640) this.dom.sidebar.classList.remove('open');
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

        try {
            let botReply = '';

            // 🧩 Todo comando direto do usuário ($) é tratado aqui
            if (text.startsWith('$')) {
                // $memorizar usa o Memorizer, outros usam Commands
                if (text.trim().startsWith('$memorizar')) {
                    botReply = await window.Memorizer.memorize(this.messages);
                } else {
                    botReply = await window.Commands.execute(text);
                }

                // Se for $wiki e título padrão, atualiza
                if (text.startsWith('$wiki') && isDefaultTitle) {
                    const term = text.replace('$wiki', '').trim() || 'Busca livre';
                    this.updateTitleUI(this.currentChatId, `Wiki: ${term}`);
                }

            } else {
                // ⚡ Fluxo normal com o orquestrador (sempre ativo)
                botReply = await window.Orchestrator.process(text, this.messages);

                // Gerar título se ainda for padrão (apenas quando não for comando)
                if (isDefaultTitle) {
                    window.API.generateTitle(text).then(newTitle => {
                        if (newTitle) this.updateTitleUI(this.currentChatId, newTitle);
                    });
                }
            }

            this.removeTypingIndicator();
            const botEl = this.createBotMsgPlaceholder();
            await this.typeEffect(botEl, botReply, 15);

            this.messages.push({ role: 'bot', content: botReply });
            window.Storage.saveMessages(this.currentChatId, this.messages);

        } catch (e) {
            this.removeTypingIndicator();
            const botEl = this.createBotMsgPlaceholder();
            botEl.textContent = `[Erro]: ${e.message}`;
        }

        this.isTyping = false;
        this.dom.input.disabled = false;
        this.dom.sendBtn.disabled = false;
        this.dom.input.focus();
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
    }
};

document.addEventListener('DOMContentLoaded', () => window.App.init());
