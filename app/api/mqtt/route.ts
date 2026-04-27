import { NextResponse } from "next/server";
import { getMqttClient } from "./mqttClient";

export async function GET() {
  const client = getMqttClient();
  return NextResponse.json({
    status: client.connected ? "conectado" : "desconectado",
    message: client.connected
      ? "Receptor MQTT está ativo."
      : "Receptor MQTT não está conectado.",
  });
}
