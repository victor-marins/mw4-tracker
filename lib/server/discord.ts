export async function postToDiscord(content: string) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    });
    if (!response.ok) console.warn(`[discord] webhook respondeu ${response.status}`);
  } catch (error) {
    console.warn('[discord] falha ao enviar webhook', error);
  }
}
