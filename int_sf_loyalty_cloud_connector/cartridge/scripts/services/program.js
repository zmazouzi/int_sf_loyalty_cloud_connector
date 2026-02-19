"use strict";

const customPrefs = require("*/cartridge/scripts/helpers/customPreferences");
const urls = require("*/cartridge/scripts/helpers/urls");
const LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
const Logger = require("dw/system/Logger");
const logger = Logger.getLogger("connector");

const createLoyaltyService = require("./connector").createLoyaltyService;
const genericQuery = require("./connector").genericQuery;

function getMemberProfile(memberId, membershipNumber) {
    var loyaltyProgramName = customPrefs.getLoyaltyCloudProgramName();
    var nonQualifyingCurrencyName = customPrefs.getLoyaltyCloudNonQualifyingCurrencyName();
    return createLoyaltyService("LoyaltyCloud_getMemberProfile", "GET", {
        queryParams: {
            memberId: memberId,
            membershipNumber: membershipNumber,
            programCurrencyName: nonQualifyingCurrencyName
        },
        endpointProcessor: function(url) {
            return url
                .replace("loyalty-program-name", encodeURIComponent(loyaltyProgramName))
                .replace("version", "v" + customPrefs.getLoyaltyCloudApiVersion());
        }
    });
}

function enrollProgramMember(programName, memberData) {
    return createLoyaltyService("LoyaltyCloud_enrollProgramMembers", "POST", {
        payload: memberData,
        endpointProcessor: function(url) {
            return url
                .replace("program-name", encodeURIComponent(programName))
                .replace("version", "v" + customPrefs.getLoyaltyCloudApiVersion());
        }
    });
}

function getLoyaltyProgramConfig(programName) {
    var soqlQuery = `SELECT Id, Name,  (SELECT Id, Name FROM LoyaltyProgramCurrencies),
          (SELECT Id, Name, (SELECT Id, Name FROM LoyaltyTiers) FROM LoyaltyTierGroups),
      (SELECT Id, Name FROM JournalTypes),
      (SELECT Id, Name FROM JournalSubTypes)
      FROM LoyaltyProgram   WHERE Name = '${programName}' LIMIT 1`;
    return genericQuery(soqlQuery.replace(/\s+/g, ' ').trim());
}


module.exports = {
    getMemberProfile,
    enrollProgramMember,
    getLoyaltyProgramConfig
};
