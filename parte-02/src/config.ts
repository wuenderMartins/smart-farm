// Topologia da fazenda, seguindo o diagrama: duas areas Edge, cada uma
// com um gateway que atende tres talhoes. Tudo roda na mesma maquina,
// entao cada componente e identificado pela sua porta.

export const HOST = "127.0.0.1";

export interface TalhaoInfo {
  id: string;
  porta: number;
}

export interface GatewayInfo {
  id: string;
  talhoes: TalhaoInfo[];
}

export const GATEWAYS: GatewayInfo[] = [
  {
    id: "G1",
    talhoes: [
      { id: "G1-T01", porta: 4101 },
      { id: "G1-T02", porta: 4102 },
      { id: "G1-T03", porta: 4103 },
    ],
  },
  {
    id: "G2",
    talhoes: [
      { id: "G2-T01", porta: 4201 },
      { id: "G2-T02", porta: 4202 },
      { id: "G2-T03", porta: 4203 },
    ],
  },
];

export const PORTA_SERVICO_MEDIA = 4000;

// De quanto em quanto tempo o gateway le os talhoes, e quanto tempo ele
// espera uma resposta antes de desistir.
export const INTERVALO_LEITURA_MS = 3000;
export const TIMEOUT_MS = 2000;

export function buscarGateway(id: string): GatewayInfo | undefined {
  return GATEWAYS.find((gateway) => gateway.id === id);
}

export function buscarTalhao(id: string): TalhaoInfo | undefined {
  return GATEWAYS.flatMap((gateway) => gateway.talhoes).find((talhao) => talhao.id === id);
}
