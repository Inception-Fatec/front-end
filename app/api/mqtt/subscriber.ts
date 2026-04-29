import { saveRawData } from "@/lib/mongodb";
import { getMqttClient } from "./mqttClient";

export function startReceptor(): void {
  const client = getMqttClient();
  const TOPICO = "estacoes/+/dados";

  function performerSubscriber() {
    client.subscribe(TOPICO, { qos: 1 });
  }

  if (client.connected) {
    performerSubscriber();
  } else {
    client.on("connect", performerSubscriber);
  }

  client.on("message", async (topic: string, message: Buffer) => {
    try {
      const rawData = JSON.parse(message.toString());

      await saveRawData({
        topic,
        payload: rawData,
      });
    } catch (error) {
      console.error("[MQTT] Erro ao processar mensagem:", error);
    }
  });
}
