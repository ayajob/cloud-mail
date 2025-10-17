import emailService from './email-service';
import settingService from './setting-service';
import attService from './att-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { emailConst, isDel, settingConst } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

function extractFirstEmail(s) {
  if (!s) return null;
  const angle = s.match(/<\s*([^>]+)\s*>/);
  if (angle && angle[1]) return angle[1].trim();
  const m = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0] : null;
}

function normalizeEmail(addr, dropPlus = true) {
  if (!addr) return null;
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
      const em = extractFirstEmail(v);
      if (em) return normalizeEmail(em);
    }
  }
  if (fallbackTo) {
    const em = extractFirstEmail(fallbackTo);
    if (em) return normalizeEmail(em);
  }
  return null;
}

const imapService = {

	/**
	 * Process incoming email from IMAP catch-all
	 * This replaces the original email function but works with catch-all
	 */
	async processIncomingEmail(message, env, ctx) {
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

			// Parse the "real recipient" (supports forwarding headers)
			const headers = message.headers;
			const toHeader = headers.get('to');
			const resolvedTo = resolveRecipientFromHeaders(headers, toHeader) || message.to;

			// Read and parse raw email
			const reader = message.raw.getReader();
			let content = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				content += new TextDecoder().decode(value);
			}
			
			// Use PostalMime for parsing
			const PostalMime = (await import('postal-mime')).default;
			const email = await PostalMime.parse(content);

			// Extract prefix from recipient email
			const prefix = this.extractPrefixFromEmail(resolvedTo);
			
			// For catch-all system, we don't need to match specific accounts
			// All emails are stored and filtered by prefix when accessed
			
			// Find display name in email.to that matches resolvedTo
			const toName = (email.to?.find?.(i => (i.address || '').toLowerCase() === resolvedTo)?.name) || '';

			const params = {
				toEmail: resolvedTo,
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
				userId: 0, // No specific user for catch-all
				accountId: 0, // No specific account for catch-all
				isDel: isDel.NORMAL, // Changed from DELETE to NORMAL for catch-all
				status: emailConst.status.SAVING,
				prefix: prefix // Store the extracted prefix
			};

			const attachments = [];
			const cidAttachments = [];

			for (let item of email.attachments) {
				let attachment = { ...item };
				attachment.key =
					constant.ATTACHMENT_PREFIX +
					(await fileUtils.getBuffHash(attachment.content)) +
					fileUtils.getExtFileName(item.filename);
				attachment.size = item.content.length ?? item.content.byteLength;
				attachments.push(attachment);
				if (attachment.contentId) {
					cidAttachments.push(attachment);
				}
			}

			let emailRow = await emailService.receiveCatchAll({ env }, params, cidAttachments, r2Domain);

			attachments.forEach(attachment => {
				attachment.emailId = emailRow.emailId;
				attachment.userId = 0; // No specific user
				attachment.accountId = 0; // No specific account
			});

			if (attachments.length > 0 && env.r2) {
				await attService.addAtt({ env }, attachments);
			}

			emailRow = await emailService.completeReceive(
				{ env },
				emailConst.status.RECEIVE, // Always mark as received for catch-all
				emailRow.emailId
			);

			// Handle rule-based filtering if needed
			if (ruleType === settingConst.ruleType.RULE) {
				const emails = (ruleEmail || '').split(',');
				if (!emails.includes(resolvedTo)) {
					return;
				}
			}

			// Telegram notifications
			if (tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {
				const tgMessage = `<b>${params.subject}</b>

<b>发件人：</b>${params.name}\t&lt;${params.sendEmail}&gt;
<b>收件人：</b>${resolvedTo}
<b>前缀：</b>${prefix}
<b>时间：</b>${dayjs.utc(emailRow.createTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm')}

${params.text || emailUtils.htmlToText(params.content) || ''}
`;

				const tgChatIds = tgChatId.split(',');

				await Promise.all(
					tgChatIds.map(async chatId => {
						try {
							const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
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
					})
				);
			}

			// Email forwarding
			if (forwardStatus === settingConst.forwardStatus.OPEN && forwardEmail) {
				const emails = forwardEmail.split(',');
				await Promise.all(
					emails.map(async em => {
						try {
							await message.forward(em);
						} catch (e) {
							console.error(`转发邮箱 ${em} 失败：`, e);
						}
					})
				);
			}

			return emailRow;

		} catch (e) {
			console.error('邮件接收异常: ', e);
			throw e;
		}
	},

	/**
	 * Extract prefix from email address
	 * For example: "test@domain.com" -> "test"
	 */
	extractPrefixFromEmail(email) {
		if (!email) return '';
		const [local] = email.toLowerCase().split('@');
		return local || '';
	},

	/**
	 * Check if an email belongs to a specific prefix
	 */
	emailMatchesPrefix(email, prefix) {
		if (!email || !prefix) return false;
		const emailPrefix = this.extractPrefixFromEmail(email);
		return emailPrefix === prefix.toLowerCase();
	},

	/**
	 * Get all emails for a specific prefix
	 * This is used by the prefix service
	 */
	async getEmailsForPrefix(c, prefix, options = {}) {
		const { page = 1, size = 20, timeSort = 0 } = options;
		
		// This will be handled by prefix-service.js
		// Just a placeholder for any IMAP-specific logic
		return null;
	}
};

export default imapService;