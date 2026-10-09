// Gera as imagens dos posts, assinadas "S.A REDES".
// Capa: estilo A (azul-petróleo). Notícias: estilo B (telejornal vermelho). Análise: estilo C (preto e verde).
// Formatos: feed 4:5 (1080x1350) e story 9:16 (1080x1920). LinkedIn: capa 1200x627 + carrossel em PDF.
// Sem custo de tokens: Playwright (Chromium) + fotografias livres do Wikimedia Commons.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, cpSync } from "node:fs";
import { execSync } from "node:child_process";

const ED = "docs/data/edicao.json";
if (!existsSync(ED)) { console.log("Sem edição."); process.exit(0); }
const ed = JSON.parse(readFileSync(ED, "utf8"));
const des = ed.design || {};
const an = ed.analise || {};
const slides = des.slides || [];
if (!slides.length) { console.log("Sem slides para desenhar."); process.exit(0); }

const DIR = "docs/data/imagens";
rmSync(DIR, { recursive: true, force: true });
mkdirSync(`${DIR}/feed`, { recursive: true });
mkdirSync(`${DIR}/story`, { recursive: true });

/* ---------- Fotografias livres (Wikimedia Commons) ---------- */
const UA = { "User-Agent": "DireccoesDaSemana/1.0 (https://github.com; newsletter bot)" };
const usadas = new Set();
const semHtml = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
async function fotoLivre(termos) {
  if (!termos) return null;
  try {
    const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
      action: "query", format: "json", generator: "search", gsrsearch: termos + " filetype:bitmap",
      gsrnamespace: "6", gsrlimit: "12", prop: "imageinfo", iiprop: "url|extmetadata|mime|size", iiurlwidth: "1600",
    });
    const d = await (await fetch(url, { headers: UA })).json();
    const pages = Object.values(d?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      if (!ii || !/image\/(jpeg|png)/.test(ii.mime) || (ii.width || 0) < 900 || usadas.has(p.title)) continue;
      const m = ii.extmetadata || {};
      const lic = semHtml(m.LicenseShortName?.value);
      if (!/(cc0|public domain|domínio público|cc by)/i.test(lic) || /\bNC\b|\bND\b|non-?commercial|no-?deriv/i.test(lic)) continue;
      const img = await fetch(ii.thumburl || ii.url, { headers: UA });
      if (!img.ok) continue;
      const buf = Buffer.from(await img.arrayBuffer());
      usadas.add(p.title);
      const autor = semHtml(m.Artist?.value).slice(0, 60) || "autor desconhecido";
      return { src: `data:${ii.mime};base64,${buf.toString("base64")}`, credito: `Foto: ${autor} / Wikimedia Commons, ${lic}` };
    }
  } catch (e) { console.warn("Foto não encontrada para", termos, e.message); }
  return null;
}

/* ---------- Utilidades ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const limpaT = (t) => String(t ?? "")
  .replace(/(\d{1,2}(?:\s+de)?\s+\p{L}+)\s*[–—]\s*(\d{1,2})/gu, "$1 a $2").replace(/(\d)\s*[–—]\s*(\d)/g, "$1 a $2")
  .replace(/\s*[—–]\s*/g, ", ").replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").trim();
