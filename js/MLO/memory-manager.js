// js/MLO/memory-manager.js
window.MemoryManager = {
    dbName: 'lm_sandbox',
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('notes')) {
                    const store = db.createObjectStore('notes', { keyPath: 'id' });
                    store.createIndex('owner', 'owner', { unique: false });
                    store.createIndex('scope', 'scope', { unique: false });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            request.onerror = (event) => {
                console.error('Erro ao abrir sandbox', event.target.error);
                resolve(); // tenta continuar mesmo com erro
            };
        });
    },

    _put(note) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('notes', 'readwrite');
            const store = tx.objectStore('notes');
            store.put(note);
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
    },

    async criar(id, tag, conteudo, owner = 'ai', scope = 'session', parentId = null) {
        if (!this.db) await this.init();
        const note = { id, tag, conteudo, owner, scope, parentId, created: Date.now() };
        await this._put(note);
        return `📝 Nota '${id}' criada${tag ? ' (tag: ' + tag + ')' : ''}.`;
    },

    async ver(id) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('notes', 'readonly');
            const store = tx.objectStore('notes');
            const request = store.get(id);
            request.onsuccess = () => {
                const note = request.result;
                if (!note) return resolve('⚠️ Nota não encontrada.');
                resolve(`📄 [${note.owner === 'ai' ? 'AI' : 'User'}] ${note.id}${note.tag ? ' (' + note.tag + ')' : ''}\n${note.conteudo}`);
            };
            request.onerror = reject;
        });
    },

    async listar(owner = null, tag = null) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('notes', 'readonly');
            const store = tx.objectStore('notes');
            const request = store.getAll();
            request.onsuccess = () => {
                let notas = request.result;
                if (owner) notas = notas.filter(n => n.owner === owner);
                if (tag) notas = notas.filter(n => n.tag === tag);

                const aiNotes = notas.filter(n => n.owner === 'ai');
                const userNotes = notas.filter(n => n.owner === 'user');

                let out = '';
                if (aiNotes.length) {
                    out += '🤖 Notas da IA:\n';
                    aiNotes.forEach(n => out += `  ${n.id} [${n.tag || 'sem tag'}] - "${n.conteudo.substring(0, 50)}..."\n`);
                }
                if (userNotes.length) {
                    out += '👤 Notas do Usuário:\n';
                    userNotes.forEach(n => out += `  ${n.id} [${n.tag || 'sem tag'}] - "${n.conteudo.substring(0, 50)}..."\n`);
                }
                resolve(out || '📭 Nenhuma nota encontrada.');
            };
            request.onerror = reject;
        });
    },

    async buscar(termo, owner = null) {
        if (!this.db) await this.init();
        const term = termo.toLowerCase();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('notes', 'readonly');
            const store = tx.objectStore('notes');
            const request = store.getAll();
            request.onsuccess = () => {
                let notas = request.result;
                if (owner) notas = notas.filter(n => n.owner === owner);
                const encontradas = notas.filter(n => n.conteudo.toLowerCase().includes(term));
                if (!encontradas.length) return resolve('🔍 Nenhuma nota encontrada com esse termo.');
                let out = `🔍 ${encontradas.length} nota(s) com "${termo}":\n`;
                encontradas.forEach(n => out += `  ${n.id} [${n.owner === 'ai' ? 'AI' : 'User'}] - "${n.conteudo.substring(0, 80)}..."\n`);
                resolve(out);
            };
            request.onerror = reject;
        });
    },

    async deletar(id) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('notes', 'readwrite');
            const store = tx.objectStore('notes');
            const request = store.delete(id);
            tx.oncomplete = () => resolve(`🗑️ Nota '${id}' removida.`);
            tx.onerror = reject;
        });
    },

    async limparSessao() {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('notes', 'readwrite');
            const store = tx.objectStore('notes');
            const request = store.getAll();
            request.onsuccess = () => {
                const toDelete = request.result.filter(n => n.scope === 'session' && n.owner === 'ai');
                toDelete.forEach(n => store.delete(n.id));
                tx.oncomplete = () => resolve(`🧹 ${toDelete.length} notas de sessão removidas.`);
            };
            request.onerror = reject;
        });
    }
};

// Inicializa ao carregar
window.MemoryManager.init();
