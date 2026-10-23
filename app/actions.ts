'use server'
import { kv } from '@vercel/kv';
import { revalidatePath } from 'next/cache';

const DB_KEY = 'mw4_tracker_state';

export async function getTrackerData() {
  const data = await kv.get(DB_KEY);
  return data || null;
}

export async function saveTrackerData(newData: any) {
  await kv.set(DB_KEY, newData);
  revalidatePath('/');
}