const corta = (t, n) => { t = limpaT(t); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "..." : t; };
const nSemana = String(ed.semana || "").split("-S")[1] || "";
const periodo = `Semana ${nSemana} de ${ed.semana?.slice(0, 4) || ""}`;
const FONTES = `<meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Open+Sans:ital,wght@0,600;0,700;0,800;1,500&family=DM+Sans:wght@400;500;700&display=block" rel="stylesheet">`;
const BASE = `*{box-sizing:border-box;margin:0;padding:0}body{width:var(--w);height:var(--h);overflow:hidden;position:relative}`;
const SETA = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const CHEV = `<svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;

/* ---------- Selo da marca (docs/marca/selo-branco.svg) ---------- */
const SELO_SVG = existsSync("docs/marca/selo-branco.svg") ? readFileSync("docs/marca/selo-branco.svg", "utf8") : "";
const selo = (cor, w) => SELO_SVG.replace('width="240"', `width="${w}"`).replaceAll("#FFFFFF", cor);

/* ---------- A: capa azul-petróleo ---------- */
// Fundo com textura, como o espaço do modelo: estrelas, grão fino, brilho atrás do selo e vinheta.
function fundoCeu(W, H, gx, gy, seed = 7) {
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
// Destaques marcados com a mão do selo, a apontar para o texto (em vez de números ou traços)
const MAO_BULLET = (tam) => `<svg viewBox="-3 -10 20 16" width="${tam}" height="${tam * 0.8}" style="display:block;color:#2BB7BD"><path d="M-1.5 -4.2 L10.5 -4.4 C13.8 -4.4 15.6 -2.4 15.6 0 C15.6 2.4 13.8 4.2 10.5 4.2 L-1.5 4.2 Z" fill="currentColor"></path><path d="M2 -3.6 L5.6 -7.8" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" fill="none"></path></svg>`;
const itens = (dest, tam, esp) => dest.map((d) => `<div style="display:grid;grid-template-columns:${tam * 1.25}px 1fr;align-items:start;gap:${tam * 0.35}px;margin-bottom:${esp}px">
  <span style="padding-top:${tam * 0.22}px">${MAO_BULLET(tam * 1.05)}</span>
  <span style="font-weight:400;font-size:${tam}px;line-height:1.2">${esc(d)}</span></div>`).join("");

function capaA(W, H, foto) {
  const dest = (des.destaques_capa || slides.slice(1, 4).map((x) => x.titulo)).slice(0, 3).map(limpaT);
  const story = H > 1500;
  const S = story ? 1250 : 900;          // selo grande, cortado pelas margens
  const figTop = story ? 20 : -70, figLeft = story ? -150 : -110;
  const nomeTop = figTop + S * 0.72;      // o nome fica sempre por baixo das figuras
  return `<!doctype html><html><head>${FONTES}<style>${BASE}
  :root{--w:${W}px;--h:${H}px}
  body{font-family:Poppins,Arial,sans-serif;color:#fff;background:#050E14}
  .fig{position:absolute;left:${figLeft}px;top:${figTop}px}
  .sem{position:absolute;right:56px;top:52px;font-weight:600;font-size:26px;letter-spacing:.04em;color:#D6E4E6}
  .nome{position:absolute;left:100px;top:${nomeTop}px;padding:26px 44px 30px;background:linear-gradient(180deg,rgba(14,140,146,.85) 0%,rgba(14,140,146,.35) 100%)}
  .nome b{display:block;font-weight:800;font-size:${story ? 86 : 74}px;line-height:1;text-transform:uppercase;letter-spacing:.01em}
  .lista{position:absolute;left:100px;right:100px;bottom:${story ? 250 : 150}px}
  .tag{display:inline-block;background:#12A4A8;font-weight:600;font-size:30px;padding:10px 30px}
  .linha{height:4px;background:#12A4A8;margin-bottom:${story ? 34 : 26}px}
  .marca{position:absolute;left:56px;bottom:44px;font-weight:700;font-size:30px;letter-spacing:.08em}
  .seta{position:absolute;right:56px;bottom:32px;width:92px;height:92px;border-radius:50%;background:linear-gradient(135deg,#FFE14D,#F7B32B);color:#111;padding:21px}
  </style></head><body>
  ${fundoCeu(W, H, figLeft + S * 0.55, figTop + S * 0.42)}
  <div class="fig">${selo("#2BB7BD", S)}</div>
  <div class="sem">${esc(periodo)}</div>
  <div class="nome"><b>Direcções</b><b>da Semana</b></div>
  <div class="lista"><div class="tag">Nesta edição</div><div class="linha"></div>${itens(dest, story ? 50 : 42, story ? 22 : 14)}</div>
  <div class="marca">S.A REDES</div><div class="seta">${SETA}</div>
  </body></html>`;
}

