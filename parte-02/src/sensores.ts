import { Medidas } from "./tipos";
import { arredondar } from "./util";

// Clima de referencia de cada cenario. Trocar o cenario com o talhao
// rodando e o jeito de provocar (ou acabar com) uma anomalia durante a
// demonstracao: seca dispara UMIDADE_BAIXA, chuva UMIDADE_ALTA, calor
// TEMPERATURA_ALTA e IS_ALTA, geada RISCO_DE_GEADA.
export const CENARIOS = {
  normal: { temperatura: 26, umidade: 55, irradiacaoSolar: 600 },
  seca: { temperatura: 30, umidade: 15, irradiacaoSolar: 700 },
  chuva: { temperatura: 20, umidade: 100, irradiacaoSolar: 150 },
  calor: { temperatura: 40, umidade: 45, irradiacaoSolar: 1250 },
  geada: { temperatura: -1, umidade: 70, irradiacaoSolar: 200 },
} satisfies Record<string, Medidas>;

export type Cenario = keyof typeof CENARIOS;

export function ehCenario(nome: string): nome is Cenario {
  return Object.hasOwn(CENARIOS, nome);
}

function sortear(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function limitar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/**
 * Simula os tres sensores de um talhao: Temperatura, Umidade e IS
 * (irradiacao solar). A cada leitura, cada medida anda um quarto do
 * caminho ate o clima do cenario e ganha um pouco de ruido, entao os
 * valores mudam aos poucos, como no campo. Cada talhao tem ainda um
 * desvio proprio, para dois talhoes no mesmo cenario nao ficarem iguais.
 */
export class Sensores {
  private cenario: Cenario;
  // O desvio e pequeno de proposito: em qualquer cenario a media fica
  // longe dos limites das regras, e o gatilho nao fica liga-desliga.
  private readonly desvio: Medidas = {
    temperatura: sortear(-2, 2),
    umidade: sortear(-5, 5),
    irradiacaoSolar: sortear(-60, 60),
  };
  private atual: Medidas;

  constructor(cenario: Cenario) {
    this.cenario = cenario;
    this.atual = this.alvo();
  }

  get cenarioAtual(): Cenario {
    return this.cenario;
  }

  mudarCenario(cenario: Cenario): void {
    this.cenario = cenario;
  }

  medir(): Medidas {
    const alvo = this.alvo();
    const andar = (atual: number, destino: number, ruido: number) =>
      atual + (destino - atual) * 0.25 + sortear(-ruido, ruido);

    this.atual = {
      temperatura: limitar(andar(this.atual.temperatura, alvo.temperatura, 1), -10, 50),
      umidade: limitar(andar(this.atual.umidade, alvo.umidade, 3), 0, 100),
      irradiacaoSolar: limitar(andar(this.atual.irradiacaoSolar, alvo.irradiacaoSolar, 60), 0, 1400),
    };

    return {
      temperatura: arredondar(this.atual.temperatura),
      umidade: arredondar(this.atual.umidade),
      irradiacaoSolar: arredondar(this.atual.irradiacaoSolar),
    };
  }

  private alvo(): Medidas {
    const clima = CENARIOS[this.cenario];
    return {
      temperatura: clima.temperatura + this.desvio.temperatura,
      umidade: clima.umidade + this.desvio.umidade,
      irradiacaoSolar: clima.irradiacaoSolar + this.desvio.irradiacaoSolar,
    };
  }
}
