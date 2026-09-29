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
| Aprovar | Etiqueta `aprovado` |

## Custos e limites

- GitHub (Actions, Pages, Issues): grátis em repositório público.
- Claude: usa a subscrição Pro que já paga. **A ronda diária gasta parte do seu limite de uso**, partilhado com o
  claude.ai. Se às 2h o limite estiver esgotado, a ronda falha e recebe um aviso; comente `/rever` mais tarde.

## Ajustes

- Hora: `.github/workflows/redaccao.yml`, `cron: "0 0 * * *"` = 2h de Maputo (para 3h use `"0 1 * * *"`).
- Linha editorial, fontes e grupos de impacto: `config/linha-editorial.json`.
- Como cada agente trabalha: `config/instrucoes-agentes.md`.
