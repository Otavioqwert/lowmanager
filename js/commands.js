// js/commands.js
window.Commands = {
    async execute(text) {
        if (!text) return null;

        // Navegador de parágrafos interativo
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

            // Modo interativo
            const resultados = await window.RawStorage.search(args);
            if (resultados.length === 0) return '🔍 Nenhum parágrafo encontrado.';
            window.ParagraphNavigator.iniciar(args, resultados);
            return `🔍 ${resultados.length} parágrafos encontrados. Use as setas ou os botões para navegar.`;
        }

        // $adicionar: salva frio E quente (embeddings). Opção de pular embeddings via "cru:1"
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

            // 1. Sempre salva frio
            const titulo = key || conteudo.split(/\s+/).slice(0, 5).join(' ');
            const rawId = await window.RawStorage.add(titulo, conteudo, category || 'manual');

            let msg = `📄 Texto bruto salvo (ID: ${rawId}).`;

            if (!onlyRaw) {
                // 2. Também indexa na biblioteca vetorial
                const result = await window.Library.addDocument(conteudo, { category, key, chunkSize });
                msg += ` 📚 Indexados ${result.added} trechos. Categoria: ${category || 'nenhuma'}.`;
            } else {
                msg += ' (apenas armazenamento frio, sem embeddings).';
            }
            return msg;
        }

        // $math (sessão de pilha interativa)
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
                        if (sub !== '') lastResult = window.MathSession.execute(sub);
                    }
                } else {
                    lastResult = window.MathSession.execute(token);
                }
            }

            if (lines.length > 1 || (lines[0] === 'show' || lines[0] === 'cls')) return lastResult;
            const topo = window.MathSession.stack.length > 0 ? window.MathSession.stack[window.MathSession.stack.length - 1] : null;
            if (topo !== null) return `Operação realizada. Topo da pilha: ${topo}`;
            return lastResult;
        }

        // $buscar (suporte a cat:, key:, id:)
        if (text.startsWith('$buscar ')) {
            const args = text.replace('$buscar ', '');
            let category = '', key = '', termo = args;
            let id = null;

            const catMatch = termo.match(/cat:(\S+)/);
            if (catMatch) {
                category = catMatch[1];
                termo = termo.replace(catMatch[0], '').trim();
            }
            const keyMatch = termo.match(/key:(\S+)/);
            if (keyMatch) {
                key = keyMatch[1];
                termo = termo.replace(keyMatch[0], '').trim();
            }
            const idMatch = termo.match(/id:(\S+)/);
            if (idMatch) {
                id = parseFloat(idMatch[1]);
                termo = termo.replace(idMatch[0], '').trim();
            }

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

        if (text.startsWith('$categorias')) {
            const lista = window.Library.listCategories();
            if (lista.length === 0) return '📂 Nenhuma categoria na biblioteca.';
            return '📂 Categorias:\n' + lista.join('\n');
        }

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

        // $web: extrai texto limpo via Jina Reader, salva frio e indexa
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

        // $paper: busca artigos, salva frio cada um, indexa
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

        // $raw comandos: listar, ver, buscar, remover
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

            // Extrai limite no final: um número precedido por espaço (ex.: ... 5)
            const limitMatch = args.match(/\s+(\d+)$/);
            let term = args;
            let limit = 20;   // padrão rápido
            if (limitMatch) {
                term = args.substring(0, args.lastIndexOf(limitMatch[0])).trim();
                limit = parseInt(limitMatch[1]);
            }

            const results = await window.RawStorage.search(term, null, limit);
            if (results.length === 0) return '🔍 Nenhum parágrafo encontrado com esse termo.';
            return results.map((r, i) => `[${i+1}] (${r.docTitle})\n${r.paragraph}...`).join('\n\n');
        }

        if (text.startsWith('$raw remover ')) {
            const id = text.replace('$raw remover ', '').trim();
            const ok = await window.RawStorage.remove(id);
            return ok ? '✅ Documento removido.' : '⚠️ Documento não encontrado.';
        }

        // $aquecer: move um documento frio para a biblioteca vetorial
        if (text.startsWith('$aquecer ')) {
            const id = text.replace('$aquecer ', '').trim();
            const content = await window.RawStorage.get(id);
            if (!content) return '⚠️ Documento não encontrado.';
            const result = await window.Library.addDocument(content, { category: 'raw', key: id });
            return `🔥 Aquecido! ${result.added} trechos indexados. Categoria: raw.`;
        }

        if (text.startsWith('$calc rpn ')) {
            const expr = text.replace('$calc rpn ', '').trim();
            const resultado = window.RPN.eval(expr);
            if (resultado.error) return `Erro RPN: ${resultado.error}`;
            return `Resultado: ${resultado.result}`;
        }

        if (text.startsWith('$calc ')) {
            const expr = text.replace('$calc ', '').trim();
            return this.calc(expr);
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
    },

    calc(expr) {
        const constants = {
            'pi': Math.PI, 'e': Math.E, 'tau': Math.PI * 2,
            'phi': (1 + Math.sqrt(5)) / 2, 'ln2': Math.LN2,
            'ln10': Math.LN10, 'sqrt2': Math.SQRT2, 'sqrt1_2': Math.SQRT1_2
        };
        let processed = expr;
        for (const [name, value] of Object.entries(constants)) {
            const regex = new RegExp('\\b' + name + '\\b', 'gi');
            processed = processed.replace(regex, value);
        }

        const functions = [
            'sin', 'cos', 'tan', 'sqrt', 'log', 'exp', 'abs',
            'ceil', 'floor', 'round', 'asin', 'acos', 'atan', 'log10', 'pow'
        ];
        functions.forEach(fn => {
            const regex = new RegExp('\\b' + fn + '\\s*\\(', 'gi');
            processed = processed.replace(regex, 'Math.' + fn + '(');
        });

        processed = processed.replace(/[^0-9+\-*/().%a-zA-Z,\s]/g, '').trim();
        if (!processed) return 'Erro: expressão vazia.';

        const safeMath = processed.replace(/Math\.\w+\s*\(/g, match => {
            const funcName = match.slice(5, -1).trim().toLowerCase();
            return functions.includes(funcName) ? match : 'INVALIDA(';
        });
        if (safeMath.includes('INVALIDA(')) return 'Erro: função não permitida.';

        console.log('[calc] expressão final:', processed);
        try {
            const result = new Function('return ' + processed)();
            if (typeof result === 'number' && isFinite(result)) return `Resultado: ${result}`;
            return 'Erro: resultado não numérico.';
        } catch (e) {
            return `Erro no cálculo: ${e.message}`;
        }
    }
};
