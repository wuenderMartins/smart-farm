import * as net from "node:net";
import { pedirMedia } from "./cliente-media";
import {
  GATEWAYS,
  GatewayInfo,
  HOST,
  INTERVALO_LEITURA_MS,
  TAMANHO_JANELA,
  TalhaoInfo,
  buscarGateway,
} from "./config";
import { aoReceber, enviar, pedir } from "./socket";
import { Leitura, Situacao } from "./tipos";
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

// Resultado do ultimo ciclo, entregue a FOG quando ela pedir. Fica null
// enquanto nao houver uma media calculada com sucesso.
let situacao: Situacao | null = null;

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
  const semResposta: string[] = [];

  gateway.talhoes.forEach((talhao, i) => {
    const leitura = respostas[i];
    if (leitura) {
      guardarNaJanela(leitura);
    } else {
      // Talhao que nao respondeu sai da media, para nao pesar com dado velho.
      janela.delete(talhao.id);
      semResposta.push(talhao.id);
    }
  });
  log(`${janela.size} de ${gateway.talhoes.length} talhoes responderam`);

  const leituras = [...janela.values()].flat();
  if (leituras.length === 0) {
    situacao = null;
    return;
  }

  // Talhoes continuam via socket; o calculo da media agora e um rpc.
  try {
    const media = await pedirMedia({ gateway: gateway.id, leituras });
    situacao = { gateway: gateway.id, atualizadaEm: new Date().toISOString(), media, semResposta };
    log(`media movel recebida via gRPC: ${formatarMedidas(media)}`);
  } catch (erro) {
    situacao = null;
    log(`servico de media indisponivel: ${(erro as Error).message}`);
  }
}

// Lado servidor do gateway: a FOG (C) conecta nesta porta e pede a
// situacao atual, e o gateway (S) responde com o ultimo resultado.
function atenderFog(): void {
  const servidor = net.createServer((socket) => {
    aoReceber(socket, (mensagem) => {
      if (mensagem.tipo !== "PEDIR_SITUACAO") {
        enviar(socket, { tipo: "ERRO", motivo: `pedido desconhecido: ${mensagem.tipo}` });
        return;
      }
      enviar(socket, { tipo: "SITUACAO", situacao });
    });

    socket.on("error", (erro) => log(`conexao com a FOG perdida: ${erro.message}`));
  });

  servidor.on("error", (erro) => {
    log(`nao foi possivel abrir a porta ${gateway.porta}: ${erro.message}`);
    process.exit(1);
  });

  servidor.listen(gateway.porta, HOST, () => log(`atendendo a FOG na porta ${gateway.porta}`));
}

async function executar(): Promise<void> {
  log(`iniciado. Talhoes: ${gateway.talhoes.map((t) => t.id).join(", ")}`);
  atenderFog();

  // O proximo ciclo so comeca quando o anterior termina, entao eles nunca
  // se atropelam, mesmo se algum talhao demorar.
  while (true) {
    await esperar(INTERVALO_LEITURA_MS);
    await ciclo();
  }
}

executar();
