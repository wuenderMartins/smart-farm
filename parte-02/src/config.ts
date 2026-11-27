import * as fs from "node:fs";
import * as path from "node:path";

// Onde cada componente roda vem do rede.json, na pasta parte-02. Para
// espalhar a fazenda por varias maquinas so esse arquivo muda: o codigo
// e o mesmo em todas elas.

export interface Endereco {
  host: string;
  porta: number;
}

export interface TalhaoInfo extends Endereco {
  id: string;
  maquina: string;
}

// A porta do gateway e a do lado servidor dele, onde a FOG conecta.
export interface GatewayInfo extends Endereco {
  id: string;
  maquina: string;
  talhoes: TalhaoInfo[];
}

export interface ServicoInfo extends Endereco {
  maquina: string;
}

interface RedeJson {
  maquinas: Record<string, string>;
  talhoes: Record<string, { maquina: string; porta: number }>;
  gateways: Record<string, { maquina: string; porta: number; talhoes: string[] }>;
  servicoMedia: { maquina: string; porta: number };
  servicoAnomalias: { maquina: string; porta: number };
  fog: { maquina: string };
}

export const ARQUIVO_REDE = path.join(__dirname, "..", "rede.json");

function erroNaRede(motivo: string): never {
  console.error(`Problema no ${ARQUIVO_REDE}: ${motivo}`);
  process.exit(1);
}

function lerRede(): RedeJson {
  const texto = fs.readFileSync(ARQUIVO_REDE, "utf8");
  let rede: RedeJson;
  try {
    rede = JSON.parse(texto);
  } catch (erro) {
    // Mostra a linha apontada pelo erro, que quase sempre e uma aspa ou
    // virgula faltando por causa de edicao a mao.
    const mensagem = (erro as Error).message;
    const linha = Number(/line (\d+)/.exec(mensagem)?.[1]);
    const trecho = linha ? `\n  linha ${linha}: ${texto.split(/\r?\n/)[linha - 1] ?? ""}` : "";
    return erroNaRede(`${mensagem}${trecho}\n  Confira as aspas e as virgulas perto dessa linha.`);
  }

  for (const secao of ["maquinas", "talhoes", "gateways", "servicoMedia", "servicoAnomalias", "fog"]) {
    if (!(secao in rede)) erroNaRede(`falta a secao "${secao}"`);
  }
  return rede;
}

const rede = lerRede();

// Nome da maquina -> IP dela. Ex.: "m1" -> "192.168.0.11". Espacos
// sobrando dentro das aspas sao ignorados; IP mal escrito para tudo com
// uma mensagem clara, em vez de falhar depois na conexao.
export const MAQUINAS: Record<string, string> = Object.fromEntries(
  Object.entries(rede.maquinas).map(([maquina, valor]) => {
    const ip = String(valor).trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
      erroNaRede(`o IP da maquina ${maquina} ("${valor}") nao e valido. Use algo como 172.23.133.150`);
    }
    return [maquina, ip];
  })
);

function ipDa(maquina: string, componente: string): string {
  return (
    MAQUINAS[maquina] ??
    erroNaRede(`${componente} esta na maquina "${maquina}", que nao aparece em "maquinas"`)
  );
}

export const TALHOES: TalhaoInfo[] = Object.entries(rede.talhoes).map(([id, talhao]) => ({
  id,
  maquina: talhao.maquina,
  host: ipDa(talhao.maquina, id),
  porta: talhao.porta,
}));

export const GATEWAYS: GatewayInfo[] = Object.entries(rede.gateways).map(([id, gateway]) => ({
  id,
  maquina: gateway.maquina,
  host: ipDa(gateway.maquina, id),
  porta: gateway.porta,
  talhoes: gateway.talhoes.map(
    (idTalhao) =>
      buscarTalhao(idTalhao) ??
      erroNaRede(`o gateway ${id} usa o talhao ${idTalhao}, que nao aparece em "talhoes"`)
  ),
}));

export const SERVICO_MEDIA: ServicoInfo = {
  ...rede.servicoMedia,
  host: ipDa(rede.servicoMedia.maquina, "servicoMedia"),
};

export const SERVICO_ANOMALIAS: ServicoInfo = {
  ...rede.servicoAnomalias,
  host: ipDa(rede.servicoAnomalias.maquina, "servicoAnomalias"),
};

// A FOG so faz pedidos, entao nao tem porta.
export const FOG = { maquina: rede.fog.maquina, host: ipDa(rede.fog.maquina, "fog") };

/**
 * Endereco em que um servidor escuta. Com IP de loopback (127.x, teste
 * em um computador so) ele escuta so nesse IP e nem aparece na rede. Com
 * IP de verdade, escuta em todas as placas de rede (0.0.0.0) para que as
 * outras maquinas consigam conectar.
 */
export function escutarEm(maquina: string): string {
  const ip = ipDa(maquina, "servidor");
  return ip.startsWith("127.") ? ip : "0.0.0.0";
}

// De quanto em quanto tempo o gateway le os talhoes e a FOG consulta os
// gateways, e quanto tempo cada um espera uma resposta antes de desistir.
export const INTERVALO_LEITURA_MS = 3000;
export const INTERVALO_FOG_MS = 5000;
export const TIMEOUT_MS = 2000;

// Quantas leituras de cada talhao entram na media movel.
export const TAMANHO_JANELA = 5;

export function buscarGateway(id: string): GatewayInfo | undefined {
  return GATEWAYS.find((gateway) => gateway.id === id);
}

export function buscarTalhao(id: string): TalhaoInfo | undefined {
  return TALHOES.find((talhao) => talhao.id === id);
}
