"use strict";

/**
 * v1 routes
 */

// admin routes
import { adminRoute as adminRouteV1 } from "@modules/admin/v1/adminRoute";
// category routes
// import { categoryRoute as categoryRouteV1 } from "@modules/category/v1/categoryRoute";

import { roleRoute as roleRouteV1 } from "@modules/role/v1/roleRoute";

// holiday management
import { holidayRoute as holidayRouteV1 } from "@modules/holiday/v1/holidayRoute"

//eligibilty 

import { eligibiltyCheckRoute as eligibiltyCheckRouteV1 } from "@modules/eligibilityCheck/v1/eligibilityCheckRoute"

//activity
import {activityRoute as activityRouteV1} from "@modules/activity/v1/activityRoute"

//extension

import {extensionRoute as extensionRouteV1} from "@modules/extension/v1/extensionRoute"

import { notificationRoute as notificationRouteV1 } from "@modules/notification/v1/notificationRoute"

export const routes: any = [

	...adminRouteV1,
	// ...categoryRouteV1,
	...roleRouteV1,
	...holidayRouteV1,
	...eligibiltyCheckRouteV1,
	...activityRouteV1,
	...extensionRouteV1,
	...notificationRouteV1
];