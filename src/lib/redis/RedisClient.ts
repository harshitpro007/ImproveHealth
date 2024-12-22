"use strict";

import * as redis from "redis";
import * as util from "util";
import * as _ from "lodash";
import { JOB_SCHEDULER_TYPE, STATUS, SERVER, USER_TYPE, DB_MODEL_REF, GEN_STATUS, ENVIRONMENT } from "@config/index";
import { logger } from "@lib/logger";
import {  loginHistoryDao } from "@modules/loginHistory/index";
import { baseDao } from "@modules/baseDao/index";

import {
	isObjectId,
	toObjectId
} from "@utils/appUtils";
import {  login_histories } from "@modules/models";
import { createAndroidPushPayload, createIOSPushPayload } from "@utils/appUtils";

import {
	DEVICE_TYPE, NOTIFICATION_DATA
} from "@config/index";
let client;
let pub, sub;

export class RedisClient {

	public modelActivity: any = DB_MODEL_REF.ACTIVITIES;

	init() {
		const _this = this;
		let CONF:any = { db: SERVER.REDIS.DB };
		const environment = process.env.NODE_ENV.trim();
		if(environment===ENVIRONMENT.PRODUCTION || environment=== ENVIRONMENT.PREPROD) {
			CONF.tls= {};
			CONF.password = SERVER.REDIS.PASSWORD;
		}
		console.log('configuration of redis>>>>>>>>>>>>>>>>>',CONF)
		client = redis.createClient(SERVER.REDIS.PORT, SERVER.REDIS.HOST, CONF, { disable_resubscribing: true });
		client.on("ready", () => {
			logger.info(`Redis server listening on ${SERVER.REDIS.HOST}:${SERVER.REDIS.PORT}, in ${SERVER.REDIS.DB} DB`);
		});
		client.on("error", (error) => {
			logger.error("Error in Redis", error);
			console.log("Error in Redis");
		});

		// .: Activate "notify-keyspace-events" for expired type events
		pub = redis.createClient(SERVER.REDIS.PORT, SERVER.REDIS.HOST, CONF);
		sub = redis.createClient(SERVER.REDIS.PORT, SERVER.REDIS.HOST, CONF);
		pub.send_command("config", ["set", "notify-keyspace-events", "Ex"], SubscribeExpired);
		// .: Subscribe to the "notify-keyspace-events" channel used for expired type events
		function SubscribeExpired(e, r) {
			const expired_subKey = "__keyevent@" + CONF.db + "__:expired";
			sub.subscribe(expired_subKey, function () {
				sub.on("message", function (chan, msg) {
					// _this.listenJobs(msg);
				});
			});
		}
	}

