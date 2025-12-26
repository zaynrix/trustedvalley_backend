const { kafka } = require('../kafka/config');

const consumer = kafka.consumer({ groupId: 'notification-service' });

// بدء الاستماع للـ notifications
async function startNotificationConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ 
      topic: 'notification-events', 
      fromBeginning: false 
    });
    
    console.log('✅ Notification Consumer started');
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        
        console.log(`🔔 Notification received:`, {
          type: event.type,
          data: event.data,
          timestamp: event.timestamp
        });
        
        // معالجة الـ notification حسب النوع
        switch (event.type) {
          case 'send':
            await handleSendNotification(event.data);
            break;
          case 'read':
            await handleReadNotification(event.data);
            break;
          default:
            console.log('Unknown notification type:', event.type);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error in notification consumer:', error);
  }
}

// إرسال notification (مثال)
async function handleSendNotification(data) {
  console.log(`📤 Sending notification to user ${data.userId}:`, data.message);
  
  // هنا تقدر تضيف الكود لإرسال:
  // - Push notification عبر Firebase
  // - Email notification
  // - SMS notification
  // - In-app notification
}

// تحديث notification كـ مقروءة
async function handleReadNotification(data) {
  console.log(`✓ Notification ${data.notificationId} marked as read`);
  
  // هنا تحدث الـ database
}

// إيقاف Consumer
async function stopNotificationConsumer() {
  await consumer.disconnect();
  console.log('🛑 Notification Consumer stopped');
}

module.exports = { 
  startNotificationConsumer, 
  stopNotificationConsumer 
};