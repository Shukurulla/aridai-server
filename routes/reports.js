const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const rc = require('../controllers/reportController');

router.post('/', auth, rc.createReport);
router.get('/', auth, adminOnly, rc.getReports);
router.put('/:id', auth, adminOnly, rc.updateReport);

module.exports = router;
