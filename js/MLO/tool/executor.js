// js/MLO/tool/executor.js
window.ToolExecutor = {
    async runLoop(messages, historyMessages, maxIterations = 10) {
        for (let i = 0; i < maxIterations; i++) {
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

            // Se não há ferramentas, devolve a resposta pura
            if (toolLines.length === 0) {
                return reply;
            }

            // Executa cada ferramenta e acumula resultados
            let toolResults = '';
            for (const cmd of toolLines) {
                const toolResult = await window.ToolComando.executeCommand(cmd, historyMessages);
                toolResults += (toolResults ? '\n' : '') + toolResult;
            }

            // Se não houve texto além das ferramentas, mostra só os resultados
            return answerText ? `${answerText}\n\n${toolResults}` : toolResults;
        }

        return '⚠️ Loop de ferramentas excedeu o limite de varredura. Tente ser mais específico.';
    }
};
