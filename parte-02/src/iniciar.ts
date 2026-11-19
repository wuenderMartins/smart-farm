import { ChildProcess, fork } from "node:child_process";
import * as path from "node:path";
import * as readline from "node:readline";
import { FOG, GATEWAYS, MAQUINAS, SERVICO_ANOMALIAS, SERVICO_MEDIA, TALHOES } from "./config";
import { CENARIOS } from "./sensores";
import { ipsDestaMaquina } from "./util";

interface Componente {
  nome: string;
  arquivo: string;
  args: string[];
  maquina: string;
}

// Todos os componentes do rede.json, na ordem em que convem subir:
// servicos, talhoes, gateways e por ultimo a FOG.
const COMPONENTES: Componente[] = [
  { nome: "Servico de Media", arquivo: "servico-media.ts", args: [], maquina: SERVICO_MEDIA.maquina },
  {
    nome: "Servico de Anomalias",
    arquivo: "servico-anomalias.ts",
    args: [],
    maquina: SERVICO_ANOMALIAS.maquina,
  },
  ...TALHOES.map((t) => ({ nome: t.id, arquivo: "talhao.ts", args: [t.id], maquina: t.maquina })),
  ...GATEWAYS.map((g) => ({ nome: g.id, arquivo: "gateway.ts", args: [g.id], maquina: g.maquina })),
  { nome: "FOG", arquivo: "fog.ts", args: [], maquina: FOG.maquina },
];

// npm start          -> sobe tudo neste computador (para testar sozinho)
// npm start -- m3    -> sobe so o que o rede.json coloca na maquina m3
const maquina = process.argv[2];

if (maquina && !MAQUINAS[maquina]) {
  console.error(`Maquina "${maquina}" nao existe no rede.json. Opcoes: ${Object.keys(MAQUINAS).join(", ")}`);
  process.exit(1);
}

const escolhidos = COMPONENTES.filter((componente) => !maquina || componente.maquina === maquina);

if (escolhidos.length === 0) {
  console.error(`Nenhum componente esta na maquina ${maquina} no rede.json.`);
  process.exit(1);
}

// Pega o erro mais comum no laboratorio: subir a maquina errada, ou o IP
// do rede.json estar desatualizado.
if (maquina) {
  const ip = MAQUINAS[maquina];
  const ips = ipsDestaMaquina();
  if (!ip.startsWith("127.") && !ips.includes(ip)) {
    console.warn(
      `ATENCAO: no rede.json a ${maquina} e ${ip}, mas os IPs deste computador sao ${ips.join(", ")}.`
    );
  }
}

const processos = new Map<string, ChildProcess>();

for (const componente of escolhidos) {
  // O teclado fica com este processo (stdin "ignore" nos filhos). O canal
  // "ipc" leva o cenario digitado ate o talhao certo.
  const processo = fork(path.join(__dirname, componente.arquivo), componente.args, {
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  processos.set(componente.nome, processo);
}

const talhoesAqui = escolhidos
  .filter((componente) => componente.arquivo === "talhao.ts")
  .map((componente) => componente.nome);

console.log(`Subindo ${maquina ? `a maquina ${maquina}` : "tudo"}: ${escolhidos.map((c) => c.nome).join(", ")}`);
if (talhoesAqui.length > 0) {
  console.log(`Para mudar o clima de um talhao, digite o talhao e o cenario. Ex.: ${talhoesAqui[0]} seca`);
  console.log(`Cenarios: ${Object.keys(CENARIOS).join(", ")}`);
}
console.log();

readline.createInterface({ input: process.stdin }).on("line", (linha) => {
  if (!linha.trim()) return;

  const [talhao = "", cenario] = linha.trim().split(/\s+/);
  const processo = processos.get(talhao);

  if (!cenario || !talhoesAqui.includes(talhao) || !processo?.connected) {
    console.log(`Use: <talhao> <cenario>. Talhoes nesta maquina: ${talhoesAqui.join(", ") || "nenhum"}`);
    return;
  }
  processo.send(cenario);
});

// Ctrl+C encerra todos os processos juntos.
process.on("SIGINT", () => {
  for (const processo of processos.values()) processo.kill();
  process.exit(0);
});
