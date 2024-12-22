"use strict";

console.log("");
console.log("//************************* Improve Health Admin Serive 1.0 **************************//");
console.log("");

console.log("env : ", process.env.NODE_ENV.trim());
require("events").EventEmitter.defaultMaxListeners = 0;
import "module-alias/register";
import * as fs from "fs";
import { Server } from "@hapi/hapi";
import * as Vision from "@hapi/vision";

import { LANGUAGES, SERVER } from "@config/index";
// create folder for upload if not exist
if (!fs.existsSync(SERVER.UPLOAD_DIR)) fs.mkdirSync(SERVER.UPLOAD_DIR);
// create folder for logs if not exist
if (!fs.existsSync(SERVER.LOG_DIR)) fs.mkdirSync(SERVER.LOG_DIR);

import { logger } from "@lib/logger";
import { plugins } from "@plugins/index";
import { routes } from "@routes/index";
import * as BootStrap from "@utils/BootStrap";
import { fetchSecreteKeys } from "@utils/appUtils";
import { kafkaConsumerObjection } from "@lib/kafkaConsumer/ObjectionResponse";
import { kafkaProducerObjection } from "@lib/kafkaProducer/ObjectionRequest";
import { kafkaProducerNotification } from "@lib/kafkaProducer/NotificationRequest";
import { kafkaConsumerNotification } from "@lib/kafkaConsumer/NotificationResponse";

fetchSecreteKeys().then(()=>{
const server: any = new Server({
	port: SERVER.ADMIN_PORT,
	routes: {
		cors: {
			origin: ["*"],
			headers: ["Accept", "api_key", "authorization", "Content-Type", "If-None-Match", "platform", "timezone", "offset", "language", "access-control-allow-origin"],
			additionalHeaders: ["Accept", "api_key", "authorization", "Content-Type", "If-None-Match", "platform", "timezone", "offset", "language", "access-control-allow-origin"], // sometime required
		},
		state: { // to configure cookie behavior at a route-level
			parse: true,
			failAction: "error"
		}
	}
});

const start = async () => {
	await server.register(Vision);

	// To use a cookie
	server.state("data", {
		ttl: null,
		isSecure: true,
		isHttpOnly: true,
		encoding: "base64json",
		clearInvalid: true,
		strictHeader: true
	});

	server.views({
		engines: {
			html: require("handlebars")
		},
		path: "src/views"
	});
	// // serving static files
	routes.push(
		{
			method: 'GET',
			path: '/src/uploads/'.toString() + `{path*}`, // ' /views/uploads/image/{path*}',
			options: {
				handler: {
					directory: {
						path: process.cwd() + '/src/uploads/'.toString(),
						listing: false,
					},
				},
			},
		}
	)

	// register i18n plugin
	await server.register({
		plugin: require("hapi-i18n"),
		options: {
			locales: LANGUAGES.map(v => v.code),
			directory: process.cwd() + "/locales",
			languageHeaderField: "language",
			defaultLocale: "en"
		}
	});
};
start();

const init = async () => {
	await server.register(plugins);

	server.route(routes);
	await server.start();
	const boot = new BootStrap.BootStrap();
	await boot.bootStrap(server);
	await kafkaProducerObjection.createTopic()	
	await kafkaConsumerObjection.runConsumer()
	await kafkaProducerNotification.createTopic()
	await kafkaConsumerNotification.runConsumer()
};
init().then(_ => {
	logger.info(`Hapi server listening on ${SERVER.PROTOCOL}://${SERVER.IP}:${SERVER.ADMIN_PORT}/documentation, in ${SERVER.ENVIRONMENT} mode`);
	//sendMessageToFlock({ "title": "[Info] Server restarted", "error": 'Server started at :' + SERVER.ENVIRONMENT });
}).catch((error) => {
	console.warn("Error while loading plugins : ");
	console.error(error);
	//sendMessageToFlock({ "title": "Server Init Error", "error": error });
	process.exit(0);
})
})
.catch((error) => {
	console.warn("Error while loading secrete manager : ");
	console.error(error);
	//sendMessageToFlock({ "title": "Server Init Error", "error": error });
	process.exit(0);
})