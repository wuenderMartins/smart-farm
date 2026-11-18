import { ChildProcess, fork } from "node:child_process";
import * as path from "node:path";
import * as readline from "node:readline";
import { GATEWAYS } from "./config";
import { CENARIOS } from "./sensores";

// Sobe cada componente em um processo separado, como se cada um
// estivesse em uma maquina diferente da fazenda.
const processos = new Map<string, ChildProcess>();

function subir(nome: string, arquivo: string, ...args: string[]): void {
  // O teclado fica com este processo (stdin "ignore" nos filhos). O canal
  // "ipc" leva o cenario digitado ate o talhao certo.
  const processo = fork(path.join(__dirname, arquivo), args, {
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  processos.set(nome, processo);
}

subir("Servico de Media", "servico-media.ts");
subir("Servico de Anomalias", "servico-anomalias.ts");
for (const gateway of GATEWAYS) {
  for (const talhao of gateway.talhoes) subir(talhao.id, "talhao.ts", talhao.id);
  subir(gateway.id, "gateway.ts", gateway.id);
}
subir("FOG", "fog.ts");

const talhoes = new Set(GATEWAYS.flatMap((gateway) => gateway.talhoes.map((t) => t.id)));

console.log("Para mudar o clima de um talhao, digite o talhao e o cenario. Ex.: G1-T01 seca");
console.log(`Cenarios: ${Object.keys(CENARIOS).join(", ")}\n`);

readline.createInterface({ input: process.stdin }).on("line", (linha) => {
  const [talhao, cenario] = linha.trim().split(/\s+/);
  const processo = processos.get(talhao ?? "");

  if (!talhao || !cenario || !talhoes.has(talhao) || !processo?.connected) {
    if (linha.trim()) console.log("Use: <talhao> <cenario>. Ex.: G1-T01 seca");
    return;
  }
  processo.send(cenario);
});

// Ctrl+C encerra todos os processos juntos.
process.on("SIGINT", () => {
  for (const processo of processos.values()) processo.kill();
  process.exit(0);
});