/* ---------- B: notícia, telejornal vermelho ---------- */
const ROT = { alerta: "Alerta", oportunidade: "Oportunidade", neutro: "Contexto" };
function noticiaB(W, H, s, i, n, foto) {
  const story = H > 1500;
  const fotoH = story ? 1080 : 700;
  const banda = story ? 1120 : 760;
  return `<!doctype html><html><head>${FONTES}<style>${BASE}
  :root{--w:${W}px;--h:${H}px}
  body{background:#C4161C;font-family:"Open Sans",Arial,sans-serif;color:#fff}
  .foto{position:absolute;left:0;right:0;top:0;height:${fotoH + 160}px;background:${foto ? `url('${foto.src}') center/cover` : "#7E0D12"}}
  .fade{position:absolute;left:0;right:0;top:0;height:${fotoH + 160}px;background:linear-gradient(180deg,rgba(196,22,28,.15) 0%,rgba(196,22,28,.35) 45%,rgba(196,22,28,.92) 80%,#C4161C 100%)}
  .grelha{position:absolute;left:0;right:0;top:${fotoH - 160}px;height:320px;opacity:.18;background-image:radial-gradient(#fff 1.4px,transparent 1.6px);background-size:14px 14px;
    -webkit-mask-image:linear-gradient(180deg,transparent,#000 50%,transparent);mask-image:linear-gradient(180deg,transparent,#000 50%,transparent)}
  .topo{position:absolute;left:0;right:0;top:${story ? 110 : 60}px;text-align:center;font-weight:800;font-size:38px;letter-spacing:.02em;text-shadow:0 2px 10px rgba(0,0,0,.5)}
  .topo::after{content:"";display:block;height:2px;background:rgba(255,255,255,.75);margin-top:22px}
  .pag{position:absolute;right:70px;top:${story ? 210 : 150}px;font-weight:600;font-size:24px;text-shadow:0 1px 6px rgba(0,0,0,.6)}
  .tag{position:absolute;left:70px;top:${banda - 76}px;background:#F2F2F2;color:#C4161C;font-weight:800;font-size:26px;letter-spacing:.06em;text-transform:uppercase;padding:14px 26px}
  .banda{position:absolute;left:0;top:${banda}px;width:${W * 0.9}px;padding:34px 150px 38px 70px;background:#8E0F14;clip-path:polygon(0 0,100% 0,86% 100%,0 100%)}
  .banda h1{font-weight:800;font-size:${story ? 78 : 70}px;line-height:1.05;text-transform:uppercase}
  .resumo{position:absolute;left:70px;right:70px;top:${banda + (story ? 330 : 300)}px;font-style:italic;font-weight:500;font-size:${story ? 46 : 40}px;line-height:1.3}
  .pe{position:absolute;left:70px;right:70px;bottom:${story ? 120 : 60}px;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:28px}
  .cred{position:absolute;left:0;right:0;bottom:${story ? 60 : 22}px;text-align:center;font-family:"DM Sans",sans-serif;font-size:16px;opacity:.8}
  </style></head><body>
  <div class="foto"></div><div class="fade"></div><div class="grelha"></div>
  <div class="topo"><span style="display:inline-flex;align-items:center;gap:14px">${selo("#FFFFFF", 64)}DIRECÇÕES DA SEMANA</span></div><div class="pag">${i + 1}/${n}</div>
  ${foto ? `<div class="cred">${esc(foto.credito)}</div>` : ""}
  <div class="tag">${ROT[s.tom] || "Contexto"}</div>
  <div class="banda"><h1>${esc(limpaT(s.titulo))}</h1></div>
  <div class="resumo">${esc(limpaT(s.texto))}</div>
  <div class="pe"><span>S.A REDES</span><span style="font-weight:600">${esc(periodo)}</span></div>
  </body></html>`;
}

