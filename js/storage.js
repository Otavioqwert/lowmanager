// storage.js
window.Storage = {
    getConfig() {
        return {
            apiKey: localStorage.getItem('lm_apikey') || '',
            model: localStorage.getItem('lm_model') || window.CONFIG.DEFAULT_MODEL
        };
    },
    setConfig(apiKey, model) {
        localStorage.setItem('lm_apikey', apiKey.trim());
        localStorage.setItem('lm_model', model.trim() || window.CONFIG.DEFAULT_MODEL);
    },
    getChats() {
        try { return JSON.parse(localStorage.getItem('lm_chats')) ||[]; }
        catch(e) { return[]; }
    },
    saveChats(chats) {
        localStorage.setItem('lm_chats', JSON.stringify(chats));
    },
    createChat(title) {
        const chats = this.getChats();
        const id = Date.now().toString();
        chats.unshift({ id, title, date: new Date().toISOString() });
        this.saveChats(chats);
        this.saveMessages(id,[]);
        return id;
    },
    updateChatTitle(id, newTitle) {
        const chats = this.getChats();
        const chat = chats.find(c => c.id === id);
        if (chat) {
            chat.title = newTitle;
            this.saveChats(chats);
        }
    },
    deleteChat(id) {
        const chats = this.getChats().filter(c => c.id !== id);
        this.saveChats(chats);
        localStorage.removeItem(`lm_msgs_${id}`);
    },
    clearAll() {
        this.getChats().forEach(c => localStorage.removeItem(`lm_msgs_${c.id}`));
        localStorage.removeItem('lm_chats');
    },
    getMessages(chatId) {
        try { return JSON.parse(localStorage.getItem(`lm_msgs_${chatId}`)) ||[]; }
        catch(e) { return[]; }
    },
    saveMessages(chatId, messages) {
        localStorage.setItem(`lm_msgs_${chatId}`, JSON.stringify(messages));
    }
};
