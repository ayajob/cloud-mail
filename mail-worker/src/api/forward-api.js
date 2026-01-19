// 邮件接收 API - 用于接收外部转发过来的邮件
// 添加到 mail-worker/src/api/ 目录
// 并在 mail-worker/src/hono/webs.js 中添加 import '../api/forward-api';

import app from '../hono/hono';
import emailService from '../service/email-service';
import accountService from '../service/account-service';
import { emailConst, isDel } from '../const/entity-const';

// JWT 验证 - 使用简化版本，只验证签名
async function verifyJwtToken(authHeader, jwtSecret) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No valid Authorization header');
        return false;
    }

    const token = authHeader.substring(7);

    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.log('Invalid JWT format');
            return false;
        }

        // Base64URL 解码函数
        function base64UrlDecode(str) {
            // 替换 URL 安全字符
            str = str.replace(/-/g, '+').replace(/_/g, '/');
            // 添加填充
            const pad = str.length % 4;
            if (pad) {
                if (pad === 1) throw new Error('Invalid base64 string');
                str += new Array(5 - pad).join('=');
            }
            // 解码
            const binary = atob(str);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }

        // 验证签名
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(jwtSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signatureBytes = base64UrlDecode(parts[2]);
        const dataToVerify = encoder.encode(parts[0] + '.' + parts[1]);

        const signatureValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes,
            dataToVerify
        );

        if (!signatureValid) {
            console.log('JWT signature verification failed');
            return false;
        }

        // 解析 payload 检查过期时间
        const payloadStr = new TextDecoder().decode(base64UrlDecode(parts[1]));
        const payload = JSON.parse(payloadStr);

        if (payload.exp && payload.exp < Date.now() / 1000) {
            console.log('JWT expired');
            return false;
        }

        console.log('JWT verification successful');
        return true;
    } catch (e) {
        console.error('JWT verification error:', e.message);
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

        // 优先使用 original_recipient（原始收件人，转发前的地址）
        // 如果没有，则使用 to 字段
        const toEmail = emailData.original_recipient || extractEmail(emailData.to);
        const sendEmail = extractEmail(emailData.from);
        const senderName = extractName(emailData.from);

        console.log(`Processing email for recipient: ${toEmail}, from: ${sendEmail}`);

        // 查找账号（根据原始收件人查找）
        let account = null;
        try {
            account = await accountService.selectByEmailIncludeDel({ env }, toEmail);
            console.log(`Found account for ${toEmail}: userId=${account?.userId}, accountId=${account?.accountId}`);
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
