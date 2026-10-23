import * as path from "node:path";
import * as grpc from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";

// O .proto e lido em tempo de execucao, sem gerar codigo, como no
// exemplo grpc-tads6. O proto-loader troca os nomes em snake_case por
// camelCase (irradiacao_solar vira irradiacaoSolar), e "defaults: true"
// faz campos vazios chegarem com o valor padrao (0, "" ou lista vazia).
const definicao = loadSync(path.join(__dirname, "..", "proto", "media.proto"), {
  defaults: true,
});
const fazenda = grpc.loadPackageDefinition(definicao).fazenda as grpc.GrpcObject;

export const ServicoMedia = fazenda.ServicoMedia as grpc.ServiceClientConstructor;
