import {
  buildTriggeredAlertLog,
  isAlertConditionMet,
  resolveAlertStateTransition,
} from "@/lib/alerts/trigger";

describe("alert trigger rules", () => {
  const criticalAlert = {
    id: 7,
    name: "Temperatura alta",
    message: "Temperatura acima do limite",
    severity: "CRITICAL" as const,
    operator: ">" as const,
    value: 35,
    status: true,
  };

  it("dispara alerta quando a condicao de trigger e atendida", () => {
    const log = buildTriggeredAlertLog(criticalAlert, {
      id_station: 10,
      id_parameter: 20,
      value: 38,
    });

    expect(log).toEqual({
      id_alert: 7,
      id_station: 10,
      id_parameter: 20,
      measurement: 38,
      name: "Temperatura alta",
      message: "Temperatura acima do limite",
      severity: "CRITICAL",
      operator: ">",
      value: 35,
    });
  });

  it("nao dispara alerta quando a condicao nao e atendida", () => {
    expect(
      buildTriggeredAlertLog(criticalAlert, {
        id_station: 10,
        id_parameter: 20,
        value: 34,
      }),
    ).toBeNull();
  });

  it("nao dispara alerta inativo mesmo com trigger atendido", () => {
    expect(
      buildTriggeredAlertLog(
        { ...criticalAlert, status: false },
        { id_station: 10, id_parameter: 20, value: 39 },
      ),
    ).toBeNull();
  });

  it("avalia todos os operadores suportados", () => {
    expect(isAlertConditionMet(10, ">", 9)).toBe(true);
    expect(isAlertConditionMet(10, "<", 11)).toBe(true);
    expect(isAlertConditionMet(10, ">=", 10)).toBe(true);
    expect(isAlertConditionMet(10, "<=", 10)).toBe(true);
    expect(isAlertConditionMet(10, "=", 10)).toBe(true);
  });

  it("identifica transicao de Critico para Moderado como reducao de estado", () => {
    expect(resolveAlertStateTransition("CRITICAL", "MODERATE")).toEqual({
      from: "CRITICAL",
      to: "MODERATE",
      direction: "deescalated",
    });
  });
});
