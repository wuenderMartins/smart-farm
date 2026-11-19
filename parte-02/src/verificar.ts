import * as net from "node:net";
import {
  ARQUIVO_REDE,
  Endereco,
  GATEWAYS,
  SERVICO_ANOMALIAS,
  SERVICO_MEDIA,
  TALHOES,
  TIMEOUT_MS,
} from "./config";
import { ipsDestaMaquina } from "./util";

// Tenta abrir uma conexao TCP com cada servidor do rede.json e mostra
// quem respondeu. Serve para achar IP errado, componente parado ou
// firewall bloqueando antes de comecar a apresentacao.

interface Alvo extends Endereco {
  nome: string;
  maquina: string;
}

const ALVOS: Alvo[] = [
  ...TALHOES.map((t) => ({ nome: t.id, maquina: t.maquina, host: t.host, porta: t.porta })),
  ...GATEWAYS.map((g) => ({ nome: `${g.id} (para a FOG)`, maquina: g.maquina, host: g.host, porta: g.porta })),
  { nome: "Servico de Media", ...SERVICO_MEDIA },
  { nome: "Servico de Anomalias", ...SERVICO_ANOMALIAS },
];

// Devolve null quando conecta, ou o motivo da falha.
function testar(alvo: Endereco): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: alvo.host, port: alvo.porta });
    socket.setTimeout(TIMEOUT_MS);

    socket.on("connect", () => {
      socket.end();
      resolve(null);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve("sem resposta: IP errado, maquina desligada ou firewall bloqueando");
    });
    socket.on("error", (erro: NodeJS.ErrnoException) => {
      resolve(erro.code === "ECONNREFUSED" ? "recusou: o componente nao esta rodando" : erro.message);
    });
  });
}

async function verificar(): Promise<void> {
  console.log(`IPs deste computador: ${ipsDestaMaquina().join(", ")}`);
  console.log(`Testando os servidores do ${ARQUIVO_REDE}\n`);

  const falhas = await Promise.all(ALVOS.map(testar));

  ALVOS.forEach((alvo, i) => {
    const endereco = `${alvo.host}:${alvo.porta}`;
    const situacao = falhas[i] ? "FALHOU" : "ok";
    console.log(
      `  ${situacao.padEnd(6)}  ${alvo.nome.padEnd(20)}  ${alvo.maquina.padEnd(3)}  ${endereco.padEnd(21)}  ${falhas[i] ?? ""}`
    );
  });

  const total = falhas.filter((falha) => falha !== null).length;
  console.log(
    total === 0
      ? `\nTodos os ${ALVOS.length} servidores responderam.`
      : `\n${total} de ${ALVOS.length} servidores nao responderam.`
  );
  process.exitCode = total === 0 ? 0 : 1;
}

verificar();
