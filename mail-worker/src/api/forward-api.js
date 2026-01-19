// 邮件接收 API - 简化版本，先测试路由是否工作
import app from '../hono/hono';

// 接收转发的邮件
app.post('/forward/receive', async (c) => {
    console.log('=== Forward receive API called ===');

    const env = c.env;

    try {
        const emailData = await c.req.json();

        console.log('Received email data:', {
            from: emailData.from,
            to: emailData.to,
            original_recipient: emailData.original_recipient,
            subject: emailData.subject
        });

        // 验证必要字段
        if (!emailData.from || !emailData.subject) {
            return c.json({ error: 'Missing required fields', code: 400 }, 400);
        }

        // 临时：直接返回成功，不存入数据库
        // 后续再添加数据库存储逻辑
        return c.json({
            success: true,
            message: 'Email received (test mode)',
            received: {
                from: emailData.from,
                to: emailData.to,
                original_recipient: emailData.original_recipient,
                subject: emailData.subject
            }
        });

    } catch (e) {
        console.error('Error processing email:', e.message);
        return c.json({ error: e.message, code: 500 }, 500);
    }
});

// 健康检查
app.get('/forward/health', async (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});
