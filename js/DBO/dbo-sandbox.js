// js/DBO/dbo-sandbox.js
window.DBO_Sandbox = {
    async execute(text) {
        if (!text) return null;

        // 🆕 $anotar – atalho para criar nota rápida da IA
        if (text.startsWith('$anotar ')) {
            const args = text.replace('$anotar ', '').trim();
            if (!args) return 'Uso: $anotar <id> <conteúdo>';

            const spaceIndex = args.indexOf(' ');
            if (spaceIndex === -1) return 'Uso: $anotar <id> <conteúdo>';

            const id = args.substring(0, spaceIndex).trim();
            const conteudo = args.substring(spaceIndex + 1).trim();
            if (!conteudo) return '⚠️ Conteúdo vazio. Uso: $anotar <id> <conteúdo>';

            return await window.MemoryManager.criar(id, 'anotação', conteudo);
        }

        if (text.startsWith('$sn criar ')) {
            const args = text.replace('$sn criar ', '').trim();
            const parts = args.match(/^(\S+)\s+(\S+)\s+(.*)$/);
            if (!parts) return 'Uso: $sn criar <id> <tag> <conteúdo>';
            return await window.MemoryManager.criar(parts[1], parts[2], parts[3]);
        }

        if (text.startsWith('$sn user criar ')) {
            const args = text.replace('$sn user criar ', '').trim();
            const parts = args.match(/^(\S+)\s+(\S+)\s+(.*)$/);
            if (!parts) return 'Uso: $sn user criar <id> <tag> <conteúdo>';
            return await window.MemoryManager.criar(parts[1], parts[2], parts[3], 'user', 'global');
        }

        if (text.startsWith('$sn ver ')) {
            return await window.MemoryManager.ver(text.replace('$sn ver ', '').trim());
        }

        if (text.startsWith('$sn listar')) {
            const args = text.replace('$sn listar', '').trim();
            let owner = null, tag = null;
            if (args.includes('user')) owner = 'user';
            else if (args.includes('ai')) owner = 'ai';
            const tagMatch = args.match(/tag:(\S+)/);
            if (tagMatch) tag = tagMatch[1];
            return await window.MemoryManager.listar(owner, tag);
        }

        if (text.startsWith('$sn buscar ')) {
            return await window.MemoryManager.buscar(text.replace('$sn buscar ', '').trim());
        }

        if (text.startsWith('$sn deletar ')) {
            return await window.MemoryManager.deletar(text.replace('$sn deletar ', '').trim());
        }

        if (text.trim() === '$sn limpar') {
            return await window.MemoryManager.limparSessao();
        }

        return null;
    }
};
