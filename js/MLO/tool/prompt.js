// js/MLO/tool/prompt.js
window.ToolPrompt = {
    buildMessages(historyMessages, userPrompt, extraContext) {
        let basePrompt = window.ToolPapel.buildSystemPrompt();
        if (extraContext) {
            basePrompt += `\n\n[DICAS DO SISTEMA]\n${extraContext}\n`;
        }
        const systemMsg = { role: 'system', content: basePrompt };
        const messages = [systemMsg];
        for (let i = 0; i < historyMessages.length; i++) {
            if (i === historyMessages.length - 1 && historyMessages[i].role === 'user') {
                messages.push({ role: 'user', content: userPrompt });
            } else {
                messages.push(historyMessages[i]);
            }
        }
        return messages;
    }
};
