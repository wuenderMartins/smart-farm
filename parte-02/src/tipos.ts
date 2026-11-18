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

// O que o gateway entrega para a FOG quando ela pede: o ultimo resultado
// do servico de media e quais talhoes nao responderam.
export interface Situacao {
  gateway: string;
  atualizadaEm: string; // ISO 8601
  media: Media;
  semResposta: string[];
}

// Pedido do rpc Analisar (proto/anomalias.proto).
export interface PedidoAnalise {
  gateway: string;
  talhoes: MediaTalhao[];
}

// Uma anomalia encontrada em um talhao, com o gatilho a disparar quando
// ela aparece (acao) e quando ela some (acaoAoNormalizar).
export interface Alerta {
  gateway: string;
  talhao: string;
  codigo: string;
  descricao: string;
  acao: string;
  acaoAoNormalizar: string;
}

// Resposta do rpc Analisar.
export interface Diagnostico {
  alertas: Alerta[];
}

// Mensagens que circulam pelos sockets. Cada uma vai como uma linha de JSON.
// A conversa com os microsservicos nao passa por aqui: ela e feita via gRPC.
export type Mensagem =
  | { tipo: "PEDIR_LEITURA" }
  | { tipo: "LEITURA"; leitura: Leitura }
  | { tipo: "PEDIR_SITUACAO" }
  | { tipo: "SITUACAO"; situacao: Situacao | null }
  | { tipo: "ERRO"; motivo: string };
