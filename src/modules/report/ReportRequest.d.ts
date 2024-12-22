declare namespace ReportRequest {

	export interface Detail extends Listing {
		postId:string,
        status:?string
	}

    export interface Listing {
        pageNo?:number,
        limit?:number,
    }

    export interface CommentDetail extends Listing {
        commentId:string,

    }

    export interface ReportListing extends Listing, Device{
        userId: string
    }

	



}