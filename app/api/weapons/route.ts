import { currentState, handle, json, readBody } from '@/lib/server/http';
import { addWeapon } from '@/lib/server/repo';

export async function POST(request: Request) {
  return handle(async () => {
    await addWeapon(await readBody(request));
    return json(await currentState(), 201);
  });
}
