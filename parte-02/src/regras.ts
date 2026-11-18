import { Alerta, MediaTalhao, Medidas } from "./tipos";

interface Regra {
  codigo: string;
  medida: keyof Medidas;
  comparacao: "abaixo de" | "acima de";
  limite: number;
  acao: string;
  acaoAoNormalizar: string;
}

// Gatilhos para anomalias. O primeiro e o exemplo do diagrama (umidade
// baixa -> ligar irrigacao); para criar outro basta acrescentar uma linha.
export const REGRAS: Regra[] = [
  {
    codigo: "UMIDADE_BAIXA",
    medida: "umidade",
    comparacao: "abaixo de",
    limite: 30,
    acao: "Ligar irrigacao",
    acaoAoNormalizar: "Desligar irrigacao",
  },
  {
    codigo: "UMIDADE_ALTA",
    medida: "umidade",
    comparacao: "acima de",
    limite: 85,
    acao: "Suspender irrigacao (risco de fungos)",
    acaoAoNormalizar: "Liberar irrigacao",
  },
  {
    codigo: "TEMPERATURA_ALTA",
    medida: "temperatura",
    comparacao: "acima de",
    limite: 35,
    acao: "Ligar nebulizacao",
    acaoAoNormalizar: "Desligar nebulizacao",
  },
  {
    codigo: "RISCO_DE_GEADA",
    medida: "temperatura",
    comparacao: "abaixo de",
    limite: 5,
    acao: "Avisar o produtor: risco de geada",
    acaoAoNormalizar: "Encerrar aviso de geada",
  },
  {
    codigo: "IS_ALTA",
    medida: "irradiacaoSolar",
    comparacao: "acima de",
    limite: 1000,
    acao: "Fechar tela de sombreamento",
    acaoAoNormalizar: "Abrir tela de sombreamento",
  },
];

const NOME: Record<keyof Medidas, string> = {
  temperatura: "temperatura",
  umidade: "umidade",
  irradiacaoSolar: "IS",
};

const UNIDADE: Record<keyof Medidas, string> = {
  temperatura: "°C",
  umidade: "%",
  irradiacaoSolar: " W/m²",
};

function violou(regra: Regra, valor: number): boolean {
  return regra.comparacao === "abaixo de" ? valor < regra.limite : valor > regra.limite;
}

/** Aplica todas as regras na media movel de cada talhao. */
export function avaliar(gateway: string, talhoes: MediaTalhao[]): Alerta[] {
  return talhoes.flatMap((talhao) =>
    REGRAS.filter((regra) => violou(regra, talhao[regra.medida])).map((regra) => {
      const unidade = UNIDADE[regra.medida];
      return {
        gateway,
        talhao: talhao.talhao,
        codigo: regra.codigo,
        descricao:
          `${NOME[regra.medida]} ${talhao[regra.medida]}${unidade} ` +
          `${regra.comparacao} ${regra.limite}${unidade}`,
        acao: regra.acao,
        acaoAoNormalizar: regra.acaoAoNormalizar,
      };
    })
  );
}
