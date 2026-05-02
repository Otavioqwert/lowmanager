// js/library.js
window.Library = {
    chunks: [],
    lastAddedIds: [],

    init() {
        const saved = localStorage.getItem('lm_library');
        if (saved) {
            this.chunks = JSON.parse(saved);
        }
    },

    save() {
        localStorage.setItem('lm_library', JSON.stringify(this.chunks));
    },

    // Adiciona documento com metadados (category, key, tags)
    async addDocument(text, options = {}) {
        const {
            category = '',
            key = '',
            tags = [],
            chunkSize = 300
        } = options;

        const chunks = this.splitText(text, chunkSize);
        this.lastAddedIds = [];
        const errors = [];

        for (const chunk of chunks) {
            if (this.chunks.some(c => c.text === chunk)) continue;
            try {
                const embedding = await this.getEmbedding(chunk);
                const id = Date.now() + Math.random();
                this.chunks.push({
                    id,
                    key: key || this._generateKey(chunk),
                                 text: chunk,
                                 embedding,
                                 category,
                                 tags
                });
                this.lastAddedIds.push(id);
            } catch (e) {
                errors.push(`Falha ao processar trecho "${chunk.substring(0, 30)}...": ${e.message}`);
            }
        }

        this.save();
        return {
            added: this.lastAddedIds.length,
            total: chunks.length,
            errors: errors
        };
    },

    // Gera uma key automática (primeiras 5 palavras)
    _generateKey(text) {
        return text.split(/\s+/).slice(0, 5).join(' ').toLowerCase();
    },

    // Divide texto em chunks (respeita parágrafos)
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

    // Gera embedding via OpenRouter
    async getEmbedding(text) {
        const { apiKey } = window.Storage.getConfig();
        const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'perplexity/pplx-embed-v1-0.6b',
                input: text
            })
        });
        const data = await res.json();
        return data.data[0].embedding;
    },

    // Busca semântica com filtros (categoria e/ou key parcial)
    async search(query, topK = 5, category = '', key = '') {
        if (this.chunks.length === 0) return [];
        let candidates = this.chunks;
        if (category) candidates = candidates.filter(c => c.category === category);
        if (key) candidates = candidates.filter(c => c.key.toLowerCase().includes(key.toLowerCase()));

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
        return scored.slice(0, topK).filter(s => s.score > 0.2);
    },

    // Busca exata por key
    findByKey(searchKey) {
        searchKey = searchKey.toLowerCase().trim();
        return this.chunks.find(c => c.key.toLowerCase() === searchKey) || null;
    },

    // Busca exata por ID
    findById(id) {
        return this.chunks.find(c => c.id === id) || null;
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
            if (updates.key !== undefined) chunk.key = updates.key;
            if (updates.category !== undefined) chunk.category = updates.category;
            if (updates.tags !== undefined) chunk.tags = updates.tags;
            this.save();
            return true;
        }
        return false;
    },

    // 🔄 Reprocessar: gera keys automáticas para chunks que estão sem key
    autoKeyAll() {
        let count = 0;
        this.chunks.forEach(chunk => {
            if (!chunk.key || chunk.key.trim() === '') {
                chunk.key = this._generateKey(chunk.text);
                count++;
            }
        });
        if (count > 0) this.save();
        return count;
    },

    // Processa chunks sem key em lotes, com pausa entre cada chunk
    async reprocessarEmLotes(chunksPorLote = 1, intervaloMs = 3000, onProgress = null) {
        const semKey = this.chunks.filter(c => !c.key || c.key.trim() === '');
        const total = semKey.length;
        let processados = 0;

        for (let i = 0; i < total; i += chunksPorLote) {
            const lote = semKey.slice(i, i + chunksPorLote);
            for (const chunk of lote) {
                chunk.key = this._generateKey(chunk.text);
                processados++;
            }
            this.save();

            if (onProgress) {
                onProgress({
                    processados,
                    total,
                    porcentagem: Math.round((processados / total) * 100)
                });
            }

            // Pausa entre os lotes (exceto no último)
            if (i + chunksPorLote < total) {
                await new Promise(resolve => setTimeout(resolve, intervaloMs));
            }
        }

        return { total, processados };
    }
};

// Inicializa ao carregar
window.Library.init();