/* ---------- C: análise, preto e verde ---------- */
function moldeC(W, H, i, n, titulo, corpo) {
  const story = H > 1500;
  return `<!doctype html><html><head>${FONTES}<style>${BASE}
  :root{--w:${W}px;--h:${H}px}
  body{background:#030504;font-family:"DM Sans",Arial,sans-serif;color:#fff}
  .luz{position:absolute;inset:0;background:radial-gradient(ellipse 70% 55% at 100% 100%,rgba(0,168,84,.55),transparent 70%)}
  .ondas{position:absolute;left:-200px;top:-260px;width:900px;height:900px;border-radius:50%;opacity:.35;
    background:repeating-radial-gradient(circle at 50% 50%,transparent 0 18px,rgba(0,210,106,.35) 19px 20px,transparent 21px 38px)}
  .topo{position:absolute;left:80px;right:80px;top:${story ? 130 : 80}px;display:flex;justify-content:space-between;align-items:center}
  .topo .m{font-weight:500;font-size:28px;letter-spacing:.04em}
  .pill{width:150px;height:62px;border:2px solid rgba(255,255,255,.85);border-radius:40px;display:flex;align-items:center;justify-content:center;padding:0 30px;color:#fff}
  h1{position:absolute;left:80px;right:80px;top:${story ? 280 : 170}px;font-weight:500;font-size:${story ? 96 : 78}px;line-height:1.02;text-transform:uppercase;letter-spacing:-.01em}
  .corpo{position:absolute;left:80px;right:80px;top:${story ? 560 : 360}px;bottom:${story ? 180 : 110}px}
  .pe{position:absolute;left:80px;right:80px;bottom:${story ? 110 : 60}px;display:flex;justify-content:space-between;font-size:24px;color:#9aa39e}
  .g{color:#00D26A;font-weight:700}
  .row{display:flex;align-items:center;gap:22px;margin-bottom:${story ? 30 : 20}px}
  .ch{flex:0 0 auto;width:52px;height:52px;border-radius:50%;background:#00D26A;color:#031;display:flex;align-items:center;justify-content:center}
  .cap{border:2px solid #00D26A;border-radius:60px;padding:22px 34px;margin-bottom:${story ? 26 : 18}px}
  .cap .t{color:#00D26A;font-weight:700;font-size:30px;text-transform:uppercase}
  .cap .d{font-size:27px;color:#d9dfdb;margin-top:4px;line-height:1.3}
  </style></head><body>
  <div class="luz"></div><div class="ondas"></div>
  <div class="topo"><span class="m" style="display:flex;align-items:center;gap:14px">${selo("#FFFFFF", 64)}S.A REDES</span><span class="pill">${SETA}</span></div>
  <h1>${titulo}</h1>
  <div class="corpo">${corpo}</div>
  <div class="pe"><span>${esc(periodo)}</span><span>${i + 1}/${n}</span></div>
  </body></html>`;
}
function slidesAnalise() {
  const out = [];
  const pest = an.pestal || [];
  // Oportunidades e ameaças em lista de pontos, duas dimensões por página (três páginas)
  const txt = (i) => typeof i === "string" ? i : (i?.texto || "");
  const orig = (i) => typeof i === "object" && i?.origem ? (i.origem === "externa" ? "externa" : "interna") : "";
  const pontos = (p) => {
    const o = (p.oportunidades || []).map((i) => [txt(i), orig(i)]).filter((x) => x[0]);
    const a = (p.ameacas || []).map((i) => [txt(i), orig(i)]).filter((x) => x[0]);
    if (!o.length && p.principal_oportunidade) o.push([p.principal_oportunidade, ""]);
    if (!a.length && p.principal_ameaca) a.push([p.principal_ameaca, ""]);
    return [o.slice(0, 3), a.slice(0, 3)];
  };
  const pares = [];
  for (let i = 0; i < Math.min(pest.length, 6); i += 2) pares.push(pest.slice(i, i + 2));
  pares.forEach((par) => out.push({ titulo: "Oportunidades<br>e ameaças", corpo: (W, H) => {
    // versão limpa: cabeçalhos das colunas uma só vez, pontos em texto simples, sem marcadores nem linhas
    const story = H > 1500, f = story ? 34 : 30, gap = story ? 22 : 16;
    const col = (lista, cor) => lista.length
      ? lista.map(([t]) => `<div style="font-size:${f}px;line-height:1.22;margin-bottom:${gap}px;color:${cor}">${esc(corta(t, 60))}</div>`).join("")
      : `<div style="font-size:${f}px;color:#4f5a55">Sem destaque</div>`;
    const bloco = (p) => { const [o, a] = pontos(p);
      return `<div style="margin-bottom:${story ? 70 : 44}px">
        <div style="font-size:${story ? 22 : 19}px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8c968f;margin-bottom:${story ? 18 : 14}px">${esc(limpaT(p.dimensao))}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px"><div>${col(o, "#FFFFFF")}</div><div>${col(a, "#FFFFFF")}</div></div></div>`; };
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:${story ? 56 : 36}px;font-size:${story ? 24 : 21}px;font-weight:700;letter-spacing:.1em">
        <span style="color:#00D26A">OPORTUNIDADES</span><span style="color:#B9C2BD">AMEAÇAS</span></div>${par.map(bloco).join("")}`;
  }}));
  // Quem ganha, quem perde: saldo de -2 a +2, com a razão principal
  const imp = an.impacto || [];
  const NIV = { "-2": "PERDE MUITO", "-1": "PERDE", "0": "EQUILIBRADO", "1": "GANHA", "2": "GANHA MUITO" };
  const saldo = (x) => Number.isFinite(+x.saldo) && x.saldo !== null && x.saldo !== "" ? Math.max(-2, Math.min(2, Math.round(+x.saldo))) : x.efeito === "positivo" ? 1 : x.efeito === "negativo" ? -1 : 0;
  if (imp.length) out.push({ titulo: "Quem ganha,<br>quem perde", corpo: (W, H) => {
    const story = H > 1500, q = story ? 30 : 26;
    const escala = (v) => [-2, -1, 0, 1, 2].map((k) => {
      const on = v === 0 ? k === 0 : (v > 0 ? k > 0 && k <= v : k < 0 && k >= v);
      const cor = v > 0 ? "#00D26A" : v < 0 ? "#E4E9E6" : "#6E7A74";
      return `<span style="display:inline-block;width:${q}px;height:${q * 0.62}px;border-radius:4px;margin-left:5px;border:2px solid ${k === 0 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.22)"};background:${on ? cor : "transparent"}"></span>`; }).join("");
    const linhas = imp.slice(0, 8).map((x) => { const v = saldo(x);
      return `<div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;padding:${story ? 20 : 11}px 0;border-bottom:1px solid rgba(255,255,255,.12)">
        <span><span style="display:block;font-size:${story ? 29 : 25}px;font-weight:700">${esc(corta(x.grupo, 30))}</span>
        <span style="display:block;font-size:${story ? 22 : 19}px;color:#aab3ae;margin-top:2px">${esc(corta(x.porque || x.explicacao, 58))}</span></span>
        <span style="text-align:right"><span style="display:block">${escala(v)}</span>
        <span style="display:block;font-size:${story ? 19 : 16}px;font-weight:700;letter-spacing:.05em;margin-top:6px;color:${v > 0 ? "#00D26A" : v < 0 ? "#E4E9E6" : "#9aa39e"}">${NIV[v]}</span></span></div>`; }).join("");
    return linhas + `<div style="font-size:${story ? 21 : 18}px;color:#9aa39e;margin-top:${story ? 20 : 10}px">Escala da semana: do centro para a direita ganha, para a esquerda perde.</div>`;
  }});
  const dir = an.direccao || [];
  if (dir.length) out.push({ titulo: "Direcção", corpo: (W, H) =>
    dir.slice(0, H > 1500 ? 6 : 5).map((d) => `<div class="cap"><div class="row" style="margin:0"><span class="ch">${CHEV}</span>
      <span><div class="t">${esc(corta(d.publico, 40))}</div><div class="d">${esc(corta(d.accao, 110))}</div></span></div></div>`).join("") });
  if (an.sinal) out.push({ titulo: "A acompanhar", corpo: (W, H) =>
    `<div style="font-size:${H > 1500 ? 56 : 50}px;line-height:1.25;font-weight:500">${esc(limpaT(an.sinal))}</div>
     <div class="row" style="margin-top:60px"><span class="ch">${CHEV}</span><span class="g" style="font-size:30px">SIGA S.A REDES PARA A PRÓXIMA EDIÇÃO</span></div>` });
  return out;
}

