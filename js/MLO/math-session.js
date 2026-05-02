// js/MLO/math-session.js
window.MathSession = {
    stack: [],

    execute(token) {
        token = token.trim();
        if (token === '') return 'Erro: instrução vazia.';

        if (token === 'show') {
            if (this.stack.length === 0) return 'Pilha vazia.';
            return `Topo da pilha: ${this.stack[this.stack.length - 1]}`;
        }
        if (token === 'cls') {
            this.stack = [];
            return 'Pilha limpa.';
        }

        if (!isNaN(token) && token !== '') {
            this.stack.push(parseFloat(token));
            return `Empilhado ${parseFloat(token)}. (${this.stack.length} valor(es) na pilha)`;
        }

        // Operadores e funções (mesma lógica do RPN, mas mantendo estado)
        switch (token) {
            case '+': if (this.stack.length < 2) return 'Erro: operandos insuficientes para +';
            this.stack.push(this.stack.pop() + this.stack.pop()); break;
            case '-': if (this.stack.length < 2) return 'Erro: operandos insuficientes para -';
            { const a = this.stack.pop(), b = this.stack.pop(); this.stack.push(b - a); } break;
            case '*': if (this.stack.length < 2) return 'Erro: operandos insuficientes para *';
            this.stack.push(this.stack.pop() * this.stack.pop()); break;
            case '/': if (this.stack.length < 2) return 'Erro: operandos insuficientes para /';
            { const d = this.stack.pop(); if (d === 0) return 'Erro: divisão por zero'; const n = this.stack.pop(); this.stack.push(n / d); } break;
            case '**':
            case 'pow': if (this.stack.length < 2) return 'Erro: operandos insuficientes para **';
            { const e = this.stack.pop(), b = this.stack.pop(); this.stack.push(Math.pow(b, e)); } break;
            case 'sqrt': if (this.stack.length < 1) return 'Erro: operandos insuficientes para sqrt';
            this.stack.push(Math.sqrt(this.stack.pop())); break;
            case 'sin': if (this.stack.length < 1) return 'Erro: operandos insuficientes para sin';
            this.stack.push(Math.sin(this.stack.pop())); break;
            case 'cos': if (this.stack.length < 1) return 'Erro: operandos insuficientes para cos';
            this.stack.push(Math.cos(this.stack.pop())); break;
            case 'tan': if (this.stack.length < 1) return 'Erro: operandos insuficientes para tan';
            this.stack.push(Math.tan(this.stack.pop())); break;
            case 'asin': if (this.stack.length < 1) return 'Erro: operandos insuficientes para asin';
            this.stack.push(Math.asin(this.stack.pop())); break;
            case 'acos': if (this.stack.length < 1) return 'Erro: operandos insuficientes para acos';
            this.stack.push(Math.acos(this.stack.pop())); break;
            case 'atan': if (this.stack.length < 1) return 'Erro: operandos insuficientes para atan';
            this.stack.push(Math.atan(this.stack.pop())); break;
            case 'log': if (this.stack.length < 1) return 'Erro: operandos insuficientes para log';
            this.stack.push(Math.log(this.stack.pop())); break;
            case 'log10': if (this.stack.length < 1) return 'Erro: operandos insuficientes para log10';
            this.stack.push(Math.log10(this.stack.pop())); break;
            case 'exp': if (this.stack.length < 1) return 'Erro: operandos insuficientes para exp';
            this.stack.push(Math.exp(this.stack.pop())); break;
            case 'pi': this.stack.push(Math.PI); break;
            case 'e': this.stack.push(Math.E); break;
            case 'ceil': if (this.stack.length < 1) return 'Erro: operandos insuficientes para ceil';
            this.stack.push(Math.ceil(this.stack.pop())); break;
            case 'floor': if (this.stack.length < 1) return 'Erro: operandos insuficientes para floor';
            this.stack.push(Math.floor(this.stack.pop())); break;
            case 'round': if (this.stack.length < 1) return 'Erro: operandos insuficientes para round';
            this.stack.push(Math.round(this.stack.pop())); break;
            case 'swap': if (this.stack.length < 2) return 'Erro: operandos insuficientes para swap';
            { const a = this.stack.pop(), b = this.stack.pop(); this.stack.push(a, b); } break;
            default: return `Erro: operador/função desconhecida '${token}'`;
        }

        const top = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
        return `Operação realizada. Pilha: ${this.stack.length} valor(es). Topo: ${top ?? 'vazio'}`;
    }
};
