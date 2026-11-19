import * as os from "node:os";

// Mostra os IPs deste computador com o nome da placa de rede, para
// preencher a secao "maquinas" do rede.json. Nao le o rede.json, entao
// funciona mesmo com ele ainda incompleto.
console.log("IPs deste computador (use o da placa ligada a rede do laboratorio):");

for (const [placa, enderecos] of Object.entries(os.networkInterfaces())) {
  for (const endereco of enderecos ?? []) {
    if (endereco.family === "IPv4" && !endereco.internal) {
      console.log(`  ${endereco.address.padEnd(16)} ${placa}`);
    }
  }
}
