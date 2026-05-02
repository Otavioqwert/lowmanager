// js/MLO/tool-loop.js
window.ToolLoop = {
    _buildSystemPrompt() {
        const tools = [
            '$buscar <termo> - busca semântica na biblioteca.',
            '$buscar cat:<categoria> <termo> - busca por categoria.',
            '$buscar key:<palavra-chave> - recupera EXATAMENTE o trecho com aquela key.',
            '$buscar id:<id> - recupera EXATAMENTE o trecho com aquele ID.',
            '$raw listar - lista documentos brutos.',
            '$raw buscar <termo> [limite] - busca textual (ex.: oil prices, sem aspas).',
            '$raw ver <id> - mostra o texto bruto de um documento.',
            '$aquecer <id> - indexa um documento bruto na biblioteca (gasta embeddings).',
            '$navegar <termo> - abre navegador interativo parágrafo a parágrafo.',
            '$navegar <termo> lote <número> - retorna resumo do lote (primeiras palavras de cada parágrafo).',
            '$wiki <termo> - consulta a Wikipedia.',
            '$web <url> - extrai e indexa o texto de uma página da internet.',
            '$paper <termo> - busca artigos científicos.',
            '$categorias - lista categorias disponíveis na biblioteca.',
            '$calc <expressão> - cálculo matemático.',
            '$calc rpn <instruções> - cálculo RPN.',
            '$math <instrução> - calculadora interativa.',
            '$memorizar - salva resumo da conversa.',
            '$sn criar <id> <tag> <conteúdo> - cria uma nota temporária (da IA).',
            '$sn ver <id> - lê uma nota.',
            '$sn listar - lista todas as notas (IA e usuário).',
            '$sn buscar <termo> - busca textual nas notas.',
            '$sn deletar <id> - remove uma nota.',
            '$sn limpar - remove todas as notas de sessão da IA.',
            '$sn user criar <id> <tag> <conteúdo> - cria uma nota permanente (do usuário).'
        ].join('\n');

        return `Você é o lowmanager, um assistente prestativo. Responda em português de forma direta e completa, sem pedir desculpas desnecessárias.

        PROTOCOLO DE MEMÓRIA DE TRABALHO:
        1. Antes de responder a perguntas que exijam informações externas, consulte sua sandbox com '$sn listar ai' e '$sn buscar <termo>'.
        2. Se encontrar notas relevantes, use-as. Se não, faça as buscas necessárias e salve os achados com '$sn criar <id> <tag> <conteúdo>'.
        3. Ao final da conversa, pode limpar com '$sn limpar' se desejar.

        Ferramentas:
        ${tools}

        PROTOCOLO DE BUSCA AVANÇADA:
        REGRA DE OURO: Se o usuário mencionar um documento específico ou pedir uma análise com várias etapas, você DEVE usar as ferramentas $raw buscar e $navegar lote ANTES de qualquer cálculo. NUNCA invente números ou use a calculadora com texto.
        - NUNCA inclua o nome do documento ou qualquer texto extra no comando $raw buscar. Exemplo ERRADO: $raw buscar oil prices no documento "iran war news". Exemplo CORRETO: $raw buscar oil prices 10.
        - Ao usar $raw buscar, NÃO inclua o nome do documento no termo. Apenas a palavra‑chave. Ex.: $raw buscar oil prices 10.
        - Se a busca retornar parágrafos, o sistema informará automaticamente quantos foram encontrados. Use ESSE número real nos cálculos. Se retornar "Nenhum parágrafo", use 0.
        - Para raiz quadrada, use $calc rpn <número> sqrt. Ex.: $calc rpn 19 sqrt. NUNCA use √.
        - NUNCA use aspas ao passar termos para os comandos $raw buscar, $buscar ou $navegar. Ex.: escreva $raw buscar oil prices em vez de $raw buscar "oil prices".
        - Para buscas textuais, use sempre um limite pequeno (ex.: 10) para agilizar. Exemplo: $raw buscar termo 10. Se precisar de mais resultados, aumente o limite na próxima chamada.
        1. Sempre que o usuário pedir uma informação que possa estar num documento grande, NÃO tente ler tudo de uma vez.
        2. Use a estratégia de VARREDURA SELETIVA:
        a. Adapte o idioma: se o documento estiver em inglês, faça a varredura com termos em inglês (ex.: "sanctions" para sanções, "conflict" para conflito).
        b. Comece com '$navegar <termo principal> lote 1' para ver um resumo dos primeiros 50 parágrafos.
        c. Analise as primeiras palavras de cada parágrafo e identifique os trechos mais relevantes.
        d. Se encontrar algo útil, responda com base nisso. Se precisar de mais detalhes, use '$navegar <termo> lote 2', e assim por diante.
        e. Se um lote inteiro não tiver nada relevante, diga "O lote X não contém informações relevantes sobre o assunto." e passe para o próximo.
        3. REGRA DE OURO PARA TERMOS EXATOS: se souber exatamente a palavra‑chave (ex.: "sanctions"), prefira '$raw buscar <termo>' — é muito mais rápido e preciso que a busca semântica.
        4. SE $buscar FALHAR: não insista. Mude imediatamente para '$raw buscar <termo>' nos documentos frios.
        5. Se não souber a categoria correta, use '$categorias' para listá‑las antes de buscar.
        6. Para buscas factuais simples, use '$buscar' ou '$wiki'.
        7. Ao final de respostas úteis, coloque "$memorizar" em linha separada.`;
    },

    async run(prompt, historyMessages) {
        if (/categoria\s*(paper|web|raw)/i.test(prompt) && /buscar|procure|ache/i.test(prompt)) {
            const catMatch = prompt.match(/categoria\s*(paper|web|raw)/i);
            if (catMatch) {
                const category = catMatch[1].toLowerCase();
                console.log(`⚡ [ToolLoop] Atalho para busca na categoria ${category}`);
                return await window.Commands.execute(`$buscar cat:${category} ${prompt}`);
            }
        }

        const intent = await window.IntentClassifier.classify(prompt);
        console.log(`🎯 [ToolLoop] Intenção detectada: ${intent.tool} -> "${intent.param}"`);

        if (intent.tool === 'calc') {
            const result = await window.Commands.execute(`$calc ${intent.param}`);
            const numberMatch = result.match(/Resultado:\s*([\d.]+)/);
            if (numberMatch) return `O resultado é ${numberMatch[1]}.`;
            return result;
        }
        if (intent.tool === 'paper') {
            return await window.Commands.execute(`$paper ${intent.param}`);
        }
        if (intent.tool === 'memorizar') {
            return await window.Memorizer.memorize(historyMessages);
        }

        const systemMsg = { role: 'system', content: this._buildSystemPrompt() };
        const messages = [systemMsg];
        for (let i = 0; i < historyMessages.length; i++) {
            if (i === historyMessages.length - 1 && historyMessages[i].role === 'user') {
                messages.push({ role: 'user', content: prompt });
            } else {
                messages.push(historyMessages[i]);
            }
        }

        const MAX_ITERATIONS = 10;
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const reply = await window.API.getChatResponse(messages, '');

            const lines = reply.split('\n');
            const toolLines = lines.filter(l => {
                const trimmed = l.trim();
                return trimmed.startsWith('$') || /^\d+\.\s+\$/.test(trimmed);
            }).map(l => l.replace(/^\d+\.\s+/, '').trim());

            const answerLines = lines.filter(l => {
                const trimmed = l.trim();
                return !trimmed.startsWith('$') && !/^\d+\.\s+\$/.test(trimmed);
            });
            let answerText = answerLines.join('\n').trim();

            if (toolLines.length === 0) {
                return reply;
            }

            let toolResults = '';
            for (const toolCommand of toolLines) {
                const cmd = toolCommand.trim();
                console.log(`🛠️ Ferramenta extraída: ${cmd}`);
                let toolResult;
                try {
                    toolResult = await window.Commands.execute(cmd);

                    // Contagem automática para buscas textuais
                    if (cmd.startsWith('$raw buscar ') && !toolResult.includes('Nenhum parágrafo encontrado')) {
                        const count = (toolResult.match(/\[\d+\]/g) || []).length;
                        toolResult += `\n*** TOTAL REAL DE PARÁGRAFOS ENCONTRADOS: ${count} ***\nUse este número exato nas próximas etapas.`;
                    }

                    if (cmd.startsWith('$buscar ') && toolResult.includes('Nada encontrado na biblioteca')) {
                        const searchTerm = cmd.replace('$buscar ', '').replace(/cat:\S+\s*/, '').trim();
                        const cleanTerm = searchTerm.replace(/^["']|["']$/g, '');
                        console.log(`⚡ Nada na indexada, tentando raw buscar: "${cleanTerm}"`);
                        const rawResult = await window.Commands.execute(`$raw buscar ${cleanTerm} 10`);
                        toolResult = `🔍 Resultados da busca textual (documentos frios):\n${rawResult}`;
                    }
                } catch (e) {
                    toolResult = `Erro ao executar ${cmd}: ${e.message}`;
                }
                toolResults += (toolResults ? '\n' : '') + toolResult;
            }

            return answerText ? `${answerText}\n\n${toolResults}` : toolResults;
        }

        return '⚠️ Loop de ferramentas excedeu o limite de varredura. Tente ser mais específico.';
    }
};
