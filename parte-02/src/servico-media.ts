import * as grpc from "@grpc/grpc-js";
import { HOST, PORTA_SERVICO_MEDIA } from "./config";
import { calcularMedia } from "./calculo";
import { ServicoMedia } from "./grpc";
import { Lote, Media } from "./tipos";
import { criarLog, formatarMedidas } from "./util";

const log = criarLog("Servico de Media");

// Na parte 02 o microsservico para calculo e um servidor gRPC. O formato
// das mensagens vem do proto/media.proto, entao nao e mais preciso
// conferir campo por campo como no socket.
function CalcularMedia(
  chamada: grpc.ServerUnaryCall<Lote, Media>,
  responder: grpc.sendUnaryData<Media>
): void {
  const { gateway, leituras } = chamada.request;

  if (leituras.length === 0) {
    responder({ code: grpc.status.INVALID_ARGUMENT, details: "lote sem leituras" });
    return;
  }

  const media = calcularMedia(gateway, leituras);
  log(
    `${gateway}: ${media.quantidade} leituras de ${media.talhoes.length} talhoes -> ` +
      formatarMedidas(media)
  );
  responder(null, media);
}

const servidor = new grpc.Server();
servidor.addService(ServicoMedia.service, { CalcularMedia });

servidor.bindAsync(
  `${HOST}:${PORTA_SERVICO_MEDIA}`,
  grpc.ServerCredentials.createInsecure(),
  (erro, porta) => {
    if (erro) {
      log(`nao foi possivel iniciar: ${erro.message}`);
      process.exit(1);
    }
    log(`servidor gRPC ouvindo na porta ${porta}`);
  }
);
