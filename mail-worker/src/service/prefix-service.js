import orm from '../entity/orm';
import prefix from '../entity/prefix';
import email from '../entity/email';
import { and, desc, eq, gt, lt, count, asc, sql, like, or } from 'drizzle-orm';
import { isDel, emailConst } from '../const/entity-const';
import BizError from '../error/biz-error';
import attService from './att-service';
import userService from './user-service';
import { t } from '../i18n/i18n';
import dayjs from 'dayjs';

const prefixService = {

	async getEmailsByPrefix(c, params) {
		const { prefix: prefixName, password, page = 1, size = 20, emailId, timeSort } = params;

		// Verify prefix and password
		const prefixRow = await this.authenticatePrefix(c, prefixName, password);
		
		// Update access statistics
		await this.updateAccessStats(c, prefixRow.prefixId);

		let emailIdFilter = Number(emailId);
		const pageSize = Math.min(Number(size), 30);
		const timeDirection = Number(timeSort);

		if (!emailIdFilter) {
			emailIdFilter = timeDirection ? 0 : 9999999999;
		}

		// Get emails that match the prefix pattern
		const conditions = [
			eq(email.isDel, isDel.NORMAL),
			eq(email.type, emailConst.type.RECEIVE),
			timeDirection ? gt(email.emailId, emailIdFilter) : lt(email.emailId, emailIdFilter),
			// Match emails where toEmail starts with prefix@
			sql`${email.toEmail} COLLATE NOCASE LIKE ${prefixName.toLowerCase() + '@%'}`
		];

		const query = orm(c)
			.select()
			.from(email)
			.where(and(...conditions));

		if (timeDirection) {
			query.orderBy(asc(email.emailId));
		} else {
			query.orderBy(desc(email.emailId));
		}

		const listQuery = query.limit(pageSize).all();

		// Get total count for pagination
		const totalQuery = orm(c).select({ total: count() }).from(email).where(
			and(
				eq(email.isDel, isDel.NORMAL),
				eq(email.type, emailConst.type.RECEIVE),
				sql`${email.toEmail} COLLATE NOCASE LIKE ${prefixName.toLowerCase() + '@%'}`
			)
		).get();

		const [list, totalRow] = await Promise.all([listQuery, totalQuery]);

		// Get attachments for emails
		const emailIds = list.map(item => item.emailId);
		const attsList = await attService.selectByEmailIds(c, emailIds);

		list.forEach(emailRow => {
			const atts = attsList.filter(attsRow => attsRow.emailId === emailRow.emailId);
			emailRow.attList = atts;
			// Remove sensitive user information
			delete emailRow.userId;
			delete emailRow.accountId;
		});

		return { 
			list, 
			total: totalRow.total,
			page: Number(page),
			size: pageSize,
			totalPages: Math.ceil(totalRow.total / pageSize)
		};
	},

	async getEmailDetail(c, params) {
		const { prefix: prefixName, password, emailId } = params;

		// Verify prefix and password
		await this.authenticatePrefix(c, prefixName, password);

		const emailRow = await orm(c).select().from(email).where(
			and(
				eq(email.emailId, emailId),
				eq(email.isDel, isDel.NORMAL),
				eq(email.type, emailConst.type.RECEIVE),
				sql`${email.toEmail} COLLATE NOCASE LIKE ${prefixName.toLowerCase() + '@%'}`
			)
		).get();

		if (!emailRow) {
			throw new BizError(t('emailNotFound'), 404);
		}

		// Get attachments
		const attsList = await attService.selectByEmailIds(c, [emailId]);
		emailRow.attList = attsList;

		// Remove sensitive information
		delete emailRow.userId;
		delete emailRow.accountId;

		return emailRow;
	},

	async markEmailAsRead(c, params) {
		const { prefix: prefixName, password, emailId } = params;

		// Verify prefix and password
		await this.authenticatePrefix(c, prefixName, password);

		// For now, we'll just verify the email exists and belongs to the prefix
		// In a full implementation, you might want to add a read status field
		const emailRow = await orm(c).select().from(email).where(
			and(
				eq(email.emailId, emailId),
				eq(email.isDel, isDel.NORMAL),
				sql`${email.toEmail} COLLATE NOCASE LIKE ${prefixName.toLowerCase() + '@%'}`
			)
		).get();

		if (!emailRow) {
			throw new BizError(t('emailNotFound'), 404);
		}

		return true;
	},

	async getPrefixStats(c, params) {
		const { prefix: prefixName, password } = params;

		// Verify prefix and password
		await this.authenticatePrefix(c, prefixName, password);

		// Get email counts
		const totalEmails = await orm(c).select({ count: count() }).from(email).where(
			and(
				eq(email.isDel, isDel.NORMAL),
				eq(email.type, emailConst.type.RECEIVE),
				sql`${email.toEmail} COLLATE NOCASE LIKE ${prefixName.toLowerCase() + '@%'}`
			)
		).get();

		// Get recent emails count (last 7 days)
		const sevenDaysAgo = dayjs().subtract(7, 'day').valueOf();
		const recentEmails = await orm(c).select({ count: count() }).from(email).where(
			and(
				eq(email.isDel, isDel.NORMAL),
				eq(email.type, emailConst.type.RECEIVE),
				sql`${email.toEmail} COLLATE NOCASE LIKE ${prefixName.toLowerCase() + '@%'}`,
				gt(email.createTime, sevenDaysAgo)
			)
		).get();

		return {
			totalEmails: totalEmails.count,
			recentEmails: recentEmails.count,
			prefix: prefixName
		};
	},

	async authenticatePrefix(c, prefixName, password) {
		if (!prefixName || !password) {
			throw new BizError(t('prefixPasswordRequired'), 401);
		}

		const prefixRow = await orm(c).select().from(prefix).where(
			and(
				eq(prefix.prefix, prefixName.toLowerCase()),
				eq(prefix.isActive, 1)
			)
		).get();

		if (!prefixRow) {
			throw new BizError(t('invalidPrefix'), 401);
		}

		// Simple password comparison (in production, use proper hashing)
		if (prefixRow.password !== password) {
			throw new BizError(t('invalidPassword'), 401);
		}

		return prefixRow;
	},

	async updateAccessStats(c, prefixId) {
		const now = dayjs().valueOf();
		await orm(c).update(prefix).set({
			lastAccessTime: now,
			accessCount: sql`${prefix.accessCount} + 1`
		}).where(eq(prefix.prefixId, prefixId)).run();
	},

	// Admin functions
	async managePrefix(c, params, adminUserId) {
		const { action, prefix: prefixName, password, description } = params;

		// Verify admin permissions
		const user = await userService.selectById(c, adminUserId);
		if (user.email !== c.env.admin) {
			throw new BizError(t('adminRequired'), 403);
		}

		const now = dayjs().valueOf();

		switch (action) {
			case 'create':
				return await this.createPrefix(c, { prefixName, password, description, adminUserId, now });
			case 'update':
				return await this.updatePrefix(c, { prefixName, password, description, now });
			case 'toggle':
				return await this.togglePrefix(c, { prefixName });
			default:
				throw new BizError(t('invalidAction'), 400);
		}
	},

	async createPrefix(c, params) {
		const { prefixName, password, description, adminUserId, now } = params;

		if (!prefixName || !password) {
			throw new BizError(t('prefixPasswordRequired'), 400);
		}

		// Check if prefix already exists
		const existingPrefix = await orm(c).select().from(prefix).where(
			eq(prefix.prefix, prefixName.toLowerCase())
		).get();

		if (existingPrefix) {
			throw new BizError(t('prefixExists'), 400);
		}

		const prefixRow = await orm(c).insert(prefix).values({
			prefix: prefixName.toLowerCase(),
			password: password,
			description: description || '',
			createdBy: adminUserId,
			createTime: now,
			updateTime: now,
			isActive: 1,
			accessCount: 0
		}).returning().get();

		return prefixRow;
	},

	async updatePrefix(c, params) {
		const { prefixName, password, description, now } = params;

		const updateData = { updateTime: now };
		if (password) updateData.password = password;
		if (description !== undefined) updateData.description = description;

		const prefixRow = await orm(c).update(prefix).set(updateData).where(
			eq(prefix.prefix, prefixName.toLowerCase())
		).returning().get();

		if (!prefixRow) {
			throw new BizError(t('prefixNotFound'), 404);
		}

		return prefixRow;
	},

	async togglePrefix(c, params) {
		const { prefixName } = params;

		const prefixRow = await orm(c).select().from(prefix).where(
			eq(prefix.prefix, prefixName.toLowerCase())
		).get();

		if (!prefixRow) {
			throw new BizError(t('prefixNotFound'), 404);
		}

		const newStatus = prefixRow.isActive ? 0 : 1;
		const now = dayjs().valueOf();

		await orm(c).update(prefix).set({
			isActive: newStatus,
			updateTime: now
		}).where(eq(prefix.prefixId, prefixRow.prefixId)).run();

		return { ...prefixRow, isActive: newStatus };
	},

	async listPrefixes(c, params, adminUserId) {
		// Verify admin permissions
		const user = await userService.selectById(c, adminUserId);
		if (user.email !== c.env.admin) {
			throw new BizError(t('adminRequired'), 403);
		}

		const { page = 1, size = 20 } = params;
		const pageSize = Math.min(Number(size), 50);
		const offset = (Number(page) - 1) * pageSize;

		const listQuery = orm(c).select().from(prefix)
			.orderBy(desc(prefix.createTime))
			.limit(pageSize)
			.offset(offset)
			.all();

		const totalQuery = orm(c).select({ total: count() }).from(prefix).get();

		const [list, totalRow] = await Promise.all([listQuery, totalQuery]);

		// Don't return passwords in list
		const sanitizedList = list.map(item => ({
			...item,
			password: '***'
		}));

		return {
			list: sanitizedList,
			total: totalRow.total,
			page: Number(page),
			size: pageSize,
			totalPages: Math.ceil(totalRow.total / pageSize)
		};
	},

	async deletePrefix(c, params, adminUserId) {
		// Verify admin permissions
		const user = await userService.selectById(c, adminUserId);
		if (user.email !== c.env.admin) {
			throw new BizError(t('adminRequired'), 403);
		}

		const { prefix: prefixName } = params;

		const result = await orm(c).delete(prefix).where(
			eq(prefix.prefix, prefixName.toLowerCase())
		).run();

		if (result.changes === 0) {
			throw new BizError(t('prefixNotFound'), 404);
		}

		return true;
	}
};

export default prefixService;