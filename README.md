# Direcções da Semana — redacção automática (sem custo extra)

Todos os dias às 2h da madrugada (Maputo) quatro agentes preparam a edição: **Fontes → Análise → Design → Editor**.
A edição é aprimorada ao longo da semana. Quando fica pronta, recebe um email do GitHub.
Os agentes usam a **sua subscrição Claude (Pro)**. Não é preciso API paga.

- Escritório: `https://SEU-UTILIZADOR.github.io/NOME-DO-REPO/`
- Conversa da semana: uma *Issue* por semana (é daí que vêm os emails).

## Montar (uma vez só)

1. **Criar o repositório:** em github.com → **+** → *New repository* → por exemplo `direccoes-da-semana` → **Public** → *Create*.
2. **Enviar os ficheiros:** *Add file* → *Upload files* → todos os ficheiros e pastas deste pacote → *Commit changes*.
3. **Gerar o token da subscrição Claude** (precisa de um computador, uma única vez):
   - Instale o Claude Code: https://code.claude.com (instruções para Windows/Mac/Linux).
   - No terminal, escreva `claude setup-token`, entre com a sua conta Claude Pro e copie o token que aparece.
   - No repositório: *Settings* → *Secrets and variables* → *Actions* → *New repository secret* →
     Nome: `CLAUDE_CODE_OAUTH_TOKEN` → cole o token → *Add secret*.
4. **Ligar a página:** *Settings* → *Pages* → *Deploy from a branch* → `main` e pasta `/docs` → *Save*.
5. **Permissões:** *Settings* → *Actions* → *General* → *Workflow permissions* → **Read and write permissions** → *Save*.
6. **Primeira ronda:** separador *Actions* → *Redacção diária* → *Run workflow*. Demora 10–25 minutos.
7. **Emails:** instale a app **GitHub** no telemóvel e confirme que as notificações por email das *Issues* estão ligadas.

Se a ronda falhar com um erro de permissões do GitHub, instale a app oficial do Claude no repositório:
https://github.com/apps/claude

## No dia-a-dia (na Issue da semana)

| Quero… | Faço… |
|---|---|
| Acrescentar notícia local (ex.: Diário de Moçambique) | Comentário a começar por `Notícia:` |
| Dar sugestão | Comentário normal (entra na próxima ronda) |
| Rever já | Comentário `/rever` |
| Trocar uma frase ou palavra (sem gastar o Claude) | `/trocar "texto antigo" por "texto novo"` (pode pôr várias linhas) |
| Pôr na edição uma notícia que ficou de fora | Ver o número em "Todas as notícias" no escritório e comentar `/incluir 12` |
| Aprovar | Comentário `aprovado` (ou `/aprovar`), ou a etiqueta `aprovado` |

## Custos e limites

- GitHub (Actions, Pages, Issues): grátis em repositório público.
- Claude: usa a subscrição Pro que já paga. **A ronda diária gasta parte do seu limite de uso**, partilhado com o
  claude.ai. Se às 2h o limite estiver esgotado, a ronda falha e recebe um aviso; comente `/rever` mais tarde.

## Ajustes

- Hora: `.github/workflows/redaccao.yml`, `cron: "0 0 * * *"` = 2h de Maputo (para 3h use `"0 1 * * *"`).
- Linha editorial, fontes e grupos de impacto: `config/linha-editorial.json`.
- Como cada agente trabalha: `config/instrucoes-agentes.md`.

## Kit da semana e Google Drive

Quando aprova a edição (etiqueta `aprovado`), o sistema cria o **kit da semana**:

```
Direccoes-2026-S40.zip
  0-LEIA-ME.txt
  1-STORIES (WhatsApp, Instagram, Facebook)   S40-story-01-capa.jpg ...
  2-FEED (Instagram e Facebook)               S40-feed-01-capa.jpg ... legenda-instagram.txt, texto-facebook.txt
  3-LINKEDIN                                  S40-Direccoes-da-Semana.pdf, S40-capa-linkedin.jpg, texto-linkedin.txt
  4-TEXTOS                                    whatsapp-canal.txt, analise-completa.txt
  5-REEL                                      S40-reel.mp4
```

- Descarrega-se no escritório ("Kit da semana"), que guarda também as edições anteriores.
- Um `/trocar` numa edição já aprovada actualiza o kit.

### Ligar o Google Drive (opcional, uma vez, no computador)

1. Instale o rclone: https://rclone.org/downloads (no Windows também `winget install Rclone.Rclone`).
2. No terminal, escreva `rclone config` e responda:
   - `n` (novo), nome: **gdrive**
   - tipo de armazenamento: **drive** (Google Drive)
   - client_id e client_secret: deixe vazio (Enter)
   - scope: escolha **drive.file** (o rclone só mexe nos ficheiros que ele próprio cria)
   - o resto: Enter / `n`, até perguntar se quer autorizar no browser: `y`. Entre com a sua conta Google.
   - shared drive: `n`; confirme com `y` e saia com `q`.
3. Escreva `rclone config show` e copie **todo** o texto que aparece.
4. No GitHub: Settings → Secrets and variables → Actions → New repository secret →
   nome **RCLONE_CONF**, valor: o texto copiado.

A partir daí, cada edição aprovada aparece no Drive em `Direccoes da Semana/2026-S40/`.

### Do Drive para a galeria do telemóvel

- **Android:** instale a app *Autosync for Google Drive* (MetaCtrl). Crie uma ligação entre a pasta do Drive
  `Direccoes da Semana` e uma pasta do telemóvel, por exemplo `Pictures/Direccoes`, com o método
  **"Só descarregar"**. Cada semana nova aparece sozinha na galeria.
- **iPhone:** abra a pasta na app Ficheiros (Drive) e use "Guardar imagens" para as pôr na galeria.
