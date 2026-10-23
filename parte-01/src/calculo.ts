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

// Pelo socket chega JSON de qualquer formato, entao cada leitura e
// conferida antes de entrar na conta.
export function leituraValida(valor: unknown): valor is Leitura {
  const leitura = valor as Leitura;
  return (
    typeof leitura === "object" &&
    leitura !== null &&
    typeof leitura.talhao === "string" &&
    [leitura.temperatura, leitura.umidade, leitura.irradiacaoSolar].every(Number.isFinite)
  );
}
