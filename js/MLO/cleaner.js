// js/cleaner.js
window.Cleaner = {
    async cleanPrompt(rawText) {
        const { apiKey } = window.Storage.getConfig();
        if (!apiKey) return rawText;
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'lowmanager'
                },
                body: JSON.stringify({
                    model: window.CONFIG.ANALYZER_MODEL,
                    messages: [
                        { role: 'system', content: 'Reescreva a mensagem do usuário de forma clara, concisa e em português correto, preservando a intenção original. Retorne APENAS o texto limpo.' },
                        { role: 'user', content: rawText }
                    ],
                    temperature: 0.2,
                    max_tokens: 500
                })
            });
            const data = await res.json();
            return data.choices[0].message.content.trim() || rawText;
        } catch (e) {
            console.warn('⚠️ [Cleaner] Falha, usando original.');
            return rawText;
        }
    }
};
