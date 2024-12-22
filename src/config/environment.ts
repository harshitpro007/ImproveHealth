"use strict";

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const ENVIRONMENT = process.env.NODE_ENV.trim();

switch (ENVIRONMENT) {
	case "dev":
	case "dev": {
		if (fs.existsSync(path.join(process.cwd(), "/.env.dev"))) {
			dotenv.config({ path: ".env.dev" });
		} else {
			console.log("Unable to find Environment File");
			process.exit(1);
		}
		break;
	}
	case "qa": {
		if (fs.existsSync(path.join(process.cwd(), "/.env.qa"))) {
			dotenv.config({ path: ".env.qa" });
		} else {
			process.exit(1);
		}
		break;
	}
	case "stag":
	case "stag": {
		if (fs.existsSync(path.join(process.cwd(), "/.env.stag"))) {
			dotenv.config({ path: ".env.stag" });
		} else {
			process.exit(1);
		}
		break;
	}
	case "preprod": {
		if (fs.existsSync(path.join(process.cwd(), "/.env.preprod"))) {
			dotenv.config({ path: ".env.preprod" });
		} else {
			process.exit(1);
		}
		break;
	}
	case "prod":
	case "production": {
		if (fs.existsSync(path.join(process.cwd(), "/.env"))) {
			dotenv.config({ path: ".env" });
		} else {
			process.exit(1);
		}
		break;
	}
	case "default": {
		if (fs.existsSync(path.join(process.cwd(), "/.env.default"))) {
			dotenv.config({ path: ".env.default" });
		} else {
			process.exit(1);
		}
		break;
	}
	case "local": {
		if (fs.existsSync(path.join(process.cwd(), "/.env.local"))) {
			dotenv.config({ path: ".env.local" });
		} else {
			process.exit(1);
		}
		break;
	}
	default: {
		// fs.existsSync(path.join(process.cwd(), "/.env.local")) ? dotenv.config({ path: ".env.local" }) : process.exit(1);
	}
}

