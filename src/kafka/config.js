const { Kafka } = require('kafkajs');

// إنشاء Kafka client
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'my-platform',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    retries: 5,
    initialRetryTime: 300
  }
});

// إنشاء admin client لإدارة Topics
const admin = kafka.admin();

// دالة لإنشاء Topics تلقائياً
async function createTopics() {
  try {
    await admin.connect();
    
    const topics = [
      { topic: 'user-events', numPartitions: 3 },
      { topic: 'request-events', numPartitions: 3 },
      { topic: 'notification-events', numPartitions: 3 },
      { topic: 'analytics-events', numPartitions: 3 }
    ];
    
    await admin.createTopics({
      topics,
      waitForLeaders: true
    });
    
    console.log('✅ Kafka topics created successfully');
    await admin.disconnect();
  } catch (error) {
    if (error.type === 'TOPIC_ALREADY_EXISTS') {
      console.log('ℹ️  Topics already exist');
    } else {
      console.error('❌ Error creating topics:', error.message);
    }
    await admin.disconnect();
  }
}

module.exports = { kafka, createTopics };