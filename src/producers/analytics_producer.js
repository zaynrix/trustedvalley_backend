const { kafka } = require('../kafka/config');

const producer = kafka.producer();
let isConnected = false;

async function connectProducer() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('✅ Analytics Producer connected');
  }
}

// إرسال Analytics Event (Page View, Action, Error)
async function sendAnalyticsEvent(eventType, analyticsData) {
  try {
    await connectProducer();
    
    const message = {
      key: analyticsData.userId || 'anonymous',
      value: JSON.stringify({
        type: eventType,
        data: analyticsData,
        timestamp: new Date().toISOString()
      })
    };
    
    await producer.send({
      topic: 'analytics-events',
      messages: [message]
    });
    
    console.log(`📊 Analytics event sent: ${eventType}`);
    return { success: true, eventType };
    
  } catch (error) {
    console.error('❌ Error sending analytics event:', error);
    throw error;
  }
}

// مثال للاستخدام:
// sendAnalyticsEvent('page-view', { userId: '123', page: '/home' });
// sendAnalyticsEvent('action', { userId: '123', action: 'button-click', button: 'submit' });
// sendAnalyticsEvent('error', { userId: '123', error: 'API failed', code: 500 });

module.exports = { sendAnalyticsEvent };