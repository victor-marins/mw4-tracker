import { currentState, handle, json, readBody } from '@/lib/server/http';
import { addPlayer } from '@/lib/server/repo';

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody(request);
    await addPlayer(body.actor, body.name);
    return json(await currentState(), 201);
  });
}
