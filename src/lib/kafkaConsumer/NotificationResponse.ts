import { Kafka } from 'kafkajs';
import { SERVER } from '@config/environment';
import { KAFKA_GROUP, KAFKA_TOPICS } from '@config/constant';
import { logger } from "@lib/logger";
import { notificationDaoV1 } from '@modules/notification';
import { kafkaProducerNotification } from '@lib/kafkaProducer/NotificationRequest';

class KafkaConsumer {
  private kafka: Kafka;
  private consumer: any;

  constructor(brokers: string[], username: string, password: string) {
    this.kafka = new Kafka({ brokers });
    this.consumer = this.kafka.consumer({ groupId: KAFKA_GROUP.NOTIFICATION_RESPONSE_GROUP });
  }

  public async listen(topic: string): Promise<void> {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic, fromBeginning: true });
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log(`Received message from topic ${topic}: ${message.value.toString()}`);
          // Add your logic here to handle the received message

          await kafkaProducerNotification.sendResponse("Response from chat service", topic);
        }
      });
    } catch (error) {
      console.error('Error running consumer:', error);
    }
  }

  public async runConsumer(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: KAFKA_TOPICS.NOTIFICATION_RESPONSE });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log("************************* Consumer Running **************");
          console.log({
            topic,
            partition,
            offset: message.offset,
            value: message.value.toString()
          });

          // Process the message here
          try {
            const data = JSON.parse(message.value.toString());
            if (data ) {
                await notificationDaoV1.sendBulkNotification(data.query, data.notificationData, data.tokenData);
            } 
          } catch (error) {
            console.error('Error processing message:', error);
            logger.error('Failed to parse or process the message:', {
              error: error.message,
              stack: error.stack,
            });
          }
        },
      });
    } catch (error) {
      console.error('Error running consumer:', error);
    }
  }
}

// Example usage:
export const kafkaConsumerNotification = new KafkaConsumer(
  SERVER.KAFKA.URL,    // Parsed array of Kafka broker URLs
  SERVER.KAFKA.USERNAME, // Username from environment config
  SERVER.KAFKA.PASSWORD  // Password from environment config
);
