import * as grpc from "@grpc/grpc-js";
import { SERVICO_ANOMALIAS, TIMEOUT_MS } from "./config";
import { ServicoAnomalias, descreverErro } from "./grpc";
import { Diagnostico, PedidoAnalise } from "./tipos";

// Mesmo esquema do cliente-media.ts: o tipo descreve o rpc que o
// proto-loader cria em tempo de execucao.
type ClienteAnomalias = grpc.Client & {
  Analisar(
    pedido: PedidoAnalise,
    opcoes: grpc.CallOptions,
    retorno: (erro: grpc.ServiceError | null, diagnostico?: Diagnostico) => void
  ): grpc.ClientUnaryCall;
};

const endereco = `${SERVICO_ANOMALIAS.host}:${SERVICO_ANOMALIAS.porta}`;
const cliente = new ServicoAnomalias(
  endereco,
  grpc.credentials.createInsecure()
) as unknown as ClienteAnomalias;

/** Chama o rpc Analisar, com o mesmo deadline usado no servico de media. */
export function analisar(pedido: PedidoAnalise): Promise<Diagnostico> {
  return new Promise((resolve, reject) => {
    const opcoes = { deadline: Date.now() + TIMEOUT_MS };

    cliente.Analisar(pedido, opcoes, (erro, diagnostico) => {
      if (erro) reject(new Error(descreverErro(erro, endereco)));
      else resolve(diagnostico!);
    });
  });
}
