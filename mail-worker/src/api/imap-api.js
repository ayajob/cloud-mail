import app from '../hono/hono';
import imapService from '../service/imap-service';
import prefixAccessService from '../service/prefix-access-service';
import result from '../model/result';
import userContext from '../security/user-context';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

// IMAP Configuration Management
app.post('/imap/config', async (c) => {
	const userId = userContext.getUserId(c);
	const configData = await c.req.json();
	
	// Only admin can manage IMAP config
	if (c.env.admin !== userContext.getUserEmail(c)) {
		throw new BizError(t('noPermission'), 403);
	}

	const config = await imapService.createConfig(c, configData);
	return c.json(result.ok(config));
});

app.put('/imap/config/:configId', async (c) => {
	const userId = userContext.getUserId(c);
	const configId = parseInt(c.req.param('configId'));
	const configData = await c.req.json();
	
	// Only admin can manage IMAP config
	if (c.env.admin !== userContext.getUserEmail(c)) {
		throw new BizError(t('noPermission'), 403);
	}

	const config = await imapService.updateConfig(c, configId, configData);
	return c.json(result.ok(config));
});

app.delete('/imap/config/:configId', async (c) => {
	const userId = userContext.getUserId(c);
	const configId = parseInt(c.req.param('configId'));
	
	// Only admin can manage IMAP config
	if (c.env.admin !== userContext.getUserEmail(c)) {
		throw new BizError(t('noPermission'), 403);
	}

	await imapService.deleteConfig(c, configId);
	return c.json(result.ok());
});

app.get('/imap/config', async (c) => {
	// Only admin can view IMAP config
	if (c.env.admin !== userContext.getUserEmail(c)) {
		throw new BizError(t('noPermission'), 403);
	}

	const config = await imapService.getImapConfig(c);
	return c.json(result.ok(config));
});

// Manual email fetching
app.post('/imap/fetch', async (c) => {
	// Only admin can trigger manual fetch
	if (c.env.admin !== userContext.getUserEmail(c)) {
		throw new BizError(t('noPermission'), 403);
	}

	const emails = await imapService.fetchEmails(c);
	return c.json(result.ok(emails));
});

// Prefix Access Management
app.post('/prefix-access', async (c) => {
	const userId = userContext.getUserId(c);
	const { prefix, accessPassword, accountId } = await c.req.json();

	const prefixRecord = await prefixAccessService.create(c, {
		prefix,
		accessPassword,
		userId,
		accountId
	});

	return c.json(result.ok(prefixRecord));
});

app.put('/prefix-access/:prefixId', async (c) => {
	const userId = userContext.getUserId(c);
	const prefixId = parseInt(c.req.param('prefixId'));
	const params = await c.req.json();

	const prefixRecord = await prefixAccessService.update(c, prefixId, params);
	return c.json(result.ok(prefixRecord));
});

app.delete('/prefix-access/:prefixId', async (c) => {
	const userId = userContext.getUserId(c);
	const prefixId = parseInt(c.req.param('prefixId'));

	await prefixAccessService.delete(c, prefixId);
	return c.json(result.ok());
});

app.get('/prefix-access', async (c) => {
	const userId = userContext.getUserId(c);
	const prefixes = await prefixAccessService.getByUserId(c, userId);
	return c.json(result.ok(prefixes));
});

// Public endpoint for accessing emails by prefix
app.post('/prefix-access/:prefix/emails', async (c) => {
	const prefix = c.req.param('prefix');
	const { accessPassword, ...emailParams } = await c.req.json();

	try {
		const emails = await prefixAccessService.getEmailsByPrefix(c, prefix, {
			...emailParams,
			accessPassword
		});
		return c.json(result.ok(emails));
	} catch (error) {
		throw new BizError(error.message, 401);
	}
});

// Verify prefix access
app.post('/prefix-access/:prefix/verify', async (c) => {
	const prefix = c.req.param('prefix');
	const { accessPassword } = await c.req.json();

	const isValid = await prefixAccessService.verifyAccess(c, prefix, accessPassword);
	return c.json(result.ok({ valid: isValid }));
});