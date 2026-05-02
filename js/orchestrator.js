// js/orchestrator.js
window.Orchestrator = {
    async process(userText, historyMessages) {
        // Comandos manuais
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

        // Sempre usa o loop de ferramentas (não precisa mais da flag)
        return await window.ToolLoop.run(finalPrompt, historyMessages);
    }
};
