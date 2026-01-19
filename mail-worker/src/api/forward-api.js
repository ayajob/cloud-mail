// 邮件接收 API - 用于接收外部转发过来的邮件
// 添加到 mail-worker/src/api/ 目录
// 并在 mail-worker/src/hono/webs.js 中添加 import '../api/forward-api';

import app from '../hono/hono';

// JWT 验证
async function verifyJwtToken(authHeader, jwtSecret) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    const token = authHeader.substring(7);

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(jwtSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        // Base64URL 解码
        const base64UrlDecode = (str) => {
            str = str.replace(/-/g, '+').replace(/_/g, '/');
            while (str.length % 4) str += '=';
            return Uint8Array.from(atob(str), c => c.charCodeAt(0));
        };

        const signatureValid = await crypto.subtle.verify(
            'HMAC',
            key,
            base64UrlDecode(parts[2]),
            encoder.encode(parts[0] + '.' + parts[1])
        );

        if (!signatureValid) return false;

        // 检查过期时间
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && payload.exp < Date.now() / 1000) {
            return false;
        }

        return true;
    } catch (e) {
        console.error('JWT verification failed:', e);
        return false;
    }
}

// 接收转发的邮件
app.post('/forward/receive', async (c) => {
    const env = c.env;

    // 验证 JWT
    const jwtSecret = env.JWT_SECRET || 'kgguR4FWyPjE&ZT';
    const authHeader = c.req.header('Authorization');

    const isValid = await verifyJwtToken(authHeader, jwtSecret);
    if (!isValid) {
        return c.json({ error: 'Unauthorized', code: 401 }, 401);
    }

    try {
        const emailData = await c.req.json();

        // 验证必要字段
        if (!emailData.from || !emailData.subject) {
            return c.json({ error: 'Missing required fields', code: 400 }, 400);
        }

        // 生成唯一 ID
        const emailId = crypto.randomUUID();
        const now = new Date().toISOString();

        // 存储到 D1 数据库
        // 根据你的 emailDao 结构调整
        const db = env.DB;
        if (db) {
            await db.prepare(`
        INSERT INTO emails (
          id, sender, recipient, subject, 
          body_text, body_html, message_id, 
          received_at, account, raw_email, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
                emailId,
                emailData.from || '',
                emailData.to || '',
                emailData.subject || '',
                emailData.body_text || '',
                emailData.body_html || '',
                emailData.message_id || '',
                now,
                emailData.account || '',
                emailData.raw || '',
                'forwarded'  // 标记为转发邮件
            ).run();
        }

        // 存储到 KV（可选）
        const kv = env.KV;
        if (kv) {
            const kvData = {
                id: emailId,
                from: emailData.from,
                to: emailData.to,
                subject: emailData.subject,
                date: emailData.date,
                received_at: now,
                account: emailData.account,
                source: 'forwarded'
            };
            await kv.put(`forward:${emailId}`, JSON.stringify(kvData), {
                expirationTtl: 60 * 60 * 24 * 30 // 30天过期
            });
        }

        console.log(`Forwarded email received: ${emailData.subject}`);

        return c.json({
            success: true,
            id: emailId,
            message: 'Email received successfully'
        });

    } catch (e) {
        console.error('Error processing forwarded email:', e);
        return c.json({ error: e.message, code: 500 }, 500);
    }
});

// 获取转发的邮件列表
app.get('/forward/list', async (c) => {
    const env = c.env;
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    try {
        const db = env.DB;
        if (!db) {
            return c.json({ emails: [], total: 0 });
        }

        const result = await db.prepare(`
      SELECT id, sender, recipient, subject, received_at, account
      FROM emails
      WHERE source = 'forwarded'
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

        return c.json({
            emails: result.results,
            total: result.results.length
        });

    } catch (e) {
        return c.json({ error: e.message, code: 500 }, 500);
    }
});
