// js/commands.js
window.Commands = {
    async execute(text) {
        // Comandos de busca e informação
        if (text.startsWith('$wiki')) {
            const term = text.replace('$wiki', '').trim() || 'Busca livre';
            return await window.API.fetchWiki(term);
        }

        // Adicionar documento à biblioteca
        if (text.startsWith('$adicionar ')) {
            const args = text.replace('$adicionar ', '');
            let category = '';
            let key = '';
            let conteudo = args;

            const catMatch = args.match(/categoria:(\S+)/);
            if (catMatch) {
                category = catMatch[1];
                conteudo = conteudo.replace(catMatch[0], '').trim();
            }
            const keyMatch = conteudo.match(/key:(\S+)/);
            if (keyMatch) {
                key = keyMatch[1];
                conteudo = conteudo.replace(keyMatch[0], '').trim();
            }

            if (!conteudo) return '📚 Nenhum texto fornecido para adicionar.';
            const qtde = await window.Library.addDocument(conteudo, { category, key });
            return `📚 Adicionado à biblioteca: ${qtde} trechos. Categoria: ${category || 'nenhuma'}.`;
        }

        // Buscar na biblioteca
        if (text.startsWith('$buscar ')) {
            const args = text.replace('$buscar ', '');
            let category = '';
            let termo = args;

            const catMatch = args.match(/cat:(\S+)/);
            if (catMatch) {
                category = catMatch[1];
                termo = termo.replace(catMatch[0], '').trim();
            }

            if (!termo) return '🔍 Por favor, informe um termo para busca.';
            const resultados = await window.Library.search(termo, 3, category);
            if (resultados.length === 0) return '🔍 Nada encontrado na biblioteca.';
            return resultados.map((r, i) =>
            `[Trecho ${i+1}] (cat: ${r.category || 'geral'}) ${r.text}`
            ).join('\n\n');
        }

        // Listar categorias da biblioteca
        if (text.startsWith('$categorias')) {
            const lista = window.Library.listCategories();
            if (lista.length === 0) return '📂 Nenhuma categoria na biblioteca.';
            return '📂 Categorias:\n' + lista.join('\n');
        }

        // Rotular um chunk
        if (text.startsWith('$rotular ')) {
            const args = text.replace('$rotular ', '');
            let id = null;
            if (args.startsWith('último')) {
                if (window.Library.lastAddedIds.length > 0) {
                    id = window.Library.lastAddedIds[0];
                } else {
                    return '⚠️ Nenhum chunk adicionado recentemente.';
                }
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

        // Calculadora RPN
        if (text.startsWith('$calc rpn ')) {
            const expr = text.replace('$calc rpn ', '').trim();
            const resultado = window.RPN.eval(expr);
            if (resultado.error) return `Erro RPN: ${resultado.error}`;
            return `Resultado: ${resultado.result}`;
        }

        // Calculadora simples (expressão comum)
        if (text.startsWith('$calc ')) {
            const expr = text.replace('$calc ', '').trim();
            return this.calc(expr);
        }

        // Nenhum comando reconhecido
        return null;
    },

    // Calculadora simples (mantida por compatibilidade)
    calc(expr) {
        const sanitized = expr
        .replace(/[^0-9+\-*/().%\s]/g, '')
        .trim();

        if (!sanitized) return 'Erro: expressão vazia.';

        console.log('[calc] expressão final:', sanitized);

        try {
            const result = new Function('return ' + sanitized)();
            if (typeof result === 'number' && isFinite(result)) {
                return `Resultado: ${result}`;
            }
            return 'Erro: resultado não numérico.';
        } catch (e) {
            return `Erro no cálculo: ${e.message}`;
        }
    }
};
