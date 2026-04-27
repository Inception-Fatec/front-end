import mqtt, {MqttClient} from "mqtt";

const BROKER_URL = process.env.MQTT_BROKER_URL!;
const USERNAME = process.env.MQTT_USERNAME!;
const PASSWORD = process.env.MQTT_PASSWORD!;

let clientInstance: MqttClient | null = null

export function getMqttClient(): MqttClient {
    if (clientInstance && clientInstance.connected) {
        return clientInstance;
    }

    clientInstance = mqtt.connect(BROKER_URL, {
        username: USERNAME,
        password: PASSWORD,
        protocol: "mqtts",
        rejectUnauthorized: false,        
        keepalive: 60,
        reconnectPeriod: 3000,
        clientId: `receptor_${Math.random().toString(16).slice(2, 8)}`
    });

    return clientInstance;
}