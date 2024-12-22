"use strict";

const CHECK_LIST = {
    SERVICE_PRIOR: {
        NAME: "service_prior",
        STATEMENT: "Was the service in question provided prior to 1/1/2022?"
    },
    TAXID: {
        NAME: "taxId",
        STATEMENT: "Tax ID missing"
    },
    NPI: {
        NAME: "npi",
        STATEMENT: "National Provider Identifier (NPI) missing"
    },
    OPEN_NEGOTIATION_DATE: {
        NAME: "open_negotiation_date",
        STATEMENT: "When did the open negotiation period start?"
    },
    DISPUTE: {
        NAME: "dispute",
        STATEMENT: "What are you disputing today?"
    },
    COI: {
        NAME: "coi",
        STATEMENT: "Conflict of Interest, Exists?"
    },
    IDRE_DATE: {
        NAME: "idre_date",
        STATEMENT: "IDRE initiated timely?"
    },
    LOCATION_OF_SERVICE: {
        NAME: "location_of_service",
        STATEMENT: "Location of service missing"
    },
    QPA_MISSING: {
        NAME: "qpa_missing",
        STATEMENT: "QPA Missing"
    },
    PLACE_OF_SERIVCE: {
        NAME: "place_of_service",
        STATEMENT: "Place of service code missing"
    },
    SERVICE_CODE_MISSING: {
        NAME: "service_code_missing",
        STATEMENT: "Service code missing"
    },
    INITIATING_PARTY_NAME: {
        NAME: "initiating_party_name",
        STATEMENT: "I'm a(n)?"
    },
    TRIPLE_ZERO: {
        NAME: "triple_zero",
        STATEMENT: "QPA, Initial Payment and Cost Sharing values are $0.00"
    },
    PARTIES_INFO: {
        NAME: "parties_info"
    },
    CLAIM_NUMBER: {
        NAME: "claim_number",
        STATEMENT: "Claim Number is missing"
    },
    PROOF_COOLING_OFF: {
        NAME: "proof_cooling_off",
        STATEMENT: "Proof of cooling off is valid"
    },
    TIMELY_OPEN_NEGOTIATION: {
        NAME: "timely_open_negotiation",
        STATEMENT: "Is open negotiation timely initiated?"
    },
    STATE_PROCESS: {
        NAME: "state_law",
        STATEMENT: "Does state law applies?"
    },
    FOUR_DAY_TIMELINE: {
        NAME: "exceed_four_day_timeline",
        STATEMENT: "Exceeds four day timeline"
    },
    SUBJECT_TO_NSA: {
        NAME: "plan_not_subject_to_nsa",
        STATEMENT: "Plan not subject to NSA"
    },
    POLICY_YEAR: {
        NAME: "prior_to_applicable_policy_year",
        STATEMENT: "Prior to applicable policy year"
    },
    NOTICE_OF_INITIATION_NOT_SUBMITTED: {
        NAME:"notice_of_initiation_not_submitted",
        STATEMENT:"Notice of initiation not submitted"
    },
    OTHER: {
        NAME:"other",
        STATEMENT: "Other"
    },
    COVERED_BY_PLAN: {
        NAME: "item_or_service_not_covered_by_plan",
        STATEMENT: "Item or service not covered by plan"
    }
    // NPI:{
    //     NAME:"npi",
    //     STATEMENT:"National Provider Identifier (NPI)"
    // },

}


const STATES = {
    "FederalIDRProcess": [
        "AK", "AL", "AZ", "AR", "DC", "HI", "ID", "IN", "IA", "KS", "KY", "LA", "MA", "MN",
        "MS", "MT", "NC", "ND", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "UT",
        "VT", "WV", "WI", "WY"
    ],
    "BifurcatedProcess": [
        "CA", "CO", "CT", "DE", "FL", "GA", "IL", "ME", "MD", "MI", "MO", "NE",
        "NV", "NH", "NJ", "NM", "NY", "OH", "TX", "VA", "WA"
    ]
}

const COI_STATES = ["MI", "WI", "MN", "IL"]

const SERVICE_DATE = '2022-01-01'

