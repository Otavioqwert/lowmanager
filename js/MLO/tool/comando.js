// js/MLO/tool/comando.js
window.ToolComando = {
    async executeCommand(cmd, historyMessages) {
        let result;
        // Memorizar é tratado diretamente (precisa do histórico)
        if (cmd === '$memorizar') {
            result = await window.Memorizer.memorize(historyMessages);
        } else {
            result = await window.Commands.execute(cmd);
        }

        // Garante que sempre retornamos uma string
        if (result === null || result === undefined) {
            result = '⚠️ Comando executado, mas sem resposta.';
        }

        // Contagem automática para buscas textuais ($raw buscar)
        if (cmd.startsWith('$raw buscar ') && !result.includes('Nenhum parágrafo encontrado')) {
            const count = (result.match(/\[\d+\]/g) || []).length;
            result += `\n*** TOTAL REAL DE PARÁGRAFOS ENCONTRADOS: ${count} ***\nUse este número exato nas próximas etapas.`;
        }

        // Fallback $buscar → $raw buscar
        if (cmd.startsWith('$buscar ') && result.includes('Nada encontrado na biblioteca')) {
            const searchTerm = cmd.replace('$buscar ', '').replace(/cat:\S+\s*/, '').trim();
            const cleanTerm = searchTerm.replace(/^["']|["']$/g, '');
            console.log(`⚡ Nada na indexada, tentando raw buscar: "${cleanTerm}"`);
            try {
                const rawResult = await window.Commands.execute(`$raw buscar ${cleanTerm} 10`);
                result = `🔍 Resultados da busca textual (documentos frios):\n${rawResult}`;
            } catch (e) {
                result = `Erro ao buscar raw: ${e.message}`;
            }
        }

        return result;
    }
};
