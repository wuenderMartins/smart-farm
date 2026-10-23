import { ChildProcess, fork } from "node:child_process";
import * as path from "node:path";
import { GATEWAYS } from "./config";

// Sobe cada componente em um processo separado, como se cada um
// estivesse em uma maquina diferente da fazenda.
const processos: ChildProcess[] = [];

function subir(arquivo: string, ...args: string[]): void {
  processos.push(fork(path.join(__dirname, arquivo), args));
}

subir("servico-media.ts");
for (const gateway of GATEWAYS) {
  for (const talhao of gateway.talhoes) subir("talhao.ts", talhao.id);
  subir("gateway.ts", gateway.id);
}

// Ctrl+C encerra todos os processos juntos.
process.on("SIGINT", () => {
  for (const processo of processos) processo.kill();
  process.exit(0);
});
