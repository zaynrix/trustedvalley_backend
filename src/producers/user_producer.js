const { kafka } = require('../kafka/config');

const producer = kafka.producer();
let isConnected = false;

// الاتصال بـ Kafka Producer
async function connectProducer() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('✅ User Producer connected');
  }
}

// إرسال User Event (Login, Register, Profile Update)
async function sendUserEvent(eventType, userData) {
  try {
    await connectProducer();
    
    const message = {
      key: userData.userId || 'anonymous',
      value: JSON.stringify({
        type: eventType,
        data: userData,
        timestamp: new Date().toISOString()
      })
    };
    
    await producer.send({
      topic: 'user-events',
      messages: [message]
    });
    
    console.log(`📤 User event sent: ${eventType}`);
    return { success: true, eventType };
    
  } catch (error) {
    console.error('❌ Error sending user event:', error);
    throw error;
  }
}

// مثال للاستخدام:
// sendUserEvent('login', { userId: '123', email: 'user@example.com' });
// sendUserEvent('register', { userId: '456', name: 'John', email: 'john@example.com' });
// sendUserEvent('profile-update', { userId: '123', name: 'Updated Name' });

module.exports = { sendUserEvent };