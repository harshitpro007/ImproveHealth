declare namespace EligibiltyCheckRequest {
    
    export interface List {
        pageNo: number;
        limit: number;
        searchKey?: string;
        sortBy?: string;
        sortOrder?: string;
        status?: Array<>;
        complainantType?: Array<>;
        disputeType?:Array<>;
        fromDate?: number;
        toDate?: number;
        assignedfromDate?: number;
        assignedtoDate?: number;
        isExport:boolean,
        adminId?: [string]
        objection?: [string];
    }


    export interface Details {
        disputeId: string;
        pageNo:?number;
        limit:?number;
    }

    export interface Assign {
        disputeId: Array<string>;
        adminId:string;
    }

    export interface UnAssign {
        disputeId: Array<string>;
    }



}