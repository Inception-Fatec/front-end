export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Instrumentation] Iniciando receptor MQTT...");

    const { startReceptor } = await import("./app/api/mqtt/subscriber");
    startReceptor();
  }
}
