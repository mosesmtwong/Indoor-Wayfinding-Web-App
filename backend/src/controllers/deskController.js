const deskService = require('../services/deskService');
const { isValidDate } = require('../utils/validators');

/**
 * Controller for desk-related endpoints.
 */

// GET /api/desks — return all desks with computed availability
function getAllDesks(req, res) {
  try {
    const desks = deskService.getAllDesks();
    res.json({ desks });
  } catch (err) {
    console.error('Error fetching desks:', err);
    res.status(500).json({ error: 'Failed to fetch desks' });
  }
}

// GET /api/desks/:id/availability?date=YYYY-MM-DD
function getDeskAvailability(req, res) {
  try {
    const deskId = parseInt(req.params.id);

    // Check if desk exists
    const desk = deskService.getDeskById(deskId);
    if (!desk) {
      return res.status(404).json({ error: 'Desk not found' });
    }

    // Validate date param
    const { date } = req.query;
    if (!date || !isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid or missing date. Use format: YYYY-MM-DD' });
    }

    const slots = deskService.getAvailableSlots(deskId, date);
    res.json({ desk_id: deskId, desk_name: desk.name, date, slots });
  } catch (err) {
    console.error('Error fetching availability:', err);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
}

module.exports = { getAllDesks, getDeskAvailability };
