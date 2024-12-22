declare namespace ExtensionRequest {
    export interface Add {
        ipName?: string[];
        nipName?: string[];
        startDate: number;
        endDate: number;
        ipType: string;
        nipType: string;
        reason: string;
        stateName?: string[];
        groupId?: ObjectId;
        day?:string;

    }

    export interface ID {
        extensionId: string;
    }


}