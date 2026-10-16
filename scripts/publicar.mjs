// Junta o trabalho dos agentes (ficheiros pequenos em trabalho/) na edição, sem gastar tokens.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { juntar as juntarMemoria, resumo as resumoMemoria } from "./memoria.mjs";

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
acum.proximo_n = acum.proximo_n || (acum.itens.reduce((m, i) => Math.max(m, i.n || 0), 0) + 1);
for (const i of acum.itens) if (!i.n) i.n = acum.proximo_n++;
for (const n of f.novas || []) if (!vistos.has((n.titulo || "").toLowerCase())) acum.itens.push({ ...n, n: acum.proximo_n++, recolhida: ent.hoje });
for (const u of f.actualizacoes || []) {
  const it = acum.itens.find((i) => i.titulo === u.titulo_existente);
  if (it) it.resumo += ` Actualização (${ent.hoje}): ${u.novidade}`;
}
acum.itens = acum.itens.slice(-80);
acum.lacunas = f.lacunas || [];
// Fontes consultadas na semana (por categoria)
const fc = acum.fontes_consultadas || [];
for (const x of f.fontes_consultadas || []) if (x && x.fonte && !fc.some((y) => y.fonte === x.fonte && y.categoria === x.categoria)) fc.push({ ...x, data: ent.hoje });
acum.fontes_consultadas = fc.slice(-200);

