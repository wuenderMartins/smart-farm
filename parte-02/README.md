# Smart Farm — Parte 02 (Socket + gRPC + FOG)

A Parte 02 parte da [Parte 01](../parte-01) e implementa o diagrama completo da Smart Farm:

- os **talhões** (Temperatura, Umidade e IS) são lidos pelos **gateways** por **socket**;
- o gateway chama o **Microsserviço para cálculo** por **gRPC**, e ele retorna a média;
- a **FOG** busca a situação de cada gateway por **socket**;
- a FOG chama o **Microsserviço de Análise de Anomalias** por **gRPC**, que dispara gatilhos (ex.: umidade baixa → ligar irrigação).

Cada componente é um processo separado, e o arquivo [rede.json](rede.json) diz em qual máquina cada um roda. O mesmo código roda num computador só ou espalhado por 6 ou mais máquinas.

## Arquitetura

```
                  socket                         gRPC
 Talhões G1 (S) ◄────────► (C) Gateway G1 (C) ─────────► (S) Serviço de Média
 Talhões G2 (S) ◄────────► (C) Gateway G2 (C) ─────────►     "retorna a média"
                               (S)      (S)
                                ▲        ▲
                         socket │        │ socket
                                └──(C)───┘
                                   FOG (C) ───── gRPC ─────► (S) Serviço de Anomalias
                                                                 "gatilhos"
```

| Ligação | Cliente (C) | Servidor (S) | Tecnologia | Conversa |
|---|---|---|---|---|
| Gateway ↔ Talhão | Gateway | Talhão | socket TCP | `PEDIR_LEITURA` → `LEITURA` |
| Gateway → Microsserviço para cálculo | Gateway | Serviço de Média | gRPC | `CalcularMedia(Lote) → Media` |
| FOG ↔ Gateway | FOG | Gateway | socket TCP | `PEDIR_SITUACAO` → `SITUACAO` |
| FOG → Microsserviço de Anomalias | FOG | Serviço de Anomalias | gRPC | `Analisar(PedidoAnalise) → Diagnostico` |

### O caminho de um dado

1. A cada 3 s o gateway pede uma leitura a cada um dos seus 3 talhões. Cada talhão responde com a temperatura, a umidade e o IS do momento.
2. O gateway guarda as **5 últimas leituras** de cada talhão e manda todas para o Serviço de Média (`CalcularMedia`). O serviço devolve a média geral do gateway e a **média móvel** de cada talhão.
3. A cada 5 s a FOG pede a situação aos dois gateways e recebe o último resultado de cada um.
4. Para cada gateway, a FOG manda a média de cada talhão para o Serviço de Anomalias (`Analisar`). O serviço aplica as regras e devolve os alertas.
5. A FOG compara com os alertas que já estavam ativos e só dispara o gatilho quando um alerta **aparece** (`>>> GATILHO`) ou **some** (`<<< NORMALIZADO`). Enquanto o alerta continua, nada se repete.

A média móvel evita alarme falso: uma leitura isolada fora da faixa não dispara o gatilho, só uma tendência dispara.

## Regras de anomalia

Ficam em uma tabela em [src/regras.ts](src/regras.ts). Para criar um gatilho novo, basta acrescentar uma linha.

| Código | Quando | Gatilho | Ao normalizar |
|---|---|---|---|
| `UMIDADE_BAIXA` | umidade abaixo de 30 % | Ligar irrigação | Desligar irrigação |
| `UMIDADE_ALTA` | umidade acima de 85 % | Suspender irrigação (risco de fungos) | Liberar irrigação |
| `TEMPERATURA_ALTA` | temperatura acima de 35 °C | Ligar nebulização | Desligar nebulização |
| `RISCO_DE_GEADA` | temperatura abaixo de 5 °C | Avisar o produtor | Encerrar aviso de geada |
| `IS_ALTA` | IS acima de 1000 W/m² | Fechar tela de sombreamento | Abrir tela de sombreamento |

## Cenários de clima

Para provocar uma anomalia na hora, cada talhão tem um cenário que pode ser trocado com ele rodando. As medidas mudam aos poucos até o clima do cenário. Por isso o gatilho aparece de 20 a 30 s depois da troca.

| Cenário | O que a FOG dispara |
|---|---|
| `normal` | nada (é o cenário inicial) |
| `seca` | `UMIDADE_BAIXA` → ligar irrigação |
| `chuva` | `UMIDADE_ALTA` → suspender irrigação |
| `calor` | `TEMPERATURA_ALTA` e `IS_ALTA` → nebulização e sombreamento |
| `geada` | `RISCO_DE_GEADA` → avisar o produtor |

