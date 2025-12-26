const { kafka } = require('../kafka/config');

const producer = kafka.producer();
let isConnected = false;

async function connectProducer() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('✅ Request Producer connected');
  }
}

// إرسال Request Event (Create, Update, Complete)
async function sendRequestEvent(eventType, requestData) {
  try {
    await connectProducer();
    
    const message = {
      key: requestData.requestId || 'new',
      value: JSON.stringify({
        type: eventType,
        data: requestData,
        timestamp: new Date().toISOString()
      })
    };
    
    await producer.send({
      topic: 'request-events',
      messages: [message]
    });
    
    console.log(`📝 Request event sent: ${eventType}`);
    return { success: true, eventType };
    
  } catch (error) {
    console.error('❌ Error sending request event:', error);
    throw error;
  }
}

// مثال للاستخدام:
// sendRequestEvent('create', { requestId: '789', userId: '123', title: 'New Request' });
// sendRequestEvent('update', { requestId: '789', status: 'in-progress' });
// sendRequestEvent('complete', { requestId: '789', status: 'completed' });

module.exports = { sendRequestEvent };