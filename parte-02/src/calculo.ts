import { Leitura, Media } from "./tipos";
import { arredondar } from "./util";

type Medida = "temperatura" | "umidade" | "irradiacaoSolar";

export function calcularMedia(gateway: string, leituras: Leitura[]): Media {
  const mediaDe = (medida: Medida) =>
    arredondar(leituras.reduce((soma, leitura) => soma + leitura[medida], 0) / leituras.length, 2);

  return {
    gateway,
    quantidade: leituras.length,
    temperatura: mediaDe("temperatura"),
    umidade: mediaDe("umidade"),
    irradiacaoSolar: mediaDe("irradiacaoSolar"),
  };
}
