"use strict";

var Logger = require("dw/system/Logger");
var Status = require("dw/system/Status");
var Site = require("dw/system/Site");
var CustomObjectMgr = require("dw/object/CustomObjectMgr");
var Transaction = require("dw/system/Transaction");

/**
 * Loyalty Cloud Data Sync Job Step
 * This job step syncs access token and loyalty program configuration data
 * and stores them in CustomObject for caching and reuse
 */
function Run(params) {
    try {
        var connector = require("*/cartridge/scripts/services/connector");
        var site = Site.getCurrent();
        

        var successCount = 0;
        var failureCount = 0;
        var errors = [];

        // 1. Get and store access token
        Logger.info("Retrieving Loyalty Cloud access token...");
        var tokenResult = connector.getAccessToken();
        var tokenResponse = connector.handleServiceResult(tokenResult, 'getAccessToken');
        tokenResponse = JSON.parse(tokenResponse.data.client.text);
        if (tokenResponse && tokenResponse.access_token) {
            var accessToken = tokenResponse.access_token;
            //var signature = tokenResponse.data.signature;
            //var issuedAt = tokenResponse.data.issued_at;

            // Store access token in CustomObject
            Transaction.wrap(function () {
                var lmObject = CustomObjectMgr.getCustomObject("LoyaltyCloud", "loyalty_cloud");
                if (!lmObject) {
                    lmObject = CustomObjectMgr.createCustomObject("LoyaltyCloud", "loyalty_cloud");
                }
            
                 lmObject.custom.access_token = accessToken;
                // authObject.custom.signature = tokenType;
                // authObject.custom.issued_at = issuedAt;
            });
            
            successCount++;
            Logger.info("Successfully stored access token in CustomObject");
        } else {
            failureCount++;
            var errorMsg = `Failed to retrieve access token: ${tokenResponse.error.message}`;
            errors.push(errorMsg);
            Logger.error(errorMsg);
        }

        // 2. Get and store loyalty program configuration
        // Logger.info("Retrieving Loyalty Cloud program configuration...");
        var dto = require("*/cartridge/scripts/helpers/dto");
        var programName = connector.getLoyaltyProgramName();
        var configResult = connector.getLoyaltyProgramConfig(programName);
        var configResponse = connector.handleServiceResult(configResult, 'getLoyaltyProgramConfig');
        if (configResponse && configResponse.data) {


            // Map the response to simplified format
            var configData = JSON.parse(configResponse.data.client.text);
            var journalTypesResult = connector.getJournalTypes();
            var journalTypesResponse = connector.handleServiceResult(journalTypesResult, 'getJournalTypes');
            var journalTypesData = JSON.parse(journalTypesResponse.data.client.text);
            var journalSubtypesResult = connector.getJournalSubtypes();
            var journalSubtypesResponse = connector.handleServiceResult(journalSubtypesResult, 'getJournalSubtypes');
            var journalSubtypesData = JSON.parse(journalSubtypesResponse.data.client.text);
            var mappedConfig = dto.mapLoyaltyProgramConfigData(configData, journalTypesData, journalSubtypesData);
            var configJson = JSON.stringify(mappedConfig, null, 2);
            
            // Store loyalty program config in CustomObject
            Transaction.wrap(function () {
                var lmObject = CustomObjectMgr.getCustomObject("LoyaltyCloud", "loyalty_cloud");
                if (!lmObject) {
                    lmObject = CustomObjectMgr.createCustomObject("LoyaltyCloud", "loyalty_cloud");
                }
            
                lmObject.custom.loyalty_program_ids = configJson;
            });
            
            successCount++;
            Logger.info("Successfully stored loyalty program configuration in CustomObject");
        
        } else {
            failureCount++;
            var errorMsg = `Failed to retrieve loyalty program config: ${configResponse.error.message}`;
            errors.push(errorMsg);
            Logger.error(errorMsg);
        }

        // Prepare result message
        var message = `Loyalty Cloud Data Sync completed. Success: ${successCount}, Failed: ${failureCount}`;
        if (errors.length > 0) {
            Logger.warn(message + " Errors: " + errors.join("; "));
        } else {
            Logger.info(message);
        }

        // Return appropriate status
        if (failureCount > 0 && successCount === 0) {
            return new Status(Status.ERROR, "Complete Failure", message + " All operations failed.");
        } else if (failureCount > 0) {
            return new Status(Status.OK, "Partial Success", message + " Some operations failed.");
        }

        return new Status(Status.OK, "Success", "Loyalty Cloud Data Sync completed.");
     } catch (error) {
        var err = error;
        Logger.error("Loyalty Cloud Data Sync job failed: {0}", error.message);
        return new Status(Status.ERROR, "Error", "Loyalty Cloud data sync failed: {0}", error.message);
    }
}

module.exports = {
    Run: Run,
};
