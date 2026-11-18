import { analisar } from "./cliente-anomalias";
import { GATEWAYS, GatewayInfo, INTERVALO_FOG_MS } from "./config";
import { pedir } from "./socket";
import { Alerta, Situacao } from "./tipos";
import { criarLog, esperar, formatarMedidas } from "./util";

const log = criarLog("FOG");

// Alertas ativos, pela chave "talhao codigo". O gatilho so dispara quando
// um alerta aparece ou some, e nao a cada ciclo enquanto ele continua.
const ativos = new Map<string, Alerta>();

const chave = (alerta: Alerta) => `${alerta.talhao} ${alerta.codigo}`;

// A FOG e o cliente (C) da conexao com o gateway: ela pede a situacao e o
// gateway (S) responde. Gateway fora do ar nao para a FOG.
async function consultar(gateway: GatewayInfo): Promise<Situacao | null> {
  try {
    const resposta = await pedir(gateway.porta, { tipo: "PEDIR_SITUACAO" });
    if (resposta.tipo === "SITUACAO") {
      if (!resposta.situacao) log(`${gateway.id} ainda nao tem media calculada`);
      return resposta.situacao;
    }
    log(`${gateway.id} respondeu ${resposta.tipo}`);
  } catch (erro) {
    log(`${gateway.id} indisponivel: ${(erro as Error).message}`);
  }
  return null;
}

function dispararGatilhos(situacao: Situacao, alertas: Alerta[]): void {
  for (const alerta of alertas) {
    if (ativos.has(chave(alerta))) continue;
    ativos.set(chave(alerta), alerta);
    log(`>>> GATILHO ${alerta.talhao}: ${alerta.descricao} -> ${alerta.acao}`);
  }

  // So normaliza alerta de talhao que foi analisado agora. Talhao que nao
  // respondeu fica com o alerta como estava ate voltar.
  const analisados = new Set(situacao.media.talhoes.map((talhao) => talhao.talhao));
  const encontrados = new Set(alertas.map(chave));
  for (const [id, alerta] of ativos) {
    if (!analisados.has(alerta.talhao) || encontrados.has(id)) continue;
    ativos.delete(id);
    log(`<<< NORMALIZADO ${alerta.talhao}: ${alerta.codigo} -> ${alerta.acaoAoNormalizar}`);
  }
}

async function ciclo(): Promise<void> {
  const situacoes = (await Promise.all(GATEWAYS.map(consultar))).filter(
    (situacao) => situacao !== null
  );

  for (const situacao of situacoes) {
    const fora = situacao.semResposta.length
      ? ` | sem resposta: ${situacao.semResposta.join(", ")}`
      : "";
    log(`${situacao.gateway}: ${formatarMedidas(situacao.media)}${fora}`);

    try {
      const diagnostico = await analisar({
        gateway: situacao.gateway,
        talhoes: situacao.media.talhoes,
      });
      dispararGatilhos(situacao, diagnostico.alertas);
    } catch (erro) {
      log(`servico de anomalias indisponivel: ${(erro as Error).message}`);
    }
  }

  log(`alertas ativos: ${[...ativos.keys()].join(", ") || "nenhum"}`);
}

async function executar(): Promise<void> {
  log(`iniciada. Gateways: ${GATEWAYS.map((g) => g.id).join(", ")}`);

  while (true) {
    await esperar(INTERVALO_FOG_MS);
    await ciclo();
  }
}

executar();
