// api.js
window.API = {
    async getChatResponse(messages, modifier = '') {
        const { apiKey, model } = window.Storage.getConfig();
        if (!apiKey) throw new Error('Chave da API não configurada no painel à esquerda.');

        const apiMessages =[{ role: 'system', content: window.CONFIG.SYSTEM_PROMPT }];

        messages.forEach((msg, idx) => {
            let content = msg.content;
            if (idx === messages.length - 1 && msg.role === 'user' && modifier) {
                content = `${modifier} ${content}`;
            }
            apiMessages.push({ role: msg.role, content });
        });

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'lowmanager'
            },
            body: JSON.stringify({ model, messages: apiMessages, temperature: 0.7 })
        });

        if (!res.ok) throw new Error(`Erro na API (Status ${res.status})`);
        const data = await res.json();
        return data.choices[0].message.content;
    },

    async generateTitle(firstMessage) {
        const { apiKey, model } = window.Storage.getConfig();
        if (!apiKey) return null;
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages:[
                        { role: 'system', content: 'Crie um título bem curto (máximo 4 palavras) para a conversa baseada na mensagem do usuário. Responda APENAS com o título, sem aspas, sem pontos e sem introdução.' },
                                     { role: 'user', content: firstMessage }
                    ],
                    temperature: 0.3
                })
            });
            const data = await res.json();
            let newTitle = data.choices[0].message.content.trim();
            return newTitle.replace(/^["']|["']$/g, '');
        } catch (e) {
            console.warn('Falha silenciosa ao gerar título.', e);
            return null;
        }
    },

    async analyzeComplexity(text) {
        console.log('🧠[Analisador Híbrido] Iniciando análise...');
        const score = await this.analyzeComplexityScore(text);
        if (score !== null) {
            console.log(`📊 [Analisador] Complexidade: ${score}/100`);
            if (score >= 40) return '[Simplifique]';
        }
        return '';
    },

    async analyzeComplexityScore(text) {
        const { apiKey } = window.Storage.getConfig();
        if (!apiKey) return null;

        try {
            const prompt = `Analise a complexidade do texto abaixo e retorne APENAS um JSON válido no formato: {"scoreComplexidade": 0-100}. Texto: "${text.replace(/"/g, '\\"')}"`;

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: window.CONFIG.ANALYZER_MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                })
            });
            const data = await res.json();
            const content = data.choices[0].message.content;
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const json = JSON.parse(match[0]);
                return json.scoreComplexidade;
            }
        } catch (e) {
            console.warn('⚠️ [Analisador] Falha ao obter score.', e);
        }
        return null;
    },

    async fetchWiki(term) {
        try {
            console.log(`🔍 [Wiki] Buscando por: ${term}`);
            let res = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`);
            if (!res.ok) res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`);
                if (res.ok) {
                    const data = await res.json();
                    return `**Wikipedia:** ${data.title}\n\n${data.extract}`;
                }
        } catch(e) {}
        return null;
    }
};
