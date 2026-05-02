// js/MLO/raw-storage.js
window.RawStorage = {
    dbName: 'lm_rawdocs',
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('documents')) {
                    db.createObjectStore('documents', { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this._migrateFromLocalStorage().then(resolve).catch(resolve);
            };
            request.onerror = (event) => {
                console.error('Erro ao abrir IndexedDB', event.target.error);
                resolve(); // tenta continuar mesmo com erro
            };
        });
    },

    async _migrateFromLocalStorage() {
        const old = localStorage.getItem('lm_rawdocs');
        if (!old) return;
        try {
            const docs = JSON.parse(old);
            for (const doc of docs) {
                await this._put(doc);
            }
            localStorage.removeItem('lm_rawdocs');
            console.log('✅ Documentos brutos migrados para IndexedDB');
        } catch (e) {
            console.warn('Falha ao migrar rawdocs, mantendo no localStorage', e);
        }
    },

    _put(doc) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('documents', 'readwrite');
            const store = tx.objectStore('documents');
            store.put(doc);
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
    },

    async add(title, content, category = 'bruto') {
        if (!this.db) await this.init();
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const doc = { id, title, content, category, date: new Date().toISOString() };
        await this._put(doc);
        return id;
    },

    async list(category = null) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('documents', 'readonly');
            const store = tx.objectStore('documents');
            const request = store.getAll();
            request.onsuccess = () => {
                let docs = request.result;
                if (category) docs = docs.filter(d => d.category === category);
                resolve(docs.map(d => ({ id: d.id, title: d.title, category: d.category, size: d.content.length })));
            };
            request.onerror = reject;
        });
    },

    async get(id) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('documents', 'readonly');
            const store = tx.objectStore('documents');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result ? request.result.content : null);
            request.onerror = reject;
        });
    },

    async remove(id) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('documents', 'readwrite');
            const store = tx.objectStore('documents');
            const request = store.delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = reject;
        });
    },

    async search(query, category = null, maxResults = 20) {
        if (!this.db) await this.init();
        const term = query.toLowerCase();
        const docs = await new Promise((resolve, reject) => {
            const tx = this.db.transaction('documents', 'readonly');
            const store = tx.objectStore('documents');
            const request = store.getAll();
            request.onsuccess = () => {
                let docs = request.result;
                if (category) docs = docs.filter(d => d.category === category);
                resolve(docs);
            };
            request.onerror = reject;
        });

        const results = [];
        for (const doc of docs) {
            if (maxResults > 0 && results.length >= maxResults) break;

            const paragraphs = doc.content.split(/\n\s*\n/).filter(p => p.trim());
            for (const para of paragraphs) {
                if (para.toLowerCase().includes(term)) {
                    results.push({
                        docId: doc.id,
                        docTitle: doc.title,
                        paragraph: para.trim().substring(0, 500)
                    });
                    if (maxResults > 0 && results.length >= maxResults) break;
                }
            }
        }
        return results;
    }
};

// Inicializa ao carregar (assíncrono, mas não bloqueia)
window.RawStorage.init();
