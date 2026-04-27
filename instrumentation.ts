export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {    
    const { startReceptor } = await import("./app/api/mqtt/subscriber");
    startReceptor();
  }
}