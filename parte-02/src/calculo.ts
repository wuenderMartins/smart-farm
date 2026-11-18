import { Leitura, Media, MediaTalhao, Medidas } from "./tipos";
import { arredondar } from "./util";

function mediaDasMedidas(leituras: Leitura[]): Medidas {
  const mediaDe = (medida: keyof Medidas) =>
    arredondar(leituras.reduce((soma, leitura) => soma + leitura[medida], 0) / leituras.length, 2);

  return {
    temperatura: mediaDe("temperatura"),
    umidade: mediaDe("umidade"),
    irradiacaoSolar: mediaDe("irradiacaoSolar"),
  };
}

/**
 * Calcula a media geral do lote e a media de cada talhao. Como o gateway
 * manda as ultimas leituras de cada talhao, a media de um talhao e uma
 * media movel: ela suaviza as oscilacoes de uma leitura para a outra.
 */
export function calcularMedia(gateway: string, leituras: Leitura[]): Media {
  const porTalhao = new Map<string, Leitura[]>();
  for (const leitura of leituras) {
    porTalhao.set(leitura.talhao, [...(porTalhao.get(leitura.talhao) ?? []), leitura]);
  }

  const talhoes: MediaTalhao[] = [...porTalhao].map(([talhao, doTalhao]) => ({
    talhao,
    leituras: doTalhao.length,
    ...mediaDasMedidas(doTalhao),
  }));

  return { gateway, quantidade: leituras.length, ...mediaDasMedidas(leituras), talhoes };
}