Para trocar, digite no terminal onde o talhão está rodando: `G1-T01 seca` no terminal do `npm start`, ou só `seca` no terminal de um `npm run talhao`. Volte com `normal` para ver o alerta normalizar.

## Rodar em um computador

Requer Node.js 20 ou mais novo.

```bash
cd parte-02
npm install
npm start          # sobe os 11 processos: 6 talhões, 2 gateways, FOG e os 2 serviços
```

Com tudo rodando, digite `G1-T01 seca` e Enter. Em uns 30 s a FOG mostra:

```
[FOG] >>> GATILHO G1-T01: umidade 24.78% abaixo de 30% -> Ligar irrigacao
```

Depois digite `G1-T01 normal`. Pouco depois aparece `<<< NORMALIZADO G1-T01: UMIDADE_BAIXA -> Desligar irrigacao`. Ctrl+C encerra tudo.

## Rodar em 6 máquinas (laboratório)

O [rede.json](rede.json) já vem dividido em 6 máquinas, seguindo os blocos do diagrama:

| Máquina | O que roda | Bloco do diagrama |
|---|---|---|
| m1 | talhões G1-T01, G1-T02, G1-T03 | EDGE (área 1) |
| m2 | gateway G1 | EDGE (área 1) |
| m3 | talhões G2-T01, G2-T02, G2-T03 | EDGE (área 2) |
| m4 | gateway G2 | EDGE (área 2) |
| m5 | Serviço de Média | EDGE (microsserviço para cálculo) |
| m6 | FOG e Serviço de Anomalias | FOG (servidor local) |

Passo a passo:

1. **Em todas as máquinas:** baixe o repositório, depois rode `cd parte-02` e `npm install`.
2. **Em cada máquina:** rode `npm run ip` e anote o IP da placa ligada à rede do laboratório (normalmente "Ethernet").
3. **Preencha os IPs** na seção `maquinas` do `rede.json`. O arquivo precisa ser **igual em todas as máquinas**: edite em uma, faça commit e push, e rode `git pull` nas outras.
   ```json
   "maquinas": {
     "m1": "10.0.5.21",
     "m2": "10.0.5.22",
     ...
   }
   ```
4. **Em cada máquina,** suba só a parte dela: `npm start -- m1` na primeira, `npm start -- m2` na segunda, e assim até a `m6`. A ordem não importa: quem sobe antes espera os outros e conecta sozinho. Se o IP do `rede.json` não for o daquela máquina, aparece um aviso `ATENCAO`.
5. **Em qualquer máquina,** rode `npm run verificar`. Ele testa a conexão com os 10 servidores e diz o motivo de cada falha: componente parado, IP errado ou firewall.
6. **Demonstração:** na m1, digite `G1-T01 seca`. Na m6, a FOG dispara `Ligar irrigacao`. Depois digite `G1-T01 normal` na m1 e veja a FOG normalizar.

Para usar **mais de 6 máquinas**, acrescente `m7`, `m8`… em `maquinas` e mude a máquina de quem você quiser. Por exemplo, cada talhão pode ficar numa máquina própria, até 11 máquinas, sem mudar o código.

### Firewall e portas

- Na primeira vez que um componente abre uma porta na rede, o Windows pergunta se o **Node.js** pode acessar a rede: clique em **Permitir**. Sem isso, as outras máquinas não conseguem conectar, e o `verificar` delas mostra `sem resposta`.
- Portas usadas: talhões 4101–4103 e 4201–4203, gateways 4501 e 4502, Serviço de Média 4300 e Serviço de Anomalias 4400. Todas ficam abaixo de 49152 de propósito: o Windows reserva faixas acima disso (Hyper-V, WSL, Docker), e ali dá erro `EACCES`.
- Com o IP `127.x` (teste num computador só), os servidores escutam só nesse IP e nem aparecem na rede. Com IP de verdade, escutam em todas as placas (`0.0.0.0`).

## Testes de falha

Bons para mostrar na apresentação:

| O que fazer | O que acontece |
|---|---|
| Parar a m1 (talhões do G1) | o G1 registra `0 de 3 talhoes responderam`. A FOG mostra `G1 ainda nao tem media calculada` e segue com o G2. |
| Parar a m5 (Serviço de Média) | os gateways registram `servico de media indisponivel: fora do ar`. Quando a m5 volta, a média volta em poucos segundos. |
| Parar a m4 (gateway G2) | a FOG registra `G2 indisponivel` e continua analisando o G1. |
| Parar o Serviço de Anomalias | a FOG continua mostrando as médias e registra `servico de anomalias indisponivel`. |

