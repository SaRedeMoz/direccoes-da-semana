// Junta o trabalho dos agentes (ficheiros pequenos em trabalho/) na edição, sem gastar tokens.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const ler = (p, d) => { try { return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d; } catch (e) { console.warn(`Aviso: ${p} tem JSON inválido (${e.message}); a usar valor por defeito.`); return d; } };
const gravar = (p, o) => { mkdirSync(p.split("/").slice(0, -1).join("/"), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 2)); };

const ent = ler("docs/data/entrada.json", null);
if (!ent) { console.error("Falta docs/data/entrada.json"); process.exit(1); }
const W = "trabalho";
const ACUM = `docs/data/semanas/${ent.semana}/acumulado.json`;
const acum = ler(ACUM, { itens: [], processados: [], sugestoes_semana: [], versao: 0 });

// Fontes: novas notícias + actualizações
const f = ler(`${W}/fontes.json`, { novas: [], actualizacoes: [], lacunas: acum.lacunas || [] });
const vistos = new Set(acum.itens.map((i) => (i.titulo || "").toLowerCase()));
for (const n of f.novas || []) if (!vistos.has((n.titulo || "").toLowerCase())) acum.itens.push({ ...n, recolhida: ent.hoje });
for (const u of f.actualizacoes || []) {
  const it = acum.itens.find((i) => i.titulo === u.titulo_existente);
  if (it) it.resumo += ` Actualização (${ent.hoje}): ${u.novidade}`;
}
acum.itens = acum.itens.slice(-60);
acum.lacunas = f.lacunas || [];

// Análise, design, textos (só substitui se o agente produziu nova versão)
for (const k of ["analise", "design", "textos"]) {
  const v = ler(`${W}/${k}.json`, null);
  if (v) acum[k] = v;
}
const faltam = ["fontes", "analise", "design", "textos"].filter((k) => !existsSync(`${W}/${k}.json`));
if (faltam.length) {
  // Guarda o trabalho parcial para não o perder, e falha com uma mensagem clara
  gravar(ACUM, acum);
  const S0 = "docs/data/status.json";
  const s0 = ler(S0, { estagios: {}, log: [] });
  const nomes = { fontes: "fontes", analise: "analise", design: "design", textos: "editor" };
  const ag = nomes[faltam[0]];
  const em0 = new Date().toISOString();
  s0.estagios = s0.estagios || {};
  s0.estagios[ag] = { estado: "erro", msg: "Não terminou (limite de passos ou de uso)", em: em0 };
  s0.log = [{ em: em0, agente: ag, msg: "Não terminou: faltam " + faltam.join(", ") }, ...(s0.log || [])].slice(0, 40);
  s0.actualizado = em0;
  gravar(S0, s0);
  try { execSync(`git add docs/data && (git diff --cached --quiet || git commit -qm "trabalho parcial") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" }); } catch {}
  console.error(`Os agentes não terminaram. Ficheiros em falta em trabalho/: ${faltam.join(", ")}. Veja o fim do registo do passo "Agentes (Claude)".`);
  process.exit(1);
}

// Verificação automática das direcções editoriais
const LINHA = ler("config/linha-editorial.json", {});
const falhas = [];
const dims = (acum.analise?.pestal || []).map((x) => (x.dimensao || "").toLowerCase());
for (const dm of LINHA.dimensoes_pestal || []) if (!dims.some((x) => x.startsWith(dm.toLowerCase().slice(0, 5)))) falhas.push(`PESTAL sem a dimensão ${dm}`);
const grs = (acum.analise?.impacto || []).map((x) => (x.grupo || "").toLowerCase());
for (const g of LINHA.grupos_de_impacto || []) if (!grs.some((x) => x.includes(g.toLowerCase().split(" ")[0]) && (g.split(" ").length < 2 || x.includes(g.toLowerCase().split(" ")[1])))) falhas.push(`Impacto sem o grupo ${g}`);
if (!acum.textos.analise_completa) falhas.push("Falta a versão longa (análise completa)");
for (const c of acum.textos.conformidade || []) if (c.ok === false) falhas.push(`Auto-verificação: ${c.criterio}`);
acum.textos.verificar = [...(acum.textos.verificar || []), ...falhas.map((f) => "⚠️ " + f)];
acum.falhas_conformidade = falhas;

acum.sugestoes_semana = [...(acum.sugestoes_semana || []), ...(ent.sugestoes_novas || [])];
acum.processados = [...(acum.processados || []), ...(ent.ids_comentarios || [])];
acum.versao = (acum.versao || 0) + 1;
gravar(ACUM, acum);

const ed = { semana: ent.semana, dia: ent.hoje, versao: acum.versao, aprovada: false, issue: ent.issue, falhas_conformidade: acum.falhas_conformidade,
  itens: acum.itens, lacunas: acum.lacunas, analise: acum.analise, design: acum.design, textos: acum.textos };
gravar("docs/data/edicao.json", ed);
gravar(`docs/data/semanas/${ent.semana}/dia-${ent.hoje}.json`, ed);

// Escritório: editor pronto
const S = "docs/data/status.json";
const s = ler(S, { estagios: {}, log: [] });
const em = new Date().toISOString();
s.actualizado = em;
s.estagios.editor = { estado: "pronto", msg: "Textos finais prontos", em };
s.log = [{ em, agente: "editor", msg: `Edição versão ${acum.versao} montada` }, ...(s.log || [])].slice(0, 40);
gravar(S, s);
execSync(`git add docs/data && (git diff --cached --quiet || git commit -qm "edição v${acum.versao}") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" });
console.log(`Edição ${ent.semana} v${acum.versao}: ${acum.itens.length} notícias.`);