	// .: For example (create a key & set to expire in 10 seconds)
	createJobs(params) {
		const expTime = Math.trunc((params.time - Date.now()) / 1000); // in secs
		console.log("createJobs===========================>", params, expTime);
		switch (params.jobName) {
			case JOB_SCHEDULER_TYPE.AUTO_SESSION_EXPIRE:
				this.setExp(`${JOB_SCHEDULER_TYPE.AUTO_SESSION_EXPIRE}.${params.params.userId}.${params.params.deviceId}`, expTime, JSON.stringify({ "deviceId": params.params.deviceId, "userId": params.params.userId }));
				break;
			case JOB_SCHEDULER_TYPE.EXPIRE_GROUP_ACTIVITY:
				this.setExp(`${JOB_SCHEDULER_TYPE.EXPIRE_GROUP_ACTIVITY}.${params.data.activityId}`, expTime, JSON.stringify({ "activityId": params.data.activityId }));
				break;
			case JOB_SCHEDULER_TYPE.EXPIRE_SHIFT_ACTIVITY:
				this.setExp(`${JOB_SCHEDULER_TYPE.EXPIRE_SHIFT_ACTIVITY}.${params.data.activityId}.${params.data.intervalId}`, expTime, JSON.stringify({ "activityId": params.data.activityId, "intervalId": params.data.intervalId }));
				break;
			case JOB_SCHEDULER_TYPE.EXPIRE_SHIFT_START_TIME:
				this.setExp(`${JOB_SCHEDULER_TYPE.EXPIRE_SHIFT_START_TIME}.${params.data.activityId}.${params.data.intervalId}`, expTime, JSON.stringify({ "activityId": params.data.activityId, "intervalId": params.data.intervalId }));
				break;
			case JOB_SCHEDULER_TYPE.EXPIRE_GROUP_START_TIME:
				this.setExp(`${JOB_SCHEDULER_TYPE.EXPIRE_GROUP_START_TIME}.${params.data.activityId}`, expTime, JSON.stringify({ "activityId": params.data.activityId }));
				break;
			case JOB_SCHEDULER_TYPE.SHIFT_NOTIFICATION_INTERVAL:
				this.setExp(`${JOB_SCHEDULER_TYPE.SHIFT_NOTIFICATION_INTERVAL}.${params.data.activityId}.${params.data.intervalId}`, expTime, JSON.stringify({ "activityId": params.data.activityId, "intervalId": params.data.intervalId }));
				break;
			case JOB_SCHEDULER_TYPE.GROUP_NOTIFICATION_INTERVAL:
				this.setExp(`${JOB_SCHEDULER_TYPE.GROUP_NOTIFICATION_INTERVAL}.${params.data.activityId}`, expTime, JSON.stringify({ "activityId": params.data.activityId }));
				break;
			case JOB_SCHEDULER_TYPE.SUB_ADMIN_REINVITE:
				this.setExp(`${JOB_SCHEDULER_TYPE.SUB_ADMIN_REINVITE}.${params.data.email}.${params.data.id}`, params.time/1000, JSON.stringify({ "email": params.data.email }));
				break;
		}
	}

