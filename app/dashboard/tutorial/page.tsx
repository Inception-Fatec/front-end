"use client";

import { Settings } from "lucide-react";

type GuideTopic = {
  title: string;
  definition: string;
  scientificContext: string;
  unit: string;
  symbol: string;
  range: string;
  accuracy: string;
  standards: string[];
  applications: string[];
  sensors: string[];
};

const guideTopics: GuideTopic[] = [
  {
    title: "Termometria",
    definition: "Medição da temperatura do ar, da água ou do solo.",
    scientificContext:
      "A termometria estuda a medição de temperatura utilizando propriedades térmicas dos materiais. A temperatura é uma medida da energia cinética média das moléculas e é fundamental para entender processos atmosféricos, oceanográficos e terrestres. Estações meteorológicas medem temperatura para análise climática, proteção de cultivos e controle industrial.",
    unit: "Temperatura",
    symbol: "°C",
    range: "-40°C a +60°C (típico em estações meteorológicas)",
    accuracy: "±0,5°C a ±2°C (depende do sensor)",
    standards: ["ISO 3864", "WMO nº 8", "Normas meteorológicas internacionais"],
    applications: [
      "Monitoramento climático",
      "Proteção de cultivos",
      "Controle industrial",
      "Meteorologia",
    ],
    sensors: ["DHT22", "BME280", "DS18B20"],
  },
  {
    title: "Higrometria",
    definition: "Medição da umidade relativa do ar.",
    scientificContext:
      "A higrometria quantifica o conteúdo de vapor de água na atmosfera. A umidade relativa é a proporção entre a quantidade de vapor de água presente e a quantidade máxima que o ar pode conter naquela temperatura. É essencial para agricultura de precisão, meteorologia e sistemas HVAC, afetando evaporação, condensação e processos biológicos.",
    unit: "Umidade relativa",
    symbol: "% RH",
    range: "0% a 100% UR",
    accuracy: "±2% a ±5% UR (depende do sensor)",
    standards: ["ISO 4, Parte 1", "WMO nº 8", "Recomendações meteorológicas"],
    applications: [
      "Agricultura de precisão",
      "Meteorologia",
      "Controle ambiental",
      "Previsão de conforto térmico",
    ],
    sensors: ["DHT22", "BME280", "SHT31"],
  },
  {
    title: "Barometria",
    definition:
      "Medição da pressão atmosférica para análise de variações climáticas.",
    scientificContext:
      "A barometria mede a pressão exercida pela coluna de ar sobre a superfície terrestre. Variações de pressão indicam mudanças no sistema atmosférico e são fundamentais para previsão meteorológica. Pressão baixa geralmente indica tempo instável, enquanto pressão alta indica estabilidade. Também é usada para determinar altitude.",
    unit: "Pressão atmosférica",
    symbol: "hPa",
    range: "300 hPa a 1100 hPa",
    accuracy: "±1 hPa a ±2 hPa",
    standards: [
      "WMO nº 8",
      "ISO 6149",
      "Padrões meteorológicos internacionais",
    ],
    applications: [
      "Previsão meteorológica",
      "Determinação de altitude",
      "Análise sinótica",
      "Aviação",
    ],
    sensors: ["BME280", "BMP280", "BME680"],
  },
  {
    title: "Anemometria - Velocidade",
    definition: "Medição da velocidade do vento.",
    scientificContext:
      "A anemometria quantifica a velocidade horizontal do vento próximo à superfície. A velocidade do vento é crítica para energia eólica, aviação e previsão de desastres naturais. Anemômetros de conchas são mais comuns em estações meteorológicas convencionais, enquanto anemômetros ultrassônicos oferecem melhor resolução temporal.",
    unit: "Velocidade do vento",
    symbol: "km/h",
    range: "0 a 200+ km/h (depende do sensor)",
    accuracy: "±0,3 m/s ou ±1% da leitura",
    standards: ["WMO nº 8", "ISO 4, Parte 1", "Normas de aerodinâmica"],
    applications: [
      "Energia renovável (eólica)",
      "Meteorologia",
      "Aviação",
      "Dispersão de poluentes",
    ],
    sensors: ["Anemômetro de conchas", "Anemômetro ultrassônico"],
  },
  {
    title: "Anemometria - Direção",
    definition: "Medição da direção do vento.",
    scientificContext:
      "A direção do vento é medida como ângulo em relação ao norte geográfico (0° a 360°). A veleta fornece a orientação do vento local próximo à estação. Dados de direção são essenciais para meteorologia sinótica, modelagem de dispersão atmosférica e navegação aérea.",
    unit: "Direção do vento",
    symbol: "°",
    range: "0° a 360° (com relação ao norte)",
    accuracy: "±5° a ±10°",
    standards: ["WMO nº 8", "ISO 4, Parte 1", "Convenções meteorológicas"],
    applications: [
      "Meteorologia sinótica",
      "Aviação",
      "Dispersão de poluentes",
      "Análise climatológica",
    ],
    sensors: ["Veleta", "Biruta"],
  },
  {
    title: "Pluviometria",
    definition: "Medição da precipitação acumulada na estação.",
    scientificContext:
      "A pluviometria quantifica a quantidade de chuva (e outros tipos de precipitação) que cai em uma área. Pluviômetros basculantes registram automaticamente eventos de precipitação, essenciais para hidrologia, agricultura e previsão de inundações. A resolução temporal permite detectar intensidade de chuva.",
    unit: "Chuva",
    symbol: "mm",
    range: "0 a 500+ mm por evento",
    accuracy: "±5% a ±10%",
    standards: ["WMO nº 8", "ISO 4680", "Normas hidrológicas"],
    applications: [
      "Hidrologia",
      "Agricultura de precisão",
      "Previsão de inundações",
      "Estudos climáticos",
    ],
    sensors: [
      "Pluviômetro basculante",
      "Pluviômetro de báscula",
      "Pluviômetro coletor",
    ],
  },
];