Para derrubar **um talhão só**, suba os talhões um por terminal em vez do `npm start -- m1`: `npm run talhao -- G1-T01`, `npm run talhao -- G1-T02` e assim por diante. Depois feche um deles. O gateway segue com os outros dois, e a FOG mostra o talhão em `sem resposta`.

## Rodar cada processo separado

```bash
npm run servico-media
npm run servico-anomalias
npm run talhao -- G1-T01          # cenário inicial opcional: npm run talhao -- G1-T01 seca
npm run gateway -- G1
npm run fog
```

`npm run typecheck` confere os tipos sem gerar build.

## Mensagens do socket

Cada mensagem é um objeto JSON em uma linha terminada por `\n`, como na Parte 01.

```jsonc
// gateway -> talhao
{"tipo":"PEDIR_LEITURA"}
// talhao -> gateway
{"tipo":"LEITURA","leitura":{"talhao":"G1-T01","horario":"2026-11-18T23:01:16.000Z","temperatura":30.2,"umidade":24.5,"irradiacaoSolar":710.4}}

// FOG -> gateway
{"tipo":"PEDIR_SITUACAO"}
// gateway -> FOG (situacao fica null enquanto o gateway nao tem media)
{"tipo":"SITUACAO","situacao":{"gateway":"G1","atualizadaEm":"...","semResposta":[],"media":{"gateway":"G1","quantidade":15,"temperatura":27.1,"umidade":45.3,"irradiacaoSolar":640.2,"talhoes":[{"talhao":"G1-T01","leituras":5,"temperatura":30.1,"umidade":24.78,"irradiacaoSolar":705.3}]}}}

// pedido desconhecido
{"tipo":"ERRO","motivo":"pedido desconhecido: ..."}
```

## Contratos gRPC

Cada microsserviço tem o seu `.proto`, lido em tempo de execução com `@grpc/proto-loader`, como no exemplo `grpc-tads6`:

- [proto/media.proto](proto/media.proto): `ServicoMedia.CalcularMedia(Lote) returns (Media)`. O `Media` traz a média geral e a lista `talhoes`, com a média móvel de cada um.
- [proto/anomalias.proto](proto/anomalias.proto): `ServicoAnomalias.Analisar(PedidoAnalise) returns (Diagnostico)`. O `Diagnostico` traz a lista de `alertas`, cada um com `acao` e `acao_ao_normalizar`.

Os clientes reconectam sozinhos se o serviço cair, esperando no máximo 5 s entre as tentativas.

## Arquivos

| Arquivo | Bloco do diagrama | O que faz |
|---|---|---|
| [src/talhao.ts](src/talhao.ts) | EDGE | Servidor socket de um talhão, com troca de cenário |
| [src/sensores.ts](src/sensores.ts) | EDGE | Simula os três sensores e os cenários de clima |
| [src/gateway.ts](src/gateway.ts) | EDGE | Lê os talhões, pede a média e atende a FOG |
| [src/cliente-media.ts](src/cliente-media.ts) | EDGE | Cliente gRPC do Serviço de Média |
| [src/servico-media.ts](src/servico-media.ts) + [src/calculo.ts](src/calculo.ts) | EDGE (microsserviço) | Servidor gRPC que calcula as médias |
| [src/fog.ts](src/fog.ts) | FOG | Consulta os gateways e dispara os gatilhos |
| [src/cliente-anomalias.ts](src/cliente-anomalias.ts) | FOG | Cliente gRPC do Serviço de Anomalias |
| [src/servico-anomalias.ts](src/servico-anomalias.ts) + [src/regras.ts](src/regras.ts) | FOG (microsserviço) | Servidor gRPC que aplica as regras |
| [src/config.ts](src/config.ts) + [rede.json](rede.json) | — | Onde cada componente roda (IP e porta) e os tempos |
| [src/socket.ts](src/socket.ts) | — | Enviar e receber mensagens; `pedir()` é o lado cliente |
| [src/tipos.ts](src/tipos.ts) | — | Formato das leituras, médias, alertas e mensagens |
| [src/grpc.ts](src/grpc.ts) | — | Carrega os `.proto` e configura a reconexão |
| [src/iniciar.ts](src/iniciar.ts) | — | `npm start`: sobe tudo, ou só uma máquina |
| [src/verificar.ts](src/verificar.ts), [src/ip.ts](src/ip.ts) | — | `npm run verificar` e `npm run ip` |

## Decisões e suposições

- **IS** foi tratado como irradiação solar (W/m²). O diagrama não define a sigla.
- O diagrama não pede banco nem painel. As médias ficam em memória, e o resultado aparece no terminal da FOG.
- A ligação gRPC não é criptografada (`createInsecure`), como no exemplo do professor. Serve para a rede do laboratório, não para a internet.
