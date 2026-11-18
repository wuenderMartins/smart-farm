# Smart Farm — Parte 02 (Socket + gRPC + FOG)

A Parte 02 parte da [Parte 01](../parte-01) e implementa o diagrama completo da Smart Farm:

- o **Microsserviço para cálculo** passa a ser chamado por **gRPC** e retorna a média;
- entra a camada **FOG** (servidor local), que busca os dados nos gateways por **socket**;
- a FOG chama o **Microsserviço de Análise de Anomalias** por **gRPC**, que dispara gatilhos (ex.: umidade baixa → ligar irrigação).

> **Status: em andamento.** A camada Edge já usa gRPC e funciona de ponta a ponta. FOG e anomalias ainda não foram feitas.

## O que já funciona

```
 Talhão (S) ◄──socket──► (C) Gateway (C) ──gRPC──► (S) Serviço de Média
 3 por gateway               G1 e G2                   devolve a média
```

| Parte do diagrama | Comunicação | Situação |
|---|---|---|
| Talhões 01–03 (Temperatura, Umidade, IS) | socket — talhão é o servidor (S) | Feito |
| Gateway lendo os talhões | socket — gateway é o cliente (C) | Feito |
| Gateway → Microsserviço para cálculo | **gRPC** — gateway é o cliente (C) | Feito |
| Gateway ↔ FOG | socket — gateway é o servidor (S), FOG é o cliente (C) | Falta |
| FOG → Microsserviço de Análise de Anomalias | gRPC — FOG é o cliente (C) | Falta |
| Gatilhos (ex.: ligar irrigação) | — | Falta |

### O que mudou em relação à Parte 01

| | Parte 01 | Parte 02 |
|---|---|---|
| Gateway → Serviço de Média | socket, mensagens `CALCULAR_MEDIA` / `MEDIA` | gRPC, `rpc CalcularMedia(Lote) returns (Media)` |
| Formato das mensagens | combinado no código ([src/tipos.ts](../parte-01/src/tipos.ts)) | contrato em [proto/media.proto](proto/media.proto) |
| Validação das leituras | manual, campo por campo | feita pelo gRPC a partir dos tipos do `.proto` |
| Conexão | uma nova a cada pedido | o cliente gRPC mantém a conexão aberta e reaproveita |
| Porta do serviço | 4000 | 4300 |

Os talhões e a leitura dos talhões pelo gateway continuam iguais, por socket.

## Próximos passos

1. O gateway guarda a última média e abre um **servidor socket** para a FOG consultar.
2. Criar a **FOG**: um cliente socket que consulta os dois gateways.
3. Criar `proto/anomalias.proto` e o **Microsserviço de Análise de Anomalias** (servidor gRPC) com as regras de gatilho.
4. A FOG manda as médias para análise e mostra as ações (ex.: "G1: umidade baixa, ligar irrigação").

## Como rodar

Requer Node.js 20 ou mais novo.

```bash
cd parte-02
npm install
npm start           # sobe o serviço gRPC, os 6 talhões e os 2 gateways
```

Ou cada processo em um terminal:

```bash
npm run servico-media
npm run talhao -- G1-T01      # G1-T01..G1-T03 e G2-T01..G2-T03
npm run gateway -- G1         # G1 ou G2
```

## Arquivos novos ou alterados

| Arquivo | O que faz |
|---|---|
| [proto/media.proto](proto/media.proto) | Contrato gRPC do Microsserviço para cálculo |
| [src/grpc.ts](src/grpc.ts) | Carrega o `.proto` com `@grpc/proto-loader` |
| [src/servico-media.ts](src/servico-media.ts) | Servidor gRPC que calcula a média |
| [src/cliente-media.ts](src/cliente-media.ts) | Cliente gRPC usado pelo gateway |
| [src/gateway.ts](src/gateway.ts) | Lê os talhões por socket e pede a média por gRPC |

Os demais arquivos (`talhao.ts`, `sensores.ts`, `socket.ts`, `config.ts`, `util.ts`, `iniciar.ts`) vêm da Parte 01.
