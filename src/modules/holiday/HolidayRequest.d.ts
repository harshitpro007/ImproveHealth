declare namespace HolidayRequest {
    export interface Holiday {
        name: string;
        date?: number;
    }

    export interface Add {
        holidayDate: Holiday[];
        import?:boolean;
        fileName?:string;
    }

    export interface Edit {
        holidayId: string;
        name: strig;
        date: number;
    }

    export interface Delete {
        holidayId:string;
    }
    
    export interface Get {
        fromDate:number;
        endDate:number;
        searchKey?:string;
    }

}