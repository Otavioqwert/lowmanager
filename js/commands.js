// js/commands.js
window.Commands = {
    async execute(text) {
        if (!text) return null;

        if (text.startsWith('$anotar')) {
            return await window.DBO_Sandbox.execute(text);
        }

        if (text.startsWith('$sn')) {
            return await window.DBO_Sandbox.execute(text);
        }

        if (text.startsWith('$sn')) {
            return await window.DBO_Sandbox.execute(text);
        }

        // Roteamento por prefixo
        if (text.startsWith('$adicionar') || text.startsWith('$categorias') ||
            text.startsWith('$rotular') || text.trim() === '$reprocessar' ||
            text.startsWith('$aquecer')) {
            return await window.DBO_Library.execute(text);
            }

            if (text.startsWith('$buscar') || text.startsWith('$raw') ||
                text.startsWith('$navegar')) {
                return await window.DBO_Search.execute(text);
                }

                if (text.startsWith('$math') || text.startsWith('$calc')) {
                    return await window.DBO_Math.execute(text);
                }

                if (text.startsWith('$wiki') || text.startsWith('$web') ||
                    text.startsWith('$paper')) {
                    return await window.DBO_Ingest.execute(text);
                    }

                    return null;
    }
};
