// Parte sem custo: GitHub Issues, estado do escritório, notificações.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resumo as resumoMemoria } from "./memoria.mjs";

const [, , ACCAO] = process.argv;
const REPO = process.env.GITHUB_REPOSITORY;
const OWNER = process.env.GITHUB_REPOSITORY_OWNER;
const TOKEN = process.env.GITHUB_TOKEN;
const EVENTO = process.env.EVENTO || "workflow_dispatch";
const PAGE = `https://${OWNER}.github.io/${REPO.split("/")[1]}/`;
const D = "docs/data";

const maputo = new Date(Date.now() + 2 * 3600e3);
const hoje = maputo.toISOString().slice(0, 10);
function semanaISO(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const n = Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-S${String(n).padStart(2, "0")}`;
}
const SEMANA = semanaISO(maputo);
const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const DIA_SEMANA = DIAS[maputo.getUTCDay()];
// Segunda, terça, quinta e sexta: Direcção do Dia. Quarta: O Seu Bolso. Fim de semana: só a edição semanal.
let POST_DO_DIA = { quarta: "bolso", sabado: "nenhum", domingo: "nenhum" }[DIA_SEMANA] || "dia";
// Que aprovar: "aprovado dia", "aprovado semana", "aprovado tudo"; sem nada, aprova o último que foi enviado.
function alvoDe(com) {
  const m = com.match(/^\/?aprova(?:r|do|da)\b[\s,:]*(?:(?:a|o|os)\s+)?(dia|bolso|post|semana|semanal|edi[cç][aã]o|tudo|ambos|dois)?/i);
  const w = (m?.[1] || "").toLowerCase();
  if (/dia|bolso|post/.test(w)) return "dia";
  if (/semana|edi/.test(w)) return "semana";
  if (/tudo|ambos|dois/.test(w)) return "tudo";
  return ler(`${D}/status.json`, {}).ultimo_notificado || "semana";
}
const PASTA_DIA = (dia) => `${dia.data}-${dia.tipo === "bolso" ? "O-Seu-Bolso" : "Direccao-do-Dia"}`;
const ler = (p, d) => { try { return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d; } catch (e) { console.warn(`Aviso: ${p} tem JSON inválido (${e.message}); a usar valor por defeito.`); return d; } };
const gravar = (p, o) => { mkdirSync(p.split("/").slice(0, -1).join("/"), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 2)); };
const saida = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);

async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" } });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}
function git(msg) {
  try {
    execSync(`git add ${D} && (git diff --cached --quiet || git commit -qm "${msg}") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" });
  } catch (e) { console.warn(e.message); }
}
function estado(ag, est, msg) {
  const s = ler(`${D}/status.json`, { estagios: {}, log: [] });
  s.semana = SEMANA; s.dia = hoje; s.actualizado = new Date().toISOString();
  s.estagios[ag] = { estado: est, msg, em: s.actualizado };
  s.log = [{ em: s.actualizado, agente: ag, msg }, ...(s.log || [])].slice(0, 40);
  return s;
}

async function issueDaSemana() {
  const titulo = `Direcções da Semana — ${SEMANA}`;
  const lista = await gh(`/issues?state=all&labels=edicao&per_page=20`);
  const ja = lista.find((i) => i.title === titulo);
  if (ja) return ja;
  for (const [name, color] of [["edicao", "1F6F6A"], ["aprovado", "C8912E"]]) { try { await gh(`/labels`, { method: "POST", body: JSON.stringify({ name, color }) }); } catch {} }
  return gh(`/issues`, { method: "POST", body: JSON.stringify({ title: titulo, labels: ["edicao"], body:
    `Conversa da semana **${SEMANA}**.\n\n- **Notícia:** … para acrescentar uma notícia (texto ou link)\n- Comentário normal = sugestão para a próxima ronda\n- **Tema:** … para escolher o assunto do próximo post do dia\n- **/rever** para refazer já com as suas sugestões\n- **aprovado** (post do dia), **aprovado semana** (edição da semana) ou **aprovado tudo**\n\nEscritório: ${PAGE}` }) });
}