const OBJECTION = {
    STATE_PROCESS:"Eligible for state process",
    POLICY_YEAR: "Prior to applicable policy year",
    SUBJECT_TO_NSA: "Plan not subject to NSA",
    COVERED_BY_PLAN: "Item or service not covered by plan",
    NOT_NSA_ELIGIBLE: "Item or service not NSA eligible",
    FOUR_DAY_TIMELINE: "Exceeded four-day timeline",
    INCORRECTLY_BATCHED: "Incorrectly batched",
    INCORRECTLY_BUNDLED: "Incorrectly bundled",
    NOTICE_OF_INITIATION_NOT_SUBMITTED: "Notice of initiation not submitted",
    NEGOTIATION_NOT_COMPLETED: "Open negotiation not complete",
    NEGOTIATION_NOT_INITIATED: "Open negotiation not initiated",
    COOLING_OFF_PERIOD: "Cooling off period not completed",
    OTHER: "*Other"
}

const KAFKA_OBJECTION = {
    NO_OBJECTION: "NO_OBJECTION",
    STATE_PROCESS:"STATE_PROCESS",
    POLICY_YEAR:"POLICY_YEAR"  ,
    SUBJECT_TO_NSA:"SUBJECT_TO_NSA"  ,
    COVERED_BY_PLAN:"COVERED_BY_PLAN"  ,
    NOT_NSA_ELIGIBLE:"NOT_NSA_ELIGIBLE" ,
    FOUR_DAY_TIMELINE: "FOUR_DAY_TIMELINE",
    INCORRECTLY_BATCHED: "INCORRECTLY_BATCHED",
    INCORRECTLY_BUNDLED: "INCORRECTLY_BUNDLED",
    NOTICE_OF_INITIATION_NOT_SUBMITTED:"NOTICE_OF_INITIATION_NOT_SUBMITTED" ,
    NEGOTIATION_NOT_COMPLETED:"NEGOTIATION_NOT_COMPLETED",
    NEGOTIATION_NOT_INITIATED:"NEGOTIATION_NOT_INITIATED",
    COOLING_OFF_PERIOD:"COOLING_OFF_PERIOD",
    OTHER : "OTHER"
}

const OBJECTION_REASON = {
    SUBJECT_TO_NSA: {
        SPECIAL_MEDICAL_PLAN: "SPECIAL_MEDICAL_PLAN",
        BIFURCATED_STATE: "BIFURCATED_STATE"
    },
    COVERED_BY_PLAN: {
        BIFURCATED_STATE: "BIFURCATED_STATE"
    }
}

const PARTIES_INFO = [
    'complainantName', 'complainantPhoneNumber',
    'complainantEmailAddress', 'complainantCity', 'complainantState',
    'complainantType', 'complainantZipCode', 'complainantAddressLine1',
    'respondentZip', 'respondentType', 'respondentState',
    'respondentPhoneNumber', 'respondentName',
    'respondentEmailAddress', 'respondentCity', 'respondentAddressLine1'
]

const DATE_PATTERN = [
    'MMMM D, YYYY',    // e.g., June 2, 2022
    'MM/DD/YYYY',      // e.g., 06/02/2022
    'MM-DD-YYYY',      // e.g., 06-02-2022
    'MM/DD/YY',         // e.g., 08/17/23
    'MM.DD.YYYY',      // e.g., 06.02.2022
    'YYYY/MM/DD',      // e.g., 2022/06/02
    'YYYY-MM-DD',      // e.g., 2022-06-02
    'YYYY.MM.DD',      // e.g., 2022.06.02
]

const STATE_NAMES = {
    "AK": "Alaska",
    "AL": "Alabama",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "DC": "District of Columbia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "MA": "Massachusetts",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MT": "Montana",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "UT": "Utah",
    "VT": "Vermont",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "IL": "Illinois",
    "ME": "Maine",
    "MD": "Maryland",
    "MI": "Michigan",
    "MO": "Missouri",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "OH": "Ohio",
    "TX": "Texas",
    "VA": "Virginia",
    "WA": "Washington"
};

const REDIS = {
    DISPUTE:"Dispute"
}

const SUBMISSION_WINDOW={
    COOLING_OFF:"90-Day Cooling Period",
    RESUBMISSION:"Resubmission Requested",
    APPROVED_EXTENSION:"Approved Extension",
    TMA_EXTENSION:"TMA III & TMA IV Extension"
}



export {
    CHECK_LIST,
    STATES,
    COI_STATES,
    SERVICE_DATE,
    OBJECTION,
    KAFKA_OBJECTION,
    OBJECTION_REASON,
    DATE_PATTERN,
    STATE_NAMES,
    PARTIES_INFO,
    REDIS,
    SUBMISSION_WINDOW
}