// Análise, design, textos (só substitui se o agente produziu nova versão)
for (const k of ["analise", "design", "textos"]) {
  const v = ler(`${W}/${k}.json`, null);
  if (v) acum[k] = v;
}
// Memória cumulativa: indicadores, temas, direcções e lições
const mem = ler(`${W}/memoria.json`, null);
const delta = mem || { indicadores: f.indicadores || [] };
if (!mem && f.indicadores) delta.indicadores = f.indicadores;
const nInd = juntarMemoria(delta, { hoje: ent.hoje, semana: ent.semana });
acum.memoria_actualizada = { em: ent.hoje, indicadores: nInd, temas: (mem?.temas || []).length, direccoes: (mem?.direccoes_novas || []).length };

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
  try { execSync(`git add docs/data memoria && (git diff --cached --quiet || git commit -qm "trabalho parcial") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" }); } catch {}
  console.error(`Os agentes não terminaram. Ficheiros em falta em trabalho/: ${faltam.join(", ")}. Veja o fim do registo do passo "Agentes (Claude)".`);
  process.exit(1);
}

// Limpeza automática de marcas típicas de IA (travessões, emojis, setas, símbolos)
function limpaIA(t) {
  if (typeof t !== "string") return t;
  return t
    .replace(/(\d{1,2}(?:\s+de)?\s+\p{L}+)\s*[–—]\s*(\d{1,2})/gu, "$1 a $2")   // intervalos de datas
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1 a $2")                                   // intervalos de números
    .replace(/\s*[—–]\s*/g, ", ")                                                  // travessões como pontuação
    .replace(/[\p{Extended_Pictographic}\u2190-\u21FF\u2700-\u27BF\uFE0F\u200D\u20E3]/gu, "") // emojis e setas
    .replace(/^[ \t]*[•▪►]\s*/gm, "- ")
    .replace(/,\s*,/g, ",").replace(/ ,/g, ",").replace(/[ \t]{2,}/g, " ").replace(/^[ \t]+/gm, (m) => m.replace(/ +/, ""))
    .replace(/\n{3,}/g, "\n\n").trim();
}
function limpaIA_obj(o) {
  if (typeof o === "string") return limpaIA(o);
  if (Array.isArray(o)) return o.map(limpaIA_obj);
  if (o && typeof o === "object") { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = ["url", "imagem_termos", "tom"].includes(k) ? v : limpaIA_obj(v); return r; }
  return o;
}
if (acum.textos) { const { conformidade, ...resto } = acum.textos; acum.textos = { ...limpaIA_obj(resto), conformidade }; }
if (acum.design) acum.design = limpaIA_obj(acum.design);

// Verificação automática das direcções editoriais
const LINHA = ler("config/linha-editorial.json", {});
const falhas = [];
const dims = (acum.analise?.pestal || []).map((x) => (x.dimensao || "").toLowerCase());
for (const dm of LINHA.dimensoes_pestal || []) if (!dims.some((x) => x.startsWith(dm.toLowerCase().slice(0, 5)))) falhas.push(`PESTAL sem a dimensão ${dm}`);
const grs = (acum.analise?.impacto || []).map((x) => (x.grupo || "").toLowerCase());
for (const g of LINHA.grupos_de_impacto || []) if (!grs.some((x) => x.includes(g.toLowerCase().split(" ")[0]) && (g.split(" ").length < 2 || x.includes(g.toLowerCase().split(" ")[1])))) falhas.push(`Impacto sem o grupo ${g}`);
if (!acum.textos.analise_completa) falhas.push("Falta a versão longa (análise completa)");
const imp = acum.analise?.impacto || [];
if (imp.some((x) => x.saldo === undefined)) falhas.push("Impacto sem saldo (-2 a +2) em algum grupo");
if (imp.filter((x) => +x.saldo === 0).length > 2) falhas.push("Mais de 2 grupos em equilibrado: o analista deve escolher um lado");
if ((acum.analise?.pestal || []).some((x) => x.peso_oportunidade === undefined || x.peso_ameaca === undefined)) falhas.push("PESTAL sem pesos (0 a 3) em alguma dimensão");
const an = acum.analise || {};
if (!(an.canais || []).length) falhas.push("Faltam os canais de transmissão (como chega ao bolso)");
const cen = an.cenarios || [];
if (cen.length !== 3) falhas.push("Os cenários devem ser 3 (melhora, fica igual, piora)");
else { const soma = cen.reduce((a, c) => a + (+c.probabilidade || 0), 0); if (Math.abs(soma - 100) > 5) falhas.push(`As probabilidades dos cenários somam ${soma}, não 100`); }
if ((an.riscos || []).length < 3) falhas.push("Faltam riscos (pelo menos 3, com probabilidade e impacto)");
if (!an.horizonte) falhas.push("Falta o horizonte (imediato, 3 meses, 1 ano)");
if (!(an.vulnerabilidade || []).length) falhas.push("Falta a vulnerabilidade por grupo");
if (!an.confianca) falhas.push("Falta o grau de confiança");
if (!an.continuidade) falhas.push("Falta a ligação à memória (o que mudou face às semanas anteriores)");
if (ent.modo === "diario") {
  const cobertas = new Set((f.fontes_consultadas || []).map((x) => x.categoria));
  const faltamCat = (ent.categorias_hoje || []).filter((c) => !cobertas.has(c));
  if (faltamCat.length) falhas.push(`Categorias de fontes não consultadas hoje: ${faltamCat.join(", ")}`);
}
for (const c of acum.textos.conformidade || []) if (c.ok === false) falhas.push(`Auto-verificação: ${c.criterio}`);
acum.textos.verificar = [...(acum.textos.verificar || []), ...falhas.map((f) => "⚠️ " + f)];
acum.falhas_conformidade = falhas;

acum.incluir_itens = ent.incluir_itens || acum.incluir_itens || [];
acum.sugestoes_semana = [...(acum.sugestoes_semana || []), ...(ent.sugestoes_novas || [])];
acum.processados = [...(acum.processados || []), ...(ent.ids_comentarios || [])];
acum.versao = (acum.versao || 0) + 1;
gravar(ACUM, acum);

const ed = { semana: ent.semana, dia: ent.hoje, versao: acum.versao, aprovada: false, issue: ent.issue, falhas_conformidade: acum.falhas_conformidade,
  itens: acum.itens.map((i) => ({ ...i, na_edicao: (acum.design?.fontes_usadas || []).includes(i.n) })), lacunas: acum.lacunas, fontes_consultadas: acum.fontes_consultadas, memoria: acum.memoria_actualizada, analise: acum.analise, design: acum.design, textos: acum.textos };
gravar("docs/data/edicao.json", ed);
gravar(`docs/data/semanas/${ent.semana}/dia-${ent.hoje}.json`, ed);

// Post do dia (Direcção do Dia ou O Seu Bolso)
let diaMsg = "";
if (ent.post_do_dia && ent.post_do_dia !== "nenhum") {
  const dia = ler(`${W}/dia.json`, null);
  if (dia) {
    const { fontes: fts, ...resto } = dia;
    const anterior = ler("docs/data/dia.json", {});
    const versao = anterior.data === ent.hoje ? (anterior.versao || 0) + 1 : 1;
    const limpo = { ...limpaIA_obj(resto), fontes: fts || [], tipo: dia.tipo || ent.post_do_dia, data: ent.hoje, dia_semana: ent.dia_semana,
      semana: ent.semana, versao, aprovada: false };
    if (limpo.tipo === "bolso") {
      const r = resumoMemoria(ent.hoje);
      limpo.series = (limpo.indicadores || []).map((id) => r.indicadores.find((x) => x.id === id)).filter(Boolean)
        .map((x) => ({ id: x.id, nome: x.nome, unidade: x.unidade, ultimo: x.ultimo, var4: x.variacao_4_semanas_pct, var12: x.variacao_12_semanas_pct,
          pontos: (ler("memoria/indicadores.json", {})[x.id]?.serie || []).slice(-16).map((p) => [p.data, p.valor]) }));
      // Comparação entre as três capitais regionais (Maputo, Beira, Nampula)
      const REG = ler("config/fontes.json", {}).regioes || [];
      const bases = (limpo.comparar || []).length ? limpo.comparar : ["chapa", "milho", "arroz", "inflacao"];
      limpo.regional = { regioes: REG.map((g) => ({ id: g.id, nome: g.nome, zona: g.zona })),
        linhas: bases.map((b) => {
          const xs = REG.map((g) => r.indicadores.find((x) => x.id === `${b}_${g.id}`));
          const ref = xs.find(Boolean);
          return { base: b, nome: (ref?.nome || b).replace(/\s*\([^)]*\)\s*$/, ""), unidade: ref?.unidade || "",
            cidades: REG.map((g, k) => ({ regiao: g.id, nome: g.nome, valor: xs[k]?.ultimo?.valor ?? null, data: xs[k]?.ultimo?.data || "", var4: xs[k]?.variacao_4_semanas_pct ?? null })) };
        }) };
    }
    const falhasDia = [];
    if (limpo.tipo === "dia") {
      const soma = (limpo.cenarios || []).reduce((a, c) => a + (+c.probabilidade || 0), 0);
      if ((limpo.cenarios || []).length !== 3 || Math.abs(soma - 100) > 5) falhasDia.push("Cenários do dia: devem ser 3 e somar 100");
      if (!(limpo.canal?.passos || []).length) falhasDia.push("Falta o canal (como chega ao bolso)");
      const cs = limpo.cenarios || [];
      if (cs.some((c) => !c.gatilho || !c.numeros || !c.quando)) falhasDia.push("Há cenários sem gatilho, números ou prazo");
      if (cs.some((c) => !c.porque_probabilidade)) falhasDia.push("Há probabilidades sem justificação");
      const ps = cs.map((c) => +c.probabilidade || 0);
      if (ps.length === 3 && Math.max(...ps) - Math.min(...ps) <= 4) falhasDia.push("Probabilidades quase iguais: o analista deve escolher");
      if ((limpo.sinais || []).length < 3 || (limpo.sinais || []).some((x) => !x.limiar)) falhasDia.push("Faltam sinais com limiar e data (pelo menos 3)");
      if (!(limpo.conta?.barras || []).length) falhasDia.push("Falta a conta (exemplo prático com números)");
      if (!limpo.precedente?.o_que_aconteceu) falhasDia.push("Falta o precedente");
      if (!limpo.visao_contraria) falhasDia.push("Falta a visão contrária");
      if ((limpo.fontes || []).length < 3) falhasDia.push("Menos de 3 fontes no post do dia");
    }
    limpo.falhas = falhasDia;
    gravar("docs/data/dia.json", limpo);
    gravar(`docs/data/dias/${ent.hoje}.json`, limpo);
    const hist = ler("docs/data/dias/lista.json", []);
    gravar("docs/data/dias/lista.json", [{ data: ent.hoje, tipo: limpo.tipo, tema: limpo.tema || limpo.titulo }, ...hist.filter((h) => h.data !== ent.hoje)].slice(0, 120));
    diaMsg = limpo.tipo === "bolso" ? "O Seu Bolso pronto" : `Direcção do Dia: ${limpo.tema || ""}`;
  } else diaMsg = "Post do dia não ficou pronto";
}

// Escritório: editor pronto
const S = "docs/data/status.json";
const s = ler(S, { estagios: {}, log: [] });
const em = new Date().toISOString();
s.actualizado = em;
s.estagios.editor = { estado: "pronto", msg: "Textos finais prontos", em };
s.log = [{ em, agente: "editor", msg: `Edição versão ${acum.versao} montada` }, ...(diaMsg ? [{ em, agente: "editor", msg: diaMsg }] : []), ...(s.log || [])].slice(0, 40);
gravar(S, s);
execSync(`git add docs/data memoria && (git diff --cached --quiet || git commit -qm "edição v${acum.versao}") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" });
console.log(`Edição ${ent.semana} v${acum.versao}: ${acum.itens.length} notícias.`);
