import * as path from "node:path";
import * as grpc from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";

// O .proto e lido em tempo de execucao, sem gerar codigo, como no
// exemplo grpc-tads6. O proto-loader troca os nomes em snake_case por
// camelCase (irradiacao_solar vira irradiacaoSolar), e "defaults: true"
// faz campos vazios chegarem com o valor padrao (0, "" ou lista vazia).
function carregar(arquivo: string): grpc.GrpcObject {
  const definicao = loadSync(path.join(__dirname, "..", "proto", arquivo), {
    defaults: true,
  });
  return grpc.loadPackageDefinition(definicao).fazenda as grpc.GrpcObject;
}

// Se o servico cair, ou subir depois do cliente, o gRPC reconecta
// sozinho, esperando cada vez mais entre as tentativas. O padrao chega a
// 2 minutos de espera; aqui o maximo e 5 s, para a fazenda voltar rapido.
export const OPCOES_CANAL: grpc.ChannelOptions = {
  "grpc.initial_reconnect_backoff_ms": 1000,
  "grpc.max_reconnect_backoff_ms": 5000,
};

/** Traduz os erros mais comuns do gRPC para uma frase curta no log. */
export function descreverErro(erro: grpc.ServiceError, endereco: string): string {
  if (erro.code === grpc.status.UNAVAILABLE) return `fora do ar (${endereco})`;
  if (erro.code === grpc.status.DEADLINE_EXCEEDED) return `nao respondeu a tempo (${endereco})`;
  return erro.details || erro.message;
}

export const ServicoMedia = carregar("media.proto").ServicoMedia as grpc.ServiceClientConstructor;

export const ServicoAnomalias = carregar("anomalias.proto")
  .ServicoAnomalias as grpc.ServiceClientConstructor;
