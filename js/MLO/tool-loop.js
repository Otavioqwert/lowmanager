// js/MLO/tool-loop.js
window.ToolLoop = {
    _buildSystemPrompt() {
        const tools = [
            '$buscar <termo> - busca semântica na biblioteca.',
            '$buscar cat:<categoria> <termo> - busca por categoria.',
            '$buscar key:<palavra-chave> - recupera EXATAMENTE o trecho com aquela key.',
            '$buscar id:<id> - recupera EXATAMENTE o trecho com aquele ID.',
            '$wiki <termo> - consulta a Wikipedia.',
            '$categorias - lista categorias.',
            '$calc <expressão> - cálculo matemático.',
            '$calc rpn <instruções> - cálculo RPN.',
            '$math <instrução> - calculadora interativa.',
            '$paper <termo> - busca artigos científicos.',
            '$memorizar - salva resumo da conversa.'
        ].join('\n');

        return `Você é o lowmanager, um assistente prestativo. Responda em português de forma direta e completa, sem pedir desculpas desnecessárias.

        Ferramentas:
        ${tools}

        REGRAS:
        1. Quando precisar de uma ferramenta, coloque o comando em uma linha separada no final da sua resposta, NUNCA no meio de uma frase.
        Exemplo correto:
        Aqui está a explicação.
        $wiki buracos negros
        2. Para cálculos, use $calc ou $math. NUNCA invente números.
        3. Para informações factuais, use $buscar ou $wiki.
        4. Ao final de respostas úteis, coloque "$memorizar" em uma linha separada.`;
    },

    async run(prompt, historyMessages) {
        // ATALHO: buscas explícitas na categoria paper
        if (/categoria\s*paper|trechos?\s*(da|sobre)\s*categoria/i.test(prompt) ||
            /artigos?\s*(que\s*(já|encontramos|estão|temos)|da\s*biblioteca)/i.test(prompt)) {
            console.log('⚡ [ToolLoop] Atalho para busca na biblioteca (paper)');
        return await window.Commands.execute(`$buscar cat:paper ${prompt}`);
            }

            // Classificador de intenção (apenas para ações determinísticas)
            const intent = await window.IntentClassifier.classify(prompt);
            console.log(`🎯 [ToolLoop] Intenção detectada: ${intent.tool} -> "${intent.param}"`);

            if (intent.tool === 'calc') {
                const result = await window.Commands.execute(`$calc ${intent.param}`);
                const numberMatch = result.match(/Resultado:\s*([\d.]+)/);
                if (numberMatch) return `O resultado é ${numberMatch[1]}.`;
                return result;
            }
            if (intent.tool === 'paper') {
                const result = await window.Commands.execute(`$paper ${intent.param}`);
                return result;
            }
            if (intent.tool === 'memorizar') {
                return await window.Memorizer.memorize(historyMessages);
            }

            // Para 'buscar', 'wiki' e 'conversa', loop normal
            const systemMsg = { role: 'system', content: this._buildSystemPrompt() };
            const messages = [systemMsg];
            for (let i = 0; i < historyMessages.length; i++) {
                if (i === historyMessages.length - 1 && historyMessages[i].role === 'user') {
                    messages.push({ role: 'user', content: prompt });
                } else {
                    messages.push(historyMessages[i]);
                }
            }

            const MAX_ITERATIONS = 20;   // suficiente para uma rodada de ferramentas
            for (let i = 0; i < MAX_ITERATIONS; i++) {
                const reply = await window.API.getChatResponse(messages, '');

                const lines = reply.split('\n');
                // Pega apenas as linhas que começam com '$'
                const toolLines = lines.filter(l => l.trim().startsWith('$'));
                const answerLines = lines.filter(l => !l.trim().startsWith('$'));
                const answerText = answerLines.join('\n').trim();

                // Se não há comandos, resposta final
                if (toolLines.length === 0) {
                    return reply;
                }

                // Processa cada comando e coleta resultados
                let toolResults = '';
                for (const toolCommand of toolLines) {
                    const cmd = toolCommand.trim();
                    console.log(`🛠️ Ferramenta extraída: ${cmd}`);
                    let toolResult;
                    if (cmd.startsWith('$memorizar')) {
                        toolResult = await window.Memorizer.memorize(messages);
                    } else if (cmd.startsWith('$calc ')) {
                        toolResult = await window.Commands.execute(cmd);
                        const numberMatch = toolResult.match(/Resultado:\s*([\d.]+)/);
                        if (numberMatch) {
                            // Substitui o último número no answerText
                            answerText = answerText.replace(/\d+(\.\d+)?/, numberMatch[1]);
                        }
                    } else {
                        toolResult = await window.Commands.execute(cmd);
                    }
                    toolResults += (toolResults ? '\n' : '') + toolResult;
                }

                // Retorna o texto da IA seguido dos resultados das ferramentas
                const finalResponse = answerText
                ? answerText + '\n\n' + toolResults
                : toolResults;
                return finalResponse;
            }

            return '⚠️ Loop de ferramentas excedeu o limite.';
    }
};
