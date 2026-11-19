import * as grpc from "@grpc/grpc-js";
import { SERVICO_MEDIA, TIMEOUT_MS } from "./config";
import { OPCOES_CANAL, ServicoMedia, descreverErro } from "./grpc";
import { Lote, Media } from "./tipos";

// Os metodos do cliente sao criados a partir do .proto em tempo de
// execucao, entao o TypeScript nao os conhece. Este tipo descreve o rpc.
type ClienteMedia = grpc.Client & {
  CalcularMedia(
    lote: Lote,
    opcoes: grpc.CallOptions,
    retorno: (erro: grpc.ServiceError | null, media?: Media) => void
  ): grpc.ClientUnaryCall;
};

// Diferente do socket da parte 01, o cliente gRPC mantem uma conexao
// aberta e a reaproveita em todas as chamadas, por isso e criado uma vez.
const endereco = `${SERVICO_MEDIA.host}:${SERVICO_MEDIA.porta}`;
const cliente = new ServicoMedia(
  endereco,
  grpc.credentials.createInsecure(),
  OPCOES_CANAL
) as unknown as ClienteMedia;

/**
 * Chama o rpc CalcularMedia. O deadline faz o papel do timeout: se o
 * servico nao responder a tempo, a chamada falha em vez de ficar parada.
 */
export function pedirMedia(lote: Lote): Promise<Media> {
  return new Promise((resolve, reject) => {
    const opcoes = { deadline: Date.now() + TIMEOUT_MS };

    cliente.CalcularMedia(lote, opcoes, (erro, media) => {
      if (erro) reject(new Error(descreverErro(erro, endereco)));
      else resolve(media!);
    });
  });
}
