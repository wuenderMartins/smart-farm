import { arredondar } from "./util";

function sortear(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function limitar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/**
 * Simula os tres sensores de um talhao: Temperatura, Umidade e IS
 * (irradiacao solar). Cada medida comeca em um valor sorteado e depois
 * muda um pouco a cada leitura, como aconteceria no campo: se a umidade
 * esta baixa agora, tende a continuar baixa nas proximas leituras.
 */
export class Sensores {
  private temperatura = sortear(18, 32);
  private umidade = sortear(35, 80);
  private irradiacaoSolar = sortear(200, 900);

  medir(): { temperatura: number; umidade: number; irradiacaoSolar: number } {
    this.temperatura = limitar(this.temperatura + sortear(-1, 1), 5, 45);
    this.umidade = limitar(this.umidade + sortear(-4, 4), 5, 100);
    this.irradiacaoSolar = limitar(this.irradiacaoSolar + sortear(-60, 60), 0, 1200);

    return {
      temperatura: arredondar(this.temperatura),
      umidade: arredondar(this.umidade),
      irradiacaoSolar: arredondar(this.irradiacaoSolar),
    };
  }
}
