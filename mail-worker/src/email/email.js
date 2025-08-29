 import PostalMime from 'postal-mime';
 import emailService from '../service/email-service';
 import accountService from '../service/account-service';
 import settingService from '../service/setting-service';
 import attService from '../service/att-service';
 import constant from '../const/constant';
 import fileUtils from '../utils/file-utils';
 import { emailConst, isDel, roleConst, settingConst } from '../const/entity-const';
 import emailUtils from '../utils/email-utils';
 import dayjs from 'dayjs';
 import utc from 'dayjs/plugin/utc';
 import timezone from 'dayjs/plugin/timezone';
 import roleService from '../service/role-service';
 import verifyUtils from '../utils/verify-utils';

 dayjs.extend(utc);
 dayjs.extend(timezone);

function extractFirstEmail(s) {
  const angle = s.match(/<\s*([^>]+)\s*>/);
  if (angle && angle[1]) return angle[1].trim();
  const m = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0] : null;
}

function normalizeEmail(addr, dropPlus = true) {
  let [local, domain] = addr.trim().toLowerCase().split('@');
  if (dropPlus && local.includes('+')) local = local.split('+')[0];
  return `${local}@${domain}`;
}

function resolveRecipientFromHeaders(headers, fallbackTo) {
  const keys = [
    'x-original-to',
    'original-recipient',
    'delivered-to',
    'envelope-to',
    'x-receiver',
    'x-forwarded-to',
  ];
  for (const k of keys) {
    const v = headers.get(k);
    if (v) {
      const email = extractFirstEmail(v);
      if (email) return normalizeEmail(email);
    }
  }
  if (fallbackTo) {
    const email = extractFirstEmail(fallbackTo);
    if (email) return normalizeEmail(email);
  }
  return null;
}

 export async function email(message, env, ctx) {

 	try {

 		const {
 			receive,
 			tgBotToken,
 			tgChatId,
 			tgBotStatus,
 			forwardStatus,
 			forwardEmail,
 			ruleEmail,
 			ruleType,
 			r2Domain,
 			noRecipient
 		} = await settingService.query({ env });

 		if (receive === settingConst.receive.CLOSE) {
 			return;
 		}

const headers = message.headers;
const toHeader = headers.get('to');
const resolvedTo = resolveRecipientFromHeaders(headers, toHeader) || message.to;

 		const reader = message.raw.getReader();
 		let content = '';

 		while (true) {
 			const { done, value } = await reader.read();
 			if (done) break;
 			content += new TextDecoder().decode(value);
 		}

 		const email = await PostalMime.parse(content);

-		const account = await accountService.selectByEmailIncludeDel({ env: env }, message.to);
+		// 用解析后的收件人匹配账号（支持 bbb.com）
+		const account = await accountService.selectByEmailIncludeDel({ env: env }, resolvedTo);

 		if (!account && noRecipient === settingConst.noRecipient.CLOSE) {
 			return;
 		}

 		if (account && account.email !== env.admin) {

 			let { banEmail, banEmailType, availDomain } = await roleService.selectByUserId({ env: env }, account.userId);

-			if(!roleService.hasAvailDomainPerm(availDomain, message.to)) {
+			if(!roleService.hasAvailDomainPerm(availDomain, resolvedTo)) {
 				return;
 			}

 			banEmail = banEmail.split(',').filter(item => item !== '');

 			for (const item of banEmail) {
        ...
 			}

 		}

-		const toName = email.to.find(item => item.address === message.to)?.name || '';
+		// 在解析后的收件人上找显示名（email.to 里可能有多收件人）
+		const toName = (email.to?.find?.(i => (i.address || '').toLowerCase() === resolvedTo) || {}).name || '';

 		const params = {
-			toEmail: message.to,
+			toEmail: resolvedTo,
 			toName: toName,
 			sendEmail: email.from.address,
 			name: email.from.name || emailUtils.getName(email.from.address),
 			subject: email.subject,
 			content: email.html,
 			text: email.text,
 			cc: email.cc ? JSON.stringify(email.cc) : '[]',
 			bcc: email.bcc ? JSON.stringify(email.bcc) : '[]',
 			recipient: JSON.stringify(email.to),
 			inReplyTo: email.inReplyTo,
 			relation: email.references,
 			messageId: email.messageId,
 			userId: account ? account.userId : 0,
 			accountId: account ? account.accountId : 0,
 			isDel: isDel.DELETE,
 			status: emailConst.status.SAVING
 		};

		const attachments = [];
		const cidAttachments = [];

		for (let item of email.attachments) {
			let attachment = { ...item };
			attachment.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(attachment.content) + fileUtils.getExtFileName(item.filename);
			attachment.size = item.content.length ?? item.content.byteLength;
			attachments.push(attachment);
			if (attachment.contentId) {
				cidAttachments.push(attachment);
			}
		}

		let emailRow = await emailService.receive({ env }, params, cidAttachments, r2Domain);

		attachments.forEach(attachment => {
			attachment.emailId = emailRow.emailId;
			attachment.userId = emailRow.userId;
			attachment.accountId = emailRow.accountId;
		});

		if (attachments.length > 0 && env.r2) {
			await attService.addAtt({ env }, attachments);
		}

 		emailRow = await emailService.completeReceive({ env }, account ? emailConst.status.RECEIVE : emailConst.status.NOONE, emailRow.emailId);

 		if (ruleType === settingConst.ruleType.RULE) {
 			const emails = ruleEmail.split(',');
-			if (!emails.includes(message.to)) {
+			if (!emails.includes(resolvedTo)) {
 				return;
 			}
 		}

 		if (tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {

 			const tgMessage = `<b>${params.subject}</b>

 <b>发件人：</b>${params.name}		&lt;${params.sendEmail}&gt;
-<b>收件人：\u200B</b>${message.to}
+<b>收件人：\u200B</b>${resolvedTo}
 <b>时间：</b>${dayjs.utc(emailRow.createTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm')}

 ${params.text || emailUtils.htmlToText(params.content) || ''}
 `;
			
			const tgChatIds = tgChatId.split(',');

			await Promise.all(tgChatIds.map(async chatId => {
				try {
					const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							chat_id: chatId,
							parse_mode: 'HTML',
							text: tgMessage
						})
					});
					if (!res.ok) {
						console.error(`转发 Telegram 失败: chatId=${chatId}, 状态码=${res.status}`);
					}
				} catch (e) {
					console.error(`转发 Telegram 失败: chatId=${chatId}`, e);
				}
			}));
		}

		if (forwardStatus === settingConst.forwardStatus.OPEN && forwardEmail) {

			const emails = forwardEmail.split(',');

			await Promise.all(emails.map(async email => {

				try {
					await message.forward(email);
				} catch (e) {
					console.error(`转发邮箱 ${email} 失败：`, e);
				}

			}));

		}

	} catch (e) {

		console.error('邮件接收异常: ', e);
	}
}