	async listenJobs(key) {
		const jobName = key.split(".")[0];
		console.log('***************listenJobs*************',jobName)
		switch (jobName) {
			case JOB_SCHEDULER_TYPE.AUTO_SESSION_EXPIRE: {
				break;
			}
			case JOB_SCHEDULER_TYPE.EXPIRE_GROUP_ACTIVITY: {
				const activityId = key.split(".")[1];
				await baseDao.updateOne(this.modelActivity, { "_id": activityId }, { "$set": { status: STATUS.CANCELLED.TYPE, "intervals.$[].status": STATUS.CANCELLED.TYPE } }, {});
				break;
			}
			case JOB_SCHEDULER_TYPE.EXPIRE_SHIFT_ACTIVITY: {
				const activityId = key.split(".")[1];
				const intervalId = key.split(".")[2];
				//find detail of shift and manage status according
				let shfitDetial = await baseDao.findOne(this.modelActivity, { "_id": activityId }, {}, {})

				const isEqual = shfitDetial.intervals[shfitDetial.intervals.length - 1]._id.toString() === intervalId;
				let completeShift = shfitDetial.intervals.filter(v => v.status === STATUS.CANCELLED.TYPE);
				//check expire interval is last interval then
				if (isEqual) {
					if (completeShift && completeShift.length && (completeShift.length == shfitDetial.intervals.length - 1)) {
						//interval status update
						await baseDao.updateOne(this.modelActivity, { "_id": activityId, "intervals._id": intervalId }, { "$set": { "intervals.$.status": STATUS.CANCELLED.TYPE } }, {});
						await baseDao.updateOne(this.modelActivity, { "_id": activityId }, { "$set": { status: STATUS.CANCELLED.TYPE } }, {});

					} else {
						let intervalStatus = shfitDetial.intervals.filter(v => v._id.toString() === intervalId)
						if (intervalStatus[0].status === STATUS.ACCEPTED || intervalStatus[0].status === STATUS.PENDING.TYPE)
							await baseDao.updateOne(this.modelActivity, { "_id": activityId, "intervals._id": intervalId }, { "$set": { "intervals.$.status": STATUS.CANCELLED.TYPE } }, {});

					}
				} else {
					let intervalStatus1 = shfitDetial.intervals.filter(v => v._id.toString() === intervalId)
					if (intervalStatus1[0].status === STATUS.ACCEPTED || intervalStatus1[0].status === STATUS.PENDING.TYPE)
						await baseDao.updateOne(this.modelActivity, { "_id": activityId, "intervals._id": intervalId }, { "$set": { "intervals.$.status": STATUS.CANCELLED.TYPE } }, {});

				}

				break;
			}
			case JOB_SCHEDULER_TYPE.EXPIRE_SHIFT_START_TIME: {
				const activityId = key.split(".")[1];
				const intervalId = key.split(".")[2];

				let shfitDetial = await baseDao.findOne(this.modelActivity, { "_id": activityId }, {}, {})

				const isEqual = shfitDetial.intervals[shfitDetial.intervals.length - 1]._id.toString() === intervalId;
				//check expire interval is last interval then
				if (isEqual) {
					let intervalStatus = shfitDetial.intervals.filter(v => v._id.toString() === intervalId)
					if (intervalStatus[0].status === STATUS.ONGOING) {
						await baseDao.updateOne(this.modelActivity, { "_id": activityId, "intervals._id": intervalId }, { "$set": { "intervals.$.status": STATUS.COMPLETED.TYPE, "intervals.$.isAutomaticComplete": true } }, {});
						await baseDao.updateOne(this.modelActivity, { "_id": activityId }, { "$set": { status: STATUS.COMPLETED.TYPE } }, {});
					}
				} else {
					let intervalStatus1 = shfitDetial.intervals.filter(v => v._id.toString() === intervalId)
					if (intervalStatus1[0].status === STATUS.ONGOING) {
						await baseDao.updateOne(this.modelActivity, { "_id": activityId, "intervals._id": intervalId }, { "$set": { "intervals.$.status": STATUS.COMPLETED.TYPE, "intervals.$.isAutomaticComplete": true } }, {});
					}
				}
				break;
			}
			case JOB_SCHEDULER_TYPE.EXPIRE_GROUP_START_TIME: {
				const activityId = key.split(".")[1];
				await baseDao.updateOne(this.modelActivity, { "_id": activityId }, { "$set": { status: STATUS.COMPLETED.TYPE, "intervals.$[].status": STATUS.COMPLETED.TYPE, "intervals.$[].isAutomaticComplete": true } }, {});
				break;
			}
			case JOB_SCHEDULER_TYPE.SHIFT_NOTIFICATION_INTERVAL: {
				const activityId = key.split(".")[1];
				const intervalId = key.split(".")[2];

				let activityData = await baseDao.findOne(this.modelActivity, { "_id": activityId }, {}, {})
				let supporter = activityData.attendees.filter(v => (v.userType == USER_TYPE.SUPPORTER && v.status == STATUS.ACCEPTED));
				let ids = [];
				if (supporter) {
					supporter.forEach(element => {
						ids.push(element._id)
					});
				}
				//send push to user with rabbitmq
				let userToken = await login_histories.find({ "userId._id": { "$in": ids }, "isLogin": true, "userId.pushNotificationStatus": true }, { platform: 1, deviceToken: 1, userId: 1 }).cursor({ "batchSize": SERVER.CHUNK_SIZE });;
				let notificationData;
				// andorid/ios push notification
				notificationData = NOTIFICATION_DATA.SHIFT_ACTIVITY_FINISH_NOTIFICATION(activityId, intervalId);
				notificationData = _.extend(notificationData, {
					"activityId": activityData._id,
					"intervalId": intervalId

				});

				userToken.on("data", function (doc) {

					const deviceToken = doc.deviceToken;
					if (deviceToken !== undefined) {

						if (doc.platform === DEVICE_TYPE.ANDROID) {
							const androidPayload = createAndroidPushPayload(notificationData);
						} else { // IOS

							const iosPayload = createIOSPushPayload(notificationData);
						}
					}
				});
				break;
			}
			case JOB_SCHEDULER_TYPE.GROUP_NOTIFICATION_INTERVAL: {
				const activityId = key.split(".")[1];

				let activityData = await baseDao.findOne(this.modelActivity, { "_id": activityId }, {}, {})
				let supporter = activityData.attendees.filter(v => (v.userType == USER_TYPE.SUPPORTER && v.status == STATUS.ACCEPTED));
				let ids = [];
				if (supporter) {
					supporter.forEach(element => {
						ids.push(element._id)
					});
				}
				//send push to user with rabbitmq
				let userToken = await login_histories.find({ "userId._id": { "$in": ids }, "isLogin": true, "userId.pushNotificationStatus": true }, { platform: 1, deviceToken: 1, userId: 1 }).cursor({ "batchSize": SERVER.CHUNK_SIZE });;
				let notificationData;
				// andorid/ios push notification
				notificationData = NOTIFICATION_DATA.GROUP_ACTIVITY_FINISH_NOTIFICATION(activityId);
				notificationData = _.extend(notificationData, {
					"activityId": activityData._id,

				});

				userToken.on("data", function (doc) {

					const deviceToken = doc.deviceToken;
					if (deviceToken !== undefined) {

						if (doc.platform === DEVICE_TYPE.ANDROID) {
							const androidPayload = createAndroidPushPayload(notificationData);
						} else { // IOS

							const iosPayload = createIOSPushPayload(notificationData);
						}
					}
				});
				break;
			}
			case JOB_SCHEDULER_TYPE.SUB_ADMIN_REINVITE: {
				console.log('************invite subadmin event*************')
				const email = key.split(".")[2];
				const id = key.split(".")[3];
				const model:any = DB_MODEL_REF.ADMIN
				const match = {
					_id: toObjectId(id),
					status: GEN_STATUS.PENDING
				}
				const update = {
					$set: {reinvite:true}
				}
				await baseDao.updateOne(model,match,update,{})
			}
			default: {
				const userId = key.split(".")[0];
				const deviceId = key.split(".")[1];
				if (isObjectId(userId) && deviceId) {
					await loginHistoryDao.removeDeviceById({ userId, deviceId });
					if (SERVER.IS_REDIS_ENABLE) await redisClient.deleteKey(`${userId}.${deviceId}`);
				}
			}
		}
	}

