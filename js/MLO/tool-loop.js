// js/MLO/tool-loop.js
window.ToolLoop = {
    _buildSystemPrompt() {
        const tools = [
            '$buscar <termo> - busca na biblioteca.',
            '$buscar cat:<categoria> <termo> - busca por categoria.',
            '$wiki <termo> - consulta a Wikipedia.',
            '$categorias - lista categorias.',
            '$calc <expressão> - cálculo matemático simples.',
            '$calc rpn <instruções> - cálculo em notação polonesa reversa.',
            '$math <instrução> - calculadora interativa passo a passo. Use para cálculos grandes.',
            '$memorizar - salva resumo da conversa.'
        ].join('\n');

        return `Você é o lowmanager. Responda em português de forma clara e direta.

        Ferramentas disponíveis:
        ${tools}

        PROTOCOLO OBRIGATÓRIO:
        1. REGRA CRÍTICA: Ao usar ferramentas, sua resposta deve conter APENAS a linha da ferramenta.
        2. Para cálculos grandes (mais de 3 operações), USE EXCLUSIVAMENTE o comando $math. Envie uma instrução por vez (ex.: $math 2, $math sqrt, $math 3 *). Após enviar a última instrução, não faça mais nada – o sistema exibirá automaticamente o resultado final.
        3. Exemplo de sequência para elevar ao cubo: $math 3 **   (NUNCA use "cub" ou palavras, apenas operadores como **, sqrt, etc.)
        4. Para informações factuais, use $buscar ou $wiki.
        5. Ao final, coloque "$memorizar" em linha separada.`;
    },

    async run(prompt, historyMessages) {
        const systemMsg = { role: 'system', content: this._buildSystemPrompt() };
        const messages = [systemMsg];
        for (let i = 0; i < historyMessages.length; i++) {
            if (i === historyMessages.length - 1 && historyMessages[i].role === 'user') {
                messages.push({ role: 'user', content: prompt });
            } else {
                messages.push(historyMessages[i]);
            }
        }

        const MAX_ITERATIONS = 20;  // suficiente para sequências longas
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const reply = await window.API.getChatResponse(messages, '');

            const lines = reply.split('\n');
            const lastLine = lines[lines.length - 1].trim();
            const hasToolAtEnd = lastLine.startsWith('$') && lines.length > 1;

            if (hasToolAtEnd) {
                const answerText = lines.slice(0, -1).join('\n').trim();
                const toolCommand = lastLine;
                console.log(`🛠️ Ferramenta no final: ${toolCommand}`);
                let toolResult;
                if (toolCommand.startsWith('$memorizar')) {
                    toolResult = await window.Memorizer.memorize(messages);
                } else if (toolCommand.startsWith('$calc ')) {
                    toolResult = await window.Commands.execute(toolCommand);
                    const numberMatch = toolResult.match(/Resultado:\s*([\d.]+)/);
                    const correctNumber = numberMatch ? numberMatch[1] : toolResult;
                    return answerText.replace(/\d+(\.\d+)?/, correctNumber);
                } else {
                    toolResult = await window.Commands.execute(toolCommand);
                }
                return answerText;
            }

            // 🛡️ Se a resposta inteira começa com '$', extrai APENAS a primeira linha com comando
            if (reply.trim().startsWith('$')) {
                const firstCommandLine = lines.find(l => l.trim().startsWith('$')).trim();
                console.log(`🛠️ Ferramenta pura (extraída): ${firstCommandLine}`);

                let toolResult;
                if (firstCommandLine.startsWith('$memorizar')) {
                    toolResult = await window.Memorizer.memorize(messages);
                } else {
                    toolResult = await window.Commands.execute(firstCommandLine);
                }

                if (firstCommandLine.startsWith('$calc ')) {
                    const numberMatch = toolResult.match(/Resultado:\s*([\d.]+)/);
                    if (numberMatch) return `O resultado exato é ${numberMatch[1]}.`;
                    return toolResult;
                }

                // Adiciona ao histórico normalmente (tanto $math quanto outros)
                messages.push({ role: 'assistant', content: firstCommandLine });
                messages.push({ role: 'user', content: toolResult });
                continue;
            }

            // Se não é comando, é a resposta final (texto comum)
            // Se a última ferramenta foi um $math, retorna o topo da pilha antes de devolver a resposta
            const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
            if (lastAssistant && lastAssistant.content.trim().startsWith('$math ')) {
                const topo = window.MathSession.stack.length > 0 ? window.MathSession.stack[window.MathSession.stack.length - 1] : null;
                if (topo !== null) {
                    return `O resultado final é ${topo}.`;
                }
            }
            return reply;
        }

        // Se atingiu o limite de iterações sem resposta final
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistant && lastAssistant.content.trim().startsWith('$math ')) {
            const topo = window.MathSession.stack.length > 0 ? window.MathSession.stack[window.MathSession.stack.length - 1] : null;
            if (topo !== null) {
                return `O resultado final é ${topo}.`;
            }
        }
        return '⚠️ Loop de ferramentas excedeu o limite sem resultado.';
    }
};
