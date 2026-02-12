import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const imapConfig = sqliteTable('imap_config', {
	configId: integer('config_id').primaryKey({ autoIncrement: true }),
	host: text('host').notNull(),
	port: integer('port').notNull(),
	username: text('username').notNull(),
	password: text('password').notNull(),
	useTLS: integer('use_tls').default(1).notNull(),
	useSSL: integer('use_ssl').default(0).notNull(),
	mailbox: text('mailbox').default('INBOX').notNull(),
	isActive: integer('is_active').default(1).notNull(),
	lastFetchTime: text('last_fetch_time'),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: text('update_time').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export default imapConfig;