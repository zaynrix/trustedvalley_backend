const express = require('express');
const router = express.Router();
const contentService = require('../content/contentService');
const authMiddleware = require('../auth/middleware/authMiddleware');
const roleMiddleware = require('../auth/middleware/roleMiddleware');
const { translate } = require('../utils/i18n');

// GET /api/content/home
router.get('/home', async (req, res, next) => {
  try {
    const data = await contentService.getHomeContent();
    if (!data) {
      return res.status(404).json({ 
        error: 'home-content-not-found', 
        message: translate(req, 'errors.home-content-not-found') 
      });
    }
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/statistics
router.get('/statistics', async (req, res, next) => {
  try {
    const items = await contentService.getStatisticsItems();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/statistics/:id
router.get('/statistics/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await contentService.getStatisticsItemById(id);
    if (!item) {
      return res.status(404).json({ 
        error: 'item-not-found', 
        message: translate(req, 'errors.item-not-found') 
      });
    }
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

// ADMIN: Upsert home content (role 0 = admin)
router.post('/home', authMiddleware, roleMiddleware(0), async (req, res, next) => {
  try {
    const data = req.body;
    const result = await contentService.upsertHomeContent(data);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ADMIN: Create statistic item (role 0 = admin)
router.post('/statistics', authMiddleware, roleMiddleware(0), async (req, res, next) => {
  try {
    const item = req.body;
    const created = await contentService.createStatisticsItem(item);
    res.status(201).json({ item: created });
  } catch (err) {
    next(err);
  }
});

// ADMIN: Update statistic item (role 0 = admin)
router.put('/statistics/:id', authMiddleware, roleMiddleware(0), async (req, res, next) => {
  try {
    const id = req.params.id;
    const fields = req.body || {};
    const updated = await contentService.updateStatisticsItem(id, fields);
    if (!updated) {
      return res.status(404).json({ 
        error: 'not-found', 
        message: translate(req, 'errors.not-found') 
      });
    }
    res.json({ item: updated });
  } catch (err) {
    next(err);
  }
});

// ADMIN: Delete statistic item (role 0 = admin)
router.delete('/statistics/:id', authMiddleware, roleMiddleware(0), async (req, res, next) => {
  try {
    const id = req.params.id;
    await contentService.deleteStatisticsItem(id);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
