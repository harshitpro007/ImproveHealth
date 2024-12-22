declare namespace RoleRequest {

	export interface CreateRole {
		role: string;
		permission: object;
	}

	export interface EditRole {
		roleId: string;
		role?: string;
		permission?: object;
	}

	export interface BlockUnblockRole {
		roleId: string;
		status: string;
	}

	export interface RoleId {
		roleId: string;
	}

	export interface CreateSubAdmin {
		roleId: string;
		name?: string;
		email: string;
		password?: string;
		userType?: string;
		salt?: string;
		hash?: string;
		addedBy: string;
	}

	export interface EditSubAdmin {
		adminId: string;
		name?: string;
		roleId?: string;
		mobileNo?: string;
		countryCode?:string;
		salt?: string;
		hash?: string;
		fullMobileNo?:string;
	}

	export interface BlockSubAdmin {
		adminId: string;
		status: string;
	}

	export interface AdminId {
		adminId: string;
	}

	export interface SubAdminList extends ListingRequest {
		roleId?: Array<>;
		isExport:boolean;
	}

	export interface resendInviteSubadmin {
		adminId:string
	}
}