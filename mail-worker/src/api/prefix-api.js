import app from '../hono/hono';
import prefixService from '../service/prefix-service';
import result from '../model/result';
import userContext from '../security/user-context';

// Get emails for a specific prefix (with authentication)
app.post('/prefix/emails', async (c) => {
	const { prefix, password, page = 1, size = 20 } = await c.req.json();
	const data = await prefixService.getEmailsByPrefix(c, { prefix, password, page, size });
	return c.json(result.ok(data));
});

// Admin endpoint to manage prefix passwords
app.post('/prefix/manage', async (c) => {
	const adminUserId = userContext.getUserId(c);
	const params = await c.req.json();
	const data = await prefixService.managePrefix(c, params, adminUserId);
	return c.json(result.ok(data));
});

// Admin endpoint to list all prefixes
app.get('/prefix/list', async (c) => {
	const adminUserId = userContext.getUserId(c);
	const params = c.req.query();
	const data = await prefixService.listPrefixes(c, params, adminUserId);
	return c.json(result.ok(data));
});

// Admin endpoint to delete prefix
app.delete('/prefix/delete', async (c) => {
	const adminUserId = userContext.getUserId(c);
	const params = c.req.query();
	await prefixService.deletePrefix(c, params, adminUserId);
	return c.json(result.ok());
});

// Get email details by ID (with prefix authentication)
app.post('/prefix/email/detail', async (c) => {
	const { prefix, password, emailId } = await c.req.json();
	const data = await prefixService.getEmailDetail(c, { prefix, password, emailId });
	return c.json(result.ok(data));
});

// Mark email as read
app.post('/prefix/email/read', async (c) => {
	const { prefix, password, emailId } = await c.req.json();
	await prefixService.markEmailAsRead(c, { prefix, password, emailId });
	return c.json(result.ok());
});

// Get email statistics for prefix
app.post('/prefix/stats', async (c) => {
	const { prefix, password } = await c.req.json();
	const data = await prefixService.getPrefixStats(c, { prefix, password });
	return c.json(result.ok(data));
});