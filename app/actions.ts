'use server'

import { kv } from '@vercel/kv';

const DB_KEY = 'mw4_tracker_data';

export async function getTrackerData() {
  try {
    const data = await kv.get(DB_KEY);
    return data; 
  } catch (error) {
    console.error('Erro ao ler do banco:', error);
    return null;
  }
}

export async function saveTrackerData(data: any) {
  try {
    await kv.set(DB_KEY, data);
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar no banco:', error);
    return { success: false };
  }
}
