// js/MLO/tool-loop.js
window.ToolLoop = {
    _buildSystemPrompt() {
        const tools = [
            '$buscar <termo> - busca na biblioteca.',
            '$buscar cat:<categoria> <termo> - busca por categoria.',
            '$wiki <termo> - consulta a Wikipedia.',
            '$categorias - lista categorias.',
            '$calc <expressão> - cálculo matemático simples.',
            '$calc rpn <instruções> - cálculo em notação polonesa reversa (para múltiplas etapas).',
            '$memorizar - salva resumo da conversa.'
        ].join('\n');

        return `Você é o lowmanager. Responda em português de forma clara e direta.

        Ferramentas disponíveis:
        ${tools}

        OPERADORES ACEITOS NO $calc rpn:
        Aritméticos: + - * / ** sqrt
        Trigonométricos (ângulo em radianos): sin cos tan asin acos atan
        Logaritmos/Exponencial: log log10 exp
        Constantes: pi e
        Arredondamento: ceil floor round
        Controle de pilha: swap

        PROTOCOLO OBRIGATÓRIO:
        1. REGRA CRÍTICA: Quando usar QUALQUER ferramenta ($calc, $calc rpn, $buscar, $wiki, $memorizar...), sua resposta deve conter APENAS a linha da ferramenta. Não escreva NADA antes ou depois.
        2. Para cálculos com mais de 3 operações, divida em etapas menores usando vários $calc rpn. Após obter um resultado intermediário, use-o na próxima chamada.
        Exemplo:
        Usuário: "raiz de 9 vezes 2 mais 3"
        Assistente: $calc rpn 9 sqrt 2 *
        (resultado: 6)
        Assistente: $calc rpn 6 3 +
        3. Após receber o resultado da ferramenta, responda com o valor EXATO retornado (Ex.: "O resultado é 417.43"). NÃO arredonde, NÃO invente, NÃO recuse.
        4. Para informações factuais, use $buscar ou $wiki.
        5. Ao final de respostas úteis, coloque "$memorizar" em uma linha separada.`;
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

        const MAX_ITERATIONS = 5;
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

                messages.push({ role: 'assistant', content: firstCommandLine });
                messages.push({ role: 'user', content: toolResult });
                continue;
            }

            return reply;
        }
        return '⚠️ Loop de ferramentas excedeu o limite.';
    }
};
