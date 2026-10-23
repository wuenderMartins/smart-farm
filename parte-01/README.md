# Smart Farm — Parte 01 (Socket)

Primeira versão da fazenda inteligente: **todos os componentes conversam por socket TCP** (módulo `node:net`).

```
 Talhão (S) ◄──socket──► (C) Gateway (C) ──socket──► (S) Serviço de Média
 3 por gateway               G1 e G2                    devolve a média
```

- **Talhão:** servidor socket com três sensores: Temperatura, Umidade e IS (irradiação solar). Só mede quando alguém pede.
- **Gateway:** a cada 3 s pede uma leitura a cada um dos seus 3 talhões, junta as leituras e pede a média ao Serviço de Média.
- **Serviço de Média:** recebe as leituras de um gateway e devolve a média de temperatura, umidade e IS.

São 9 processos ao todo: 6 talhões, 2 gateways e 1 serviço.

## Protocolo

Toda mensagem é um objeto JSON em uma linha terminada por `\n`. A quebra de linha é necessária porque o TCP entrega um fluxo de bytes: uma mensagem pode chegar partida em dois pedaços, ou duas podem chegar juntas.

| Quem pede → quem responde | Pedido | Resposta |
|---|---|---|
| Gateway → Talhão | `{"tipo":"PEDIR_LEITURA"}` | `{"tipo":"LEITURA","leitura":{...}}` |
| Gateway → Serviço de Média | `{"tipo":"CALCULAR_MEDIA","gateway":"G1","leituras":[...]}` | `{"tipo":"MEDIA","media":{...}}` |
| Qualquer pedido inválido | — | `{"tipo":"ERRO","motivo":"..."}` |

Cada pedido usa uma conexão nova, fechada assim que a resposta chega.

## Falhas

- Se um talhão não responder em 2 s, o gateway segue com os outros e tenta de novo no próximo ciclo.
- Se o Serviço de Média estiver fora do ar, o gateway registra o erro e continua lendo os talhões.

## Como rodar

Requer Node.js 20 ou mais novo.

```bash
cd parte-01
npm install
npm start           # sobe os 9 processos; Ctrl+C encerra todos
```

Ou cada processo em um terminal:

```bash
npm run servico-media
npm run talhao -- G1-T01      # G1-T01..G1-T03 e G2-T01..G2-T03
npm run gateway -- G1         # G1 ou G2
```

## Arquivos

| Arquivo | O que faz |
|---|---|
| [src/config.ts](src/config.ts) | Gateways, talhões e portas (4000 serviço, 41xx e 42xx talhões) |
| [src/tipos.ts](src/tipos.ts) | Formato da leitura, da média e das mensagens |
| [src/socket.ts](src/socket.ts) | Enviar e receber mensagens; `pedir()` faz o papel de cliente |
| [src/sensores.ts](src/sensores.ts) | Simula os três sensores de um talhão |
| [src/talhao.ts](src/talhao.ts) | Servidor socket do talhão |
| [src/gateway.ts](src/gateway.ts) | Ciclo do gateway |
| [src/calculo.ts](src/calculo.ts) | Cálculo da média e validação das leituras |
| [src/servico-media.ts](src/servico-media.ts) | Servidor socket do Serviço de Média |
| [src/iniciar.ts](src/iniciar.ts) | Sobe todos os processos |
