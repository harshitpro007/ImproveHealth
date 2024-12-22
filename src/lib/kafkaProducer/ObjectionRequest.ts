import { KAFKA_TOPICS, KAFKA_TOPICS_PRODUCER } from '@config/constant';
import { SERVER } from '@config/environment';
import { Kafka, Admin } from 'kafkajs';

class KafkaProducer {
  private kafka: Kafka;
  private producer: any;
  private admin: Admin;

  constructor(brokers: string[], username?: string, password?: string) {
    this.kafka = new Kafka({ brokers });
    this.producer = this.kafka.producer();
    this.admin = this.kafka.admin();
  }

  public async createTopic(): Promise<void> {
    try {
      await this.admin.connect();
      await this.admin.createTopics({
        topics: [{ topic: KAFKA_TOPICS_PRODUCER.OBJECTION_REQUEST }],
      });
      console.log(` ****** Topic created successfully.  ${KAFKA_TOPICS_PRODUCER.OBJECTION_REQUEST} ****** `);
    } catch (error) {
      console.error(`Error creating topic in ${KAFKA_TOPICS_PRODUCER.OBJECTION_REQUEST}:`, error);
    } finally {
      await this.admin.disconnect();
    }
  }

  public async sendResponse(messageContent: string, topic: string): Promise<void> {
    try {
      await this.producer.connect();
      await this.producer.send({
        topic: topic,
        messages: [{ value: messageContent }],
      });
      console.log(`Message sent to topic ${topic}: ${messageContent}`);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      await this.producer.disconnect();
    }
  }
}

// Example usage:
export const kafkaProducerObjection = new KafkaProducer(
  SERVER.KAFKA.URL,   // Broker URL
  SERVER.KAFKA.USERNAME, // Username from environment config
  SERVER.KAFKA.PASSWORD  // Password from environment config
);
