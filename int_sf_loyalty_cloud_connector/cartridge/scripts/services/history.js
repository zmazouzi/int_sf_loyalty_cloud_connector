"use strict";

const customPrefs = require("*/cartridge/scripts/helpers/customPreferences");
const urls = require("*/cartridge/scripts/helpers/urls");
const LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
const Logger = require("dw/system/Logger");
const logger = Logger.getLogger("connector");

const getLoyaltyProgramName = require("./connector").getLoyaltyProgramName;
const createLoyaltyService = require("./connector").createLoyaltyService;
const getNonQualifyingCurrencyName = require("./connector").getNonQualifyingCurrencyName;

function getTransactionHistory(membershipNumber, journalType) {
    var loyaltyProgramName = getLoyaltyProgramName();
    return createLoyaltyService("LoyaltyCloud_transactionHistory", "POST", {
        queryParams: { page: 1 },
        payload: {
            membershipNumber: membershipNumber,
            journalType: journalType
        },
        endpointProcessor: function(url) {
            return url
                .replace("loyalty-program-name", encodeURIComponent(loyaltyProgramName))
                .replace("version", "v" + customPrefs.getLoyaltyCloudApiVersion());
        }
    });
}

function getTransactionLedgerSummary(queryParams) {
    var loyaltyProgramName = getLoyaltyProgramName();
    return createLoyaltyService("LoyaltyCloud_transactionLedgerSummary", "GET", {
        queryParams: queryParams,
        endpointProcessor: function(url) {
            return url
                .replace("loyalty-program-name", encodeURIComponent(loyaltyProgramName))
                .replace("membership-number", queryParams.membershipNumber)
                .replace("version", "v" + customPrefs.getLoyaltyCloudApiVersion());
        }
    });
}

function executeTransactionJournals(transactionJournals) {
    var loyaltyProgramName = getLoyaltyProgramName();
    return createLoyaltyService("LoyaltyCloud_transactionJournalsExecution", "POST", {
        payload: {
            transactionJournals: transactionJournals
        },
        endpointProcessor: function(url) {
            return url
                .replace("loyalty-program-name", encodeURIComponent(loyaltyProgramName))
                .replace("version", "v" + customPrefs.getLoyaltyCloudApiVersion());
        }
    });
}

module.exports = {
    getTransactionHistory,
    getTransactionLedgerSummary,
    executeTransactionJournals
};
