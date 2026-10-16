// Imagens do post diário (docs/data/dia.json):
//   "dia"   Direcção do Dia (segunda, terça, quinta, sexta): capa no céu com o selo, o resto no estilo C (preto e verde).
//   "bolso" O Seu Bolso (quarta): estilo claro (areia, tinta e azul Índico), com as séries da memória.
// Formatos: feed 4:5 (1080x1350), story 9:16 (1080x1920) e PDF do carrossel para o LinkedIn.
// Sem custo de tokens: Playwright (Chromium).
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { esc, limpaT, corta, FONTES, BASE, SETA, CHEV, selo, fundoCeu, NIV, saldo, escala, dataLonga, num } from "./estilo.mjs";

const DJ = "docs/data/dia.json";
if (!existsSync(DJ)) { console.log("Sem post do dia."); process.exit(0); }
const dia = JSON.parse(readFileSync(DJ, "utf8"));
if (!["dia", "bolso"].includes(dia.tipo)) { console.log("Tipo de post do dia desconhecido."); process.exit(0); }
const SEM_COMMIT = process.argv.includes("--sem-commit");
const HOJE = new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
if (process.argv.includes("--se-hoje") && dia.data !== HOJE) { console.log("O post do dia não é de hoje: sem imagens novas."); process.exit(0); }

const DIR = "docs/data/dia";
rmSync(DIR, { recursive: true, force: true });
mkdirSync(`${DIR}/feed`, { recursive: true });
mkdirSync(`${DIR}/story`, { recursive: true });
const quando = dataLonga(dia.data);

/* ================= Direcção do Dia ================= */
function capaDia(W, H) {
  const story = H > 1500;
  const S = story ? 900 : 700;
  const figLeft = story ? 330 : 420, figTop = story ? 60 : -10;
  const nums = (dia.facto?.numeros || []).slice(0, 1);
  return `<!doctype html><html><head>${FONTES}<style>${BASE}
  :root{--w:${W}px;--h:${H}px}
  body{font-family:Poppins,Arial,sans-serif;color:#fff;background:#050E14}
  .fig{position:absolute;left:${figLeft}px;top:${figTop}px;opacity:.9}
  .sem{position:absolute;left:90px;top:${story ? 110 : 60}px;font-weight:600;font-size:28px;letter-spacing:.04em;color:#D6E4E6}
  .tag{position:absolute;left:90px;top:${story ? 700 : 520}px;display:inline-block;background:#12A4A8;font-weight:700;font-size:30px;letter-spacing:.1em;padding:10px 28px;text-transform:uppercase}
  .linha{position:absolute;left:90px;right:90px;top:${story ? 768 : 588}px;height:4px;background:#12A4A8}
  h1{position:absolute;left:90px;right:90px;top:${story ? 810 : 625}px;font-weight:800;font-size:${story ? 92 : 78}px;line-height:1.04;letter-spacing:-.01em}
  .num{position:absolute;left:90px;bottom:${story ? 270 : 160}px;display:flex;align-items:baseline;gap:22px}
  .num b{font-weight:800;font-size:${story ? 74 : 60}px;color:#F7B32B}
  .num span{font-family:"DM Sans",sans-serif;font-size:${story ? 30 : 26}px;color:#D6E4E6}
  .marca{position:absolute;left:56px;bottom:44px;font-weight:700;font-size:30px;letter-spacing:.08em}
  .seta{position:absolute;right:56px;bottom:32px;width:92px;height:92px;border-radius:50%;background:linear-gradient(135deg,#FFE14D,#F7B32B);color:#111;padding:21px}
  </style></head><body>
  ${fundoCeu(W, H, figLeft + S * 0.55, figTop + S * 0.42, 11)}
  <div class="fig">${selo("#2BB7BD", S)}</div>
  <div class="sem">${esc(quando)}</div>
  <div class="tag">Direcção do Dia</div><div class="linha"></div>
  <h1>${esc(corta(dia.pergunta || dia.tema, 90))}</h1>
  ${nums.length ? `<div class="num"><b>${esc(corta(nums[0].valor, 16))}</b><span>${esc(corta(nums[0].legenda, 40))}</span></div>` : ""}
  <div class="marca">S.A REDES</div><div class="seta">${SETA}</div>
  </body></html>`;
}

function moldeC(W, H, i, n, titulo, corpo, zoom = 1) {
  const story = H > 1500;
  return `<!doctype html><html><head>${FONTES}<style>${BASE}
  :root{--w:${W}px;--h:${H}px}
  body{background:#030504;font-family:"DM Sans",Arial,sans-serif;color:#fff}
  .luz{position:absolute;inset:0;background:radial-gradient(ellipse 70% 55% at 100% 100%,rgba(0,168,84,.5),transparent 70%)}
  .ondas{position:absolute;left:-200px;top:-260px;width:900px;height:900px;border-radius:50%;opacity:.3;
    background:repeating-radial-gradient(circle at 50% 50%,transparent 0 18px,rgba(0,210,106,.35) 19px 20px,transparent 21px 38px)}
  .topo{position:absolute;left:80px;right:80px;top:${story ? 130 : 70}px;display:flex;justify-content:space-between;align-items:center}
  .topo .m{font-weight:500;font-size:26px;letter-spacing:.04em;display:flex;align-items:center;gap:14px}
  .topo .d{font-size:22px;font-weight:700;letter-spacing:.12em;color:#00D26A;text-transform:uppercase}
  h1{position:absolute;left:80px;right:80px;top:${story ? 270 : 165}px;font-weight:500;font-size:${story ? 88 : 72}px;line-height:1.02;text-transform:uppercase;letter-spacing:-.01em}
  .corpo{position:absolute;left:80px;right:80px;top:${story ? 500 : 340}px;bottom:${story ? 190 : 120}px}
  .pe{position:absolute;left:80px;right:80px;bottom:${story ? 110 : 56}px;display:flex;justify-content:space-between;font-size:23px;color:#9aa39e}
  .g{color:#00D26A;font-weight:700}
  .row{display:flex;align-items:center;gap:22px}
  .ch{flex:0 0 auto;width:52px;height:52px;border-radius:50%;background:#00D26A;color:#031;display:flex;align-items:center;justify-content:center}
  .cap{border:2px solid #00D26A;border-radius:48px;padding:20px 32px;margin-bottom:${story ? 26 : 18}px}
  .cap .t{color:#00D26A;font-weight:700;font-size:${story ? 30 : 27}px;text-transform:uppercase}
  .cap .x{font-size:${story ? 30 : 26}px;color:#e3e8e5;margin-top:4px;line-height:1.28}
  .rot{font-size:${story ? 22 : 19}px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8c968f}
  </style></head><body>
  <div class="luz"></div><div class="ondas"></div>
  <div class="topo"><span class="m">${selo("#FFFFFF", 60)}S.A REDES</span><span class="d">Direcção do Dia</span></div>
  <h1>${titulo}</h1>
  <div class="corpo"><div style="zoom:${zoom}">${corpo}</div></div>
  <div class="pe"><span>${esc(quando)}</span><span>${i + 1}/${n}</span></div>
  </body></html>`;
}

