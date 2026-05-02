// js/tool-loop.js
window.ToolLoop = {
    _buildSystemPrompt() {
        const tools = [
            '$buscar <termo> - busca na biblioteca.',
            '$buscar cat:<categoria> <termo> - busca por categoria.',
            '$wiki <termo> - consulta a Wikipedia.',
            '$categorias - lista categorias.',
            '$calc <expressão> - cálculo matemático.',
            '$memorizar - salva resumo da conversa.'
        ].join('\n');

        return `Você é o lowmanager. Responda em português de forma clara e direta.

        Ferramentas:
        ${tools}

        PROTOCOLO:
        1. Para qualquer cálculo, responda APENAS com "$calc <expressão>".
        2. Após receber o resultado, responda com o valor exato.
        3. Para informações factuais, use $buscar ou $wiki.
        4. Ao final de respostas úteis, coloque "$memorizar" em linha separada.`;
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

            if (reply.trim().startsWith('$')) {
                console.log(`🛠️ Ferramenta pura: ${reply}`);
                let toolResult;
                if (reply.trim().startsWith('$memorizar')) {
                    toolResult = await window.Memorizer.memorize(messages);
                } else {
                    toolResult = await window.Commands.execute(reply.trim());
                }

                if (reply.trim().startsWith('$calc ')) {
                    const numberMatch = toolResult.match(/Resultado:\s*([\d.]+)/);
                    if (numberMatch) return `O resultado exato é ${numberMatch[1]}.`;
                    return toolResult;
                }

                messages.push({ role: 'assistant', content: reply });
                messages.push({ role: 'user', content: toolResult });
                continue;
            }

            return reply;
        }
        return '⚠️ Loop de ferramentas excedeu o limite.';
    }
};
