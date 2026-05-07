const express = require('express');
const router = express.Router();
const deskController = require('../controllers/deskController');

// GET /api/desks — all desks with current availability
router.get('/', deskController.getAllDesks);

// GET /api/desks/:id/availability?date=YYYY-MM-DD — time slots
router.get('/:id/availability', deskController.getDeskAvailability);

module.exports = router;
