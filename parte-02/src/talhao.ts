import * as net from "node:net";
import * as readline from "node:readline";
import { TALHOES, buscarTalhao, escutarEm } from "./config";
import { CENARIOS, Sensores, ehCenario } from "./sensores";
import { aoReceber, enviar } from "./socket";
import { Leitura } from "./tipos";
import { criarLog, formatarMedidas } from "./util";

const NOMES_CENARIOS = Object.keys(CENARIOS).join(", ");

const talhao = buscarTalhao(process.argv[2] ?? "");

if (!talhao) {
  console.error(`Informe o talhao. Opcoes: ${TALHOES.map((t) => t.id).join(", ")}`);
  process.exit(1);
}

const cenarioInicial = process.argv[3] ?? "normal";

if (!ehCenario(cenarioInicial)) {
  console.error(`Cenario "${cenarioInicial}" nao existe. Opcoes: ${NOMES_CENARIOS}`);
  process.exit(1);
}

const log = criarLog(talhao.id);
const sensores = new Sensores(cenarioInicial);

function mudarCenario(nome: string): void {
  if (!ehCenario(nome)) {
    log(`cenario "${nome}" nao existe. Opcoes: ${NOMES_CENARIOS}`);
    return;
  }
  sensores.mudarCenario(nome);
  log(`cenario agora e "${nome}"`);
}

// O cenario pode mudar com o talhao rodando. Num terminal proprio, basta
// digitar o nome dele; iniciado pelo iniciar.ts, o nome chega pelo canal
// de comunicacao entre os processos.
if (process.stdin.isTTY) {
  readline.createInterface({ input: process.stdin }).on("line", (linha) => {
    if (linha.trim()) mudarCenario(linha.trim());
  });
}
process.on("message", (nome) => mudarCenario(String(nome)));

// O talhao e o servidor (S) da conexao: fica ouvindo e so mede quando o
// gateway (C) pede uma leitura.
const servidor = net.createServer((socket) => {
  aoReceber(socket, (mensagem) => {
    if (mensagem.tipo !== "PEDIR_LEITURA") {
      enviar(socket, { tipo: "ERRO", motivo: `pedido desconhecido: ${mensagem.tipo}` });
      return;
    }

    const leitura: Leitura = {
      talhao: talhao.id,
      horario: new Date().toISOString(),
      ...sensores.medir(),
    };
    log(`${formatarMedidas(leitura)} [${sensores.cenarioAtual}]`);
    enviar(socket, { tipo: "LEITURA", leitura });
  });

  // Se o gateway cair no meio da conversa, so essa conexao e perdida.
  socket.on("error", (erro) => log(`conexao perdida: ${erro.message}`));
});

servidor.on("error", (erro) => {
  log(`nao foi possivel abrir a porta ${talhao.porta}: ${erro.message}`);
  process.exit(1);
});

servidor.listen(talhao.porta, escutarEm(talhao.maquina), () =>
  log(`ouvindo na porta ${talhao.porta}, cenario "${sensores.cenarioAtual}"`)
);
