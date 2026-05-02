// js/DBO/dbo-math.js
window.DBO_Math = {
    async execute(text) {
        if (!text) return null;

        if (text.startsWith('$math ')) {
            const tudo = text.replace('$math ', '').trim();
            if (!tudo) return 'Uso: $math <número|operador|show|cls>';

            const lines = tudo.split('\n').map(l => l.trim()).filter(l => l !== '');
            let lastResult = '';

            for (const line of lines) {
                let token = line.startsWith('$math ') ? line.replace('$math ', '').trim() : line;
                if (token.includes(' ')) {
                    const subTokens = token.split(/\s+/);
                    for (const sub of subTokens) {
                        if (sub !== '') lastResult = window.MathSession.execute(sub);
                    }
                } else {
                    lastResult = window.MathSession.execute(token);
                }
            }

            if (lines.length > 1 || (lines[0] === 'show' || lines[0] === 'cls')) return lastResult;
            const topo = window.MathSession.stack.length > 0 ? window.MathSession.stack[window.MathSession.stack.length - 1] : null;
            if (topo !== null) return `Operação realizada. Topo da pilha: ${topo}`;
            return lastResult;
        }

        if (text.startsWith('$calc rpn ')) {
            const expr = text.replace('$calc rpn ', '').trim();
            const resultado = window.RPN.eval(expr);
            if (resultado.error) return `Erro RPN: ${resultado.error}`;
            return `Resultado: ${resultado.result}`;
        }

        if (text.startsWith('$calc ')) {
            const expr = text.replace('$calc ', '').trim();
            return this.calc(expr);
        }

        return null;
    },

    calc(expr) {
        const constants = {
            'pi': Math.PI, 'e': Math.E, 'tau': Math.PI * 2,
            'phi': (1 + Math.sqrt(5)) / 2, 'ln2': Math.LN2,
            'ln10': Math.LN10, 'sqrt2': Math.SQRT2, 'sqrt1_2': Math.SQRT1_2
        };
        let processed = expr;
        for (const [name, value] of Object.entries(constants)) {
            const regex = new RegExp('\\b' + name + '\\b', 'gi');
            processed = processed.replace(regex, value);
        }

        const functions = [
            'sin', 'cos', 'tan', 'sqrt', 'log', 'exp', 'abs',
            'ceil', 'floor', 'round', 'asin', 'acos', 'atan', 'log10', 'pow'
        ];
        functions.forEach(fn => {
            const regex = new RegExp('\\b' + fn + '\\s*\\(', 'gi');
            processed = processed.replace(regex, 'Math.' + fn + '(');
        });

        processed = processed.replace(/[^0-9+\-*/().%a-zA-Z,\s]/g, '').trim();
        if (!processed) return 'Erro: expressão vazia.';

        const safeMath = processed.replace(/Math\.\w+\s*\(/g, match => {
            const funcName = match.slice(5, -1).trim().toLowerCase();
            return functions.includes(funcName) ? match : 'INVALIDA(';
        });
        if (safeMath.includes('INVALIDA(')) return 'Erro: função não permitida.';

        console.log('[calc] expressão final:', processed);
        try {
            const result = new Function('return ' + processed)();
            if (typeof result === 'number' && isFinite(result)) return `Resultado: ${result}`;
            return 'Erro: resultado não numérico.';
        } catch (e) {
            return `Erro no cálculo: ${e.message}`;
        }
    }
};
