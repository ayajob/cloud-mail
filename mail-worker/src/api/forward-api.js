// 邮件接收 API - 用于接收外部转发过来的邮件
import app from '../hono/hono';
import orm from '../entity/orm';
import { email } from '../entity/email';
import accountService from '../service/account-service';
import { emailConst, isDel } from '../const/entity-const';

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
    console.log('=== Forward receive API called ===');

    const env = c.env;

    try {
        const emailData = await c.req.json();

        // 验证必要字段
        if (!emailData.from || !emailData.subject) {
            return c.json({ error: 'Missing required fields', code: 400 }, 400);
        }

        // 优先使用 original_recipient，否则使用 to
        const toEmail = emailData.original_recipient || extractEmail(emailData.to);
        const sendEmail = extractEmail(emailData.from);
        const senderName = extractName(emailData.from);

        console.log(`Processing email: from=${sendEmail}, to=${toEmail}, subject=${emailData.subject}`);

        // 查找账号
        let account = null;
        try {
            account = await accountService.selectByEmailIncludeDel({ env }, toEmail);
            console.log(`Found account: userId=${account?.userId}, accountId=${account?.accountId}`);
        } catch (e) {
            console.log('Account not found for:', toEmail);
        }

        // 插入邮件到数据库
        const result = await orm({ env })
            .insert(email)
            .values({
                sendEmail: sendEmail,
                name: senderName,
                accountId: account ? account.accountId : 0,
                userId: account ? account.userId : 0,
                subject: emailData.subject || '',
                text: emailData.body_text || '',
                content: emailData.body_html || '',
                cc: '[]',
                bcc: '[]',
                recipient: JSON.stringify([{ address: toEmail, name: extractName(emailData.to) }]),
                toEmail: toEmail,
                toName: extractName(emailData.to),
                inReplyTo: '',
                relation: '',
                messageId: emailData.message_id || '',
                type: emailConst.type.RECEIVE,
                status: emailConst.status.RECEIVE,
                isDel: isDel.NORMAL
            })
            .returning()
            .get();

        console.log(`Email saved with emailId: ${result.emailId}`);

        return c.json({
            success: true,
            id: result.emailId,
            message: 'Email received successfully'
        });

    } catch (e) {
        console.error('Error processing email:', e.message, e.stack);
        return c.json({ error: e.message, code: 500 }, 500);
    }
});

// 健康检查
app.get('/forward/health', async (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});
