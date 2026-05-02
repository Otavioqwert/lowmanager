// js/DBO/dbo-ingest.js
window.DBO_Ingest = {
    async execute(text) {
        if (!text) return null;

        if (text.startsWith('$wiki')) {
            const term = text.replace('$wiki', '').trim() || 'Busca livre';
            return await window.API.fetchWiki(term);
        }

        if (text.startsWith('$web ')) {
            const url = text.replace('$web ', '').trim();
            if (!url) return 'Uso: $web <url>';
            const content = await this.fetchWebPage(url);
            if (!content || content.length < 100) return '⚠️ Não foi possível extrair conteúdo relevante da URL.';
            const title = url.split('/').pop().replace(/[-_]/g, ' ') || url;

            const rawId = await window.RawStorage.add(title, content, 'web');
            const result = await window.Library.addDocument(content, { category: 'web', key: title });
            return `🌐 Conteúdo de "${title}" adicionado. ID bruto: ${rawId}. ${result.added} trechos indexados. Categoria: web.`;
        }

        if (text.startsWith('$paper ')) {
            const query = text.replace('$paper ', '').trim();
            if (!query) return 'Uso: $paper <termos de busca>';
            const papers = await this.fetchPapers(query);
            if (papers.length === 0) return '📚 Nenhum artigo com resumo encontrado.';
            let totalAdded = 0, totalErrors = 0;
            for (const p of papers) {
                await window.RawStorage.add(p.title, p.summary, 'paper');
                const result = await window.Library.addDocument(`${p.title}\n\n${p.summary}`, {
                    category: 'paper',
                    key: p.title,
                    tags: p.tags
                });
                totalAdded += result.added;
                if (result.errors) totalErrors += result.errors.length;
            }
            let msg = `📚 Indexados ${papers.length} artigos sobre "${query}" (${totalAdded} trechos adicionados).`;
            if (totalErrors > 0) msg += ` ⚠️ ${totalErrors} falhas de embedding.`;
            return msg;
        }

        return null;
    },

    async fetchWebPage(url) {
        try {
            const res = await fetch(`https://r.jina.ai/${url}`, {
                headers: { 'Accept': 'text/plain' }
            });
            if (!res.ok) return null;
            return await res.text();
        } catch (e) {
            console.warn('⚠️ [Jina Reader] Erro ao buscar URL:', e);
            return null;
        }
    },

    async fetchPapers(query, max = 10) {
        const url = `https://archive.org/advancedsearch.php?q=(${encodeURIComponent(query)}) AND mediatype:texts&fl[]=identifier&fl[]=title&fl[]=description&fl[]=format&output=json&rows=${max}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        const docs = data.response?.docs || [];
        return docs
        .filter(doc => doc.description && doc.description.length > 200)
        .map(doc => ({
            id: doc.identifier,
            title: doc.title || doc.identifier,
            summary: doc.description.substring(0, 4000),
                     tags: []
        }));
    }
};
