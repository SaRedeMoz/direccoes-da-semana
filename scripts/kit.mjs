// Kit de publicação da semana: uma pasta organizada por rede social + um ZIP único.
// Corre quando a edição é aprovada (e quando há /trocar numa edição já aprovada).
// Sem custo: usa ffmpeg (PNG -> JPG) e zip do GitHub Actions.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync, statSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";

const ED = "docs/data/edicao.json";
if (!existsSync(ED)) { console.log("Sem edição."); process.exit(0); }
const ed = JSON.parse(readFileSync(ED, "utf8"));
if (!ed.aprovada) { console.log("Edição ainda não aprovada: o kit só é criado depois da aprovação."); process.exit(0); }
const im = ed.imagens || {}, t = ed.textos || {};
const [ano, sem] = String(ed.semana || "").split("-S");
const S = `S${sem}`, NOME = `${ano}-S${sem}`;
const BASE = `publicar/${NOME}`;
rmSync(BASE, { recursive: true, force: true });

const PASTAS = {
  stories: "1-STORIES (WhatsApp, Instagram, Facebook)",
  feed: "2-FEED (Instagram e Facebook)",
  linkedin: "3-LINKEDIN",
  textos: "4-TEXTOS",
  reel: "5-REEL",
};
for (const p of Object.values(PASTAS)) mkdirSync(`${BASE}/${p}`, { recursive: true });

const jpg = (src, dst) => execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-q:v", "3", dst]);
const tipos = im.tipos || [];
const nome = (i) => `${String(i + 1).padStart(2, "0")}-${tipos[i] || "slide"}`;
const txt = (p, conteudo) => writeFileSync(p, String(conteudo || "").trim() + "\n");

// 1. Stories (9:16)
(im.stories || []).forEach((p, i) => existsSync("docs/" + p) && jpg("docs/" + p, `${BASE}/${PASTAS.stories}/${S}-story-${nome(i)}.jpg`));
// 2. Feed (4:5)
(im.slides || []).forEach((p, i) => existsSync("docs/" + p) && jpg("docs/" + p, `${BASE}/${PASTAS.feed}/${S}-feed-${nome(i)}.jpg`));
const hashtags = (ed.design?.hashtags || []).join(" ");
txt(`${BASE}/${PASTAS.feed}/legenda-instagram.txt`, [t.instagram, hashtags].filter(Boolean).join("\n\n"));
txt(`${BASE}/${PASTAS.feed}/texto-facebook.txt`, t.facebook || t.linkedin);
// 3. LinkedIn
if (im.pdf && existsSync("docs/" + im.pdf)) copyFileSync("docs/" + im.pdf, `${BASE}/${PASTAS.linkedin}/${S}-Direccoes-da-Semana.pdf`);
if (im.capa && existsSync("docs/" + im.capa)) jpg("docs/" + im.capa, `${BASE}/${PASTAS.linkedin}/${S}-capa-linkedin.jpg`);
txt(`${BASE}/${PASTAS.linkedin}/texto-linkedin.txt`, t.linkedin);
// 4. Textos
txt(`${BASE}/${PASTAS.textos}/whatsapp-canal.txt`, t.whatsapp);
txt(`${BASE}/${PASTAS.textos}/analise-completa.txt`, t.analise_completa);
// 5. Reel
if (im.reel && existsSync("docs/" + im.reel)) copyFileSync("docs/" + im.reel, `${BASE}/${PASTAS.reel}/${S}-reel.mp4`);

// 0. LEIA-ME
const lista = (a) => (a && a.length ? a.map((x) => `- ${x}`).join("\n") : "- (nada)");
txt(`${BASE}/0-LEIA-ME.txt`, `DIRECÇÕES DA SEMANA, ${S} de ${ano}
Versão ${ed.versao || "?"}, aprovada em ${(ed.aprovadaEm || "").slice(0, 10)}. Por S.A REDES.

O QUE ESTÁ EM CADA PASTA
${PASTAS.stories}
  Imagens 9:16 pela ordem. Publique nos Status do WhatsApp e nos stories do Instagram;
  com a partilha automática ligada na Central de Contas da Meta, seguem também para o Facebook.
${PASTAS.feed}
  Imagens 4:5 pela ordem, para o carrossel do Instagram e a publicação com várias imagens do Facebook.
  legenda-instagram.txt e texto-facebook.txt: copie e cole.
${PASTAS.linkedin}
  O PDF publica-se como documento (aparece como carrossel). A capa serve para publicação com imagem.
  texto-linkedin.txt: copie e cole.
${PASTAS.textos}
  whatsapp-canal.txt para o canal do WhatsApp. analise-completa.txt para arquivo ou newsletter.
${PASTAS.reel}
  Vídeo 9:16 para Reels do Instagram e do Facebook. Escolha a música na biblioteca da app.

NOMES DOS FICHEIROS
  ${S}-feed-03-noticia.jpg = semana ${sem}, formato feed, 3.ª imagem, slide de notícia.
  Tipos: capa, noticia, oportunidades, quem-ganha, direccao, sinal.

CONFIRMAR ANTES DE PUBLICAR
${lista(t.verificar)}

CRÉDITOS DAS FOTOGRAFIAS
${lista(im.creditos)}
`);

// ZIP único, guardado no site para descarregar de qualquer telemóvel
const ZIPDIR = "docs/data/kits"; mkdirSync(ZIPDIR, { recursive: true });
const zipNome = `Direccoes-${NOME}.zip`;
rmSync(`${ZIPDIR}/${zipNome}`, { force: true });
execSync(`cd publicar && zip -qr "../${ZIPDIR}/${zipNome}" "${NOME}"`, { shell: "/bin/bash" });
const KJ = `${ZIPDIR}/kits.json`;
const kits = existsSync(KJ) ? JSON.parse(readFileSync(KJ, "utf8")) : [];
const reg = { semana: ed.semana, versao: ed.versao, aprovada: ed.aprovadaEm, zip: `data/kits/${zipNome}`, mb: +(statSync(`${ZIPDIR}/${zipNome}`).size / 1e6).toFixed(1) };
writeFileSync(KJ, JSON.stringify([reg, ...kits.filter((k) => k.semana !== ed.semana)], null, 2));
ed.kit = reg.zip; writeFileSync(ED, JSON.stringify(ed, null, 2));
if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `pasta=${NOME}\n`, { flag: "a" });
execSync(`git add docs/data && (git diff --cached --quiet || git commit -qm "kit ${NOME}") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" });
console.log(`Kit ${zipNome} criado (${reg.mb} MB).`);
