import * as os from "node:os";

/** IPs (IPv4) de todas as placas de rede desta maquina, inclusive 127.0.0.1. */
export function ipsDestaMaquina(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((placa): placa is os.NetworkInterfaceInfo => placa?.family === "IPv4")
    .map((placa) => placa.address);
}

/** Cria uma funcao de log que mostra a hora e quem esta falando. */
export function criarLog(origem: string): (texto: string) => void {
  return (texto) => {
    const hora = new Date().toLocaleTimeString("pt-BR");
    console.log(`${hora} [${origem}] ${texto}`);
  };
}

export function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function arredondar(valor: number, casas = 1): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

export function formatarMedidas(medidas: {
  temperatura: number;
  umidade: number;
  irradiacaoSolar: number;
}): string {
  return `T=${medidas.temperatura}°C U=${medidas.umidade}% IS=${medidas.irradiacaoSolar} W/m²`;
}
