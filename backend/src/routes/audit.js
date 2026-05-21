const express = require('express');
const { query } = require('../utils/db');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();
router.use(auth, adminOnly);

router.get('/', async (req, res) => {
  try {
    const { page=1, limit=50, action, search, team_member_id } = req.query;
    const offset = (parseInt(page)-1) * Math.min(parseInt(limit),100);
    const params = []; const conds = [];
    if (action)         { params.push(action);          conds.push(`al.action = $${params.length}`); }
    if (team_member_id) { params.push(team_member_id);  conds.push(`al.team_member_id = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(tm.full_name ILIKE $${params.length} OR ct.full_name ILIKE $${params.length})`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(Math.min(parseInt(limit),100)); params.push(offset);
    const [dataRes, countRes] = await Promise.all([
      query(`SELECT al.id, al.action, al.details, al.ip_address, al.created_at, al.conversation_id, al.contact_id, tm.full_name AS team_member_name, tm.role AS team_member_role, ct.full_name AS contact_name FROM activity_log al LEFT JOIN team_members tm ON tm.id = al.team_member_id LEFT JOIN contacts ct ON ct.id = al.contact_id ${where} ORDER BY al.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      query(`SELECT COUNT(*) FROM activity_log al LEFT JOIN team_members tm ON tm.id = al.team_member_id LEFT JOIN contacts ct ON ct.id = al.contact_id ${where}`, params.slice(0,-2)),
    ]);
    res.json({ success: true, logs: dataRes.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load audit log' });
  }
});
module.exports = router;
