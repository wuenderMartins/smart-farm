// Topologia da fazenda, seguindo o diagrama: duas areas Edge, cada uma
// com um gateway que atende tres talhoes. Tudo roda na mesma maquina,
// entao cada componente e identificado pela sua porta.

export const HOST = "127.0.0.1";

export interface TalhaoInfo {
  id: string;
  porta: number;
}

// A porta do gateway e a do lado servidor dele, onde a FOG conecta.
export interface GatewayInfo {
  id: string;
  porta: number;
  talhoes: TalhaoInfo[];
}

export const GATEWAYS: GatewayInfo[] = [
  {
    id: "G1",
    porta: 4501,
    talhoes: [
      { id: "G1-T01", porta: 4101 },
      { id: "G1-T02", porta: 4102 },
      { id: "G1-T03", porta: 4103 },
    ],
  },
  {
    id: "G2",
    porta: 4502,
    talhoes: [
      { id: "G2-T01", porta: 4201 },
      { id: "G2-T02", porta: 4202 },
      { id: "G2-T03", porta: 4203 },
    ],
  },
];

// Servidor gRPC do microsservico para calculo. Fica abaixo de 49152 de
// proposito: o Windows reserva faixas acima disso (Hyper-V, WSL, Docker),
// e nelas nenhum programa consegue abrir porta (erro EACCES).
export const PORTA_SERVICO_MEDIA = 4300;

// Servidor gRPC do microsservico de analise de anomalias, usado pela FOG.
export const PORTA_SERVICO_ANOMALIAS = 4400;

// De quanto em quanto tempo o gateway le os talhoes e a FOG consulta os
// gateways, e quanto tempo cada um espera uma resposta antes de desistir.
export const INTERVALO_LEITURA_MS = 3000;
export const INTERVALO_FOG_MS = 5000;
export const TIMEOUT_MS = 2000;

// Quantas leituras de cada talhao entram na media movel.
export const TAMANHO_JANELA = 5;

export function buscarGateway(id: string): GatewayInfo | undefined {
  return GATEWAYS.find((gateway) => gateway.id === id);
}

export function buscarTalhao(id: string): TalhaoInfo | undefined {
  return GATEWAYS.flatMap((gateway) => gateway.talhoes).find((talhao) => talhao.id === id);
}
