const { kafka } = require('../kafka/config');

const consumer = kafka.consumer({ groupId: 'analytics-service' });

// بدء الاستماع للـ analytics
async function startAnalyticsConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ 
      topic: 'analytics-events', 
      fromBeginning: false 
    });
    
    console.log('✅ Analytics Consumer started');
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        
        console.log(`📊 Analytics event received:`, {
          type: event.type,
          data: event.data,
          timestamp: event.timestamp
        });
        
        // معالجة Analytics حسب النوع
        switch (event.type) {
          case 'page-view':
            await handlePageView(event.data);
            break;
          case 'action':
            await handleAction(event.data);
            break;
          case 'error':
            await handleError(event.data);
            break;
          default:
            console.log('Unknown analytics type:', event.type);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error in analytics consumer:', error);
  }
}

// معالجة Page View
async function handlePageView(data) {
  console.log(`👁️  Page view: ${data.page} by user ${data.userId}`);
  
  // هنا تحفظ في database أو ترسل لـ analytics service
  // مثل: Google Analytics, Mixpanel, etc.
}

// معالجة Action
async function handleAction(data) {
  console.log(`⚡ Action: ${data.action} by user ${data.userId}`);
  
  // تتبع تصرفات المستخدمين
}

// معالجة Errors
async function handleError(data) {
  console.log(`🚨 Error occurred: ${data.error} for user ${data.userId}`);
  
  // هنا ممكن ترسل الـ errors لـ monitoring service
  // مثل: Sentry, Rollbar, etc.
}

// إيقاف Consumer
async function stopAnalyticsConsumer() {
  await consumer.disconnect();
  console.log('🛑 Analytics Consumer stopped');
}

module.exports = { 
  startAnalyticsConsumer, 
  stopAnalyticsConsumer 
};