const TIPO_CEN = { melhora: "Melhora", fica_igual: "Fica igual", piora: "Piora" };
function nomeCenario(tipo) { const c = (dia.cenarios || []).find((x) => x.tipo === tipo); return c ? c.nome : TIPO_CEN[tipo] || ""; }
const bloco = (rot, txt, story, tam) => txt ? `<div style="margin-bottom:${story ? 30 : 20}px"><div class="rot" style="margin-bottom:6px">${rot}</div>
  <div style="font-size:${tam}px;line-height:1.28">${esc(txt)}</div></div>` : "";

function slidesDia() {
  const out = [];
  const f = dia.facto || {};
  if (f.texto || (f.numeros || []).length) out.push({ tipo: "facto", zoom: [(dia.facto?.numeros || []).length > 2 ? 1.08 : 1.18, 1.25], titulo: "O facto", corpo: (W, H) => {
    const story = H > 1500, ns = (f.numeros || []).slice(0, 3);
    const grande = ns.length === 1 ? (story ? 150 : 128) : (story ? 96 : 80);
    return `<div style="display:grid;grid-template-columns:${ns.length > 1 ? "1fr 1fr" : "1fr"};gap:${story ? 46 : 30}px 48px;margin-bottom:${story ? 70 : 40}px">
      ${ns.map((x) => `<div><div style="font-family:Poppins,sans-serif;font-weight:800;font-size:${grande}px;line-height:1;color:#00D26A;white-space:nowrap">${esc(corta(x.valor, 14))}</div>
        <div style="font-size:${story ? 30 : 25}px;color:#cfd6d2;margin-top:12px">${esc(corta(x.legenda, 42))}</div></div>`).join("")}</div>
      <div style="font-size:${story ? 40 : 33}px;line-height:1.32">${esc(corta(f.texto, 420))}</div>
      ${f.fonte ? `<div style="font-size:${story ? 22 : 20}px;color:#8c968f;margin-top:${story ? 36 : 24}px">Fonte: ${esc(corta(f.fonte, 110))}</div>` : ""}`;
  }});

  // Como chegámos aqui: linha do tempo e precedente
  const lt = (dia.linha_do_tempo || []).slice(0, 6), pr = dia.precedente || {};
  if (lt.length || pr.o_que_aconteceu) out.push({ tipo: "contexto", zoom: [1.12, 1.3], titulo: "Como<br>chegámos aqui", corpo: (W, H) => {
    const story = H > 1500, alt = story ? 92 : 74;
    const pontos = lt.map((x, k) => `<div style="position:relative;display:grid;grid-template-columns:150px 36px 1fr;align-items:center;height:${alt}px">
        <span style="font-family:Poppins,sans-serif;font-weight:700;font-size:${story ? 28 : 25}px;color:${x.futuro ? "#9aa39e" : "#fff"}">${esc(corta(x.data, 10))}</span>
        <span style="position:relative;height:100%;display:flex;align-items:center;justify-content:center">
          ${k ? `<span style="position:absolute;left:17px;top:0;height:50%;width:2px;background:rgba(0,210,106,.5)"></span>` : ""}
          ${k < lt.length - 1 ? `<span style="position:absolute;left:17px;bottom:0;height:50%;width:2px;background:rgba(0,210,106,.5)"></span>` : ""}
          <span style="position:relative;width:20px;height:20px;border-radius:50%;${x.futuro ? "border:3px solid #00D26A;background:#030504" : "background:#00D26A"}"></span></span>
        <span style="font-size:${story ? 28 : 25}px;line-height:1.22;padding-left:14px;color:${x.futuro ? "#cfd6d2" : "#fff"}">${esc(corta(x.texto, 80))}${x.futuro ? ' <span style="color:#00D26A;font-weight:700">(por vir)</span>' : ""}</span></div>`).join("");
    const caixa = pr.o_que_aconteceu ? `<div style="border:2px solid rgba(0,210,106,.6);border-radius:18px;padding:${story ? 28 : 20}px 28px;margin-top:${story ? 40 : 24}px">
        <div class="rot" style="color:#00D26A;margin-bottom:8px">Já aconteceu antes: ${esc(corta(pr.quando, 30))}</div>
        <div style="font-size:${story ? 27 : 24}px;line-height:1.3">${esc(corta(pr.o_que_aconteceu, 230))}</div>
        ${pr.licao ? `<div style="font-size:${story ? 25 : 22}px;line-height:1.3;color:#cfd6d2;margin-top:10px"><span class="g">Lição:</span> ${esc(corta(pr.licao, 140))}</div>` : ""}</div>` : "";
    return pontos + caixa;
  }});

  const passos = (dia.canal?.passos || []).slice(0, 5);
  if (dia.porque_importa || passos.length) out.push({ tipo: "porque", zoom: [1.1, 1.3], titulo: "Porque<br>importa", corpo: (W, H) => {
    const story = H > 1500, alt = story ? 96 : 72;
    const cadeia = passos.map((p, k) => { const ult = k === passos.length - 1;
      return `<div style="position:relative;display:flex;align-items:center;gap:22px;height:${alt}px">
        ${k < passos.length - 1 ? `<span style="position:absolute;left:25px;top:${alt / 2 + 26}px;width:2px;height:${alt - 52}px;background:#00D26A;opacity:.6"></span>` : ""}
        <span style="flex:0 0 auto;width:52px;height:52px;border-radius:50%;${ult ? "background:#00D26A;color:#031" : "border:2px solid #00D26A;color:#00D26A"};display:flex;align-items:center;justify-content:center">${CHEV}</span>
        <span style="font-size:${story ? 34 : 29}px;${ult ? "font-weight:700" : ""}">${esc(corta(p, 48))}</span></div>`; }).join("");
    return `<div style="font-size:${story ? 36 : 31}px;line-height:1.32;margin-bottom:${story ? 56 : 34}px">${esc(corta(dia.porque_importa, 340))}</div>
      ${passos.length ? `<div class="rot" style="margin-bottom:${story ? 20 : 12}px">Como chega ao bolso</div>${cadeia}` : ""}
      ${dia.canal?.quem_sente ? `<div style="font-size:${story ? 28 : 24}px;color:#cfd6d2;margin-top:${story ? 30 : 18}px"><span class="g">Quem sente primeiro:</span> ${esc(corta(dia.canal.quem_sente, 90))}</div>` : ""}`;
  }});

  // A conta: comparação em barras de uma só cor, com o valor escrito ao lado
  const ct = dia.conta || {}, bs = (ct.barras || []).slice(0, 3);
  if (bs.length) out.push({ tipo: "conta", zoom: [1.3, 1.5], titulo: esc(corta(ct.titulo || "A conta", 40)), corpo: (W, H) => {
    const story = H > 1500, mx = Math.max(...bs.map((b) => +b.valor || 0)) || 1;
    const barras = bs.map((b, k) => { const w = Math.max(4, Math.round(((+b.valor || 0) / mx) * 100));
      return `<div style="margin-bottom:${story ? 40 : 28}px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:20px">
          <span style="font-size:${story ? 29 : 26}px">${esc(corta(b.rotulo, 40))}</span>
          <span style="font-family:Poppins,sans-serif;font-weight:700;font-size:${story ? 36 : 32}px;white-space:nowrap">${esc(b.texto || num(b.valor))}</span></div>
        <div style="height:${story ? 40 : 34}px;background:rgba(255,255,255,.08);border-radius:4px">
          <div style="height:100%;width:${w}%;background:${k === bs.length - 1 ? "#00D26A" : "#E4E9E6"};border-radius:0 4px 4px 0"></div></div></div>`; }).join("");
    return `${ct.pressupostos ? `<div style="font-size:${story ? 25 : 22}px;color:#aab3ae;line-height:1.3;margin-bottom:${story ? 40 : 26}px">${esc(corta(ct.pressupostos, 170))}</div>` : ""}
      ${barras}
      ${ct.conclusao ? `<div style="font-size:${story ? 34 : 30}px;line-height:1.28;font-weight:700;margin-top:${story ? 24 : 10}px">${esc(corta(ct.conclusao, 170))}</div>` : ""}`;
  }});

  // Três cenários: visão geral (probabilidade e gatilho)
  const cen = (dia.cenarios || []).slice(0, 3);
  if (cen.length) out.push({ tipo: "cenarios", zoom: [1.15, 1.35], titulo: "Três<br>cenários", corpo: (W, H) => {
    const story = H > 1500;
    return cen.map((c, k) => { const p = Math.max(0, Math.min(100, Math.round(+c.probabilidade || 0)));
      return `<div style="margin-bottom:${story ? 50 : 30}px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:16px">
          <span style="font-family:Poppins,sans-serif;font-weight:700;font-size:${story ? 33 : 29}px"><span style="color:#8c968f">${k + 1}.</span> ${esc(corta(c.nome, 34))}</span>
          <span style="font-family:Poppins,sans-serif;font-weight:700;font-size:${story ? 42 : 36}px">${p}%</span></div>
        <div style="height:${story ? 20 : 16}px;background:rgba(255,255,255,.10);border-radius:4px">
          <div style="height:100%;width:${p}%;background:#00D26A;border-radius:0 4px 4px 0"></div></div>
        ${c.gatilho ? `<div style="font-size:${story ? 27 : 24}px;line-height:1.28;color:#e3e8e5;margin-top:12px"><span class="g">Acontece se</span> ${esc(corta(c.gatilho, 120))}</div>` : `<div style="font-size:${story ? 27 : 24}px;line-height:1.28;color:#e3e8e5;margin-top:12px">${esc(corta(c.o_que_acontece, 120))}</div>`}
        ${c.porque_probabilidade ? `<div style="font-size:${story ? 22 : 19}px;line-height:1.3;color:#9aa39e;margin-top:6px">Porquê ${p}%: ${esc(corta(c.porque_probabilidade, 170))}</div>` : ""}</div>`; }).join("");
  }});

  // Um slide por cenário, com o mecanismo, os números e o que fazer
  cen.forEach((c, k) => { if (!c.gatilho && !c.numeros) return;
    out.push({ tipo: `cenario-${k + 1}`, zoom: [1.08, 1.25], titulo: `<span style="font-size:.4em;letter-spacing:.12em;color:#00D26A;display:block;margin-bottom:12px">Cenário ${k + 1} de ${cen.length}, ${Math.round(+c.probabilidade || 0)}%</span><span style="font-size:.72em;display:block;line-height:1.05">${esc(corta(c.nome, 38))}</span>`, corpo: (W, H) => {
      const story = H > 1500, t = story ? 30 : 27;
      return `${bloco("Acontece se", corta(c.gatilho, 140), story, t)}
        ${bloco("O que acontece", corta(c.o_que_acontece, 240), story, t)}
        ${c.numeros ? `<div style="margin-bottom:${story ? 30 : 20}px"><div class="rot" style="margin-bottom:6px">Em números${c.quando ? ", " + esc(corta(c.quando, 50)) : ""}</div>
          <div style="font-family:Poppins,sans-serif;font-weight:700;font-size:${story ? 42 : 36}px;line-height:1.15;color:#00D26A">${esc(corta(c.numeros, 90))}</div></div>` : ""}
        ${c.ganha || c.perde ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:${story ? 30 : 20}px">
          <div><div class="rot" style="margin-bottom:6px">Ganha</div><div style="font-size:${t - 2}px;line-height:1.25">${esc(corta(c.ganha, 60))}</div></div>
          <div><div class="rot" style="margin-bottom:6px">Perde</div><div style="font-size:${t - 2}px;line-height:1.25">${esc(corta(c.perde, 60))}</div></div></div>` : ""}
        ${c.se_acontecer ? `<div class="cap" style="margin:0"><div class="row"><span class="ch">${CHEV}</span><span><div class="t">Se acontecer</div><div class="x">${esc(corta(c.se_acontecer, 140))}</div></span></div></div>` : ""}`;
    }});
  });

  // Como saber qual cenário está a chegar
  const sn = (dia.sinais || []).slice(0, 4);
  if (sn.length) out.push({ tipo: "sinais", zoom: [1.12, 1.3], titulo: "Como saber<br>o que vem aí", corpo: (W, H) => {
    const story = H > 1500;
    return sn.map((x) => `<div style="padding:${story ? 24 : 16}px 0;border-bottom:1px solid rgba(255,255,255,.12)">
        <div style="font-size:${story ? 30 : 27}px;font-weight:700;line-height:1.22">${esc(corta(x.o_que, 70))}</div>
        <div style="font-size:${story ? 26 : 23}px;color:#e3e8e5;line-height:1.28;margin-top:6px">${esc(corta(x.limiar, 90))}${x.quando ? `, <span style="color:#9aa39e">${esc(corta(x.quando, 50))}</span>` : ""}</div>
        <div style="display:inline-block;margin-top:10px;border:2px solid #00D26A;border-radius:30px;padding:4px 16px;font-size:${story ? 21 : 19}px;font-weight:700;color:#00D26A">Aponta para: ${esc(corta(nomeCenario(x.aponta_para), 40))}</div></div>`).join("");
  }});

  const af = (dia.afectados || []).slice(0, 6);
  if (af.length) out.push({ tipo: "afectados", zoom: [1.35, 1.55], titulo: "Quem é<br>afectado", corpo: (W, H) => {
    const story = H > 1500, q = story ? 30 : 26;
    return af.map((x) => { const v = saldo(x);
      return `<div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;padding:${story ? 24 : 14}px 0;border-bottom:1px solid rgba(255,255,255,.12)">
        <span><span style="display:block;font-size:${story ? 31 : 27}px;font-weight:700">${esc(corta(x.grupo, 30))}</span>
        <span style="display:block;font-size:${story ? 24 : 21}px;color:#aab3ae;margin-top:3px">${esc(corta(x.porque, 60))}</span></span>
        <span style="text-align:right"><span style="display:block">${escala(v, q)}</span>
        <span style="display:block;font-size:${story ? 19 : 16}px;font-weight:700;letter-spacing:.05em;margin-top:6px;color:${v > 0 ? "#00D26A" : v < 0 ? "#E4E9E6" : "#9aa39e"}">${NIV[v]}</span></span></div>`; }).join("")
      + `<div style="font-size:${story ? 21 : 18}px;color:#8c968f;margin-top:${story ? 22 : 12}px">Do centro para a direita ganha, para a esquerda perde.</div>`;
  }});

  const dir = (dia.direccao || []).slice(0, 4);
  if (dir.length) out.push({ tipo: "direccao", zoom: [1.1, 1.3], titulo: "Direcção", corpo: (W, H) =>
    dir.map((d) => `<div class="cap"><div class="row"><span class="ch">${CHEV}</span>
      <span><div class="t">${esc(corta(d.publico, 36))}</div><div class="x">${esc(corta(d.agora || d.accao, 130))}</div>
      ${d.se_piorar ? `<div style="color:#aab3ae;font-size:${H > 1500 ? 25 : 22}px;margin-top:6px;line-height:1.28"><b style="color:#fff">Se piorar:</b> ${esc(corta(d.se_piorar, 110))}</div>` : ""}</span></div></div>`).join("") });

  const ns = (dia.nao_sabemos || []).slice(0, 3);
  if (dia.visao_contraria || ns.length) out.push({ tipo: "contraria", zoom: [1.18, 1.38], titulo: "O que pode<br>estar errado", corpo: (W, H) => {
    const story = H > 1500;
    return `${dia.visao_contraria ? `<div class="rot" style="margin-bottom:10px">A outra leitura</div><div style="font-size:${story ? 36 : 31}px;line-height:1.3;margin-bottom:${story ? 50 : 34}px">${esc(corta(dia.visao_contraria, 260))}</div>` : ""}
      ${ns.length ? `<div class="rot" style="margin-bottom:10px">O que ainda não se sabe</div>${ns.map((x) => `<div style="display:grid;grid-template-columns:40px 1fr;font-size:${story ? 29 : 25}px;line-height:1.28;margin-bottom:14px"><span class="g">?</span><span>${esc(corta(x, 130))}</span></div>`).join("")}` : ""}`;
  }});

  if (dia.sinal || dia.confianca) out.push({ tipo: "sinal", zoom: [1.22, 1.45], titulo: "A acompanhar", corpo: (W, H) => {
    const story = H > 1500, nivel = { alta: 3, media: 2, "média": 2, baixa: 1 }[String(dia.confianca || "").toLowerCase()] || 0;
    const nomeN = { 3: "alta", 2: "média", 1: "baixa" }[nivel];
    const barras = [1, 2, 3].map((k) => `<span style="display:inline-block;width:${story ? 70 : 60}px;height:16px;border-radius:4px;margin-right:6px;background:${k <= nivel ? "#00D26A" : "rgba(255,255,255,.14)"}"></span>`).join("");
    const fts = (dia.fontes || []).map((x) => x.fonte || x).filter(Boolean).slice(0, 5).join(", ");
    return `<div style="font-size:${story ? 50 : 42}px;line-height:1.24;font-weight:500">${esc(corta(dia.sinal, 170))}</div>
      ${nivel ? `<div style="margin-top:${story ? 70 : 44}px"><div class="rot" style="margin-bottom:14px">Grau de confiança: ${nomeN}</div>${barras}
        ${dia.base_confianca ? `<div style="font-size:${story ? 26 : 22}px;color:#cfd6d2;margin-top:16px;line-height:1.3">${esc(corta(dia.base_confianca, 160))}</div>` : ""}</div>` : ""}
      ${fts ? `<div style="font-size:${story ? 22 : 19}px;color:#8c968f;margin-top:${story ? 40 : 24}px">Fontes: ${esc(corta(fts, 170))}</div>` : ""}
      <div class="row" style="margin-top:${story ? 56 : 32}px"><span class="ch">${CHEV}</span><span class="g" style="font-size:${story ? 29 : 26}px">SIGA S.A REDES: UM ASSUNTO A FUNDO, TODOS OS DIAS ÚTEIS</span></div>`;
  }});
  return out;
}

/* ================= O Seu Bolso ================= */
const AREIA = "#F3F1EC", TINTA = "#10181C", SEG = "#4A5559", MUDO = "#6F787C", INDICO = "#0E7C82", AMARELO = "#F7B32B", LINHA = "#DAD6CC";
function capaBolso(W, H) {
  const story = H > 1500, S = story ? 1000 : 820;
  return `<!doctype html><html><head>${FONTES}<style>${BASE}
  :root{--w:${W}px;--h:${H}px}
  body{background:${AREIA};font-family:Poppins,Arial,sans-serif;color:${TINTA}}
  .fig{position:absolute;right:${story ? -330 : -300}px;top:${story ? -40 : -120}px;opacity:.16}
  .sem{position:absolute;left:90px;top:${story ? 130 : 70}px;font-weight:600;font-size:26px;letter-spacing:.04em;color:${SEG}}
  .barra{position:absolute;left:90px;top:${story ? 640 : 420}px;width:160px;height:14px;background:${AMARELO}}
  h1{position:absolute;left:84px;right:90px;top:${story ? 680 : 455}px;font-weight:800;font-size:${story ? 150 : 128}px;line-height:.95;text-transform:uppercase;letter-spacing:-.02em}
  .sub{position:absolute;left:90px;top:${story ? 1000 : 735}px;font-weight:600;font-size:${story ? 34 : 30}px;color:${INDICO}}
  .res{position:absolute;left:90px;right:90px;top:${story ? 1090 : 810}px;font-family:"DM Sans",sans-serif;font-size:${story ? 40 : 34}px;line-height:1.32;color:${SEG}}
  .marca{position:absolute;left:56px;bottom:44px;font-weight:700;font-size:30px;letter-spacing:.08em;display:flex;align-items:center;gap:14px}
  .seta{position:absolute;right:56px;bottom:32px;width:92px;height:92px;border-radius:50%;background:${AMARELO};color:${TINTA};padding:21px}
  </style></head><body>
  <div class="fig">${selo(INDICO, S)}</div>
  <div class="sem">${esc(quando)}</div>
  <div class="barra"></div>
  <h1>O seu<br>bolso</h1>
  <div class="sub">Para a classe média e a classe baixa</div>
  <div class="res">${esc(corta(dia.resumo, story ? 240 : 190))}</div>
  <div class="marca">${selo(TINTA, 56)}S.A REDES</div><div class="seta">${SETA}</div>
  </body></html>`;
}

function moldeBolso(W, H, i, n, titulo, corpo, zoom = 1) {
  const story = H > 1500;
  return `<!doctype html><html><head>${FONTES}<style>${BASE}
  :root{--w:${W}px;--h:${H}px}
  body{background:${AREIA};font-family:"DM Sans",Arial,sans-serif;color:${TINTA}}
  .topo{position:absolute;left:80px;right:80px;top:${story ? 130 : 66}px;display:flex;justify-content:space-between;align-items:center}
  .topo .m{font-family:Poppins,sans-serif;font-weight:700;font-size:24px;letter-spacing:.06em;display:flex;align-items:center;gap:12px}
  .topo .d{font-family:Poppins,sans-serif;font-size:22px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:${AMARELO};padding:6px 16px}
  h1{position:absolute;left:80px;right:80px;top:${story ? 260 : 150}px;font-family:Poppins,sans-serif;font-weight:800;font-size:${story ? 76 : 64}px;line-height:1.02;text-transform:uppercase;letter-spacing:-.01em}
  .corpo{position:absolute;left:80px;right:80px;top:${story ? 460 : 300}px;bottom:${story ? 190 : 116}px}
  .pe{position:absolute;left:80px;right:80px;bottom:${story ? 110 : 54}px;display:flex;justify-content:space-between;font-size:22px;color:${MUDO};border-top:1px solid ${LINHA};padding-top:16px}
  .rot{font-size:${story ? 21 : 18}px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${MUDO}}
  </style></head><body>
  <div class="topo"><span class="m">${selo(TINTA, 52)}S.A REDES</span><span class="d">O Seu Bolso</span></div>
  <h1>${titulo}</h1>
  <div class="corpo"><div style="zoom:${zoom}">${corpo}</div></div>
  <div class="pe"><span>${esc(quando)}</span><span>${i + 1}/${n}</span></div>
  </body></html>`;
}

// Linha de tendência sem eixos (pequenos múltiplos, um indicador por cartão, uma só cor)
function sparkline(pontos, w, h) {
  const vs = pontos.map((p) => +p[1]).filter((v) => Number.isFinite(v));
  if (vs.length < 2) return `<div style="height:${h}px;display:flex;align-items:center;font-size:20px;color:${MUDO}">A série começa agora: mais pontos nas próximas semanas.</div>`;
  let lo = Math.min(...vs), hi = Math.max(...vs);
  // Escala honesta: a amplitude mínima é 8% do nível, para que pequenas oscilações pareçam pequenas
  const meio = (hi + lo) / 2, minimo = Math.abs(meio) * 0.08 || 1;
  if (hi - lo < minimo) { lo = meio - minimo / 2; hi = meio + minimo / 2; }
  const pad = 10, x = (k) => pad + (k * (w - 2 * pad)) / (vs.length - 1), y = (v) => pad + (1 - (v - lo) / (hi - lo)) * (h - 2 * pad);
  const d = vs.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${d} L${x(vs.length - 1).toFixed(1)} ${h} L${x(0).toFixed(1)} ${h} Z`;
  const lx = x(vs.length - 1), ly = y(vs.at(-1));
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible">
    <path d="${area}" fill="${INDICO}" opacity=".08"></path>
    <path d="${d}" fill="none" stroke="${INDICO}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path>
    <circle cx="${lx}" cy="${ly}" r="9" fill="${INDICO}" stroke="#FFFFFF" stroke-width="3"></circle></svg>`;
}
const curta = (iso) => { const [, m, d] = String(iso || "").split("-"); return d ? `${+d}/${+m}` : ""; };
const variacaoTxt = (v, rot) => v === null || v === undefined ? "" :
  `<span style="white-space:nowrap">${rot}: <b style="color:${TINTA}">${v > 0 ? "sobe" : v < 0 ? "desce" : "igual"}${v ? " " + num(Math.abs(v), 1) + "%" : ""}</b></span>`;

function slidesBolso() {
  const out = [];
  const ser = (dia.series || []).slice(0, 4);
  if (ser.length) out.push({ tipo: "indicadores", titulo: "Como estão<br>os preços", corpo: (W, H) => {
    const story = H > 1500, cw = (W - 160 - 32) / 2, sh = story ? 240 : 150;
    const cart = ser.map((s) => {
      const u = s.ultimo || {}, pts = s.pontos || [];
      return `<div style="background:#FFFFFF;border:1px solid ${LINHA};border-radius:12px;padding:${story ? 30 : 22}px ${story ? 28 : 24}px">
        <div style="font-size:${story ? 28 : 24}px;font-weight:700;color:${SEG};line-height:1.2;height:${story ? 68 : 58}px;overflow:hidden">${esc(corta(s.nome, 44))}</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin:${story ? 12 : 6}px 0 ${story ? 18 : 12}px">
          <span style="font-family:Poppins,sans-serif;font-weight:800;font-size:${story ? 76 : 62}px;line-height:1">${u.valor !== undefined ? esc(num(u.valor)) : "s/d"}</span>
          <span style="font-size:${story ? 25 : 21}px;color:${MUDO}">${esc(s.unidade || "")}</span></div>
        ${sparkline(pts, cw - (story ? 58 : 50), sh)}
        ${pts.length > 1 ? `<div style="display:flex;justify-content:space-between;font-size:${story ? 20 : 18}px;color:${MUDO};margin-top:8px"><span>${curta(pts[0][0])}</span><span>${curta(pts.at(-1)[0])}</span></div>` : ""}
        <div style="display:flex;flex-wrap:wrap;gap:4px 18px;font-size:${story ? 24 : 21}px;color:${SEG};margin-top:${story ? 14 : 8}px">${variacaoTxt(s.var4, "4 semanas")}${variacaoTxt(s.var12, "12 semanas")}</div>
      </div>`; }).join("");
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${story ? 32 : 24}px 32px">${cart}</div>
      <div style="font-size:${story ? 23 : 20}px;color:${MUDO};margin-top:${story ? 26 : 16}px">Valores registados semana a semana pela redacção. Fontes nos textos do post.</div>`;
  }});
  // Três capitais regionais: cada indicador com a sua escala; barras de uma só cor, cidade identificada pelo nome
  const rg = dia.regional || {}, linhas = (rg.linhas || []).filter((l) => l.cidades.some((c) => c.valor !== null)).slice(0, 4);
  if (linhas.length) out.push({ tipo: "regioes-precos", zoom: [1.1, 1.3], titulo: "Sul, Centro<br>e Norte", corpo: (W, H) => {
    const story = H > 1500;
    const ZONA = Object.fromEntries((rg.regioes || []).map((g) => [g.id, g.zona]));
    const grupo = (l) => { const mx = Math.max(...l.cidades.map((c) => +c.valor || 0)) || 1;
      return `<div style="margin-bottom:${story ? 40 : 26}px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid ${TINTA};padding-bottom:6px;margin-bottom:10px">
          <span style="font-family:Poppins,sans-serif;font-weight:700;font-size:${story ? 30 : 26}px">${esc(corta(l.nome, 30))}</span>
          <span style="font-size:${story ? 21 : 18}px;color:${MUDO}">${esc(l.unidade)}</span></div>
        ${l.cidades.map((c) => { const tem = c.valor !== null && c.valor !== undefined, w = tem ? Math.max(3, Math.round((+c.valor / mx) * 100)) : 0;
          const nomeC = c.nome || (rg.regioes || []).find((g) => g.id === c.regiao)?.nome || c.regiao;
          const varT = tem && c.var4 !== null && c.var4 !== undefined ? `${c.var4 > 0 ? "sobe" : c.var4 < 0 ? "desce" : "igual"}${c.var4 ? " " + num(Math.abs(c.var4), 1) + "%" : ""}` : "";
          return `<div style="display:grid;grid-template-columns:${story ? 200 : 180}px 1fr ${story ? 100 : 90}px ${story ? 150 : 130}px;align-items:center;gap:12px;min-height:${story ? 52 : 42}px">
            <span style="font-size:${story ? 25 : 22}px;font-weight:700">${esc(nomeC)} <span style="font-weight:400;color:${MUDO};font-size:.8em">${esc(ZONA[c.regiao] || "")}</span></span>
            <span style="height:${story ? 22 : 18}px;border-radius:4px;${tem ? `background:#E7E3DA` : `border:2px dashed ${LINHA}`}">${tem ? `<span style="display:block;height:100%;width:${w}%;background:${INDICO};border-radius:0 4px 4px 0"></span>` : ""}</span>
            <span style="text-align:right;font-family:Poppins,sans-serif;font-weight:700;font-size:${story ? 28 : 24}px">${tem ? esc(num(c.valor)) : `<span style="font-family:'DM Sans',sans-serif;font-weight:400;color:${MUDO};font-size:.75em;white-space:nowrap">sem dados</span>`}</span>
            <span style="font-size:${story ? 20 : 17}px;color:${SEG};line-height:1.15">${varT ? `${varT}<br><span style="color:${MUDO}">em 4 semanas</span>` : ""}</span></div>`; }).join("")}</div>`; };
    return linhas.map(grupo).join("") + `<div style="font-size:${story ? 20 : 17}px;color:${MUDO}">Preços registados pela redacção nas três capitais regionais. Cada indicador tem a sua escala.</div>`;
  }});
  const regs = (dia.regioes || []).slice(0, 3);
  if (regs.length) out.push({ tipo: "regioes-direccao", zoom: [1.15, 1.35], titulo: "Cada região,<br>a sua direcção", corpo: (W, H) => {
    const story = H > 1500, G = Object.fromEntries((rg.regioes || []).map((g) => [g.id, g]));
    return regs.map((x) => { const g = G[x.regiao] || { nome: x.regiao, zona: "" };
      return `<div style="background:#FFFFFF;border:1px solid ${LINHA};border-left:8px solid ${AMARELO};border-radius:12px;padding:${story ? 26 : 18}px 26px;margin-bottom:${story ? 28 : 18}px">
        <div class="rot" style="margin-bottom:6px">${esc(g.zona)}</div>
        <div style="font-family:Poppins,sans-serif;font-weight:800;font-size:${story ? 38 : 32}px;line-height:1">${esc(g.nome)}</div>
        <div style="font-size:${story ? 27 : 24}px;line-height:1.3;color:${SEG};margin-top:10px">${esc(corta(x.destaque, 130))}</div>
        <div style="display:grid;grid-template-columns:44px 1fr;gap:12px;align-items:start;margin-top:12px">
          <span style="width:40px;height:40px;border-radius:50%;background:${INDICO};color:#fff;display:flex;align-items:center;justify-content:center">${CHEV}</span>
          <span style="font-size:${story ? 27 : 24}px;line-height:1.3;font-weight:700">${esc(corta(x.direccao, 150))}</span></div></div>`; }).join("");
  }});
  const mud = (dia.o_que_mudou || []).slice(0, 3);
  if (mud.length) out.push({ tipo: "o-que-mudou", zoom: [1.2, 1.35], titulo: "O que<br>mudou", corpo: (W, H) => {
    const story = H > 1500;
    return mud.map((m) => `<div style="border-left:8px solid ${AMARELO};padding:${story ? 8 : 4}px 0 ${story ? 8 : 4}px 30px;margin-bottom:${story ? 60 : 38}px">
      <div style="font-family:Poppins,sans-serif;font-weight:700;font-size:${story ? 42 : 36}px;line-height:1.1">${esc(corta(m.titulo, 60))}</div>
      <div style="font-size:${story ? 31 : 27}px;line-height:1.32;color:${SEG};margin-top:10px">${esc(corta(m.explicacao, 190))}</div>
      ${m.canal ? `<div style="font-size:${story ? 24 : 21}px;color:${INDICO};font-weight:700;margin-top:10px">Chega ao bolso por: ${esc(corta(m.canal, 70))}</div>` : ""}</div>`).join("");
  }});
  const dir = (dia.direccoes || []).slice(0, 6);
  const CL = { baixa: "Classe baixa", media: "Classe média", "média": "Classe média", ambas: "Média e baixa" };
  if (dir.length) out.push({ tipo: "direccoes", zoom: [1.22, 1.3], titulo: "O que<br>fazer", corpo: (W, H) => {
    const story = H > 1500, f = dir.length > 4 && !story ? 23 : story ? 29 : 26;
    return dir.map((d) => `<div style="display:grid;grid-template-columns:${story ? 70 : 60}px 1fr;gap:16px;padding:${story ? 22 : dir.length > 4 ? 12 : 16}px 0;border-bottom:1px solid ${LINHA}">
      <span style="width:${story ? 52 : 46}px;height:${story ? 52 : 46}px;border-radius:50%;background:${INDICO};color:#FFFFFF;display:flex;align-items:center;justify-content:center">${CHEV}</span>
      <span><span style="font-family:Poppins,sans-serif;font-weight:700;font-size:${f}px;text-transform:uppercase">${esc(corta(d.area, 24))}</span>
        <span style="font-size:${f - 6}px;font-weight:700;color:${MUDO};margin-left:12px;letter-spacing:.04em">${esc(CL[String(d.classe || "").toLowerCase()] || "")}</span>
        <span style="display:block;font-size:${f}px;line-height:1.28;color:${SEG};margin-top:4px">${esc(corta(d.accao, 120))}</span></span></div>`).join("");
  }});
  const rev = (dia.revisao || []).slice(0, 3);
  out.push({ tipo: "revisao", zoom: [1.3, 1.5], titulo: rev.length ? "O que dissemos<br>e o que houve" : "Para ter<br>em conta", corpo: (W, H) => {
    const story = H > 1500;
    // Resultado com ícone e palavra, nunca só pela cor
    const ICO = {
      confirmada: [`<path d="M6 12.5l4 4 8-9" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`, "Confirmou-se", INDICO],
      parcial: [`<path d="M12 4a8 8 0 0 1 0 16Z" fill="#FFFFFF"/>`, "Em parte", SEG],
      nao_confirmada: [`<path d="M8 8l8 8M16 8l-8 8" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>`, "Não se confirmou", TINTA],
    };
    const lista = rev.map((r) => { const [ic, nome, cor] = ICO[r.resultado] || ICO.parcial;
      return `<div style="display:grid;grid-template-columns:64px 1fr;gap:20px;margin-bottom:${story ? 44 : 28}px">
        <span style="width:56px;height:56px;border-radius:50%;background:${cor};display:flex;align-items:center;justify-content:center"><svg width="32" height="32" viewBox="0 0 24 24">${ic}</svg></span>
        <span><span style="display:block;font-size:${story ? 29 : 25}px;line-height:1.28">${esc(corta(r.direccao, 110))}</span>
          <span style="display:block;font-size:${story ? 23 : 20}px;color:${SEG};margin-top:6px"><b style="color:${TINTA}">${nome}.</b> ${esc(corta(r.nota, 80))}</span></span></div>`; }).join("");
    return `${lista || `<div style="font-size:${story ? 32 : 28}px;line-height:1.32;color:${SEG}">Cada quarta-feira revemos as direcções anteriores e dizemos se se confirmaram. A memória da redacção cresce de semana para semana.</div>`}
      <div style="background:#FFFFFF;border:1px solid ${LINHA};border-radius:12px;padding:${story ? 30 : 22}px 28px;margin-top:${story ? 50 : 26}px;font-size:${story ? 23 : 20}px;line-height:1.35;color:${SEG}">
        Orientação geral para famílias e pequenos negócios. Não é aconselhamento financeiro individual nem recomenda bancos ou produtos.</div>
      <div style="font-family:Poppins,sans-serif;font-weight:700;font-size:${story ? 27 : 24}px;margin-top:${story ? 44 : 26}px;color:${INDICO}">Todas as quartas, na S.A REDES.</div>`;
  }});
  return out;
}

/* ================= Render ================= */
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(html, w, h, ficheiro) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: "networkidle", timeout: 60000 }).catch(() => page.setContent(html, { waitUntil: "load" }));
  await page.evaluate(() => document.fonts.ready);
  // Ajuste automático: se o texto não cabe, reduz o tamanho até caber (nunca abaixo de 70%)
  await page.evaluate(() => {
    const c = document.querySelector(".corpo"), d = c && c.firstElementChild;
    if (!d) return;
    let z = parseFloat(d.style.zoom || "1");
    const cabe = () => d.getBoundingClientRect().bottom <= c.getBoundingClientRect().bottom + 1;
    while (z > 0.7 && !cabe()) { z -= 0.02; d.style.zoom = String(z); }
  });
  await page.screenshot({ path: ficheiro, type: "png" });
}

