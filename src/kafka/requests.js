const express = require('express');
const router = express.Router();
const { sendRequestEvent } = require('../producers/requestProducer');
const { sendAnalyticsEvent } = require('../producers/analyticsProducer');

// POST /api/requests - إنشاء request جديد
router.post('/', async (req, res) => {
  try {
    const { userId, title, description, priority } = req.body;
    
    const requestId = 'req_' + Date.now(); // مثال
    
    // إرسال event لـ Kafka
    await sendRequestEvent('create', {
      requestId,
      userId,
      title,
      description,
      priority: priority || 'normal',
      status: 'pending',
      createdAt: new Date()
    });
    
    // إرسال analytics
    await sendAnalyticsEvent('action', {
      userId,
      action: 'request-created',
      requestId
    });
    
    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      requestId
    });
    
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create request' 
    });
  }
});

// PUT /api/requests/:id - تحديث request
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userId } = req.body;
    
    // إرسال event لـ Kafka
    await sendRequestEvent('update', {
      requestId: id,
      status,
      updatedAt: new Date()
    });
    
    // إرسال analytics
    await sendAnalyticsEvent('action', {
      userId,
      action: 'request-updated',
      requestId: id
    });
    
    res.json({
      success: true,
      message: 'Request updated successfully'
    });
    
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update request' 
    });
  }
});

// DELETE /api/requests/:id - إنهاء/حذف request
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // إرسال event لـ Kafka
    await sendRequestEvent('complete', {
      requestId: id,
      status: 'completed',
      completedAt: new Date()
    });
    
    // إرسال analytics
    await sendAnalyticsEvent('action', {
      userId,
      action: 'request-completed',
      requestId: id
    });
    
    res.json({
      success: true,
      message: 'Request completed successfully'
    });
    
  } catch (error) {
    console.error('Complete request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete request' 
    });
  }
});

// GET /api/requests - الحصول على كل الـ requests (مثال)
router.get('/', async (req, res) => {
  try {
    // هنا تجيب من الـ database
    const requests = [
      {
        requestId: 'req_1',
        title: 'Example Request',
        status: 'pending'
      }
    ];
    
    res.json({
      success: true,
      data: requests
    });
    
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get requests' 
    });
  }
});

module.exports = router;