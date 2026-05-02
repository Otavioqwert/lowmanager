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

        // Comando $math (sessão de pilha interativa) – aceita uma ou várias instruções
        if (text.startsWith('$math ')) {
            const tudo = text.replace('$math ', '').trim();
            if (!tudo) return 'Uso: $math <número|operador|show|cls>';

            const lines = tudo.split('\n').map(l => l.trim()).filter(l => l !== '');
            let lastResult = '';

            for (const line of lines) {
                let token = line.startsWith('$math ') ? line.replace('$math ', '').trim() : line;
                if (token.includes(' ')) {
                    const subTokens = token.split(/\s+/);
                    for (const sub of subTokens) {
                        if (sub !== '') {
                            lastResult = window.MathSession.execute(sub);
                        }
                    }
                } else {
                    lastResult = window.MathSession.execute(token);
                }
            }

            if (lines.length > 1 || (lines[0] === 'show' || lines[0] === 'cls')) {
                return lastResult;
            }

            const topo = window.MathSession.stack.length > 0 ? window.MathSession.stack[window.MathSession.stack.length - 1] : null;
            if (topo !== null) {
                return `Operação realizada. Topo da pilha: ${topo}`;
            }
            return lastResult;
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

        return null;
    },

    calc(expr) {
        const constants = {
            'pi': Math.PI,
            'e': Math.E,
            'tau': Math.PI * 2,
            'phi': (1 + Math.sqrt(5)) / 2,
            'ln2': Math.LN2,
            'ln10': Math.LN10,
            'sqrt2': Math.SQRT2,
            'sqrt1_2': Math.SQRT1_2
        };
        let processed = expr;
        for (const [name, value] of Object.entries(constants)) {
            const regex = new RegExp('\\b' + name + '\\b', 'gi');
            processed = processed.replace(regex, value);
        }

        const functions = [
            'sin', 'cos', 'tan', 'sqrt', 'log', 'exp', 'abs',
            'ceil', 'floor', 'round',
            'asin', 'acos', 'atan', 'log10', 'pow'
        ];
        functions.forEach(fn => {
            const regex = new RegExp('\\b' + fn + '\\s*\\(', 'gi');
            processed = processed.replace(regex, 'Math.' + fn + '(');
        });

        processed = processed
        .replace(/[^0-9+\-*/().%a-zA-Z,\s]/g, '')
        .trim();

        if (!processed) return 'Erro: expressão vazia.';

        const safeMath = processed.replace(/Math\.\w+\s*\(/g, match => {
            const funcName = match.slice(5, -1).trim().toLowerCase();
            return functions.includes(funcName) ? match : 'INVALIDA(';
        });
        if (safeMath.includes('INVALIDA(')) return 'Erro: função não permitida.';

        console.log('[calc] expressão final:', processed);
        try {
            const result = new Function('return ' + processed)();
            if (typeof result === 'number' && isFinite(result)) {
                return `Resultado: ${result}`;
            }
            return 'Erro: resultado não numérico.';
        } catch (e) {
            return `Erro no cálculo: ${e.message}`;
        }
    }

};
