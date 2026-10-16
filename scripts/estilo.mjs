// Peças visuais partilhadas pelos posts diários (scripts/dia.mjs).
// São as mesmas regras de imagens.mjs: selo da marca, céu da capa, estilo C (preto e verde), sem emojis nem travessões.
import { readFileSync, existsSync } from "node:fs";

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const limpaT = (t) => String(t ?? "")
  .replace(/(\d{1,2}(?:\s+de)?\s+\p{L}+)\s*[–—]\s*(\d{1,2})/gu, "$1 a $2").replace(/(\d)\s*[–—]\s*(\d)/g, "$1 a $2")
  .replace(/\s*[—–]\s*/g, ", ").replace(/[\p{Extended_Pictographic}️‍]/gu, "").replace(/[→←⇒➔➜]/g, "").trim();
export const corta = (t, n) => { t = limpaT(t); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "..." : t; };

export const FONTES = `<meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Open+Sans:ital,wght@0,600;0,700;0,800;1,500&family=DM+Sans:wght@400;500;700&display=block" rel="stylesheet">`;
export const BASE = `*{box-sizing:border-box;margin:0;padding:0}body{width:var(--w);height:var(--h);overflow:hidden;position:relative}`;
export const SETA = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
export const CHEV = `<svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;

const SELO_SVG = existsSync("docs/marca/selo-branco.svg") ? readFileSync("docs/marca/selo-branco.svg", "utf8") : "";
export const selo = (cor, w) => SELO_SVG.replace('width="240"', `width="${w}"`).replaceAll("#FFFFFF", cor);

export function fundoCeu(W, H, gx, gy, seed = 7) {
  let r = seed; const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  let est = "";
  for (let i = 0; i < Math.round((W * H) / 3200); i++) {
    const x = (rnd() * W).toFixed(1), y = (rnd() * H).toFixed(1), q = rnd();
    const rad = q > 0.985 ? 1.9 : q > 0.9 ? 1.2 : 0.7;
    est += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#fff" opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"></circle>`;
  }
  return `<div style="position:absolute;inset:0;background:
      radial-gradient(ellipse ${W * 0.55}px ${W * 0.5}px at ${gx}px ${gy}px, rgba(43,183,189,.30), rgba(14,124,130,.10) 45%, transparent 70%),
      radial-gradient(ellipse ${W * 0.9}px ${H * 0.5}px at 90% 0%, rgba(20,70,90,.45), transparent 70%),
      linear-gradient(180deg,#081821 0%,#050E14 60%,#03080C 100%)"></div>
    <svg style="position:absolute;inset:0" width="${W}" height="${H}">${est}</svg>
    <svg style="position:absolute;inset:0;opacity:.10;mix-blend-mode:overlay" width="${W}" height="${H}"><filter id="grao"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"></feTurbulence></filter><rect width="100%" height="100%" filter="url(#grao)"></rect></svg>
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse 120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%)"></div>`;
}

export const MAO_BULLET = (tam, cor = "#2BB7BD") => `<svg viewBox="-3 -10 20 16" width="${tam}" height="${tam * 0.8}" style="display:block;color:${cor}"><path d="M-1.5 -4.2 L10.5 -4.4 C13.8 -4.4 15.6 -2.4 15.6 0 C15.6 2.4 13.8 4.2 10.5 4.2 L-1.5 4.2 Z" fill="currentColor"></path><path d="M2 -3.6 L5.6 -7.8" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" fill="none"></path></svg>`;

// Escala de -2 a +2 (igual à da edição semanal): do centro para a direita ganha, para a esquerda perde
export const NIV = { "-2": "PERDE MUITO", "-1": "PERDE", "0": "EQUILIBRADO", "1": "GANHA", "2": "GANHA MUITO" };
export const saldo = (x) => Number.isFinite(+x.saldo) && x.saldo !== null && x.saldo !== "" ? Math.max(-2, Math.min(2, Math.round(+x.saldo))) : 0;
export function escala(v, q) {
  return [-2, -1, 0, 1, 2].map((k) => {
    const on = v === 0 ? k === 0 : (v > 0 ? k > 0 && k <= v : k < 0 && k >= v);
    const cor = v > 0 ? "#00D26A" : v < 0 ? "#E4E9E6" : "#6E7A74";
    return `<span style="display:inline-block;width:${q}px;height:${q * 0.62}px;border-radius:4px;margin-left:5px;border:2px solid ${k === 0 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.22)"};background:${on ? cor : "transparent"}"></span>`;
  }).join("");
}

// Datas e números em português de Moçambique
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const dataLonga = (iso) => { const d = new Date(iso + "T12:00:00Z"); return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
export const num = (v, casas) => {
  if (v === null || v === undefined || Number.isNaN(+v)) return "";
  const c = casas ?? (Math.abs(+v) >= 100 ? 0 : Math.abs(+v) >= 10 ? 1 : 2);
  return (+v).toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: c });
};
