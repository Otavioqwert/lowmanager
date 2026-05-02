// js/MLO/cleaner.js
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
                    model: window.CONFIG.ANALYZER_MODEL, // Phi-4
                    messages: [
                        {
                            role: 'system',
                            content: `Reescreva a mensagem do usuário APENAS para corrigir erros gramaticais e torná-la mais clara.
                            NÃO responda à pergunta. NÃO complete a frase com informações novas. NÃO forneça explicações.
                            A saída deve ser EXATAMENTE uma versão melhorada do pedido original, sem acréscimos.`
                        },
                        { role: 'user', content: rawText }
                    ],
                    temperature: 0.0,   // zero criatividade
                    max_tokens: 300     // impede divagações
                })
            });
            const data = await res.json();
            const cleaned = data.choices[0].message.content.trim();
            return cleaned || rawText;
        } catch (e) {
            console.warn('⚠️ [Cleaner] Falha, usando original.', e);
            return rawText;
        }
    }
};
