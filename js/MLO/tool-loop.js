// js/MLO/tool-loop.js
window.ToolLoop = {
    _buildSystemPrompt() {
        const tools = [
            // Biblioteca Indexada
            '$buscar <termo> - busca semântica na biblioteca.',
            '$buscar cat:<categoria> <termo> - busca por categoria.',
            '$buscar key:<palavra-chave> - recupera EXATAMENTE o trecho com aquela key.',
            '$buscar id:<id> - recupera EXATAMENTE o trecho com aquele ID.',
            // Armazenamento Frio e Aquecimento
            '$raw listar - lista documentos brutos.',
            '$raw buscar <termo> - busca por palavra-chave nos textos brutos (frios). Usar quando precisa de termos EXATOS ou quando $buscar falha.',
            '$raw ver <id> - mostra o texto bruto de um documento.',
            '$aquecer <id> - indexa um documento bruto na biblioteca (gasta embeddings).',
            // Navegação Interativa e Seletiva
            '$navegar <termo> - abre navegador interativo parágrafo a parágrafo.',
            '$navegar <termo> lote <número> - retorna resumo do lote (primeiras palavras de cada parágrafo). Use para varreduras seletivas em documentos grandes.',
            // Outras Ferramentas
            '$wiki <termo> - consulta a Wikipedia.',
            '$web <url> - extrai e indexa o texto de uma página da internet.',
            '$paper <termo> - busca artigos científicos.',
            '$categorias - lista categorias disponíveis na biblioteca.',
            '$calc <expressão> - cálculo matemático.',
            '$calc rpn <instruções> - cálculo RPN.',
            '$math <instrução> - calculadora interativa.',
            '$memorizar - salva resumo da conversa.'
        ].join('\n');

        return `Você é o lowmanager, um assistente prestativo. Responda em português de forma direta e completa, sem pedir desculpas desnecessárias.

        Ferramentas:
        ${tools}

        PROTOCOLO DE BUSCA AVANÇADA:
        - Para buscas textuais, use sempre um limite pequeno (ex.: 10) para agilizar. Exemplo: $raw buscar "termo" 10. Se precisar de mais resultados, aumente o limite na próxima chamada.
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
        // ═══════════════════════════════════════════
        // ATALHO: busca rápida em categorias conhecidas
        // ═══════════════════════════════════════════
        if (/categoria\s*(paper|web|raw)/i.test(prompt) && /buscar|procure|ache/i.test(prompt)) {
            const catMatch = prompt.match(/categoria\s*(paper|web|raw)/i);
            if (catMatch) {
                const category = catMatch[1].toLowerCase();
                console.log(`⚡ [ToolLoop] Atalho para busca na categoria ${category}`);
                return await window.Commands.execute(`$buscar cat:${category} ${prompt}`);
            }
        }

        // ═══════════════════════════════════════════
        // ETAPA 0: Classificador de intenção automática
        // ═══════════════════════════════════════════
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

        // ═══════════════════════════════════════════
        // ETAPA 1: Loop de ferramentas com varredura seletiva
        // ═══════════════════════════════════════════
        const systemMsg = { role: 'system', content: this._buildSystemPrompt() };
        const messages = [systemMsg];
        for (let i = 0; i < historyMessages.length; i++) {
            if (i === historyMessages.length - 1 && historyMessages[i].role === 'user') {
                messages.push({ role: 'user', content: prompt });
            } else {
                messages.push(historyMessages[i]);
            }
        }

        const MAX_ITERATIONS = 10;   // Permite até 10 lotes de varredura, se necessário
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const reply = await window.API.getChatResponse(messages, '');

            const lines = reply.split('\n');
            const toolLines = lines.filter(l => l.trim().startsWith('$'));
            const answerLines = lines.filter(l => !l.trim().startsWith('$'));
            let answerText = answerLines.join('\n').trim();

            // Se não há comandos, é a resposta final.
            if (toolLines.length === 0) {
                return reply;
            }

            // Processa cada comando de forma independente
            let toolResults = '';
            for (const toolCommand of toolLines) {
                const cmd = toolCommand.trim();
                console.log(`🛠️ Ferramenta extraída: ${cmd}`);
                let toolResult;
                try {
                    toolResult = await window.Commands.execute(cmd);

                    // Se a IA usou $navegar lote e recebeu um resumo, ela pode decidir continuar ou parar.
                    // O resultado já é um resumo enxuto, então apenas o retornamos.

                    // Se foi um $buscar e não encontrou nada, sugere o $raw buscar
                    if (cmd.startsWith('$buscar ') && toolResult.includes('Nada encontrado na biblioteca')) {
                        const searchTerm = cmd.replace('$buscar ', '').replace(/cat:\S+\s*/, '').trim();
                        toolResult += `\n💡 Sugestão: Tente uma busca simples nos textos brutos com "$raw buscar ${searchTerm}".`;
                    }

                    // Se foi um $navegar lote, a IA pode querer continuar a varredura
                    // O resultado inclui "Lote X/Y", então ela sabe se há mais lotes.
                } catch (e) {
                    toolResult = `Erro ao executar ${cmd}: ${e.message}`;
                }
                toolResults += (toolResults ? '\n' : '') + toolResult;
            }

            // Retorna o texto da IA seguido dos resultados das ferramentas
            return answerText ? `${answerText}\n\n${toolResults}` : toolResults;
        }

        return '⚠️ Loop de ferramentas excedeu o limite de varredura. Tente ser mais específico.';
    }
};