async function preparar() {
  const issue = await issueDaSemana();
  const COM = (process.env.COMENTARIO || "").trim();
  const eAprovar = /^\/?aprova(r|do|da)\b/i.test(COM);
  const eTrocar = /^\/?trocar\b/i.test(COM);
  // "rever bolso" ou "rever dia" força o tipo de post de hoje (útil para testar fora do dia)
  const forca = COM.match(/^\/?(?:rever|revê|refazer)\b[\s,:]*(bolso|dia)\b/i);
  if (forca) POST_DO_DIA = forca[1].toLowerCase();
  const modo = EVENTO === "issues" ? "aprovar" : EVENTO === "issue_comment" ? (eAprovar ? "aprovar" : eTrocar ? "editar" : "rever") : "diario";
  const alvo = EVENTO === "issues" ? "semana" : eAprovar ? alvoDe(COM) : "";
  const NOME_ALVO = { dia: "o post do dia", semana: "a edição da semana", tudo: "o post do dia e a edição da semana" }[alvo];
  // Reacção imediata ao comentário, para saber que o pedido foi recebido
  if (process.env.COMENTARIO_ID) { try { await gh(`/issues/comments/${process.env.COMENTARIO_ID}/reactions`, { method: "POST", body: JSON.stringify({ content: "eyes" }) }); } catch {} }
  if (EVENTO === "issue_comment") {
    const msg = { aprovar: `Recebido. A aprovar ${NOME_ALVO} e a preparar o kit${alvo !== "dia" ? " e o Reel" : ""} (cerca de 5 minutos).`, editar: "Recebido. A trocar o texto e a refazer as imagens (cerca de 5 minutos).", rever: "Recebido. Os agentes estão a rever a edição (10 a 25 minutos)." }[modo];
    try { await gh(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body: msg }) }); } catch {}
  }
  saida("modo", modo); saida("hoje", hoje); saida("semana", SEMANA); saida("issue", issue.number);
  saida("alvo", alvo); saida("post_do_dia", POST_DO_DIA);
  if (modo === "aprovar") return;
  if (modo === "editar") return editar(COM, issue);
  const acum = ler(`${D}/semanas/${SEMANA}/acumulado.json`, { itens: [], processados: [] });
  const coms = (await gh(`/issues/${issue.number}/comments?per_page=100`)).filter((c) => c.user.login === OWNER);
  const novos = coms.filter((c) => !(acum.processados || []).includes(c.id) && !/^\/?(rever|revê|refazer|trocar)\b/i.test(c.body.trim()) && !/^\/?aprova(r|do|da)\b/i.test(c.body.trim()));
  const eNoticia = (t) => /^not[ií]cia\s*:/i.test(t.trim());
  const eTema = (t) => /^tema\s*:/i.test(t.trim());
  // Fontes do dia: as categorias de sempre + as que rodam neste dia da semana
  const F = ler("config/fontes.json", { categorias: {}, rotacao: {} });
  const categorias_hoje = [...new Set([...Object.entries(F.categorias || {}).filter(([, c]) => c.sempre).map(([k]) => k), ...((F.rotacao || {})[DIA_SEMANA] || [])])];
  const temaCom = novos.filter((c) => eTema(c.body)).at(-1);
  // Memória: refaz o resumo para os agentes lerem a versão curta
  try { resumoMemoria(hoje); } catch (e) { console.warn("Resumo da memória:", e.message); }
  gravar(`${D}/entrada.json`, {
    modo, hoje, semana: SEMANA, issue: issue.html_url,
    dia_semana: DIA_SEMANA, post_do_dia: POST_DO_DIA, categorias_hoje,
    tema_pedido: temaCom ? temaCom.body.trim().replace(/^tema\s*:/i, "").trim() : "",
    ultimos_temas_dia: ler(`${D}/dias/lista.json`, []).slice(0, 5).map((x) => `${x.data} (${x.tipo}): ${x.tema || ""}`),
    noticias_do_aprovador: novos.filter((c) => eNoticia(c.body)).map((c) => c.body.trim().replace(/^not[ií]cia\s*:/i, "").trim()),
    sugestoes_novas: novos.filter((c) => !eNoticia(c.body) && !eTema(c.body) && !/^\/?incluir\b/i.test(c.body.trim())).map((c) => c.body.trim()),
    incluir_itens: [...new Set([...(acum.incluir_itens || []), ...novos.filter((c) => /^\/?incluir\b/i.test(c.body.trim())).flatMap((c) => (c.body.match(/\d+/g) || []).map(Number))])],
    ids_comentarios: novos.map((c) => c.id),
  });
  const s = estado("fontes", modo === "diario" ? "a trabalhar" : "pronto", modo === "diario" ? "A começar a pesquisa do dia…" : "A preparar a revisão…");
  for (const k of ["analise", "design", "editor"]) s.estagios[k] = { estado: "parado", msg: "À espera da sua vez", em: s.actualizado };
  s.estagios.aprovacao = { estado: "parado", msg: "Sem edição nova ainda", em: s.actualizado };
  s.issueUrl = issue.html_url;
  gravar(`${D}/status.json`, s);
  try { execSync("git add memoria", { stdio: "ignore", shell: "/bin/bash" }); } catch {}
  git("redacção: início da ronda");
}

