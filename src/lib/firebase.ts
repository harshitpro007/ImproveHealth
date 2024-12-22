const admin = require("firebase-admin");
import { FIREBASE, SERVER } from "@config/index";
import { getMessaging } from "firebase-admin/messaging";
export class FireBase {
  init() {
    const firebaseJson: any = {
      "type": SERVER.FIREBASE_TYPE,
      "project_id": SERVER.FIREBASE_PROJECT_ID,
      "private_key_id": SERVER.FIREBASE_PRIVATE_KEY_ID,
      "private_key": SERVER.FIREBASE_PRIVATE_KEY,
      "client_email": SERVER.FIREBASE_CLIENT_EMAIL,
      "client_id": SERVER.FIREBASE_CLIENT_ID,
      "auth_uri": SERVER.FIREBASE_AUTH_URI,
      "token_uri": SERVER.FIREBASE_TOKEN_URI,
      "auth_provider_x509_cert_url": SERVER.FIREBASE_AUTH_CERT_URL,
      "client_x509_cert_url": SERVER.FIREBASE_CLINET_CERT_URL,
      "universe_domain": SERVER.FIREBASE_UNIVERSE_DOMAIN
    }
    admin.initializeApp({
      credential: admin.credential.cert(firebaseJson)
    });
  }

  async sendPushNotification(deviceId: string, notification: any) {
    console.log("******sendPushNotification payload details", "\ndeviceId", deviceId, "\nnotification", notification, "\ndata");
    let message: any = {
      token: deviceId,
      data: notification.details,
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || "default-icon-url",
          click_action: notification.clickAction || "default-click-url",
        },
      },
    };
    try {
      getMessaging().send(message)
        .then((res) => {
          console.log("******getMessaging success details", res, "\n******");
        })
        .catch((error) => {
          console.error("******getMessaging catch block details", error, "\n******");
        })
    }
    catch (error) {
      console.error("******sendPushNotification catch block details", error, "\n******");
      throw error;
    }
  };


  async sendEachForMulticast(tokens: string[], notification: any, data: any) {
    const BATCH_SIZE = SERVER.CHUNK_SIZE; // max tokens per request
    const results = [];
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batchTokens = tokens.slice(i, i + BATCH_SIZE);
      const batchMessage = {
        tokens: batchTokens,
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || "default-icon-url",
            click_action: notification.clickAction || "default-click-url",
          },
        },
        data: data,
      };
      console.log("batchMessage", batchMessage);

      try {
        const response = await getMessaging().sendEachForMulticast(batchMessage);
        results.push(response);
        console.log(`******Successfully sent message to batch ${i / BATCH_SIZE + 1}`, `\n******`);
      } catch (error) {
        console.error(`******Error sending message to batch ${i / BATCH_SIZE + 1}:`, error, `\n******`);
      }
    }
    return results;
  }
}

export const fireBase = new FireBase();