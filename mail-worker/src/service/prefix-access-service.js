import orm from '../entity/orm';
import prefixAccess from '../entity/prefix-access';
import { eq, and, like } from 'drizzle-orm';
import cryptoUtils from '../utils/crypto-utils';
import emailService from './email-service';
import dayjs from 'dayjs';

const prefixAccessService = {
	async create(c, params) {
		const { prefix, accessPassword, userId, accountId } = params;
		
		// Hash the access password
		const hashedPassword = await cryptoUtils.hashPassword(accessPassword);
		
		return await orm(c)
			.insert(prefixAccess)
			.values({
				prefix: prefix.toLowerCase(),
				accessPassword: hashedPassword,
				userId,
				accountId,
				isActive: 1,
				createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
				updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
			})
			.returning()
			.get();
	},

	async update(c, prefixId, params) {
		const updateData = {
			updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
		};

		if (params.prefix) {
			updateData.prefix = params.prefix.toLowerCase();
		}

		if (params.accessPassword) {
			updateData.accessPassword = await cryptoUtils.hashPassword(params.accessPassword);
		}

		if (params.accountId) {
			updateData.accountId = params.accountId;
		}

		return await orm(c)
			.update(prefixAccess)
			.set(updateData)
			.where(eq(prefixAccess.prefixId, prefixId))
			.returning()
			.get();
	},

	async delete(c, prefixId) {
		await orm(c)
			.update(prefixAccess)
			.set({ isActive: 0 })
			.where(eq(prefixAccess.prefixId, prefixId))
			.run();
	},

	async getByPrefix(c, prefix) {
		return await orm(c)
			.select()
			.from(prefixAccess)
			.where(and(
				eq(prefixAccess.prefix, prefix.toLowerCase()),
				eq(prefixAccess.isActive, 1)
			))
			.get();
	},

	async getByUserId(c, userId) {
		return await orm(c)
			.select()
			.from(prefixAccess)
			.where(and(
				eq(prefixAccess.userId, userId),
				eq(prefixAccess.isActive, 1)
			))
			.all();
	},

	async getAllActive(c) {
		return await orm(c)
			.select()
			.from(prefixAccess)
			.where(eq(prefixAccess.isActive, 1))
			.all();
	},

	async verifyAccess(c, prefix, password) {
		const prefixRecord = await this.getByPrefix(c, prefix);
		if (!prefixRecord) {
			return false;
		}

		return await cryptoUtils.verifyPassword(password, prefixRecord.accessPassword);
	},

	async getEmailsByPrefix(c, prefix, params) {
		// Verify access first
		const { accessPassword } = params;
		const isValid = await this.verifyAccess(c, prefix, accessPassword);
		if (!isValid) {
			throw new Error('Invalid prefix or access password');
		}

		const prefixRecord = await this.getByPrefix(c, prefix);
		if (!prefixRecord) {
			throw new Error('Prefix not found');
		}

		// Get emails for this prefix using the account
		return await emailService.list(c, {
			...params,
			accountId: prefixRecord.accountId
		}, prefixRecord.userId);
	}
};

export default prefixAccessService;