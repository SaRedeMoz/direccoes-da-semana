// Memória cumulativa da redacção (pasta memoria/ na raiz do repositório).
// Guarda o que se aprende semana a semana, para a análise não recomeçar do zero:
//   memoria/indicadores.json  séries dos indicadores do bolso (data, valor, fonte)
//   memoria/temas.json        assuntos em curso e o seu historial
//   memoria/direccoes.json    direcções dadas aos leitores e se se confirmaram depois
//   memoria/licoes.md         lições aprendidas (uma por ronda, no máximo)
//   memoria/resumo.json       versão curta de tudo isto, que os agentes lêem (poupa tokens)
// Uso: node scripts/memoria.mjs resumo      (refaz só o resumo)
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";

const M = "memoria";
const ler = (p, d) => { try { return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d; } catch { return d; } };
const gravar = (p, o) => { mkdirSync(M, { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 2)); };
const FONTES = ler("config/fontes.json", { indicadores_do_bolso: [] });

// Indicadores esperados: nacionais (id) e regionais (id_regiao, ex.: chapa_nampula)
export function catalogo() {
  const regs = FONTES.regioes || [], out = {};
  for (const i of FONTES.indicadores_do_bolso || []) {
    if (!i.por_regiao || i.tambem_nacional) out[i.id] = { nome: i.nome, unidade: i.unidade, base: i.id, regiao: "" };
    if (i.por_regiao) for (const r of regs) out[`${i.id}_${r.id}`] = { nome: `${i.nome} (${r.nome})`, unidade: i.unidade, base: i.id, regiao: r.id };
  }
  return out;
}
export function carregar() {
  const ind = ler(`${M}/indicadores.json`, {});
  for (const [id, c] of Object.entries(catalogo())) {
    if (!ind[id]) ind[id] = { ...c, serie: [] };
    else Object.assign(ind[id], c);
  }
  return { ind, temas: ler(`${M}/temas.json`, []), dirs: ler(`${M}/direccoes.json`, []) };
}

// Junta as alterações que os agentes propõem em trabalho/memoria.json
export function juntar(delta, ctx) {
  const { ind, temas, dirs } = carregar();
  const hoje = ctx.hoje, semana = ctx.semana;
  let novos = 0;
  // Indicadores: um valor por data; o mais recente substitui o do mesmo dia
  for (const v of delta.indicadores || []) {
    if (!v.id || v.valor === undefined || v.valor === null || Number.isNaN(+v.valor)) continue;
    const alvo = ind[v.id] || (ind[v.id] = { nome: v.nome || v.id, unidade: v.unidade || "", serie: [] });
    const data = v.data || hoje;
    alvo.serie = alvo.serie.filter((p) => p.data !== data);
    alvo.serie.push({ data, valor: +v.valor, fonte: v.fonte || "", url: v.url || "", nota: v.nota || "" });
    alvo.serie.sort((a, b) => a.data.localeCompare(b.data));
    alvo.serie = alvo.serie.slice(-260);
    novos++;
  }
  // Temas em curso
  for (const t of delta.temas || []) {
    if (!t.id) continue;
    let tema = temas.find((x) => x.id === t.id);
    if (!tema) { tema = { id: t.id, nome: t.nome || t.id, estado: "activo", inicio: hoje, historial: [] }; temas.push(tema); }
    if (t.nome) tema.nome = t.nome;
    if (t.estado) tema.estado = t.estado;
    if (t.resumo) {
      tema.historial = tema.historial.filter((h) => h.data !== hoje);
      tema.historial.push({ data: hoje, semana, resumo: t.resumo, direccao: t.direccao || "" });
      tema.historial = tema.historial.slice(-60);
    }
  }
  // Direcções novas e verificação das antigas
  let maxId = dirs.reduce((m, d) => Math.max(m, +String(d.id).replace(/\D/g, "") || 0), 0);
  for (const d of delta.direccoes_novas || []) {
    if (!d.accao) continue;
    dirs.push({ id: `D${++maxId}`, data: hoje, semana, publico: d.publico || "", accao: d.accao, tema: d.tema || "",
      horizonte: d.horizonte || "", verificar_em: d.verificar_em || "", resultado: "pendente", nota: "" });
  }
  for (const v of delta.verificacoes || []) {
    const d = dirs.find((x) => x.id === v.id);
    if (d && ["confirmada", "parcial", "nao_confirmada", "pendente"].includes(v.resultado)) { d.resultado = v.resultado; d.nota = v.nota || d.nota; d.verificada_em = hoje; }
  }
  gravar(`${M}/indicadores.json`, ind);
  gravar(`${M}/temas.json`, temas);
  gravar(`${M}/direccoes.json`, dirs.slice(-500));
  if (delta.licao && String(delta.licao).trim()) {
    if (!existsSync(`${M}/licoes.md`)) writeFileSync(`${M}/licoes.md`, "# Lições aprendidas pela redacção\n\n");
    appendFileSync(`${M}/licoes.md`, `- ${hoje} (${semana}): ${String(delta.licao).trim().replace(/\n+/g, " ")}\n`);
  }
  resumo(hoje);
  return novos;
}

// Versão curta para os agentes: últimos valores, tendência, temas activos, direcções a verificar
export function resumo(hoje = new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10)) {
  const { ind, temas, dirs } = carregar();
  const variacao = (s, dias) => {
    if (s.length < 2) return null;
    const ult = s[s.length - 1], lim = new Date(new Date(ult.data).getTime() - dias * 864e5).toISOString().slice(0, 10);
    // Só calcula se houver um registo com pelo menos essa idade (sem isso, a variação seria enganadora)
    const base = [...s].reverse().find((p) => p.data <= lim);
    if (!base || !base.valor || base === ult) return null;
    return +(((ult.valor - base.valor) / base.valor) * 100).toFixed(1);
  };
  const indicadores = Object.entries(ind).map(([id, x]) => ({
    id, nome: x.nome, unidade: x.unidade, base: x.base || id, regiao: x.regiao || "",
    ultimo: x.serie.at(-1) || null,
    variacao_4_semanas_pct: variacao(x.serie, 28),
    variacao_12_semanas_pct: variacao(x.serie, 84),
    ultimos: x.serie.slice(-8).map((p) => [p.data, p.valor]),
  }));
  const r = {
    actualizado: hoje,
    indicadores,
    temas_activos: temas.filter((t) => t.estado !== "encerrado").map((t) => ({ id: t.id, nome: t.nome, desde: t.inicio, ultimos: t.historial.slice(-3) })),
    direccoes_a_verificar: dirs.filter((d) => d.resultado === "pendente" && (!d.verificar_em || d.verificar_em <= hoje)).slice(-15),
    balanco_direccoes: ["confirmada", "parcial", "nao_confirmada", "pendente"].reduce((o, k) => ({ ...o, [k]: dirs.filter((d) => d.resultado === k).length }), {}),
    ultimas_licoes: existsSync(`${M}/licoes.md`) ? readFileSync(`${M}/licoes.md`, "utf8").trim().split("\n").filter((l) => l.startsWith("- ")).slice(-8) : [],
  };
  gravar(`${M}/resumo.json`, r);
  // Cópia para o escritório (o site só publica a pasta docs/)
  if (existsSync("docs")) { mkdirSync("docs/data", { recursive: true }); writeFileSync("docs/data/memoria.json", JSON.stringify(r, null, 2)); }
  return r;
}

if (process.argv[1] && process.argv[1].endsWith("memoria.mjs") && process.argv[2] === "resumo") { resumo(); console.log("Resumo da memória actualizado."); }
