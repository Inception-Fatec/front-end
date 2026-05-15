import { register, collectDefaultMetrics } from 'prom-client';
import { NextResponse } from 'next/server';

// Garante que as métricas padrão do Node.js sejam coletadas
collectDefaultMetrics({ prefix: 'inception_api_' });

export async function GET() {
  try {
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      headers: { 'Content-Type': register.contentType },
    });
  } catch (err) {
    return new NextResponse('Erro ao coletar métricas', { status: 500 });
  }
}