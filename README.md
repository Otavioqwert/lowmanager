# lowmanager

Wrapper pessoal de IA com orquestração autônoma, buscas semânticas, armazenamento frio de documentos e interface web minimalista. Usa **OpenRouter** como backend e roda inteiramente no navegador (localStorage + IndexedDB).

## ⚡ Primeiros passos

1. Abra o `index.html` em um servidor local (ex.: `python3 -m http.server 8000`).
2. No painel esquerdo, insira sua **API Key da OpenRouter** (formato `sk-or-v1-...`).
3. Escolha um modelo no campo `modelo`:
   - `qwen/qwen3.5-9b` (recomendado, pago e obediente)
   - `google/gemma-2-2b-it:free` (grátis, limitado)
   - `meta-llama/llama-3.1-8b-instruct:free` (grátis, limitado)
4. Comece um novo chat e experimente os comandos abaixo.

## 🧠 Funciona melhor com IAs pequenas

O lowmanager foi projetado para compensar as limitações de modelos menores (Phi-4, Qwen 3.6 Flash, Gemma) com um sistema de ferramentas e um Cleaner que reescreve prompts bagunçados.  
Modelos muito "criativos" podem ignorar o protocolo de ferramentas; nesses casos, prefira modelos mais obedientes como `qwen/qwen3.5-9b` ou `llama-3.1-8b-instruct`.

## 🛠️ Comandos principais

### 🔎 Pesquisa & Informação
| Comando | Descrição |
|---------|-----------|
| `$buscar <termo>` | Busca semântica na biblioteca indexada (embeddings). |
| `$buscar cat:<categoria> <termo>` | Busca semântica filtrando por categoria. |
| `$buscar key:<chave>` | Recupera o chunk exato com aquela chave. |
| `$buscar id:<id>` | Recupera o chunk exato com aquele ID. |
| `$wiki <termo>` | Consulta a Wikipedia em português. |
| `$web <url>` | Extrai e indexa o texto de uma página (via Jina Reader). |
| `$paper <termo>` | Busca artigos acadêmicos (Internet Archive). |
| `$raw buscar <termo> [limite]` | Busca textual nos documentos frios (sem custo). Ex.: `$raw buscar sanctions 10`. |
| `$navegar <termo>` | Abre navegador interativo parágrafo a parágrafo. |
| `$navegar <termo> lote <n>` | Varredura seletiva: mostra primeiras palavras dos parágrafos do lote (IA usa isso para ler documentos grandes sem sobrecarga). |

### 🧮 Cálculo
| Comando | Descrição |
|---------|-----------|
| `$calc <expressão>` | Calculadora comum. Suporta `pi`, `e`, `sin()`, `sqrt()`, `log()`, etc. |
| `$calc rpn <tokens>` | Calculadora RPN (notação polonesa reversa). Ideal para múltiplas etapas. |
| `$math <instrução>` | Sessão interativa de pilha. Ex.: `$math 2`, `$math 3 *`, `$math show`. |

### 📂 Gerenciamento de documentos
| Comando | Descrição |
|---------|-----------|
| `$adicionar [categoria:] [key:] [chunkSize:] [cru:1] "texto"` | Adiciona texto à biblioteca. `cru:1` salva apenas no armazenamento frio (sem embeddings). |
| `$raw listar` | Lista documentos brutos armazenados. |
| `$raw ver <id>` | Exibe o texto bruto de um documento. |
| `$raw remover <id>` | Remove um documento bruto. |
| `$aquecer <id>` | Move um documento frio para a biblioteca indexada (gera embeddings). |
| `$categorias` | Lista categorias da biblioteca e quantidade de chunks. |
| `$rotular <id|último> key:... categoria:...` | Atualiza metadados de um chunk. |
| `$reprocessar [velocidade]` | Gera keys automáticas para chunks não rotulados, com barra de progresso. |
| `$memorizar` | Salva um resumo da conversa atual na biblioteca. |

### 📝 Sandbox de memória (notas da IA e do usuário)
| Comando | Descrição |
|---------|-----------|
| `$sn criar <id> <tag> <conteúdo>` | Cria uma nota temporária (da IA). |
| `$sn ver <id>` | Lê o conteúdo de uma nota. |
| `$sn listar [ai|user]` | Lista notas (IA ou usuário). |
| `$sn buscar <termo>` | Busca textual nas notas. |
| `$sn deletar <id>` | Remove uma nota. |
| `$sn limpar` | Remove todas as notas de sessão da IA. |
| `$sn user criar <id> <tag> <conteúdo>` | Cria uma nota permanente (do usuário). |

## 🏗️ Estrutura do projeto

js/
├── MLO/ # Módulos especializados
│ ├── cleaner.js # Limpeza de prompts (Phi-4)
│ ├── memorizer.js # Geração de resumos
│ ├── tool-loop.js # Loop de ferramentas (orquestração da IA)
│ ├── intent-classifier.js# Classificador de intenção
│ ├── math-session.js # Sessão interativa de pilha
│ ├── rpn-engine.js # Motor RPN
│ ├── paragraph-navigator.js # Navegador interativo
│ ├── raw-storage.js # Armazenamento frio (IndexedDB)
│ └── memory-manager.js # Gerenciador da sandbox (IndexedDB)
├── DBO/ # Módulos de banco de dados orientado
│ ├── dbo-library.js # Curadoria da biblioteca
│ ├── dbo-search.js # Buscas (vetorial, textual, navegação)
│ ├── dbo-math.js # Cálculo e RPN
│ ├── dbo-ingest.js # Ingestão de dados externos (wiki, web, paper)
│ └── dbo-sandbox.js # Comandos da sandbox de memória
├── commands.js # Roteador de comandos
├── library.js # Biblioteca vetorial (embeddings + busca)
├── api.js # Chamadas à OpenRouter
├── storage.js # Persistência de chats (localStorage)
├── config.js # Modelos padrão e system prompt
├── app.js # Interface e lógica de chat
└── error-handler.js # Tratamento seguro de erros


## 💡 Dicas

- **Economize tokens**: use `$raw buscar` (textual) sempre que possível; embeddings são caros.  
- **Documentos grandes**: capture com `$web` e explore com `$navegar <termo> lote 1`, depois lote 2, etc.  
- **Histórico poluído**: abra um novo chat quando mudar radicalmente de assunto.  
- **Cotas**: modelos `:free` têm limites diários; prefira modelos pagos e configure o limite da chave na OpenRouter.  
- **Sandbox**: a IA pode anotar descobertas com `$sn criar` e revê‑las com `$sn listar`. O usuário tem seu próprio espaço com `$sn user criar`.

## 📄 Licença
MIT — use como quiser.


