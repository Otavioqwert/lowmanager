// js/error-handler.js
window.ErrorHandler = {
    /**
     * Garante que um valor seja uma string válida para exibição.
     * Se for null/undefined, retorna uma mensagem padrão.
     * @param {*} value - O valor retornado por um comando ou orquestrador
     * @param {string} fallback - Mensagem opcional de fallback
     * @returns {string}
     */
    safeString(value, fallback = '⚠️ Comando executado, mas sem resposta.') {
        if (value === null || value === undefined) return fallback;
        if (typeof value !== 'string') return String(value);
        return value;
    },

    /**
     * Envolve uma chamada assíncrona, capturando erros e retornando uma string de erro.
     * @param {Function} fn - Função assíncrona a ser executada
     * @param {string} context - Descrição do contexto (para log)
     * @returns {Promise<string>}
     */
    async safeAwait(fn, context = '') {
        try {
            const result = await fn();
            return this.safeString(result);
        } catch (e) {
            console.warn(`⚠️ [ErrorHandler] Erro em "${context}":`, e.message);
            return `[Erro] ${e.message}`;
        }
    }
};