const bolso = dia.tipo === "bolso";
const corpoSlides = bolso ? slidesBolso() : slidesDia();
const total = 1 + corpoSlides.length;
const tipos = [bolso ? "capa-bolso" : "capa-dia", ...corpoSlides.map((s) => s.tipo)];
const saida = { feed: [], story: [] };
for (const f of [{ nome: "feed", W: 1080, H: 1350 }, { nome: "story", W: 1080, H: 1920 }]) {
  let k = 0;
  const grava = async (html) => { const p = `${DIR}/${f.nome}/slide-${String(++k).padStart(2, "0")}.png`; await render(html, f.W, f.H, p); saida[f.nome].push(p.replace(/^docs\//, "")); };
  await grava(bolso ? capaBolso(f.W, f.H) : capaDia(f.W, f.H));
  for (const s of corpoSlides) await grava((bolso ? moldeBolso : moldeC)(f.W, f.H, k, total, s.titulo, s.corpo(f.W, f.H), (s.zoom || [1, 1])[f.H > 1500 ? 1 : 0]));
  console.log(`${f.nome}: ${k} imagens`);
}
const imgs = saida.feed.map((p) => `data:image/png;base64,${readFileSync("docs/" + p).toString("base64")}`);
await page.setContent(`<!doctype html><html><head><style>@page{size:1080px 1350px;margin:0}body{margin:0}img{display:block;width:1080px;height:1350px;page-break-after:always}</style></head><body>${imgs.map((s) => `<img src="${s}">`).join("")}</body></html>`, { waitUntil: "load" });
await page.pdf({ path: `${DIR}/linkedin-carrossel.pdf`, width: "1080px", height: "1350px", printBackground: true });
await browser.close();

dia.imagens = { slides: saida.feed, stories: saida.story, tipos, pdf: `data/dia/linkedin-carrossel.pdf`, v: Date.now() };
writeFileSync(DJ, JSON.stringify(dia, null, 2));
const arq = `docs/data/dias/${dia.data}.json`;
if (existsSync(arq)) writeFileSync(arq, JSON.stringify(dia, null, 2));
if (!SEM_COMMIT) execSync(`git add docs/data && (git diff --cached --quiet || git commit -qm "post do dia ${dia.data} v${dia.versao || 1}") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" });
console.log(`Post do dia (${dia.tipo}): ${saida.feed.length} feed, ${saida.story.length} stories e PDF.`);
