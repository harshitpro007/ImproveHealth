declare namespace NotificationRequest {

	export interface Id {
		notificationId?: string;
	}

	export interface Add {
		title:string;
		description?:string;
		platform:string;
        receiverId?: string;
	}
	
	export interface Read extends Id{
		isRead?:string,
	}
}
