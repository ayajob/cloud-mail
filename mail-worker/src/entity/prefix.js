import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const prefix = sqliteTable('prefix', {
	prefixId: integer('prefix_id').primaryKey({ autoIncrement: true }),
	prefix: text('prefix').notNull().unique(),
	password: text('password').notNull(),
	description: text('description'),
	isActive: integer('is_active').notNull().default(1),
	createdBy: integer('created_by').notNull(),
	createTime: integer('create_time').notNull(),
	updateTime: integer('update_time').notNull(),
	lastAccessTime: integer('last_access_time'),
	accessCount: integer('access_count').notNull().default(0)
});

export default prefix;