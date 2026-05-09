# lowmanager

Assistente pessoal de IA 100% no navegador.  
Usa **localStorage** e **IndexedDB** para armazenamento local, conectando-se a qualquer LLM via **OpenRouter**.  
Projetado para modelos pequenos e baratos, compensando limitações com um sistema inteligente de ferramentas, memória e limpeza de contexto.

## ✨ Funcionalidades

- 💬 **Chat persistente** – Conversas salvas automaticamente no navegador (localStorage)
- 🧠 **Orquestrador inteligente** – Analisa cada prompt, decide se usa ferramentas, busca contexto ou responde direto
- 📚 **Biblioteca de documentos** – Importe arquivos (.txt, .md, .json, etc.) e faça buscas vetoriais e textuais (IndexedDB)
- ⏳ **Sandbox de memória** – Salva notas rápidas e "memórias de curto prazo" para consulta em conversas futuras
- 🔧 **Tool Loop (ciclo de ferramentas)** – Deixa o modelo chamar funções internas (tradução, cálculos, busca na biblioteca) em múltiplos passos
- 📎 **Cleaner de contexto** – Otimiza prompts longos para não estourar limites de tokens de modelos pequenos
- 🎛️ **Sistema de comandos** – Atalhos como `$b` (biblioteca), `$t` (traduzir), `$s` (sandbox), `$img` (gerar imagens com IA)
- 🔐 **Suporte a múltiplas APIs** – OpenRouter como padrão, com estrutura fácil para outros backends
- 🧩 **Arquitetura modular** – Código separado em UI (`app.js`), lógica central (`main.js`) e submódulos (`js/DBO`, `js/MLO`)

## 🏗️ Estrutura do projeto

```
lowmanager/
├── index.html          # Página principal
├── main.js             # Lógica central (API window.Core)
├── app.js              # Interface e eventos do usuário
├── js/
│   ├── config.js       # Configurações (API key, modelo padrão)
│   ├── storage.js      # Abstração do localStorage
│   ├── api.js          # Comunicação com OpenRouter
│   ├── commands.js     # Roteador de comandos ($...)
│   ├── orchestrator.js # Orquestrador principal
│   ├── tool-loop.js    # Ciclo de ferramentas
│   ├── cleaner.js      # Otimizador de contexto
│   ├── library.js      # Gerenciamento da biblioteca de documentos
│   ├── error-handler.js
│   ├── DBO/            # DataBase Oriented
│   │   ├── dbo-library.js
│   │   ├── dbo-search.js
│   │   ├── dbo-ingest.js
│   │   └── dbo-math.js
│   └── MLO/            # Machine Learning Oriented (ferramentas, análise)
│       └── ...
└── README.md
```

## 🚀 Como usar

1. **Clone o repositório**  
   ```bash
   git clone https://github.com/Otavioqwert/lowmanager.git
   ```
   ou baixe o ZIP e extraia.

2. **Abra o arquivo**  
   Basta abrir o `index.html` em qualquer navegador moderno (Chrome, Firefox, Edge).  
   *Não requer servidor local*, pois usa APIs do navegador (IndexedDB, localStorage).

3. **Configure sua chave de API**  
   - Na interface, vá em **Configurações** (ícone ⚙️)  
   - Insira sua chave da OpenRouter (obtenha em [openrouter.ai](https://openrouter.ai/))  
   - Escolha o modelo desejado (ex: `openai/gpt-3.5-turbo`, `mistralai/mistral-7b-instruct`, etc.)

4. **Comece a conversar!**  
   Digite sua pergunta na caixa de texto.  
   Use comandos com `$` para ativar funções específicas (veja lista abaixo).

## ⌨️ Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `$b` ou `$buscar` | Busca na sua biblioteca pessoal (documentos importados) |
| `$t` ou `$traduzir` | Traduz o texto seguinte para português |
| `$s` ou `$sandbox` | Gerencia a sandbox de memória |
| `$sn` | Adiciona uma nota rápida na sandbox (ex: `$sn reunião dia 15`) |
| `$anotar` | Salva o último conteúdo gerado na sandbox |
| `$img` ou `$imagem` | Gera imagem via IA (requer suporte do modelo) |
| `$limpar` | Limpa o histórico da conversa atual |
| `$modelo` | Altera o modelo ativo (ex: `$modelo mistral-nemo`) |
| `$help` | Mostra a lista de comandos no chat |

A qualquer momento você também pode usar linguagem natural – o **orquestrador** decide se precisa ativar ferramentas automaticamente.

## 🧠 Como funciona (resumo)

1. Você envia uma mensagem.
2. O **Orquestrador** (`orchestrator.js`) avalia se o prompt:
   - É simples → responde direto
   - Pede uma ferramenta → ativa o **Tool Loop**, que permite ao modelo fazer várias chamadas de função até gerar a resposta final
   - Precisa de contexto → busca na **sandbox** ou na **biblioteca**.
3. Se necessário, o **Cleaner** comprime o histórico para não ultrapassar tokens do modelo escolhido.
4. A resposta é exibida e salva no histórico (localStorage).

**OBS**: Nenhum dado sai do seu navegador além das requisições para a API do OpenRouter. Tudo o que você digita ou importa fica armazenado **apenas localmente**.

## 📦 Armazenamento offline

- **localStorage**: conversas, configurações, sandbox
- **IndexedDB**: documentos da biblioteca, índices de busca vetorial e textual
- **Tamanho limite**: o navegador impõe ~5–10 MB para localStorage e muito mais para IndexedDB. Para uso intenso, prefira importar documentos via biblioteca (IndexedDB).

## ⚠️ Limitações conhecidas

- Funcionalidade **totalmente dependente de APIs externas** (OpenRouter). Sem internet, o assistente não responde.
- A geração de imagens e áudio ainda está em fase inicial (dependência de modelos específicos).
- O suporte a múltiplos chats simultâneos ainda não foi implementado (apenas um chat ativo por vez).
- Em navegadores com bloqueadores rígidos de armazenamento (modo anônimo), pode perder dados ao fechar.

## 🤝 Contribuindo

Sinta-se à vontade para abrir **issues** e enviar **pull requests**.  
Este projeto é mantido como um experimento pessoal, mas aceita melhorias na documentação, correções de bugs ou novas ferramentas.

## 📄 Licença

MIT – veja o arquivo [LICENSE](LICENSE) (se disponível no repositório).

---

**Nota**: este README foi atualizado em 2026-05-09 para refletir a arquitetura real do código, substituindo a documentação anterior que estava desatualizada.
