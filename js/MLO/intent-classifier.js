// js/MLO/intent-classifier.js
window.IntentClassifier = {
    async classify(promptText) {
        const { apiKey } = window.Storage.getConfig();
        if (!apiKey) return { tool: null, param: promptText };

        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: window.CONFIG.ANALYZER_MODEL, // Phi-4
                    messages: [
                        {
                            role: 'system',
                            content: `Você é um classificador de intenção. Dada a frase do usuário, escolha a ferramenta adequada e retorne APENAS um JSON válido no formato:
                            {"tool": "<nome>", "param": "<parâmetro>"}

                            Ferramentas disponíveis e QUANDO USAR CADA UMA:
                            - calc: para cálculos ou expressões matemáticas. Ex: "3+5"
                            - buscar: para consultar a biblioteca pessoal do usuário. Use SEMPRE que a pergunta mencionar informações que já estão na biblioteca, incluindo "categoria paper", "trechos da biblioteca", "artigos que encontramos", "o que os artigos dizem", etc.
                            - wiki: para conhecimento geral (Quem foi..., O que é...).
                            - paper: APENAS quando o usuário pedir EXPLICITAMENTE para buscar NOVOS artigos na internet (ex.: "busque artigos sobre", "indexe papers", "procure no arXiv"). Se houver qualquer referência a artigos já existentes, use "buscar".
                            - memorizar: se pedir para salvar/memorizar algo.
                            - conversa: para conversa comum, sem ferramenta.

                            Retorne apenas o JSON, sem texto adicional.`
                        },
                        { role: 'user', content: promptText }
                    ],
                    temperature: 0.1
                })
            });

            const data = await res.json();
            const raw = data.choices[0].message.content.trim();
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { tool: 'conversa', param: promptText };
        } catch (e) {
            console.warn('⚠️ [IntentClassifier] Falha, usando conversa normal.', e);
            return { tool: 'conversa', param: promptText };
        }
    }
};
