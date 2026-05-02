// js/DBO/dbo-search.js
window.DBO_Search = {
    async execute(text) {
        if (!text) return null;

        // $buscar (com cat:, key:, id:)
        if (text.startsWith('$buscar ')) {
            const args = text.replace('$buscar ', '');
            let category = '', key = '', termo = args;
            let id = null;

            const catMatch = termo.match(/cat:(\S+)/);
            if (catMatch) { category = catMatch[1]; termo = termo.replace(catMatch[0], '').trim(); }
            const keyMatch = termo.match(/key:(\S+)/);
            if (keyMatch) { key = keyMatch[1]; termo = termo.replace(keyMatch[0], '').trim(); }
            const idMatch = termo.match(/id:(\S+)/);
            if (idMatch) { id = parseFloat(idMatch[1]); termo = termo.replace(idMatch[0], '').trim(); }

            if (id) {
                const chunk = window.Library.findById(id);
                if (chunk) return `[Trecho único] (cat: ${chunk.category || 'geral'}) ${chunk.text}`;
                return '🔍 Nenhum chunk com esse ID.';
            }
            if (key && !termo) {
                const chunk = window.Library.findByKey(key);
                if (chunk) return `[Trecho único] (cat: ${chunk.category || 'geral'}) ${chunk.text}`;
                return '🔍 Nenhum chunk com essa key.';
            }
            if (!termo) return '🔍 Por favor, informe um termo para busca.';

            const resultados = await window.Library.search(termo, 5, category, key);
            if (resultados.length === 0) return '🔍 Nada encontrado na biblioteca.';
            return resultados.map((r, i) =>
            `[Trecho ${i+1}] (cat: ${r.category || 'geral'}) ${r.text}`
            ).join('\n\n');
        }

        // $raw comandos
        if (text.startsWith('$raw listar')) {
            const lista = await window.RawStorage.list();
            if (lista.length === 0) return '📄 Nenhum documento bruto armazenado.';
            return '📄 Documentos brutos:\n' + lista.map(d => `[${d.id}] ${d.title} (${d.size} caracteres, cat: ${d.category})`).join('\n');
        }

        if (text.startsWith('$raw ver ')) {
            const id = text.replace('$raw ver ', '').trim();
            const content = await window.RawStorage.get(id);
            if (!content) return '⚠️ Documento não encontrado.';
            return `📄 Conteúdo de "${id}":\n${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}`;
        }

        if (text.startsWith('$raw buscar ')) {
            const args = text.replace('$raw buscar ', '').trim();
            if (!args) return 'Uso: $raw buscar <termo> [limite]';

            const limitMatch = args.match(/\s+(\d+)$/);
            let term = args;
            let limit = 20;
            if (limitMatch) {
                term = args.substring(0, args.lastIndexOf(limitMatch[0])).trim();
                limit = parseInt(limitMatch[1]);
            }
            term = term.replace(/^["']|["']$/g, '');

            const results = await window.RawStorage.search(term, null, limit);
            if (results.length === 0) return '🔍 Nenhum parágrafo encontrado com esse termo.';
            return results.map((r, i) => `[${i+1}] (${r.docTitle})\n${r.paragraph}...`).join('\n\n');
        }

        if (text.startsWith('$raw remover ')) {
            const id = text.replace('$raw remover ', '').trim();
            const ok = await window.RawStorage.remove(id);
            return ok ? '✅ Documento removido.' : '⚠️ Documento não encontrado.';
        }

        // $navegar
        if (text.startsWith('$navegar ')) {
            const args = text.replace('$navegar ', '').trim();
            if (!args) return 'Uso: $navegar <termo> ou $navegar <termo> lote <número>';

            const loteMatch = args.match(/^(.*)\s+lote\s+(\d+)$/i);
            if (loteMatch) {
                const termo = loteMatch[1].trim();
                const lote = parseInt(loteMatch[2]);
                const resumo = await window.ParagraphNavigator.buscarLote(termo, lote);
                if (!resumo) return `🔍 Nenhum resultado no lote ${lote}.`;
                return resumo;
            }

            const resultados = await window.RawStorage.search(args);
            if (resultados.length === 0) return '🔍 Nenhum parágrafo encontrado.';
            window.ParagraphNavigator.iniciar(args, resultados);
            return `🔍 ${resultados.length} parágrafos encontrados. Use as setas ou os botões para navegar.`;
        }

        return null;
    }
};