/* ---------- LinkedIn: capa horizontal no estilo A ---------- */
function capaLinkedIn(foto) {
  const dest = (des.destaques_capa || slides.slice(1, 4).map((x) => x.titulo)).slice(0, 3).map(limpaT);
  return `<!doctype html><html><head>${FONTES}<style>${BASE}
  :root{--w:1200px;--h:627px}
  body{font-family:Poppins,Arial,sans-serif;color:#fff;background:#050E14}
  .fig{position:absolute;left:600px;top:-70px}
  .nome{position:absolute;left:720px;top:430px;padding:14px 26px 16px;background:linear-gradient(180deg,rgba(14,140,146,.85),rgba(14,140,146,.35))}
  .nome b{display:block;font-weight:800;font-size:40px;line-height:1;text-transform:uppercase}
  .sem{position:absolute;right:36px;top:30px;font-weight:600;font-size:18px;color:#D6E4E6}
  .c{position:absolute;left:56px;top:150px;width:560px}
  .tag{display:inline-block;background:#12A4A8;font-weight:600;font-size:20px;padding:6px 20px}
  .linha{height:3px;background:#12A4A8;margin-bottom:20px}
  .marca{position:absolute;left:36px;bottom:28px;font-weight:700;font-size:20px;letter-spacing:.08em}
  </style></head><body>
  ${fundoCeu(1200, 627, 900, 250)}
  <div class="fig">${selo("#2BB7BD", 640)}</div>
  <div class="nome"><b>Direcções</b><b>da Semana</b></div>
  <div class="sem">${esc(periodo)}</div>
  <div class="c"><div class="tag">Nesta edição</div><div class="linha"></div>${itens(dest, 28, 10)}</div>
  <div class="marca">S.A REDES</div>
  </body></html>`;
}

