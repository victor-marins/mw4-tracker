'use server'

import { createClient } from 'redis';
import { revalidatePath } from 'next/cache';

const DB_KEY = 'mw4_tracker_data';

async function getRedisClient() {
  const redis = await createClient().connect();
  return redis;
}

export async function getTrackerData() {
  try {
    const redis = await getRedisClient();
    const data = await redis.get(DB_KEY);
    await redis.disconnect();
    
    return data ? JSON.parse(data) : null; 
  } catch (error) {
    console.error('Erro ao ler da base de dados:', error);
    return null;
  }
}

export async function saveTrackerData(data: any) {
  try {
    const redis = await getRedisClient();
    await redis.set(DB_KEY, JSON.stringify(data));
    await redis.disconnect();
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Erro ao gravar na base de dados:', error);
    return { success: false };
  }
}