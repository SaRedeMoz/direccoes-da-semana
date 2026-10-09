// Gera o Reel (vídeo vertical 9:16) da edição aprovada, a partir das imagens em formato story.
// Sem custo: usa o ffmpeg do GitHub Actions. Sem música: junte-a na app do Instagram,
// que tem uma biblioteca de músicas com licença (e o Instagram mostra mais os Reels com áudio da app).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";

const ED = "docs/data/edicao.json";
if (!existsSync(ED)) { console.log("Sem edição."); process.exit(0); }
const ed = JSON.parse(readFileSync(ED, "utf8"));
if (process.argv.includes("--se-aprovada") && !ed.aprovada) { console.log("Edição não aprovada: sem Reel."); process.exit(0); }
const stories = (ed.imagens?.stories || []).map((p) => "docs/" + p).filter((p) => existsSync(p));
if (stories.length < 2) { console.log("Sem imagens story suficientes para o vídeo."); process.exit(0); }

// Tempo de leitura: capa curta, notícias médias, análise mais longa (tem mais texto).
const nNoticias = Math.max(0, (ed.design?.slides?.length || 1) - 1);
const dur = stories.map((_, i) => (i === 0 ? 3.5 : i <= nNoticias ? 4.5 : 5.5));
const FPS = 30, T = 0.6; // transição suave entre slides

const args = ["-y"];
stories.forEach((p) => args.push("-i", p));
let filtro = "";
stories.forEach((_, i) => {
  const frames = Math.round(dur[i] * FPS);
  // aproximação lenta (efeito Ken Burns muito subtil), centrada
  filtro += `[${i}:v]scale=1188:2112,zoompan=z='min(1+0.00035*on,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS},format=yuv420p,setsar=1[v${i}];`;
});
let anterior = "v0", t = dur[0];
for (let i = 1; i < stories.length; i++) {
  const saida = i === stories.length - 1 ? "out" : `x${i}`;
  filtro += `[${anterior}][v${i}]xfade=transition=fade:duration=${T}:offset=${(t - T).toFixed(2)}[${saida}];`;
  anterior = saida; t += dur[i] - T;
}
filtro = filtro.replace(/;$/, "");
const saidaMp4 = "docs/data/imagens/reel.mp4";
args.push("-filter_complex", filtro, "-map", stories.length > 1 ? "[out]" : "[v0]",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(FPS), saidaMp4);
execFileSync("ffmpeg", args, { stdio: "inherit" });

ed.imagens.reel = "data/imagens/reel.mp4";
ed.imagens.reel_duracao = Math.round(t);
writeFileSync(ED, JSON.stringify(ed, null, 2));
execSync(`git add docs/data && (git diff --cached --quiet || git commit -qm "reel v${ed.versao}") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" });
console.log(`Reel criado: ${stories.length} slides, cerca de ${Math.round(t)} segundos.`);
