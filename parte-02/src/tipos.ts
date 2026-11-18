// As tres medidas de um talhao: uma por sensor.
export interface Medidas {
  temperatura: number; // °C
  umidade: number; // % de umidade relativa
  irradiacaoSolar: number; // IS, em W/m²
}

// Leitura dos tres sensores de um talhao em um instante.
export interface Leitura extends Medidas {
  talhao: string;
  horario: string; // ISO 8601
}

// Pedido do rpc CalcularMedia (proto/media.proto).
export interface Lote {
  gateway: string;
  leituras: Leitura[];
}

// Media das ultimas leituras de um talhao (media movel).
export interface MediaTalhao extends Medidas {
  talhao: string;
  leituras: number;
}

// Resposta do rpc CalcularMedia: a media geral do gateway e a de cada talhao.
export interface Media extends Medidas {
  gateway: string;
  quantidade: number;
  talhoes: MediaTalhao[];
}

// Mensagens que circulam pelos sockets. Cada uma vai como uma linha de JSON.
// A conversa com o servico de media saiu daqui: agora ela e feita via gRPC.
export type Mensagem =
  | { tipo: "PEDIR_LEITURA" }
  | { tipo: "LEITURA"; leitura: Leitura }
  | { tipo: "ERRO"; motivo: string };
