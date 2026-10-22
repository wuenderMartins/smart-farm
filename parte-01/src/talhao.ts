import * as net from "node:net";
import { GATEWAYS, HOST, buscarTalhao } from "./config";
import { Sensores } from "./sensores";
import { aoReceber, enviar } from "./socket";
import { Leitura } from "./tipos";
import { criarLog, formatarMedidas } from "./util";

const talhao = buscarTalhao(process.argv[2] ?? "");

if (!talhao) {
  const ids = GATEWAYS.flatMap((gateway) => gateway.talhoes.map((t) => t.id));
  console.error(`Informe o talhao. Opcoes: ${ids.join(", ")}`);
  process.exit(1);
}

const log = criarLog(talhao.id);
const sensores = new Sensores();

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
    log(formatarMedidas(leitura));
    enviar(socket, { tipo: "LEITURA", leitura });
  });

  // Se o gateway cair no meio da conversa, so essa conexao e perdida.
  socket.on("error", (erro) => log(`conexao perdida: ${erro.message}`));
});

servidor.listen(talhao.porta, HOST, () => log(`ouvindo na porta ${talhao.porta}`));
