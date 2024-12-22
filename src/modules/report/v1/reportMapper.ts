import { DB_MODEL_REF } from "@config/constant";


export const userLookup =  {

        "$lookup": {
            from: DB_MODEL_REF.USER, 
            let: { userId: "$userId" },
            pipeline: [
                {
                    $match: {
                        $expr: { $eq: ["$_id", "$$userId"] }
                    }
                    
                },
                {
                    $project: {
                        name:1,
                        profilePicture:1,
                        status:1,
                        fullMobileNo:1,
                        created:1
                    }
                }
            ],
            as: "user_detail"
        }
};
