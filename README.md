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
| Escolher o assunto do próximo post do dia | Comentário `Tema: preço do arroz na Beira` |
| Aprovar o post do dia | Comentário `aprovado` (aprova o último que recebeu por email) ou `aprovado dia` |
| Aprovar a edição da semana | Comentário `aprovado semana`, ou a etiqueta `aprovado` |
| Aprovar os dois | Comentário `aprovado tudo` |

## Posts diários

De segunda a sexta, além de aprimorar a edição da semana, a redacção prepara um post do dia:

| Dia | Post |
|---|---|
| Segunda, terça, quinta, sexta | **Direcção do Dia**: um só assunto investigado a fundo, em cerca de 14 imagens. O facto, como chegámos aqui e o precedente, como chega ao bolso, a conta com números, três cenários (cada um com gatilho, números, prazo, quem ganha e perde, e o que fazer), os sinais com limiar e data para saber qual vem aí, quem é afectado, direcção para agora e se piorar, o que pode estar errado e o grau de confiança. |
| Quarta | **O Seu Bolso**: para a classe média e a classe baixa. Preços acompanhados semana a semana (combustível, chapa, milho, arroz, câmbio, juros), o que mudou, o que fazer por área, e revisão das direcções anteriores. |
| Sábado e domingo | Só a edição da semana (bom momento para a aprovar com `aprovado semana`). |

O email desses dias mostra primeiro o post do dia; a edição da semana vem em baixo, fechada.
Cada post do dia tem o seu kit (`Direccoes-2026-10-14-O-Seu-Bolso.zip`), no escritório e, se ligado, no
Google Drive em `Direccoes da Semana/Posts do dia/`.

## Memória da redacção (pasta `memoria/`)

A análise não recomeça do zero: a cada ronda os agentes registam

- `indicadores.json`: os valores dos indicadores do bolso, com data e fonte (séries que crescem semana a semana);
- `temas.json`: os assuntos em curso e o seu historial;
- `direccoes.json`: as direcções dadas e, mais tarde, se se confirmaram;
- `licoes.md`: o que a equipa aprendeu;
- `resumo.json`: versão curta que os agentes lêem (poupa uso do Claude). Aparece também no escritório, em "Memória da redacção".

Não apague esta pasta: é o arquivo que dá valor ao "O Seu Bolso".

## Fontes e métodos de análise

- `config/fontes.json`: fontes por categoria. Oficiais, preços e imprensa nacional são consultadas todos os dias;
  as outras (económica, análise independente, humanitária, regional, internacional) rodam pelos dias da semana.
  Pode acrescentar fontes à vontade.
- Além do PESTAL, cada edição tem: canais de transmissão (como chega ao bolso), três cenários com probabilidade,
  riscos (probabilidade e impacto), horizonte (imediato, 3 meses, 1 ano), vulnerabilidade por grupo,
  grau de confiança e ligação à memória.

## Custos e limites

- GitHub (Actions, Pages, Issues): grátis em repositório público.
- Claude: usa a subscrição Pro que já paga. **A ronda diária gasta parte do seu limite de uso**, partilhado com o
  claude.ai. Se às 2h o limite estiver esgotado, a ronda falha e recebe um aviso; comente `/rever` mais tarde.

## Ajustes

- Hora: `.github/workflows/redaccao.yml`, `cron: "0 0 * * *"` = 2h de Maputo (para 3h use `"0 1 * * *"`).
- Linha editorial e grupos de impacto: `config/linha-editorial.json`. Fontes e indicadores do bolso: `config/fontes.json`.
- Como cada agente trabalha: `config/instrucoes-agentes.md`.

## Kit da semana e Google Drive

Quando aprova a edição (`aprovado semana` ou etiqueta `aprovado`), o sistema cria o **kit da semana**:

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
