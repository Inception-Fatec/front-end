import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;

  try {
    // Busca a estação com seus parâmetros
    const { data: station, error: stationError } = await supabaseAdmin
      .from("stations")
      .select(
        `
        id,
        name,
        address,
        latitude,
        longitude,
        id_datalogger,
        last_measurement,
        created_at,
        status,
        station_groupings ( id_grouping, groupings ( name ) ),
        parameters (
          id,
          id_parameter_type,
          status,
          parameter_types ( name, unit, symbol )
        )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (stationError) throw stationError;
    if (!station)
      return NextResponse.json(
        { error: "Estação não encontrada." },
        { status: 404 },
      );

    // Busca a última medição de cada parâmetro em paralelo
    const parametersWithLatest = await Promise.all(
      station.parameters.map(async (param: { id: number }) => {
        const { data, error } = await supabaseAdmin
          .from("measurements")
          .select("id, value, date_time")
          .eq("id_parameter", param.id)
          .order("date_time", { ascending: false })
          .limit(1);

        if (error) throw error;

        return { ...param, measurements: data ?? [] };
      }),
    );

    return NextResponse.json(
      { ...station, parameters: parametersWithLatest },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/stations/[id]/latest]", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