	setExp(key, exp, value) {
		console.log('key',key,'>>>>>>>>>>>>>>>>>>>>',exp,'fffffffffffffff',value)
		client.setex(key, exp, value);
	}

	getKeys(key) {
		return new Promise((resolve, reject) => {
			client.multi().keys(key).exec(function (error, reply) { if (error) reject(error); else resolve(reply[0]) });
		});
	}

	storeValue(key, value) {
		return client.set(key, value, function (error, reply) {
			if (error) {
				console.log(error);
			}
			return reply;
		});
	}

	mset(values) {
		client.mset(values, function (error, object) {
			if (error) {
				console.log(error);
			}
			return object;
		});
	}

	getValue(key) {
		return new Promise(function (resolve, reject) {
			client.get(key, function (error, reply) {
				if (error) {
					console.log(error);
				}
				resolve(reply);
			});
		});
	}

	storeHash(key, value) {
		return client.hmset(key, value, function (error, object) {
			if (error) {
				console.log(error);
			}
			return object;
		});
	}

	getHash(key) {
		return new Promise(function (resolve, reject) {
			client.hgetall(key, function (error, object) {
				if (error) {
					console.log(error);
				}
				resolve(object);
			});
		});
	}

	storeList(key, value) {
		value.unshift(key);
		return client.rpush(value, function (error, reply) {
			if (error) {
				console.log(error);
			}
			return reply;
		});
	}

