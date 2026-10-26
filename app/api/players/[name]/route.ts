import { currentState, handle, json, readBody } from '@/lib/server/http';
import { removePlayer } from '@/lib/server/repo';

export async function DELETE(request: Request, context: { params: Promise<{ name: string }> }) {
  return handle(async () => {
    const body = await readBody(request);
    await removePlayer(body.actor, decodeURIComponent((await context.params).name));
    return json(await currentState());
  });
}
