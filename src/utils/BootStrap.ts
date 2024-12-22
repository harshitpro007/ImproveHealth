"use strict";

import { adminDaoV1 } from "@modules/admin/index";
import { ENVIRONMENT, SERVER } from "@config/index";
import { Database } from "@utils/Database";
import { redisClient } from "@lib/redis/RedisClient";
import { eligibiltyCheckControllerV1 } from "@modules/eligibilityCheck";
import * as cron from "node-cron"
import { fireBase } from "@lib/firebase";

// import { rabbitMQ } from "@lib/RabbitMQ";

export class BootStrap {
	private dataBaseService = new Database();

	async bootStrap(server) {
		await this.dataBaseService.connectToDb();
		await this.createAdmin();
		if (SERVER.IS_FIREBASE_ENABLE) fireBase.init();
		// If redis is enabled
		if (SERVER.IS_REDIS_ENABLE) redisClient.init();

		// ENABLE/DISABLE Console Logs
		if (SERVER.ENVIRONMENT === ENVIRONMENT.PRODUCTION) {
			// console.log = function () { };
		}
		if(SERVER.ENVIRONMENT !== ENVIRONMENT.PREPROD && SERVER.ENVIRONMENT !== ENVIRONMENT.PRODUCTION) {
			cron.schedule('0 4-16/12 * * *', () => {
				console.log('Running saveNewFiles every 12 hours starting from 4 AM');
				eligibiltyCheckControllerV1.saveNewFiles().catch(error => console.error('Error running saveNewFiles:', error));
			});
		}
		// rabbitMQ.init();
	}

	async createAdmin() {
		const adminData = {
			"email": SERVER.ADMIN_CREDENTIALS.EMAIL,
			"password": SERVER.ADMIN_CREDENTIALS.PASSWORD,
			"name": SERVER.ADMIN_CREDENTIALS.NAME
		};
		const step1 = await adminDaoV1.isEmailExists(adminData);
		if (!step1) adminDaoV1.createAdmin(adminData);
	}
}