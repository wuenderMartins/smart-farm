# Smart Farm

Sistema distribuído de monitoramento de uma fazenda, em Node.js + TypeScript. Sensores de temperatura, umidade e IS (irradiação solar) espalhados pelos talhões são lidos por gateways na borda (Edge). As leituras são processadas por microsserviços, e uma camada FOG analisa anomalias e dispara gatilhos, como ligar a irrigação quando a umidade cai.

| Pasta | O que tem | Comunicação | Situação |
|---|---|---|---|
| [parte-01](parte-01) | Talhões, gateways e serviço de média | socket TCP | Concluída |
| [parte-02](parte-02) | Diagrama completo: serviço de média e análise de anomalias via gRPC, FOG, várias máquinas | socket + gRPC | Concluída |

Cada parte é um projeto independente, com o próprio `package.json`. Para rodar, entre na pasta e use `npm install` e depois `npm start`.

Para rodar a Parte 02 em várias máquinas, siga o passo a passo do [README da Parte 02](parte-02/README.md#rodar-em-6-máquinas-laboratório).
