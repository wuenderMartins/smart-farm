import * as net from "node:net";
import { HOST, PORTA_SERVICO_MEDIA } from "./config";
import { calcularMedia, leituraValida } from "./calculo";
import { aoReceber, enviar } from "./socket";
import { criarLog, formatarMedidas } from "./util";

const log = criarLog("Servico de Media");

// Microsservico para calculo: recebe as leituras de um gateway e devolve
// a media na mesma conexao. Nao guarda nada entre um pedido e outro.
const servidor = net.createServer((socket) => {
  aoReceber(socket, (mensagem) => {
    if (mensagem.tipo !== "CALCULAR_MEDIA") {
      enviar(socket, { tipo: "ERRO", motivo: `pedido desconhecido: ${mensagem.tipo}` });
      return;
    }

    const { gateway, leituras } = mensagem;
    if (!Array.isArray(leituras) || leituras.length === 0 || !leituras.every(leituraValida)) {
      enviar(socket, { tipo: "ERRO", motivo: "leituras ausentes ou invalidas" });
      return;
    }

    const media = calcularMedia(gateway, leituras);
    log(`${gateway}: media de ${media.quantidade} talhoes -> ${formatarMedidas(media)}`);
    enviar(socket, { tipo: "MEDIA", media });
  });

  socket.on("error", (erro) => log(`conexao perdida: ${erro.message}`));
});

servidor.listen(PORTA_SERVICO_MEDIA, HOST, () => log(`ouvindo na porta ${PORTA_SERVICO_MEDIA}`));
