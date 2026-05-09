// main.js
// ============================================================
// Central de lógica do lowmanager
// Expõe window.Core para que a UI consuma sem conhecer detalhes
// ============================================================

window.Core = (() => {
  // ----------------------------------------------------------
  // Estado compartilhado (não deve ser manipulado diretamente pela UI)
  // ----------------------------------------------------------
  let _currentChatId = null;
  let _messages = [];
  let _isProcessing = false;

  // ----------------------------------------------------------
  // Métodos públicos
  // ----------------------------------------------------------
  return {
    /**
     * Inicializa o sistema (chamado pelo App na primeira carga)
     */
    init() {
      const chats = window.Storage.getChats();
      if (chats.length === 0) {
        const newChat = window.Storage.createChat('Novo chat');
        this.loadChat(newChat.id);
        return newChat.id;
      } else {
        this.loadChat(chats[0].id);
        return chats[0].id;
      }
    },

    /**
     * Carrega um chat do Storage
     */
    loadChat(chatId) {
      _currentChatId = chatId;
      _messages = window.Storage.getMessages(chatId) || [];
      return {
        id: chatId,
        messages: [..._messages],
        title: window.Storage.getChats().find(c => c.id === chatId)?.title || ''
      };
    },

    /**
     * Retorna a lista de chats
     */
    getChatList() {
      return window.Storage.getChats();
    },

    /**
     * Cria um novo chat
     */
    createChat(title) {
      const newChat = window.Storage.createChat(title);
      return newChat;
    },

    /**
     * Exclui um chat
     */
    deleteChat(chatId) {
      window.Storage.deleteChat(chatId);
      if (_currentChatId === chatId) {
        // Se deletou o atual, volta ao primeiro ou cria novo
        const chats = window.Storage.getChats();
        if (chats.length) {
          this.loadChat(chats[0].id);
          return chats[0].id;
        } else {
          const newChat = window.Storage.createChat('Novo chat');
          this.loadChat(newChat.id);
          return newChat.id;
        }
      }
      return _currentChatId;
    },

    /**
     * Processa uma mensagem do usuário.
     * Retorna um objeto { reply, shouldUpdateTitle, newTitle? }
     * A UI cuidará da exibição e do digitação.
     */
    async processUserMessage(text) {
      if (_isProcessing) return null;
      _isProcessing = true;

      try {
        const currentChat = window.Storage.getChats().find(c => c.id === _currentChatId);
        const isDefaultTitle = currentChat && (currentChat.title.startsWith('Novo chat') || currentChat.title.startsWith('Chat '));

        // Salva mensagem do usuário
        _messages.push({ role: 'user', content: text });
        window.Storage.saveMessages(_currentChatId, _messages);

        // Obtém resposta (comandos ou orquestrador)
        let botReply;
        let shouldUpdateTitle = false;
        let newTitle = null;

        if (text.startsWith('$')) {
          botReply = text.trim().startsWith('$memorizar')
            ? await window.Memorizer.memorize(_messages)
            : await window.Commands.execute(text);

          if (text.startsWith('$wiki') && isDefaultTitle) {
            const term = text.replace('$wiki', '').trim() || 'Busca livre';
            newTitle = `Wiki: ${term}`;
            shouldUpdateTitle = true;
          }
        } else {
          botReply = await window.Orchestrator.process(text, _messages);
          if (isDefaultTitle) {
            const generated = await window.API.generateTitle(text);
            if (generated) {
              newTitle = generated;
              shouldUpdateTitle = true;
            }
          }
        }

        // Proteção contra null/undefined
        const safeReply = window.ErrorHandler.safeString(botReply);

        // Atualiza título se necessário (a UI será avisada)
        if (shouldUpdateTitle && newTitle) {
          window.Storage.updateChatTitle(_currentChatId, newTitle);
        }

        // Salva resposta do bot
        _messages.push({ role: 'bot', content: safeReply });
        window.Storage.saveMessages(_currentChatId, _messages);

        return {
          reply: safeReply,
          shouldUpdateTitle,
          newTitle
        };

      } catch (error) {
        console.error('Erro no processamento:', error);
        return { reply: 'Desculpe, ocorreu um erro interno.' };
      } finally {
        _isProcessing = false;
      }
    },

    /**
     * Força memorização automática (chamada pela UI após a resposta)
     */
    async autoMemorizeIfNeeded(userText, botReply) {
      if (!userText.startsWith('$') && botReply.includes('informação relevante')) {
        try {
          await window.Memorizer.memorize(_messages);
          console.log('🧠 Memória externalizada automaticamente.');
          return true;
        } catch (e) {
          console.warn('⚠️ Falha ao memorizar', e);
          return false;
        }
      }
      return false;
    },

    /**
     * Reprocessa todo o conteúdo da biblioteca (progresso será reportado via callback)
     */
    async reprocessar(intervaloMs, onProgress) {
      return window.Library.reprocessarEmLotes(1, intervaloMs, onProgress);
    },

    /**
     * Retorna o estado atual do chat (para inicialização ou debug)
     */
    getCurrentChatState() {
      return {
        chatId: _currentChatId,
        messages: [..._messages],
        chatList: this.getChatList()
      };
    }
  };
})();