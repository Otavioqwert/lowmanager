// js/library.js
window.Library = {
    chunks: [],
    lastAddedIds: [], // IDs dos chunks adicionados na última chamada de addDocument

    init() {
        const saved = localStorage.getItem('lm_library');
        if (saved) {
            this.chunks = JSON.parse(saved);
        }
    },

    save() {
        localStorage.setItem('lm_library', JSON.stringify(this.chunks));
    },

    /**
     * Adiciona um documento à biblioteca.
     * @param {string} text - texto completo
     * @param {object} options - { category, key, tags, chunkSize }
     * @returns {number} quantidade de chunks adicionados
     */
    async addDocument(text, options = {}) {
        const {
            category = '',
            key = '',
            tags = [],
            chunkSize = 300
        } = options;

        const chunks = this.splitText(text, chunkSize);
        this.lastAddedIds = [];

        for (const chunk of chunks) {
            // Evita duplicatas exatas
            if (this.chunks.some(c => c.text === chunk)) continue;

            const embedding = await this.getEmbedding(chunk);
            const id = Date.now() + Math.random();
            this.chunks.push({
                id,
                key: key || this._generateKey(chunk), // gera automático se não informado
                             text: chunk,
                             embedding,
                             category,
                             tags
            });
            this.lastAddedIds.push(id);
        }
        this.save();
        return this.lastAddedIds.length;
    },

    // Gera uma chave simples (primeiras 5 palavras)
    _generateKey(text) {
        return text.split(/\s+/).slice(0, 5).join(' ').toLowerCase();
    },

    // Divide o texto em pedaços (respeita parágrafos)
    splitText(text, size = 300) {
        const paragraphs = text.split(/\n\s*\n/);
        const chunks = [];
        for (const paragraph of paragraphs) {
            if (paragraph.length <= size) {
                if (paragraph.trim()) chunks.push(paragraph.trim());
            } else {
                const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
                let current = '';
                for (const sentence of sentences) {
                    if ((current + sentence).length > size && current !== '') {
                        chunks.push(current.trim());
                        current = sentence;
                    } else {
                        current += ' ' + sentence;
                    }
                }
                if (current.trim()) chunks.push(current.trim());
            }
        }
        return chunks.length ? chunks : [text];
    },

    async getEmbedding(text) {
        const { apiKey } = window.Storage.getConfig();
        const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/text-embedding-3-small',
                input: text
            })
        });
        const data = await res.json();
        return data.data[0].embedding;
    },

    /**
     * Busca chunks por similaridade.
     * @param {string} query - texto de busca
     * @param {number} topK - quantos retornar
     * @param {string} category - categoria opcional (filtro)
     * @returns {Array} trechos ordenados por similaridade
     */
    async search(query, topK = 3, category = '') {
        if (this.chunks.length === 0) return [];
        let candidates = this.chunks;
        if (category) {
            candidates = this.chunks.filter(c => c.category === category);
        }
        if (candidates.length === 0) return [];

        const queryEmbedding = await this.getEmbedding(query);
        const scored = candidates.map(chunk => ({
            id: chunk.id,
            text: chunk.text,
            key: chunk.key,
            category: chunk.category,
            score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK).filter(s => s.score > 0.3);
    },

    cosineSimilarity(a, b) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    },

    // Lista categorias com contagem
    listCategories() {
        const map = {};
        this.chunks.forEach(c => {
            const cat = c.category || '(sem categoria)';
            map[cat] = (map[cat] || 0) + 1;
        });
        return Object.entries(map).map(([cat, count]) => `${cat}: ${count} chunks`);
    },

    // Atualiza campos de um chunk (key, category, tags)
    updateChunk(id, updates) {
        const chunk = this.chunks.find(c => c.id === id);
        if (chunk) {
            if (updates.key) chunk.key = updates.key;
            if (updates.category) chunk.category = updates.category;
            if (updates.tags) chunk.tags = updates.tags;
            this.save();
            return true;
        }
        return false;
    }
};

window.Library.init();
