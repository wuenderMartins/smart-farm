import {
  GATEWAYS,
  GatewayInfo,
  INTERVALO_LEITURA_MS,
  PORTA_SERVICO_MEDIA,
  TalhaoInfo,
  buscarGateway,
} from "./config";
import { pedir } from "./socket";
import { Leitura, Media } from "./tipos";
import { criarLog, esperar, formatarMedidas } from "./util";

function gatewayInformado(): GatewayInfo {
  const gateway = buscarGateway(process.argv[2] ?? "");
  if (!gateway) {
    console.error(`Informe o gateway. Opcoes: ${GATEWAYS.map((g) => g.id).join(", ")}`);
    process.exit(1);
  }
  return gateway;
}

const gateway = gatewayInformado();
const log = criarLog(gateway.id);

// Pede uma leitura ao talhao. Se ele nao responder, devolve null e o
// gateway segue com os outros: um talhao fora do ar nao para a fazenda.
async function lerTalhao(talhao: TalhaoInfo): Promise<Leitura | null> {
  try {
    const resposta = await pedir(talhao.porta, { tipo: "PEDIR_LEITURA" });
    if (resposta.tipo === "LEITURA") return resposta.leitura;
    log(`${talhao.id} respondeu ${resposta.tipo}`);
  } catch (erro) {
    log(`${talhao.id} nao respondeu: ${(erro as Error).message}`);
  }
  return null;
}

async function pedirMedia(leituras: Leitura[]): Promise<Media> {
  const resposta = await pedir(PORTA_SERVICO_MEDIA, {
    tipo: "CALCULAR_MEDIA",
    gateway: gateway.id,
    leituras,
  });
  if (resposta.tipo === "MEDIA") return resposta.media;
  throw new Error(resposta.tipo === "ERRO" ? resposta.motivo : `resposta inesperada: ${resposta.tipo}`);
}

async function ciclo(): Promise<void> {
  const respostas = await Promise.all(gateway.talhoes.map(lerTalhao));
  const leituras = respostas.filter((leitura) => leitura !== null);
  log(`${leituras.length} de ${gateway.talhoes.length} talhoes responderam`);
  if (leituras.length === 0) return;

  try {
    const media = await pedirMedia(leituras);
    log(`media recebida: ${formatarMedidas(media)}`);
  } catch (erro) {
    log(`servico de media indisponivel: ${(erro as Error).message}`);
  }
}

async function executar(): Promise<void> {
  log(`iniciado. Talhoes: ${gateway.talhoes.map((t) => t.id).join(", ")}`);

  // O proximo ciclo so comeca quando o anterior termina, entao eles nunca
  // se atropelam, mesmo se algum talhao demorar.
  while (true) {
    await esperar(INTERVALO_LEITURA_MS);
    await ciclo();
  }
}

executar();
