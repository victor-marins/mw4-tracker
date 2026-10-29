import { after } from 'next/server';
import { discordMessage, milestones } from '@/lib/milestones';
import { postToDiscord } from '@/lib/server/discord';
import { currentState, handle, json, readBody } from '@/lib/server/http';
import { setCamo, ValidationError } from '@/lib/server/repo';
import { ALL_CAMOS, type Camo } from '@/lib/types';

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody(request);
    if (typeof body.player !== 'string') throw new ValidationError('player obrigatório');
    if (typeof body.weaponId !== 'string') throw new ValidationError('weaponId obrigatório');
    if (typeof body.camo !== 'string' || !(ALL_CAMOS as readonly string[]).includes(body.camo)) {
      throw new ValidationError('Camuflagem inválida');
    }
    if (typeof body.value !== 'boolean') throw new ValidationError('value deve ser true ou false');

    const update = await setCamo(body.player, body.weaponId, body.camo as Camo, body.value);
    const message = discordMessage(body.player, update.events, milestones(update.before, update.after, update.weapons));
    if (message) after(() => postToDiscord(message));

    return json(await currentState());
  });
}
