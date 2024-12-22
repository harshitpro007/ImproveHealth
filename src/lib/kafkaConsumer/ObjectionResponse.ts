import { Kafka } from 'kafkajs';
import { kafkaProducerObjection } from "../kafkaProducer/ObjectionRequest";
import { SERVER } from '@config/environment';
import { HTTP_STATUS_CODE, KAFKA_GROUP, KAFKA_TOPICS } from '@config/constant';
import { logger } from "@lib/logger";
import { eligibiltyCheckDaoV1, eligibiltyCheckMapperV1 } from '@modules/eligibilityCheck';

class KafkaConsumer {
  private kafka: Kafka;
  private consumer: any;

  constructor(brokers: string[], username: string, password: string) {
    this.kafka = new Kafka({ brokers });
    this.consumer = this.kafka.consumer({ groupId: KAFKA_GROUP.OBJECTION_RESPONSE_GROUP });
  }

  public async listen(topic: string): Promise<void> {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic, fromBeginning: true });
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log(`Received message from topic ${topic}: ${message.value.toString()}`);
          // Add your logic here to handle the received message

          await kafkaProducerObjection.sendResponse("Response from chat service", topic);
        }
      });
    } catch (error) {
      console.error('Error running consumer:', error);
    }
  }

  public async runConsumer(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: KAFKA_TOPICS.OBJECTION_RESPONSE });

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
            if (data && data.status_code === HTTP_STATUS_CODE.OK) {
              await eligibiltyCheckMapperV1.checkObjections(data);
            } else {
              await eligibiltyCheckDaoV1.handleDisputeProcess(data.data?.requests);
              logger.error('Invalid message data or status code:', data);
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
export const kafkaConsumerObjection = new KafkaConsumer(
  SERVER.KAFKA.URL,    // Parsed array of Kafka broker URLs
  SERVER.KAFKA.USERNAME, // Username from environment config
  SERVER.KAFKA.PASSWORD  // Password from environment config
);
