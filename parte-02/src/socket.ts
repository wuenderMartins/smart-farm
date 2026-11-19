import * as net from "node:net";
import { Endereco, TIMEOUT_MS } from "./config";
import { Mensagem } from "./tipos";

export function enviar(socket: net.Socket, mensagem: Mensagem): void {
  socket.write(JSON.stringify(mensagem) + "\n");
}

/**
 * O TCP entrega um fluxo de bytes, nao mensagens prontas: um evento
 * "data" pode trazer meia mensagem ou varias de uma vez. Por isso cada
 * mensagem termina com "\n" e o que chega fica guardado ate a linha
 * estar completa.
 */
export function aoReceber(socket: net.Socket, tratar: (mensagem: Mensagem) => void): void {
  let incompleto = "";

  socket.setEncoding("utf8");
  socket.on("data", (pedaco: string) => {
    const linhas = (incompleto + pedaco).split("\n");
    incompleto = linhas.pop() ?? "";

    for (const linha of linhas) {
      if (linha.trim() === "") continue;

      let valor: unknown;
      try {
        valor = JSON.parse(linha);
      } catch {
        valor = undefined;
      }

      if (typeof valor !== "object" || valor === null || !("tipo" in valor)) {
        console.warn(`Mensagem ignorada, formato invalido: ${linha}`);
        continue;
      }
      tratar(valor as Mensagem);
    }
  });
}

/**
 * Lado cliente: conecta no endereco, envia um pedido e devolve a primeira
 * resposta. Cada pedido usa uma conexao nova, fechada logo em seguida.
 */
export function pedir(destino: Endereco, pedido: Mensagem): Promise<Mensagem> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: destino.host, port: destino.porta });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`sem resposta de ${destino.host}:${destino.porta} em ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    socket.on("connect", () => enviar(socket, pedido));

    aoReceber(socket, (resposta) => {
      clearTimeout(timeout);
      socket.end();
      resolve(resposta);
    });

    socket.on("error", (erro) => {
      clearTimeout(timeout);
      reject(erro);
    });
  });
}
