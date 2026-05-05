// js/MLO/intent-classifier.js
window.IntentClassifier = {
    async suggest(promptText) {
        // Pré‑filtro local: se não pergunta nem comando, nem chama a API
        const lower = promptText.trim().toLowerCase();
        const isQuestion = lower.includes('?');
        const commandVerbs = /^(anota|salva|anote|salve|busca|busque|pesquisa|pesquise|calcule|calcula|memoriza|memorize|liste|lista|procure|procura|lembre|lembra)/;
        if (!isQuestion && !commandVerbs.test(lower)) {
            return ''; // sem sugestão
        }

        const { apiKey } = window.Storage.getConfig();
        if (!apiKey) return '';

        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: window.CONFIG.ANALYZER_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: `Com base na frase, sugira APENAS UMA ferramenta dentre: buscar, wiki, paper, memorizar, anotar, sandbox, calc, conversa. Responda só com o nome da ferramenta, sem JSON.`
                        },
                        { role: 'user', content: promptText }
                    ],
                    temperature: 0.1,
                    max_tokens: 10
                })
            });

            const data = await res.json();
            const tool = data.choices[0].message.content.trim().toLowerCase();
            // Mapeia para sugestão legível
            const map = {
                'buscar': 'Tente usar $buscar (biblioteca indexada).',
                'wiki': 'Consulte $wiki para conhecimento geral.',
                'paper': 'Busque artigos com $paper.',
                'memorizar': 'Salve um resumo com $memorizar.',
                'anotar': 'Crie uma nota rápida com $anotar.',
                'sandbox': 'Verifique suas notas com $sn listar ou $sn buscar.',
                'calc': 'Use $calc para cálculos.',
                'conversa': ''
            };
            return map[tool] || '';
        } catch (e) {
            return ''; // falha silenciosa
        }
    }
};
