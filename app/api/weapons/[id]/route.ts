import { currentState, handle, json } from '@/lib/server/http';
import { deleteWeapon } from '@/lib/server/repo';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await deleteWeapon((await context.params).id);
    return json(await currentState());
  });
}
