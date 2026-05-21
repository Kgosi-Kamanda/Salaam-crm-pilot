// src/routes/dashboard.js
const express = require('express');
const { query } = require('../utils/db');
const { auth } = require('../middleware/auth');
const router  = express.Router();
router.use(auth);

router.get('/stats', async (req, res) => {
  try {
    const [summary, bySource, agentPerf, slaBreaches, csatData, avgResp] = await Promise.all([
      query(`SELECT * FROM v_dashboard_stats`),
      query(`SELECT primary_source AS name, COUNT(*) AS count FROM contacts WHERE primary_source IS NOT NULL GROUP BY primary_source ORDER BY count DESC`),
      query(`SELECT * FROM v_agent_performance ORDER BY resolved DESC LIMIT 20`),
      query(`SELECT * FROM v_sla_breaches LIMIT 20`),
      query(`SELECT ROUND(AVG(csat_score),1) AS avg_csat, COUNT(*) AS total_csat FROM conversations WHERE csat_score IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'`),
      query(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60)) AS avg_response_minutes FROM conversations WHERE first_response_at IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'`),
    ]);
    res.json({
      success: true,
      summary:           summary.rows[0],
      by_source:         bySource.rows,
      agent_performance: agentPerf.rows,
      sla_breaches:      slaBreaches.rows,
      csat:              csatData.rows[0],
      avg_response_minutes: parseInt(avgResp.rows[0]?.avg_response_minutes) || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

router.get('/sla-breaches', async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM v_sla_breaches`);
    res.json({ success: true, breaches: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load SLA breaches' });
  }
});

module.exports = router;
