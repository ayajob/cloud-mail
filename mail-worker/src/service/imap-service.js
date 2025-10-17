import Imap from 'imap';
import { simpleParser } from 'mailparser';
import orm from '../entity/orm';
import imapConfig from '../entity/imap-config';
import emailService from './email-service';
import accountService from './account-service';
import prefixAccessService from './prefix-access-service';
import { emailConst, isDel } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import { eq } from 'drizzle-orm';
import dayjs from 'dayjs';

const imapService = {
	async fetchEmails(c) {
		try {
			// Get IMAP configuration
			const config = await this.getImapConfig(c);
			if (!config) {
				console.log('No active IMAP configuration found');
				return;
			}

			// Connect to IMAP server
			const imap = new Imap({
				host: config.host,
				port: config.port,
				tls: config.useTLS === 1,
				tlsOptions: { rejectUnauthorized: false },
				user: config.username,
				password: config.password
			});

			return new Promise((resolve, reject) => {
				imap.once('ready', () => {
					imap.openBox(config.mailbox, false, (err, box) => {
						if (err) {
							console.error('Error opening mailbox:', err);
							reject(err);
							return;
						}

						// Search for unread emails since last fetch
						const searchCriteria = ['UNSEEN'];
						if (config.lastFetchTime) {
							searchCriteria.push(['SINCE', new Date(config.lastFetchTime)]);
						}

						imap.search(searchCriteria, (err, results) => {
							if (err) {
								console.error('Error searching emails:', err);
								reject(err);
								return;
							}

							if (results.length === 0) {
								console.log('No new emails found');
								imap.end();
								resolve([]);
								return;
							}

							// Fetch emails
							const fetch = imap.fetch(results, { bodies: '' });
							const emails = [];

							fetch.on('message', (msg, seqno) => {
								let buffer = '';
								
								msg.on('body', (stream, info) => {
									stream.on('data', (chunk) => {
										buffer += chunk.toString('utf8');
									});
								});

								msg.once('end', () => {
									simpleParser(buffer, (err, parsed) => {
										if (err) {
											console.error('Error parsing email:', err);
											return;
										}
										emails.push(parsed);
									});
								});
							});

							fetch.once('error', (err) => {
								console.error('Error fetching emails:', err);
								reject(err);
							});

							fetch.once('end', async () => {
								// Process fetched emails
								await this.processEmails(c, emails);
								
								// Update last fetch time
								await this.updateLastFetchTime(c, config.configId);
								
								imap.end();
								resolve(emails);
							});
						});
					});
				});

				imap.once('error', (err) => {
					console.error('IMAP connection error:', err);
					reject(err);
				});

				imap.connect();
			});
		} catch (error) {
			console.error('Error in fetchEmails:', error);
			throw error;
		}
	},

	async processEmails(c, emails) {
		for (const email of emails) {
			try {
				// Extract recipient email from headers or to field
				const recipient = this.extractRecipient(email);
				if (!recipient) {
					console.log('No recipient found for email:', email.messageId);
					continue;
				}

				// Check if this email matches any prefix pattern
				const prefixMatch = await this.findPrefixMatch(c, recipient);
				if (!prefixMatch) {
					console.log('No prefix match found for recipient:', recipient);
					continue;
				}

				// Process the email for the matched prefix
				await this.processEmailForPrefix(c, email, prefixMatch, recipient);
			} catch (error) {
				console.error('Error processing email:', error);
			}
		}
	},

	extractRecipient(email) {
		// Try to get recipient from various headers
		const headers = email.headers;
		const recipientHeaders = [
			'x-original-to',
			'original-recipient', 
			'delivered-to',
			'envelope-to',
			'x-receiver',
			'x-forwarded-to'
		];

		for (const header of recipientHeaders) {
			const value = headers.get(header);
			if (value) {
				const match = value.match(/<([^>]+)>/) || value.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})/);
				if (match) {
					return match[1].toLowerCase().trim();
				}
			}
		}

		// Fallback to 'to' field
		if (email.to && email.to.length > 0) {
			return email.to[0].address.toLowerCase().trim();
		}

		return null;
	},

	async findPrefixMatch(c, recipient) {
		// Get all active prefix access records
		const prefixes = await prefixAccessService.getAllActive(c);
		
		for (const prefix of prefixes) {
			// Check if recipient starts with prefix
			if (recipient.startsWith(prefix.prefix)) {
				return prefix;
			}
		}

		return null;
	},

	async processEmailForPrefix(c, email, prefixMatch, recipient) {
		try {
			// Get the account for this prefix
			const account = await accountService.selectById(c, prefixMatch.accountId);
			if (!account) {
				console.log('Account not found for prefix:', prefixMatch.prefix);
				return;
			}

			// Prepare email data
			const emailData = {
				toEmail: recipient,
				toName: email.to?.[0]?.name || '',
				sendEmail: email.from?.address || '',
				name: email.from?.name || emailUtils.getName(email.from?.address || ''),
				subject: email.subject || '',
				content: email.html || '',
				text: email.text || '',
				cc: email.cc ? JSON.stringify(email.cc) : '[]',
				bcc: email.bcc ? JSON.stringify(email.bcc) : '[]',
				recipient: JSON.stringify(email.to || []),
				inReplyTo: email.inReplyTo || '',
				relation: email.references || '',
				messageId: email.messageId || '',
				userId: prefixMatch.userId,
				accountId: prefixMatch.accountId,
				isDel: isDel.NORMAL,
				status: emailConst.status.RECEIVE
			};

			// Save email
			const emailRow = await emailService.receive(c, emailData, [], null);
			console.log('Email saved for prefix:', prefixMatch.prefix, 'Email ID:', emailRow.emailId);

		} catch (error) {
			console.error('Error processing email for prefix:', error);
		}
	},

	async getImapConfig(c) {
		return await orm(c)
			.select()
			.from(imapConfig)
			.where(eq(imapConfig.isActive, 1))
			.limit(1)
			.get();
	},

	async updateLastFetchTime(c, configId) {
		await orm(c)
			.update(imapConfig)
			.set({ 
				lastFetchTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
				updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
			})
			.where(eq(imapConfig.configId, configId))
			.run();
	},

	async createConfig(c, configData) {
		return await orm(c)
			.insert(imapConfig)
			.values({
				...configData,
				createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
				updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
			})
			.returning()
			.get();
	},

	async updateConfig(c, configId, configData) {
		return await orm(c)
			.update(imapConfig)
			.set({
				...configData,
				updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
			})
			.where(eq(imapConfig.configId, configId))
			.returning()
			.get();
	},

	async deleteConfig(c, configId) {
		await orm(c)
			.update(imapConfig)
			.set({ isActive: 0 })
			.where(eq(imapConfig.configId, configId))
			.run();
	}
};

export default imapService;