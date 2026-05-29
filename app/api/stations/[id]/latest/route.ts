import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
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
    const [station] = await sql`
      SELECT s.*,
        json_agg(DISTINCT jsonb_build_object(
          'id_grouping', sg.id_grouping,
          'groupings', jsonb_build_object('name', g.name)
        )) FILTER (WHERE sg.id IS NOT NULL) as station_groupings,
        json_agg(DISTINCT jsonb_build_object(
          'id', p.id,
          'id_parameter_type', p.id_parameter_type,
          'status', p.status,
          'parameter_types', jsonb_build_object('name', pt.name, 'unit', pt.unit, 'symbol', pt.symbol)
        )) FILTER (WHERE p.id IS NOT NULL) as parameters
      FROM stations s
      LEFT JOIN station_groupings sg ON sg.id_station = s.id
      LEFT JOIN groupings g ON g.id = sg.id_grouping
      LEFT JOIN parameters p ON p.id_station = s.id
      LEFT JOIN parameter_types pt ON pt.id = p.id_parameter_type
      WHERE s.id = ${id}
      GROUP BY s.id
    `;

    if (!station)
      return NextResponse.json(
        { error: "Estação não encontrada." },
        { status: 404 },
      );

    const parametersWithLatest = await Promise.all(
      (station.parameters ?? []).map(async (param: { id: number }) => {
        const measurements = await sql`
          SELECT id, value, date_time FROM measurements
          WHERE id_parameter = ${param.id}
          ORDER BY date_time DESC
          LIMIT 1
        `;
        return { ...param, measurements };
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
