export type ParameterType = {
  id: number;
  name: string;
  unit: string;
  symbol: string;
  factor_value: number;
  offset_value: number;
  json_name: string;
};

export type Parameter = {
  id: number;
  id_station: number;
  id_parameter_type: number;
  status: boolean;
};

export type ParameterWithType = Parameter & {
  parameter_types: ParameterType;
};

export type ParameterWithStationAndType = Parameter & {
  parameter_types: ParameterType;
  stations: {
    id: number;
    name: string;
  };
};

export type PaginatedParameters = {
  data: ParameterType[];
  pagination: {
    page: number;
    limit: number | "all";
    totalPages: number;
    total: number;
  };
};