export const SERVER = {
	APP_NAME: "Improve Health",
	APP_LOGO: "https://appinventiv-development.s3.amazonaws.com/1607946234266_Sqlv5.svg",
	TEMPLATE_PATH: process.cwd() + "/src/views/",
	UPLOAD_DIR: process.cwd() + "/src/uploads/",
	LOG_DIR: process.cwd() + "/logs",
	TOKEN_INFO: {
		// LOGIN_EXPIRATION_TIME: "180d", // 180 days
		EXPIRATION_TIME: {
			USER_REFRESH_TOKEN: 360 * 24 * 60 * 60 * 1000, // 360 days
			USER_LOGIN: 180 * 24 * 60 * 60 * 1000, // 180 days
			ADMIN_LOGIN: 180 * 24 * 60 * 60 * 1000, // 180 days
			FORGOT_PASSWORD: 2 * 60 * 1000, // 2 mins
			VERIFY_EMAIL: 10 * 60 * 1000, // 10 mins
			VERIFY_MOBILE: 1 * 60 * 1000, // 1 mins
			ADMIN_OTP_VERIFY: 10 * 60 * 1000, // 10 mins
			OTP_LIMIT: 5 * 60 * 1000, // 5 mins
			RESET: 5 * 60 * 1000, // 5 mins
			SUB_ADMIN_REINVITE: 1 * 24 * 60 * 60 * 1000, // 24 hrs
			OPERATIONS: 2 * 24 * 60 * 60 * 1000, //1 days
			BIFURCATED: 2 * 60 * 1000, //2 mins
			RESCAN: 5 * 60 * 1000, //5 mins
		},
		ISSUER: process.env["APP_URL"]
	},
	JWT_PRIVATE_KEY: process.cwd() + "/keys/jwtRS256.key",
	JWT_PUBLIC_KEY: process.cwd() + "/keys/jwtRS256.key.pub",
	// for private.key file use RS256, SHA256, RSA
	JWT_ALGO: "RS256",
	SALT_ROUNDS: 10,
	ENC: "102938$#@$^@1ERF",
	CHUNK_SIZE: 20,
	APP_URL: process.env["APP_URL"],
	ADMIN_URL: process.env["ADMIN_URL"],
	API_BASE_URL: `/admin/api`,
	VERIFY_AUTH_TOKEN: "verify-user-auth-token",
  	VERIFY_COMMON_AUTH_TOKEN: "verify-common-auth-token",
  	VERIFY_ADMIN_AUTH_TOKEN: "verify-auth-token",
	MONGO: {
		DB_NAME: process.env["DB_NAME"],
		DB_URL: process.env["DB_URL"],
		OPTIONS: {
			user: process.env["DB_USER"],
			pass: process.env["DB_PASSWORD"],
			useNewUrlParser: true,
			// useCreateIndex: true,
			// useUnifiedTopology: true,
			// useFindAndModify: false
		},
		REPLICA: process.env["DB_REPLICA"],
		REPLICA_OPTION: {
			replicaSet: process.env["DB_REPLICA_SET"],
			authSource: process.env["DB_AUTH_SOURCE"],
			ssl: process.env["DB_SSL"]
		}
	},
	TARGET_MONGO: {
		DB_NAME: process.env["TARGET_DB_NAME"],
		DB_URL: process.env["TARGET_DB_URL"],
		OPTIONS: {
			useNewUrlParser: true,
			useUnifiedTopology: true
		}
	},
	ADMIN_CREDENTIALS: {
		EMAIL: process.env["ADMIN_EMAIL"],
		PASSWORD: process.env["ADMIN_PASSWORD"],
		NAME: process.env["ADMIN_NAME"]
	},
	REDIS: {
		HOST: process.env["REDIS_HOST"],
		PORT: process.env["REDIS_PORT"],
		DB: process.env["REDIS_DB"],
		NAMESPACE: "ImproveHealth",
		APP_NAME: "ImproveHealth",
		PASSWORD: process.env["REDIS_PASSWORD"]
	},

	MAIL: {
		SMTP: {
			HOST: process.env["SMTP_HOST"],
			PORT: process.env["SMTP_PORT"],
			USER: process.env["SMTP_USER"],
			PASSWORD: process.env["SMTP_PASSWORD"],
			SECURE: process.env["SECURE"]
		},
		FROM_MAIL: process.env["FROM_MAIL"],
		SENDGRID_API_KEY: process.env["SENDGRID_API_KEY"],
		
	},

	MESSAGEBIRD: {
		ACCESS_KEY: process.env["MESSAGEBIRD_ACCESS_KEY"]
	},
	BASIC_AUTH: {
		NAME: process.env["BASIC_AUTH_NAME"],
		PASS: process.env["BASIC_AUTH_PASS"]
	},
	API_KEY: process.env['API_KEY'],
	AWS_IAM_USER: {
		ACCESS_KEY_ID: process.env["AWS_ACCESS_KEY"],
		SECRET_ACCESS_KEY: process.env["AWS_SECRET_KEY"]
	},
	S3: {
		ACCESS_KEY_ID: process.env["S3_ACCESS_KEY_ID"],
		SECRET_ACCESS_KEY: process.env["S3_SECRET_ACCESS_KEY"],
		S3_BUCKET_NAME: process.env["S3_BUCKET_NAME"],
		AWS_REGION: process.env["AWS_REGION"],
		BUCKET_URL: process.env["BUCKET_URL"],
		FILE_ACCESS_KEY_ID: process.env["S3_FILE_ACCESS_KEY_ID"],
		FILE_SECRET_ACCESS_KEY: process.env["S3_FILE_SECRET_ACCESS_KEY"],
		S3_FILE_BUCKET_NAME: process.env["S3_FILE_BUCKET_NAME"],
		FILE_BUCKET_URL: process.env["FILE_BUCKET_URL"]
	},
	ENVIRONMENT: process.env["ENVIRONMENT"],
	IP: process.env["IP"],
	ADMIN_PORT: process.env["ADMIN_PORT"],
	PROTOCOL: process.env["PROTOCOL"],
	FCM_SERVER_KEY: process.env["FCM_SERVER_KEY"],
	DISPLAY_COLORS: true,
	MAIL_TYPE: 2,
	IS_REDIS_ENABLE: true,
	IS_SINGLE_DEVICE_LOGIN: {
		PARTICIPANT: true,
		SUPPORTER: true
	},
	IS_MAINTENANCE_ENABLE: process.env["IS_MAINTENANCE_ENABLE"],
	BYPASS_OTP: process.env["BYPASS_OTP"],
	FLOCK_URL: process.env["FLOCK_URL"],
	ACTIVITY_TIME: { // edit/delete time
		GROUP: 10 * 60 * 1000, // 4 hours
		SHIFT: 10 * 60 * 1000  // 2 hours
	},
	IS_RABBITMQ_DELAYED_ENABLE: false,
	IS_FIREBASE_ENABLE: true,
	RABBITMQ: {
		URL: process.env["RABBITMQ_URL"],
		QUEUE_NAME: process.env["RABBITMQ_QUEUE_NAME"]
	},
	DEFAULT_PASSWORD: "String@123",
	DEFAULT_OTP: "1234",
	AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE:'1',
	NOTIFICATION_URL: process.env["NOTIFICATION_URL"],
	SUBSCRIPTION_URL: process.env["SUBSCRIPTION_URL"],
	USER_URL: process.env["USER_URL"],
	SOCIAL_URL: process.env["SOCIAL_URL"],
	CHAT_URL: process.env["CHAT_URL"],
	PYTHON_URL: process.env["PYTHON_URL"],
	KAFKA: {
		URL: process.env.KAFKA_URL.split(','),  // Parsing the comma-separated string into an array
		TOPIC1: process.env.KAFKA_TOPIC,
		USERNAME: process.env.KAFKA_USERNAME,
		PASSWORD: process.env.KAFKA_PASSWORD,
	  },
	FIREBASE_TYPE: process.env["FIREBASE_TYPE"],
	FIREBASE_PROJECT_ID: process.env["FIREBASE_PROJECT_ID"],
	FIREBASE_PRIVATE_KEY_ID: process.env["FIREBASE_PRIVATE_KEY_ID"],
	FIREBASE_PRIVATE_KEY: process.env["FIREBASE_PRIVATE_KEY"],
	FIREBASE_CLIENT_EMAIL: process.env["FIREBASE_CLIENT_EMAIL"],
	FIREBASE_CLIENT_ID: process.env["FIREBASE_CLIENT_ID"],
	FIREBASE_AUTH_URI: process.env["FIREBASE_AUTH_URI"],
	FIREBASE_TOKEN_URI: process.env["FIREBASE_TOKEN_URI"],
	FIREBASE_AUTH_CERT_URL: process.env["FIREBASE_AUTH_CERT_URL"],
	FIREBASE_CLINET_CERT_URL: process.env["FIREBASE_CLINET_CERT_URL"],
	FIREBASE_UNIVERSE_DOMAIN: process.env["FIREBASE_UNIVERSE_DOMAIN"],
};