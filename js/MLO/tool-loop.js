// js/MLO/tool-loop.js
window.ToolLoop = {
    async run(prompt, historyMessages, extraContext = '') {
        // Atalho para buscas por categoria (rápido, sem loop)
        if (/categoria\s*(paper|web|raw)/i.test(prompt) && /buscar|procure|ache/i.test(prompt)) {
            const catMatch = prompt.match(/categoria\s*(paper|web|raw)/i);
            if (catMatch) {
                const category = catMatch[1].toLowerCase();
                console.log(`⚡ [ToolLoop] Atalho para busca na categoria ${category}`);
                return await window.Commands.execute(`$buscar cat:${category} ${prompt}`);
            }
        }

        // Monta o array de mensagens com o contexto extra (sandbox + sugestões)
        const messages = window.ToolPrompt.buildMessages(historyMessages, prompt, extraContext);

        // Dispara o loop de ferramentas (agora isolado)
        return await window.ToolExecutor.runLoop(messages, historyMessages);
    }
};
