# Smart Farm

Sistema distribuído de monitoramento de uma fazenda, em Node.js + TypeScript. Sensores de temperatura, umidade e IS (irradiação solar) espalhados pelos talhões são lidos por gateways na borda (Edge). As leituras são processadas por microsserviços, e uma camada FOG analisa anomalias.

| Pasta | O que tem | Comunicação | Situação |
|---|---|---|---|
| [parte-01](parte-01) | Talhões, gateways e serviço de média | socket TCP | Concluída |
| [parte-02](parte-02) | Serviço de média via gRPC, FOG e análise de anomalias | socket + gRPC | Em andamento |

Cada parte é um projeto independente, com o próprio `package.json`. Para rodar, entre na pasta e use `npm install` e depois `npm start`. Os detalhes estão no README de cada parte.