	getList(key) {
		return new Promise(function (resolve, reject) {
			client.lrange(key, 0, -1, function (error, reply) {
				if (error) {
					console.log(error);
				}
				resolve(reply);
			});
		});
	}

	async storeSet(key, value) {
		try {
			value.unshift(key);
			const promise = util.promisify(client.sadd).bind(client);
			await promise(value);
			return {};
		} catch (error) {
			console.log(error);
			return Promise.reject(error);
		}
	}

	async removeFromSet(key, value) {
		try {
			const promise = util.promisify(client.srem).bind(client);
			await promise(key, value);
			return {};
		} catch (error) {
			console.log(error);
			return Promise.reject(error);
		}
	}

	getSet(key) {
		return new Promise(function (resolve, reject) {
			client.smembers(key, function (error, reply) {
				if (error) {
					console.log(error);
				}
				resolve(reply);
			});
		});
	}

	checkKeyExists(key) {
		return client.exists(key, function (error, reply) {
			if (error) {
				console.log(error);
			}
			return reply;
		});
	}

	deleteKey(key) {
		return client.del(key, function (error, reply) {
			if (error) {
				console.log(error);
			}
			console.log(reply)
			return reply;
		});
	}

	expireKey(key, expiryTime) {
		// in seconds
		return client.expireAsync(key, expiryTime, function (error, reply) {
			if (error) {
				console.log(error);
			}
			return reply;
		});
	}

	incrementKey(key, value) {
		// or incrby()
		return client.set(key, 10, function () {
			return client.incr(key, function (error, reply) {
				if (error) {
					console.log(error);
				}
				console.log(reply); // 11
			});
		});
	}

	decrementKey(key, value) {
		// or decrby()
		return client.set(key, 10, function () {
			return client.decr(key, function (error, reply) {
				if (error) {
					console.log(error);
				}
				console.log(reply); // 11
			});
		});
	}

	async brpop(key, timeout = 2) {
		try {
			return new Promise((resolve, reject) => {
				client.brpop(key, timeout, function (error, reply) {
					if (error)
						reject(error);
					else
						resolve(reply)
				});
			});
		} catch (error) {
			console.log(error);
			return Promise.reject(error);
		}
	}

	async addToSortedSet(setname, value, key) {
		try {
			return new Promise((resolve, reject) => {
				client.zadd(setname, value.toString(), key, function (error, reply) {
					if (error)
						reject(error);
					else
						resolve(reply)
				});
			});
		} catch (error) {
			console.log(error);
			return Promise.reject(error);
		}
	};

	async getRankFromSortedSet(setname, key) {
		try {
			return new Promise((resolve, reject) => {
				client.zrevrank(setname, key, function (error, reply) {
					if (error)
						reject(error);
					else
						resolve(reply)
				});
			});
		} catch (error) {
			console.log(error);
			return Promise.reject(error);
		}
	};

	async getRankedListFromSortedSet(setName, offset, count) {
		try {
			return new Promise((resolve, reject) => {

				const args2 = [setName, "+inf", "-inf", "WITHSCORES", "LIMIT", offset, count];
				client.zrevrangebyscore(args2, function (error, reply) {
					if (error)
						reject(error);
					else
						resolve(reply)
				});
			});
		} catch (error) {
			console.log(error);
			return Promise.reject(error);
		}
	};

	async sortedListLength(setName) {
		try {
			return new Promise((resolve, reject) => {
				const arg1 = [setName, "-inf", "+inf"];
				client.zcount(arg1, function (error, reply) {
					if (error)
						reject(error);
					else
						resolve(reply)
				});
			});
		} catch (error) {
			console.log(error);
			return Promise.reject(error);
		}
	};

	async removeToSortedSet(setname, key) {
		try {
			return new Promise((resolve, reject) => {
				client.zrem(setname, key, function (error, reply) {
					if (error)
						reject(error);
					else
						resolve(reply)
				});
			});
		} catch (error) {
			console.log(error);
			return Promise.reject(error);
		}
	};
}

export const redisClient = new RedisClient();