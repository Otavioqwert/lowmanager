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
                            - calc: APENAS para expressões matemáticas diretas (ex.: "3+5", "sqrt(9)"). Se o pedido envolver busca de dados, contagem ou múltiplas etapas, NÃO use calc.
                            - buscar: para consultar a biblioteca pessoal do usuário.
                            - wiki: para conhecimento geral.
                            - paper: APENAS quando o usuário pedir EXPLICITAMENTE para buscar NOVOS artigos.
                            - memorizar: se pedir para salvar/memorizar.
                            - conversa: para qualquer pedido que envolva múltiplas etapas, decisões, ou ferramentas diferentes. USE ESTA quando o usuário pedir para "fazer uma análise", "seguir estes passos", ou qualquer tarefa que não seja uma simples pergunta.

                            Retorne APENAS o JSON, sem texto adicional.`
                        },
                        { role: 'user', content: promptText }
                    ],
                    temperature: 0.1
                })
            });

            const data = await res.json();
            const raw = data.choices[0].message.content.trim();

            // Remove blocos de código markdown (```json ... ```)
            let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            // Encontra o primeiro objeto JSON válido
            const firstBrace = cleaned.indexOf('{');
            if (firstBrace !== -1) {
                let braceCount = 0;
                let endIndex = -1;
                for (let i = firstBrace; i < cleaned.length; i++) {
                    if (cleaned[i] === '{') braceCount++;
                    if (cleaned[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            endIndex = i;
                            break;
                        }
                    }
                }
                if (endIndex !== -1) {
                    const jsonStr = cleaned.substring(firstBrace, endIndex + 1);
                    try {
                        return JSON.parse(jsonStr);
                    } catch (e) {
                        // Tenta escapar aspas internas incorretas
                        try {
                            const escaped = jsonStr.replace(/(?<!\\)"/g, '\\"');
                            return JSON.parse(escaped);
                        } catch (finalError) {
                            console.warn('⚠️ [IntentClassifier] Não foi possível corrigir JSON.');
                        }
                    }
                }
            }

            return { tool: 'conversa', param: promptText };
        } catch (e) {
            console.warn('⚠️ [IntentClassifier] Falha, usando conversa normal.', e);
            return { tool: 'conversa', param: promptText };
        }
    }
};
