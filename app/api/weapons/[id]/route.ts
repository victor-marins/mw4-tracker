import { currentState, handle, json } from '@/lib/server/http';
import { deleteWeapon } from '@/lib/server/repo';
import { DEFAULT_PLAYERS } from '@/lib/weapons';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await deleteWeapon((await context.params).id, DEFAULT_PLAYERS);
    return json(await currentState());
  });
}
