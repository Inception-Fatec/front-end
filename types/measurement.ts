export type Measurement = {
  id: number;
  id_parameter: number;
  value: number;
  date_time: string;
};

export type MeasurementWithParameter = Measurement & {
  parameters: {
    id_station: number;
    id_parameter_type: number;
    status: boolean;
  };
};

export type MeasurementWithFullParameter = Measurement & {
  parameters: {
    id_station: number;
    id_parameter_type: number;
    status: boolean;
    parameter_types: {
      name: string;
      unit: string;
      symbol: string;
    };
  };
};