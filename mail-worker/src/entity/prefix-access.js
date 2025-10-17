import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const prefixAccess = sqliteTable('prefix_access', {
	prefixId: integer('prefix_id').primaryKey({ autoIncrement: true }),
	prefix: text('prefix').notNull().unique(),
	accessPassword: text('access_password').notNull(),
	userId: integer('user_id').notNull(),
	accountId: integer('account_id').notNull(),
	isActive: integer('is_active').default(1).notNull(),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: text('update_time').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export default prefixAccess;