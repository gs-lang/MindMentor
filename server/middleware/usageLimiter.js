const FREE_DAILY_LIMIT = 5;
const FREE_MENTOR_LIMIT = 1; // Free users can only access mentor ID 2 (Alex Hormozi)
const FREE_ALLOWED_MENTOR_IDS = [2];

function createUsageLimiter(pool) {
  return async function usageLimiter(req, res, next) {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Get user subscription tier
      const userResult = await pool.query(
        'SELECT subscription_tier FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const tier = userResult.rows[0].subscription_tier;

      // Pro users have no limits
      if (tier === 'pro') {
        return next();
      }

      // Free tier: check mentor restriction
      const mentorId = req.body.mentorId || req.query.mentorId;
      if (mentorId && !FREE_ALLOWED_MENTOR_IDS.includes(Number(mentorId))) {
        return res.status(403).json({
          error: 'upgrade_required',
          message: 'Upgrade to Pro to access all mentors',
          limit: 'mentor_access',
        });
      }

      // Free tier: check daily question limit
      const today = new Date().toISOString().split('T')[0];
      const usageResult = await pool.query(
        `INSERT INTO usage_tracking (user_id, usage_date, question_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, usage_date)
         DO UPDATE SET question_count = usage_tracking.question_count + 1
         RETURNING question_count`,
        [userId, today]
      );

      const count = usageResult.rows[0].question_count;

      if (count > FREE_DAILY_LIMIT) {
        // Roll back the increment
        await pool.query(
          `UPDATE usage_tracking SET question_count = question_count - 1
           WHERE user_id = $1 AND usage_date = $2`,
          [userId, today]
        );

        return res.status(429).json({
          error: 'daily_limit_reached',
          message: `Free tier limit: ${FREE_DAILY_LIMIT} questions per day. Upgrade to Pro for unlimited.`,
          limit: 'daily_questions',
          used: FREE_DAILY_LIMIT,
          max: FREE_DAILY_LIMIT,
        });
      }

      // Attach usage info to request for downstream use
      req.usageInfo = { tier, questionsUsedToday: count, dailyLimit: FREE_DAILY_LIMIT };
      next();
    } catch (err) {
      console.error('Usage limiter error:', err);
      next(); // Fail open to avoid blocking users on DB errors
    }
  };
}

module.exports = { createUsageLimiter };
