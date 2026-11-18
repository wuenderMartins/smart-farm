import * as grpc from "@grpc/grpc-js";
import { HOST, PORTA_SERVICO_ANOMALIAS } from "./config";
import { ServicoAnomalias } from "./grpc";
import { avaliar } from "./regras";
import { Diagnostico, PedidoAnalise } from "./tipos";
import { criarLog } from "./util";

const log = criarLog("Servico de Anomalias");

// Microsservico de Analise de Anomalias: recebe a media movel de cada
// talhao de um gateway, aplica as regras e devolve os alertas. Ele nao
// guarda nada entre um pedido e outro; quem lembra quais alertas ja
// estavam ativos e a FOG.
function Analisar(
  chamada: grpc.ServerUnaryCall<PedidoAnalise, Diagnostico>,
  responder: grpc.sendUnaryData<Diagnostico>
): void {
  const { gateway, talhoes } = chamada.request;
  const alertas = avaliar(gateway, talhoes);

  const resumo = alertas.map((alerta) => `${alerta.talhao} ${alerta.codigo}`).join(", ");
  log(`${gateway}: ${talhoes.length} talhoes analisados, alertas: ${resumo || "nenhum"}`);
  responder(null, { alertas });
}

const servidor = new grpc.Server();
servidor.addService(ServicoAnomalias.service, { Analisar });

servidor.bindAsync(
  `${HOST}:${PORTA_SERVICO_ANOMALIAS}`,
  grpc.ServerCredentials.createInsecure(),
  (erro, porta) => {
    if (erro) {
      log(`nao foi possivel iniciar: ${erro.message}`);
      process.exit(1);
    }
    log(`servidor gRPC ouvindo na porta ${porta}`);
  }
);
