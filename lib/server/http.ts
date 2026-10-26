import { NextResponse } from 'next/server';
import { RuleError } from '../rules';
import type { TrackerState } from '../types';
import { getState, ValidationError } from './repo';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    throw new ValidationError('Envie JSON');
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('JSON inválido');
  return body as Record<string, unknown>;
}

export function currentState(): Promise<TrackerState> {
  return getState();
}

export async function handle(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof RuleError || error instanceof ValidationError) {
      return json({ error: error.message }, error instanceof RuleError ? 409 : 400);
    }
    console.error('[api] erro inesperado', error);
    return json({ error: 'Erro interno' }, 500);
  }
}
