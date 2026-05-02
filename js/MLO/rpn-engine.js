// js/MLO/rpn-engine.js
window.RPN = {
    eval(expression) {
        const tokens = expression.trim().split(/\s+/);
        const stack = [];

        for (const token of tokens) {
            // Número (inclui negativos e decimais)
            if (!isNaN(token) && token !== '') {
                stack.push(parseFloat(token));
                continue;
            }

            // Operadores e funções
            switch (token) {
                // Aritmética básica
                case '+':
                    if (stack.length < 2) return { error: 'Faltam operandos para +' };
                    stack.push(stack.pop() + stack.pop());
                    break;
                case '-':
                    if (stack.length < 2) return { error: 'Faltam operandos para -' };
                    {
                        const a = stack.pop(), b = stack.pop();
                        stack.push(b - a);
                    }
                    break;
                case '*':
                    if (stack.length < 2) return { error: 'Faltam operandos para *' };
                    stack.push(stack.pop() * stack.pop());
                    break;
                case '/':
                    if (stack.length < 2) return { error: 'Faltam operandos para /' };
                    {
                        const divisor = stack.pop();
                        if (divisor === 0) return { error: 'Divisão por zero' };
                        const dividendo = stack.pop();
                        stack.push(dividendo / divisor);
                    }
                    break;
                case '**':
                case 'pow':
                    if (stack.length < 2) return { error: 'Faltam operandos para **' };
                    {
                        const expoente = stack.pop();
                        const base = stack.pop();
                        stack.push(Math.pow(base, expoente));
                    }
                    break;
                case 'sqrt':
                    if (stack.length < 1) return { error: 'Faltam operandos para sqrt' };
                    stack.push(Math.sqrt(stack.pop()));
                    break;

                    // Trigonométricas (ângulo em radianos)
                case 'sin':
                    if (stack.length < 1) return { error: 'Faltam operandos para sin' };
                    stack.push(Math.sin(stack.pop()));
                    break;
                case 'cos':
                    if (stack.length < 1) return { error: 'Faltam operandos para cos' };
                    stack.push(Math.cos(stack.pop()));
                    break;
                case 'tan':
                    if (stack.length < 1) return { error: 'Faltam operandos para tan' };
                    stack.push(Math.tan(stack.pop()));
                    break;
                case 'asin':
                    if (stack.length < 1) return { error: 'Faltam operandos para asin' };
                    stack.push(Math.asin(stack.pop()));
                    break;
                case 'acos':
                    if (stack.length < 1) return { error: 'Faltam operandos para acos' };
                    stack.push(Math.acos(stack.pop()));
                    break;
                case 'atan':
                    if (stack.length < 1) return { error: 'Faltam operandos para atan' };
                    stack.push(Math.atan(stack.pop()));
                    break;

                    // Logaritmos e exponencial
                case 'log':
                    if (stack.length < 1) return { error: 'Faltam operandos para log' };
                    stack.push(Math.log(stack.pop()));
                    break;
                case 'log10':
                    if (stack.length < 1) return { error: 'Faltam operandos para log10' };
                    stack.push(Math.log10(stack.pop()));
                    break;
                case 'exp':
                    if (stack.length < 1) return { error: 'Faltam operandos para exp' };
                    stack.push(Math.exp(stack.pop()));
                    break;

                    // Constantes
                case 'pi':
                    stack.push(Math.PI);
                    break;
                case 'e':
                    stack.push(Math.E);
                    break;

                    // Arredondamento
                case 'ceil':
                    if (stack.length < 1) return { error: 'Faltam operandos para ceil' };
                    stack.push(Math.ceil(stack.pop()));
                    break;
                case 'floor':
                    if (stack.length < 1) return { error: 'Faltam operandos para floor' };
                    stack.push(Math.floor(stack.pop()));
                    break;
                case 'round':
                    if (stack.length < 1) return { error: 'Faltam operandos para round' };
                    stack.push(Math.round(stack.pop()));
                    break;

                    // Troca os dois últimos
                case 'swap':
                    if (stack.length < 2) return { error: 'Faltam operandos para swap' };
                    {
                        const a = stack.pop(), b = stack.pop();
                        stack.push(a, b);
                    }
                    break;

                default:
                    return { error: `Operador desconhecido: ${token}` };
            }
        }

        if (stack.length !== 1) return { error: 'A pilha final deve ter exatamente um valor' };
        const rawResult = stack[0];
        if (!isFinite(rawResult)) return { error: 'Resultado não finito' };

        // Arredondamento inteligente baseado na grandeza
        const formatted = rawResult.toPrecision(12);      // 12 dígitos significativos
        const cleaned = parseFloat(formatted);            // converte de volta para número (remove trailing zeros)
        const finalResult = cleaned.toString();           // string final

        return { result: finalResult };
    }
};