// /trocar "texto antigo" por "texto novo"  (pode repetir várias linhas no mesmo comentário)
async function editar(com, issue) {
  const pares = [...com.matchAll(/["“”']([^"“”']+)["“”']\s+por\s+["“”']([^"“”']*)["“”']/gi)].map((m) => [m[1], m[2]]);
  const ed = ler(`${D}/edicao.json`, {});
  const A = `${D}/semanas/${ed.semana}/acumulado.json`, acum = ler(A, null);
  let n = 0;
  const troca = (v) => {
    if (typeof v === "string") { let r = v; for (const [a, b] of pares) { const k = r.split(a).length - 1; if (k) { n += k; r = r.split(a).join(b); } } return r; }
    if (Array.isArray(v)) return v.map(troca);
    if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = ["url", "imagem_termos", "tom", "imagens"].includes(k) ? x : troca(x); return o; }
    return v;
  };
  for (const k of ["textos", "design", "analise"]) { ed[k] = troca(ed[k]); if (acum) acum[k] = ed[k]; }
  gravar(`${D}/edicao.json`, ed); if (acum) gravar(A, acum);
  // Também no post do dia
  const dia = ler(`${D}/dia.json`, null);
  if (dia) { const antes = n; const { imagens, series, ...resto } = dia; const novo = { ...troca(resto), imagens, series };
    if (n > antes) { gravar(`${D}/dia.json`, novo); if (existsSync(`${D}/dias/${dia.data}.json`)) gravar(`${D}/dias/${dia.data}.json`, novo); } }
  const s = estado("editor", "pronto", n ? `${n} alteração(ões) feitas à mão` : "Texto a trocar não encontrado");
  s.issueUrl = issue.html_url; gravar(`${D}/status.json`, s); git("edição: troca de texto");
  if (!n) await gh(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body:
    `@${OWNER} Não encontrei o texto a trocar. Copie a frase exactamente como está na edição e use: /trocar "texto antigo" por "texto novo"` }) });
  saida("trocas", n);
}

const RAW = (p) => `https://raw.githubusercontent.com/${REPO}/main/docs/${p}`;
const det = (t, c) => (c ? `<details><summary>${t}</summary>\n\n${c}\n</details>\n\n` : "");

// Bloco do post do dia (Direcção do Dia ou O Seu Bolso), se for de hoje
function blocoDia(dia) {
  const t = dia.textos || {}, im = dia.imagens || {};
  const nome = dia.tipo === "bolso" ? "O Seu Bolso" : `Direcção do Dia: ${dia.tema || ""}`;
  const falhas = (dia.falhas || []).length ? `⚠️ ${dia.falhas.join("; ")}` : "✅ todas cumpridas";
  return `## ${nome}\n\n${dia.pergunta || dia.resumo || ""}\n\n**Direcções editoriais:** ${falhas}\n\n` +
    ((im.slides || []).length ? im.slides.map((p) => `<img src="${RAW(p)}" width="150">`).join(" ") +
      `\n\nStories 9:16 e partilha: ${PAGE}#dia\n\nCarrossel do LinkedIn (PDF): ${RAW(im.pdf || "")}\n\n` : "(imagens do dia ainda não ficaram prontas)\n\n") +
    det("WhatsApp", t.whatsapp) + det("Instagram", t.instagram) + det("Facebook", t.facebook) + det("LinkedIn", t.linkedin);
}

async function notificar() {
  const issue = await issueDaSemana();
  const ed = ler(`${D}/edicao.json`, {});
  const dia = ler(`${D}/dia.json`, null);
  const temDia = !!(dia && dia.data === hoje);
  const t = ed.textos || {};
  const l = (a) => (a && a.length ? a.map((x) => `- ${x}`).join("\n") : "- (nada)");
  const duv = (t.duvidas || []).length;
  const s = estado("aprovacao", "à espera", temDia ? "Post do dia à espera da sua aprovação" : duv ? `${duv} dúvida(s) para si` : "À espera da sua aprovação");
  s.issueUrl = issue.html_url; s.ultimo_notificado = temDia ? "dia" : "semana";
  gravar(`${D}/status.json`, s); git("redacção: edição pronta");
  const semanal = `**O que mudou:** ${ed.analise?.o_que_mudou_hoje || "—"}\n\n**Direcções editoriais:** ${(ed.falhas_conformidade || []).length ? "⚠️ " + ed.falhas_conformidade.join("; ") : "✅ todas cumpridas"}\n\n**Dúvidas da equipa:**\n${l(t.duvidas)}\n\n**Confirmar antes de publicar:**\n${l(t.verificar)}\n\n` +
    (ed.imagens?.slides?.length ? `**Imagens:**\n\n` + [ed.imagens.capa, ...ed.imagens.slides].filter(Boolean).map((p) => `<img src="${RAW(p)}" width="150">`).join(" ") +
      `\n\nStories 9:16: ${PAGE}#imagens\n\nCarrossel do LinkedIn (PDF): ${RAW(ed.imagens.pdf || "")}\n\n` : "") +
    det("Análise completa", t.analise_completa) + det("WhatsApp", t.whatsapp) + det("LinkedIn", t.linkedin) + det("Instagram", t.instagram);
  const corpo = temDia
    ? `@${OWNER} Post do dia pronto (versão ${dia.versao || 1}).\n\n${blocoDia(dia)}---\n\n` +
      `<details><summary>Edição da semana, versão ${ed.versao || "?"} (vai melhorando todos os dias)</summary>\n\n${semanal}</details>\n\n` +
      `Escritório: ${PAGE}\n\nResponda com sugestões, **Notícia: …**, **Tema: …** (assunto para o próximo post do dia), **/rever**, ou:\n- **aprovado** para aprovar o post do dia\n- **aprovado semana** para aprovar a edição da semana\n- **aprovado tudo** para aprovar os dois`
    : `@${OWNER} Edição pronta (versão ${ed.versao || "?"} da semana).\n\n${semanal}Escritório: ${PAGE}\n\n` +
      `Responda com sugestões, **Notícia: …**, **Tema: …**, **/rever**, ou escreva **aprovado** para aprovar a edição da semana.`;
  await gh(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body: corpo }) });
}

