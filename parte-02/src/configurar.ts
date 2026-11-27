import * as fs from "node:fs";
import * as path from "node:path";

// Preenche a secao "maquinas" do rede.json com os IPs passados na linha
// de comando, na ordem m1, m2, m3... Assim ninguem edita o JSON a mao.
// Com 5 IPs, a m6 (FOG e Servico de Anomalias) fica no mesmo PC da m5.
// Nao usa o config.ts de proposito: funciona mesmo com o rede.json
// quebrado por uma edicao anterior.

const ARQUIVO = path.join(__dirname, "..", "rede.json");
const USO =
  "Use: npm run configurar -- <IP PC 1> <IP PC 2> <IP PC 3> <IP PC 4> <IP PC 5> [IP PC 6]";

const ips = process.argv.slice(2).map((ip) => ip.trim()).filter(Boolean);
const invalidos = ips.filter((ip) => !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip));

if (ips.length < 5 || ips.length > 6 || invalidos.length > 0) {
  console.error(USO);
  if (invalidos.length > 0) console.error(`IP invalido: ${invalidos.join(", ")}`);
  else console.error(`Foram informados ${ips.length} IPs; sao necessarios 5 ou 6.`);
  process.exit(1);
}

let rede: { maquinas: Record<string, string> };
try {
  rede = JSON.parse(fs.readFileSync(ARQUIVO, "utf8").replace(/^﻿/, ""));
} catch (erro) {
  console.error(`Nao consegui ler o ${ARQUIVO}: ${(erro as Error).message}`);
  console.error("Restaure o original com:  git checkout -- rede.json  e rode este comando de novo.");
  process.exit(1);
}

const [m1, m2, m3, m4, m5, m6 = m5] = ips as [string, string, string, string, string, string?];
rede.maquinas = { m1, m2, m3, m4, m5, m6 };
fs.writeFileSync(ARQUIVO, JSON.stringify(rede, null, 2) + "\n", "utf8");

console.log(`rede.json atualizado (${ips.length} PCs):`);
const papeis: Record<string, string> = {
  m1: "talhoes do G1",
  m2: "gateway G1",
  m3: "talhoes do G2",
  m4: "gateway G2",
  m5: "Servico de Media",
  m6: "FOG e Servico de Anomalias",
};
for (const [maquina, ip] of Object.entries(rede.maquinas)) {
  console.log(`  ${maquina}  ${ip.padEnd(16)} ${papeis[maquina] ?? ""}`);
}
