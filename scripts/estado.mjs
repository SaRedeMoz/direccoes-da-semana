// Uso: node scripts/estado.mjs <agente> "<estado>" "<mensagem>"
// agente: fontes | analise | design | editor ; estado: a trabalhar | pronto | erro
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
const [, , ag, est, msg] = process.argv;
const P = "docs/data/status.json";
let s; try { s = existsSync(P) ? JSON.parse(readFileSync(P, "utf8")) : null; } catch { s = null; }
if (!s || typeof s !== "object") s = { estagios: {}, log: [] };
s.estagios = s.estagios || {};
const em = new Date().toISOString();
s.actualizado = em;
s.estagios[ag] = { estado: est, msg, em };
s.log = [{ em, agente: ag, msg }, ...(s.log || [])].slice(0, 40);
writeFileSync(P, JSON.stringify(s, null, 2));
try {
  execSync(`git add docs/data && (git diff --cached --quiet || git commit -qm "${ag}: ${est}") && git pull -q --rebase --autostash origin main; git push -q origin HEAD:main`, { stdio: "inherit", shell: "/bin/bash" });
} catch (e) { console.warn(e.message); }