async function aprovar() {
  const issue = await issueDaSemana();
  const alvo = alvoDe((process.env.COMENTARIO || "").trim());
  const alvoFinal = EVENTO === "issues" ? "semana" : alvo;
  const em = new Date().toISOString();
  const partes = [];
  if (alvoFinal === "dia" || alvoFinal === "tudo") {
    const dia = ler(`${D}/dia.json`, null);
    if (dia) {
      dia.aprovada = true; dia.aprovadaEm = em;
      gravar(`${D}/dia.json`, dia);
      if (existsSync(`${D}/dias/${dia.data}.json`)) gravar(`${D}/dias/${dia.data}.json`, dia);
      const nome = dia.tipo === "bolso" ? "O Seu Bolso" : "Direcção do Dia";
      partes.push(`✅ **${nome}** de ${dia.data} aprovado (versão ${dia.versao || 1}).\n\n**Kit do dia (ZIP):** ${PAGE}data/kits/Direccoes-${PASTA_DIA(dia)}.zip\n(Google Drive: "Direccoes da Semana/Posts do dia/${PASTA_DIA(dia)}")`);
    } else partes.push("Não há post do dia para aprovar.");
  }
  if (alvoFinal === "semana" || alvoFinal === "tudo") {
    const ed = ler(`${D}/edicao.json`, {}); ed.aprovada = true; ed.aprovadaEm = em;
    gravar(`${D}/edicao.json`, ed);
    const reel = ed.imagens?.reel ? `\n\n**Reel (vídeo 9:16, ${ed.imagens.reel_duracao || "?"} s):** ${RAW(ed.imagens.reel)}\nDescarregue no telemóvel, publique como Reel e escolha uma música na biblioteca do Instagram.` : "";
    partes.push(`✅ **Edição da semana** aprovada (versão ${ed.versao || "?"}).${reel}\n\n**Kit da semana (um ZIP com tudo, por rede social):** ${PAGE}data/kits/Direccoes-${ed.semana}.zip\n(Google Drive: "Direccoes da Semana/${ed.semana}")`);
  }
  const s = estado("aprovacao", "aprovado", alvoFinal === "dia" ? "Post do dia aprovado" : alvoFinal === "tudo" ? "Post do dia e edição aprovados" : "Edição aprovada. Pronta a publicar.");
  s.issueUrl = issue.html_url; gravar(`${D}/status.json`, s); git("redacção: aprovada");
  await gh(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body: `@${OWNER} ${partes.join("\n\n")}\n\nTextos e imagens no escritório: ${PAGE}` }) });
}

async function falha() {
  const s = ler(`${D}/status.json`, { estagios: {}, log: [] });
  const ag = Object.entries(s.estagios || {}).find(([, v]) => v.estado === "a trabalhar")?.[0] || "editor";
  gravar(`${D}/status.json`, estado(ag, "erro", "A ronda falhou. Veja o separador Actions.")); git("redacção: falha");
  const issue = await issueDaSemana();
  await gh(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body:
    `@${OWNER} ⚠️ A ronda falhou na etapa **${ag}**. Causa mais comum: limite de uso da subscrição Claude atingido. Tente mais tarde comentando **/rever**.` }) });
}

({ preparar, notificar, aprovar, falha })[ACCAO]().catch((e) => { console.error(e); process.exit(1); });
