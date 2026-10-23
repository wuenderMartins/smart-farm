// Leitura dos tres sensores de um talhao em um instante.
export interface Leitura {
  talhao: string;
  temperatura: number; // °C
  umidade: number; // % de umidade relativa
  irradiacaoSolar: number; // IS, em W/m²
  horario: string; // ISO 8601
}

// Media das leituras de um gateway, devolvida pelo servico de media.
export interface Media {
  gateway: string;
  quantidade: number;
  temperatura: number;
  umidade: number;
  irradiacaoSolar: number;
}

// Pedido do rpc CalcularMedia (proto/media.proto).
export interface Lote {
  gateway: string;
  leituras: Leitura[];
}

// Mensagens que circulam pelos sockets. Cada uma vai como uma linha de JSON.
// A conversa com o servico de media saiu daqui: agora ela e feita via gRPC.
export type Mensagem =
  | { tipo: "PEDIR_LEITURA" }
  | { tipo: "LEITURA"; leitura: Leitura }
  | { tipo: "ERRO"; motivo: string };