export default function TutorialPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Guia de Padronização
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Referência técnica e científica dos parâmetros meteorológicos do
            sistema
          </p>
        </div>
        
      </div>

      <div
        className="rounded-2xl border border-border overflow-hidden bg-card-background/60"
        data-printable="guide"
      >
        <div className="p-6 md:p-7">
          <div className="flex items-start gap-3 mb-6">
            <Settings size={18} className="text-primary mt-1 shrink-0" />
            <div>
              <h2 className="text-2xl font-semibold text-foreground leading-tight">
                Referência Técnica
              </h2>
              <p className="text-xs text-secondary-text mt-1">
                Conheça os detalhes de cada parâmetro meteorológico monitorado
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {guideTopics.map((topic) => (
              <div
                key={topic.title}
                className="rounded-xl border border-border/70 bg-background/40 overflow-hidden"
              >
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-secondary-text mt-0.5">
                        {topic.definition}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap shrink-0">
                      {topic.symbol}
                    </span>
                  </div>

                  <div className="border-t border-border/70 pt-4 space-y-4">
                    <p className="text-sm text-secondary-text leading-relaxed border-l-2 border-primary/30 pl-3">
                      {topic.scientificContext}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] font-semibold text-foreground mb-1">
                          Grandeza
                        </p>
                        <p className="text-sm text-secondary-text">
                          {topic.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] font-semibold text-foreground mb-1">
                          Faixa Típica
                        </p>
                        <p className="text-sm text-secondary-text">
                          {topic.range}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] font-semibold text-foreground mb-1">
                          Precisão
                        </p>
                        <p className="text-sm text-secondary-text">
                          {topic.accuracy}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] font-semibold text-foreground mb-1">
                          Sensores Típicos
                        </p>
                        <p className="text-sm text-secondary-text">
                          {topic.sensors.join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] font-semibold text-foreground mb-1">
                          Normas Técnicas
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {topic.standards.map((std, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20"
                            >
                              {std}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] font-semibold text-foreground mb-1">
                          Aplicações
                        </p>
                        <p className="text-sm text-secondary-text">
                          {topic.applications.join(" • ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-primary/25 bg-primary/10 p-4 space-y-2 mt-4">
            <p className="text-xs uppercase tracking-[0.18em] text-secondary-text">
              Fórmula de Calibração / ETL
            </p>
            <p className="text-sm text-secondary-text leading-relaxed">
              Use a conversão padronizada{" "}
              <span className="font-semibold text-foreground">
                y = (bruto × factor_value) + offset_value
              </span>{" "}
              para transformar a leitura do sensor em valor final tratado.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          [data-printable="guide"],
          [data-printable="guide"] * {
            visibility: visible !important;
          }

          [data-printable="guide"] {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            background: white !important;
            color: black !important;
          }

          [data-no-print] {
            display: none !important;
          }

          [data-printable="guide"] .bg-card-background,
          [data-printable="guide"] .bg-card-background\/60,
          [data-printable="guide"] .bg-background\/40,
          [data-printable="guide"] .bg-primary\/10 {
            background: white !important;
          }

          [data-printable="guide"] .border-border {
            border-color: #000 !important;
          }

          [data-printable="guide"] .text-secondary-text {
            color: #333 !important;
          }
        }
      `}</style>
    </div>
  );
}
