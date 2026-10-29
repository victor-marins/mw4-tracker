import { currentState, handle, json, readBody } from '@/lib/server/http';
import { setOperatorPrestige } from '@/lib/server/repo';

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody(request);
    await setOperatorPrestige(body.player, body.level);
    return json(await currentState());
  });
}