/* ---------- Render ---------- */
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(html, w, h, ficheiro) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: ficheiro, type: "png" });
}

// Fotografias: capa + uma por notícia
const noticias = slides.slice(1);
const fotoCapa = null; // a capa usa o selo da marca no fundo, em vez de fotografia
const fotos = [];
for (const s of noticias) fotos.push(await fotoLivre(s.imagem_termos));
const analise = slidesAnalise();
const total = 1 + noticias.length + analise.length;
// Nome curto do tipo de cada slide (usado nos nomes dos ficheiros do kit de publicação)
const ROTULO = { "Oportunidades<br>e ameaças": "oportunidades", "Quem ganha,<br>quem perde": "quem-ganha", "Direcção": "direccao", "A acompanhar": "sinal" };
const tipos = ["capa", ...noticias.map(() => "noticia"), ...analise.map((a) => ROTULO[a.titulo] || "analise")];

const formatos = [{ nome: "feed", W: 1080, H: 1350 }, { nome: "story", W: 1080, H: 1920 }];
const saida = { feed: [], story: [], creditos: [fotoCapa, ...fotos].filter(Boolean).map((f) => f.credito) };
for (const f of formatos) {
  let k = 0;
  const grava = async (html) => { const p = `${DIR}/${f.nome}/slide-${String(++k).padStart(2, "0")}.png`; await render(html, f.W, f.H, p); saida[f.nome].push(p.replace(/^docs\//, "")); };
  await grava(capaA(f.W, f.H, fotoCapa));
  for (let j = 0; j < noticias.length; j++) await grava(noticiaB(f.W, f.H, noticias[j], k, total, fotos[j]));
  for (const a of analise) await grava(moldeC(f.W, f.H, k, total, a.titulo, a.corpo(f.W, f.H)));
  console.log(`${f.nome}: ${k} imagens`);
}
await render(capaLinkedIn(fotoCapa), 1200, 627, `${DIR}/capa-linkedin.png`);
saida.capa = `data/imagens/capa-linkedin.png`;

// Carrossel do LinkedIn em PDF (uma página por slide 4:5)
const imgs = saida.feed.map((p) => `data:image/png;base64,${readFileSync("docs/" + p).toString("base64")}`);
await page.setContent(`<!doctype html><html><head><style>@page{size:1080px 1350px;margin:0}body{margin:0}img{display:block;width:1080px;height:1350px;page-break-after:always}</style></head><body>${imgs.map((s) => `<img src="${s}">`).join("")}</body></html>`, { waitUntil: "load" });
await page.pdf({ path: `${DIR}/linkedin-carrossel.pdf`, width: "1080px", height: "1350px", printBackground: true });
saida.pdf = `data/imagens/linkedin-carrossel.pdf`;
await browser.close();

/* ---------- Arquivo e gravação ---------- */
const arq = `docs/data/semanas/${ed.semana}/imagens-${ed.dia}`;
rmSync(arq, { recursive: true, force: true });
cpSync(DIR, arq, { recursive: true });
ed.imagens = { slides: saida.feed, stories: saida.story, tipos, capa: saida.capa, pdf: saida.pdf, creditos: saida.creditos, v: Date.now() };
writeFileSync(ED, JSON.stringify(ed, null, 2));
const diaF = `docs/data/semanas/${ed.semana}/dia-${ed.dia}.json`;
if (existsSync(diaF)) writeFileSync(diaF, JSON.stringify(ed, null, 2));
execSync(`git add docs/data && (git diff --cached --quiet || git commit -qm "imagens v${ed.versao}") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" });
console.log(`Feito: ${saida.feed.length} feed, ${saida.story.length} stories, capa LinkedIn e PDF.`);
