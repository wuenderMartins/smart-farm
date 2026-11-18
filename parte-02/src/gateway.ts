import { pedirMedia } from "./cliente-media";
import {
  GATEWAYS,
  GatewayInfo,
  INTERVALO_LEITURA_MS,
  TAMANHO_JANELA,
  TalhaoInfo,
  buscarGateway,
} from "./config";
import { pedir } from "./socket";
import { Leitura } from "./tipos";
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

// Ultimas leituras de cada talhao. O servico de media calcula a media
// movel em cima delas.
const janela = new Map<string, Leitura[]>();

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

function guardarNaJanela(leitura: Leitura): void {
  const anteriores = janela.get(leitura.talhao) ?? [];
  janela.set(leitura.talhao, [...anteriores, leitura].slice(-TAMANHO_JANELA));
}

async function ciclo(): Promise<void> {
  const respostas = await Promise.all(gateway.talhoes.map(lerTalhao));

  gateway.talhoes.forEach((talhao, i) => {
    const leitura = respostas[i];
    if (leitura) guardarNaJanela(leitura);
    // Talhao que nao respondeu sai da media, para nao pesar com dado velho.
    else janela.delete(talhao.id);
  });
  log(`${janela.size} de ${gateway.talhoes.length} talhoes responderam`);

  const leituras = [...janela.values()].flat();
  if (leituras.length === 0) return;

  // Talhoes continuam via socket; o calculo da media agora e um rpc.
  try {
    const media = await pedirMedia({ gateway: gateway.id, leituras });
    log(`media movel recebida via gRPC: ${formatarMedidas(media)}`);
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
