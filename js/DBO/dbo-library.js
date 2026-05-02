// js/DBO/dbo-library.js
window.DBO_Library = {
    async execute(text) {
        if (!text) return null;

        if (text.startsWith('$adicionar ')) {
            const args = text.replace('$adicionar ', '');
            let category = '', key = '', conteudo = args;
            let chunkSize = 300, onlyRaw = false;

            const catMatch = args.match(/categoria:(\S+)/);
            if (catMatch) { category = catMatch[1]; conteudo = conteudo.replace(catMatch[0], '').trim(); }
            const keyMatch = conteudo.match(/key:(\S+)/);
            if (keyMatch) { key = keyMatch[1]; conteudo = conteudo.replace(keyMatch[0], '').trim(); }
            const chunkMatch = conteudo.match(/chunkSize:(\d+)/);
            if (chunkMatch) { chunkSize = parseInt(chunkMatch[1]); conteudo = conteudo.replace(chunkMatch[0], '').trim(); }
            const rawMatch = conteudo.match(/cru:(\d)/);
            if (rawMatch) { onlyRaw = (rawMatch[1] === '1'); conteudo = conteudo.replace(rawMatch[0], '').trim(); }

            if (!conteudo) return '📚 Nenhum texto fornecido para adicionar.';

            const titulo = key || conteudo.split(/\s+/).slice(0, 5).join(' ');
            const rawId = await window.RawStorage.add(titulo, conteudo, category || 'manual');

            let msg = `📄 Texto bruto salvo (ID: ${rawId}).`;

            if (!onlyRaw) {
                const result = await window.Library.addDocument(conteudo, { category, key, chunkSize });
                msg += ` 📚 Indexados ${result.added} trechos. Categoria: ${category || 'nenhuma'}.`;
            } else {
                msg += ' (apenas armazenamento frio, sem embeddings).';
            }
            return msg;
        }

        if (text.startsWith('$categorias')) {
            const lista = window.Library.listCategories();
            if (lista.length === 0) return '📂 Nenhuma categoria na biblioteca.';
            return '📂 Categorias:\n' + lista.join('\n');
        }

        if (text.startsWith('$rotular ')) {
            const args = text.replace('$rotular ', '');
            let id = null;
            if (args.startsWith('último')) {
                id = window.Library.lastAddedIds[0] || null;
                if (!id) return '⚠️ Nenhum chunk adicionado recentemente.';
            } else {
                const idMatch = args.match(/^(\d+)/);
                if (idMatch) id = parseFloat(idMatch[0]);
            }

            if (!id) return '⚠️ Forneça um ID de chunk ou use "último".';

            const updates = {};
            const keyMatch = args.match(/key:(\S+)/);
            if (keyMatch) updates.key = keyMatch[1];
            const catMatch = args.match(/categoria:(\S+)/);
            if (catMatch) updates.category = catMatch[1];
            const tagsMatch = args.match(/tags:([^\s,]+(,[^\s,]+)*)/);
            if (tagsMatch) updates.tags = tagsMatch[1].split(',');

            if (Object.keys(updates).length === 0) return '⚠️ Informe key:, categoria: ou tags: para atualizar.';
            window.Library.updateChunk(id, updates);
            return `✅ Chunk ${id} atualizado.`;
        }

        if (text.trim() === '$reprocessar') {
            const args = text.replace('$reprocessar', '').trim();
            let chunksPorMinuto = 20;
            const match = args.match(/(\d+)/);
            if (match) chunksPorMinuto = parseInt(match[1]);

            const intervaloMs = Math.round(60000 / chunksPorMinuto);

            window.dispatchEvent(new CustomEvent('reprocessarIniciar', {
                detail: { intervaloMs, chunksPorMinuto }
            }));

            return `⏳ Processamento iniciado em segundo plano (~${chunksPorMinuto} chunks/min). Acompanhe a barra de progresso.`;
        }

        if (text.startsWith('$aquecer ')) {
            const id = text.replace('$aquecer ', '').trim();
            const content = await window.RawStorage.get(id);
            if (!content) return '⚠️ Documento não encontrado.';
            const result = await window.Library.addDocument(content, { category: 'raw', key: id });
            return `🔥 Aquecido! ${result.added} trechos indexados. Categoria: raw.`;
        }

        return null;
    }
};
