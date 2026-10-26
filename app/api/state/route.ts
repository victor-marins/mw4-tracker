import { connection } from 'next/server';
import { currentState, handle, json } from '@/lib/server/http';

export async function GET() {
  await connection();
  return handle(async () => json(await currentState()));
}
