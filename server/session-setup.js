const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

function setupSession(app, pool) {
  app.use(
    session({
      store: new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: false, // We handle this in migration
      }),
      secret: process.env.SESSION_SECRET || 'mindmentor-dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    })
  );
}

module.exports = { setupSession };
