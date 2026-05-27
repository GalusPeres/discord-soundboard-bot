// Bearer token middleware. BOT_API_TOKEN is required when the API starts.

function bearerAuth(req, res, next) {
    const expected = process.env.BOT_API_TOKEN;
    const header = req.headers.authorization || '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (provided !== expected) return res.status(401).json({ error: 'unauthorized' });
    next();
}

module.exports = { bearerAuth };
