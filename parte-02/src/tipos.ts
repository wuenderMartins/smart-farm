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

// Mensagens que circulam pelos sockets. Cada uma vai como uma linha de JSON.
export type Mensagem =
  | { tipo: "PEDIR_LEITURA" }
  | { tipo: "LEITURA"; leitura: Leitura }
  | { tipo: "CALCULAR_MEDIA"; gateway: string; leituras: Leitura[] }
  | { tipo: "MEDIA"; media: Media }
  | { tipo: "ERRO"; motivo: string };
