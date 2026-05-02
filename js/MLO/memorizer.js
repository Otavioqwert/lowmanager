// js/memorizer.js
window.Memorizer = {
    async memorize(historyMessages) {
        const dialogue = historyMessages
        .filter(m => m.role === 'user' || m.role === 'bot')
        .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
        .join('\n\n');

        const prompt = `Analise a conversa abaixo e retorne APENAS um objeto JSON com as chaves "titulo", "categoria" e "resumo". Exemplo: {"titulo": "Fusão Solar", "categoria": "Astronomia", "resumo": "A conversa explicou como o Sol gera energia."}

        Conversa:
        ${dialogue}`;

        const { apiKey } = window.Storage.getConfig();
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
                    { role: 'system', content: 'Você é um assistente que gera resumos em JSON. Retorne apenas o JSON, sem texto adicional.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 400
            })
        });

        const data = await res.json();
        const content = data.choices[0].message.content.trim();
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { titulo: 'Conversa', categoria: 'Geral', resumo: content };
        }

        const titulo = parsed.titulo || 'Conversa';
        const categoria = parsed.categoria || 'Geral';
        const resumo = parsed.resumo || content;

        const qtde = await window.Library.addDocument(resumo, {
            category: categoria,
            key: titulo,
            tags: [categoria]
        });

        return `✅ Memorizado: "${titulo}" (${qtde} trecho(s), categoria: ${categoria}).`;
    }
};
