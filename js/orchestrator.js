// js/orchestrator.js
window.Orchestrator = {
    async process(userText, historyMessages) {
        // Comandos manuais (precedência total)
        if (userText.trim().startsWith('$memorizar')) {
            return await window.Memorizer.memorize(historyMessages);
        }
        if (userText.startsWith('$')) {
            return await window.Commands.execute(userText);
        }

        // Análise de complexidade (cleaner opcional)
        const score = await window.API.analyzeComplexityScore(userText);
        let finalPrompt = userText;
        if (score !== null && score >= 40) {
            console.log(`🧹 Complexidade alta (${score}), acionando cleaner...`);
            finalPrompt = await window.Cleaner.cleanPrompt(userText);
            console.log(`✨ Prompt limpo: ${finalPrompt}`);
        }

        // 🧠 Busca contexto da sandbox
        const sandboxContext = await this.fetchSandboxContext(finalPrompt);

        // 🧭 Sugestão de ferramenta (norte)
        const suggestion = await window.IntentClassifier.suggest(finalPrompt);

        // Junta tudo em um extraContext para o ToolLoop
        let extraContext = '';
        if (sandboxContext) extraContext += `[CONTEXTO SANDBOX]\n${sandboxContext}\n`;
        if (suggestion) extraContext += `[SUGESTÃO] ${suggestion}\n`;

        return await window.ToolLoop.run(finalPrompt, historyMessages, extraContext);
    },

    async fetchSandboxContext(userText) {
        try {
            const aiResult = await window.MemoryManager.buscar(userText, 'ai');
            const globalResult = await window.MemoryManager.buscar(userText, 'user');

            let contextParts = [];
            if (aiResult && !aiResult.includes('Nenhuma nota')) {
                contextParts.push(`[Notas da IA]\n${aiResult}`);
            }
            if (globalResult && !globalResult.includes('Nenhuma nota')) {
                contextParts.push(`[Notas Globais]\n${globalResult}`);
            }
            return contextParts.join('\n\n');
        } catch (e) {
            console.warn('⚠️ Erro ao buscar contexto da sandbox:', e);
            return '';
        }
    }
};
