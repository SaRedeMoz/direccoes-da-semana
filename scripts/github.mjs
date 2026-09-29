// Parte sem custo: GitHub Issues, estado do escritório, notificações.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";

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
const ler = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);
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
    `Conversa da semana **${SEMANA}**.\n\n- **Notícia:** … para acrescentar uma notícia (texto ou link)\n- Comentário normal = sugestão para a próxima ronda\n- **/rever** para refazer já com as suas sugestões\n- Etiqueta **aprovado** para aprovar\n\nEscritório: ${PAGE}` }) });
}

async function preparar() {
  const issue = await issueDaSemana();
  const modo = EVENTO === "issues" ? "aprovar" : EVENTO === "issue_comment" ? "rever" : "diario";
  saida("modo", modo); saida("hoje", hoje); saida("semana", SEMANA); saida("issue", issue.number);
  if (modo === "aprovar") return;
  const acum = ler(`${D}/semanas/${SEMANA}/acumulado.json`, { itens: [], processados: [] });
  const coms = (await gh(`/issues/${issue.number}/comments?per_page=100`)).filter((c) => c.user.login === OWNER);
  const novos = coms.filter((c) => !(acum.processados || []).includes(c.id) && !c.body.trim().startsWith("/rever"));
  const eNoticia = (t) => /^not[ií]cia\s*:/i.test(t.trim());
  gravar(`${D}/entrada.json`, {
    modo, hoje, semana: SEMANA, issue: issue.html_url,
    noticias_do_aprovador: novos.filter((c) => eNoticia(c.body)).map((c) => c.body.trim().replace(/^not[ií]cia\s*:/i, "").trim()),
    sugestoes_novas: novos.filter((c) => !eNoticia(c.body)).map((c) => c.body.trim()),
    ids_comentarios: novos.map((c) => c.id),
  });
  const s = estado("fontes", modo === "diario" ? "a trabalhar" : "pronto", modo === "diario" ? "A começar a pesquisa do dia…" : "A preparar a revisão…");
  for (const k of ["analise", "design", "editor"]) s.estagios[k] = { estado: "parado", msg: "À espera da sua vez", em: s.actualizado };
  s.estagios.aprovacao = { estado: "parado", msg: "Sem edição nova ainda", em: s.actualizado };
  s.issueUrl = issue.html_url;
  gravar(`${D}/status.json`, s); git("redacção: início da ronda");
}

async function notificar() {
  const issue = await issueDaSemana();
  const ed = ler(`${D}/edicao.json`, {});
  const t = ed.textos || {};
  const l = (a) => (a && a.length ? a.map((x) => `- ${x}`).join("\n") : "- (nada)");
  const duv = (t.duvidas || []).length;
  const s = estado("aprovacao", "à espera", duv ? `${duv} dúvida(s) para si` : "À espera da sua aprovação");
  s.issueUrl = issue.html_url; gravar(`${D}/status.json`, s); git("redacção: edição pronta");
  await gh(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body:
    `@${OWNER} Edição pronta (versão ${ed.versao || "?"} da semana).\n\n**O que mudou:** ${ed.analise?.o_que_mudou_hoje || "—"}\n\n**Direcções editoriais:** ${(ed.falhas_conformidade || []).length ? "⚠️ " + ed.falhas_conformidade.join("; ") : "✅ todas cumpridas"}\n\n**Dúvidas da equipa:**\n${l(t.duvidas)}\n\n**Confirmar antes de publicar:**\n${l(t.verificar)}\n\nEscritório: ${PAGE}\n\n` +
    `<details><summary>Análise completa</summary>\n\n${t.analise_completa || ""}\n</details>\n\n<details><summary>WhatsApp</summary>\n\n${t.whatsapp || ""}\n</details>\n\n<details><summary>LinkedIn</summary>\n\n${t.linkedin || ""}\n</details>\n\n<details><summary>Instagram</summary>\n\n${t.instagram || ""}\n</details>\n\n` +
    `Responda com sugestões, **Notícia: …**, **/rever**, ou adicione a etiqueta **aprovado**.` }) });
}

async function aprovar() {
  const issue = await issueDaSemana();
  const ed = ler(`${D}/edicao.json`, {}); ed.aprovada = true; ed.aprovadaEm = new Date().toISOString();
  gravar(`${D}/edicao.json`, ed);
  const s = estado("aprovacao", "aprovado", "Edição aprovada. Pronta a publicar."); s.issueUrl = issue.html_url;
  gravar(`${D}/status.json`, s); git("redacção: aprovada");
  await gh(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body: `✅ Aprovada (versão ${ed.versao || "?"}). Textos no escritório: ${PAGE}` }) });
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
