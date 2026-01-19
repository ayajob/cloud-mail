// 邮件接收 API - 用于接收外部转发过来的邮件
// 添加到 mail-worker/src/api/ 目录
// 并在 mail-worker/src/hono/webs.js 中添加 import '../api/forward-api';

import app from '../hono/hono';
import emailService from '../service/email-service';
import accountService from '../service/account-service';
import { emailConst, isDel } from '../const/entity-const';

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

// 从邮件地址中提取名称
function extractName(emailStr) {
    if (!emailStr) return '';
    const match = emailStr.match(/^([^<]+)\s*</);
    if (match) return match[1].trim();
    const atIndex = emailStr.indexOf('@');
    if (atIndex > 0) return emailStr.substring(0, atIndex);
    return emailStr;
}

// 从邮件地址中提取纯邮箱
function extractEmail(emailStr) {
    if (!emailStr) return '';
    const match = emailStr.match(/<([^>]+)>/);
    if (match) return match[1].trim().toLowerCase();
    const emailMatch = emailStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/);
    return emailMatch ? emailMatch[0].toLowerCase() : emailStr.toLowerCase();
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

        // 解析收件人邮箱
        const toEmail = extractEmail(emailData.to);
        const sendEmail = extractEmail(emailData.from);
        const senderName = extractName(emailData.from);

        // 查找账号
        let account = null;
        try {
            account = await accountService.selectByEmailIncludeDel({ env }, toEmail);
        } catch (e) {
            console.log('Account not found for:', toEmail);
        }

        // 构造邮件参数（与 email.js 中的格式一致）
        const params = {
            toEmail: toEmail,
            toName: extractName(emailData.to),
            sendEmail: sendEmail,
            name: senderName,
            subject: emailData.subject,
            content: emailData.body_html || '',
            text: emailData.body_text || '',
            cc: '[]',
            bcc: '[]',
            recipient: JSON.stringify([{ address: toEmail, name: extractName(emailData.to) }]),
            inReplyTo: '',
            relation: '',
            messageId: emailData.message_id || '',
            userId: account ? account.userId : 0,
            accountId: account ? account.accountId : 0,
            isDel: isDel.NORMAL,  // 使用 NORMAL 而不是 DELETE，这样邮件会立即显示
            status: emailConst.status.RECEIVE,
            type: emailConst.type.RECEIVE
        };

        // 使用 emailService 保存邮件
        const emailRow = await emailService.receive({ env }, params, [], env.r2Domain || '');

        console.log(`Forwarded email saved: ${emailData.subject}, emailId: ${emailRow.emailId}`);

        return c.json({
            success: true,
            id: emailRow.emailId,
            message: 'Email received successfully'
        });

    } catch (e) {
        console.error('Error processing forwarded email:', e);
        return c.json({ error: e.message, code: 500 }, 500);
    }
});
