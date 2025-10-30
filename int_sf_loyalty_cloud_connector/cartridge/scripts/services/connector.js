"use strict";

const LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
const Logger = require("dw/system/Logger");
const logger = Logger.getLogger("connector");
const urls = require("*/cartridge/scripts/helpers/urls");
const customPrefs = require("*/cartridge/scripts/helpers/customPreferences");

// == CORE ONLY: Helper and shared methods ==

/**
 * Get Salesforce access token for Loyalty Cloud APIs
 * @returns {Object} Service result with access token
 */
function getAccessToken() {
    const service = LocalServiceRegistry.createService("LoyaltyCloud_getToken", {
        createRequest: function (svc) {
            // Get credentials from custom prefs
            const clientId = customPrefs.getLoyaltyCloudClientId();
            const clientSecret = customPrefs.getLoyaltyCloudClientSecret();
            const username = customPrefs.getLoyaltyCloudUsername();
            const password = customPrefs.getLoyaltyCloudPassword();
            const secretToken = customPrefs.getLoyaltyCloudSecretToken();
            // Build password with security token if available
            const fullPassword = secretToken ? password + secretToken : password;
            const payload = {
                "grant_type": "password",
                "client_id": clientId,
                "client_secret": clientSecret,
                "username": username,
                "password": fullPassword
            };
            let url = svc.getURL();
            const params = urls.objectToQueryString(payload);
            url = url + '?' + params;
            svc.setRequestMethod("POST");
            svc.addHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
            svc.setURL(url);
        },
        parseResponse: function (response) { return response; }
    });
    return service.call();
}

/**
 * Core createLoyaltyService utility
 */
function createLoyaltyService(serviceName, method, options) {
    var headers = {};
    var payload = null;
    var queryParams = {};
    var endpointProcessor = null;
    if (options) {
        headers = options.headers || {};
        payload = options.payload || null;
        queryParams = options.queryParams || {};
        endpointProcessor = options.endpointProcessor || null;
    }
    var service = LocalServiceRegistry.createService(serviceName, {
        createRequest: function (svc) {
            svc.setRequestMethod(method);
            var tokenSet = urls.setAccessTokenHeader(svc, 'Authorization', 'Bearer ');
            if (!tokenSet) {
                logger.error('Failed to retrieve access token for LoyaltyCloud service');
            }
            svc.addHeader("Content-Type", "application/json");
            Object.keys(headers).forEach(function(key) {
                svc.addHeader(key, headers[key]);
            });
            var url = svc.getURL();
            url = getBaseEndpoint() + "/" + url;
            if (endpointProcessor && typeof endpointProcessor === 'function') {
                url = endpointProcessor(url);
            }
            if (Object.keys(queryParams).length > 0) {
                url = urls.addQueryParametersToServiceUrl(url, queryParams);
            }
            svc.setURL(url);
            if (payload && ["POST", "PATCH", "PUT"].indexOf(method) !== -1) {
                return JSON.stringify(payload);
            }
            return null;
        },
        parseResponse: function (response) { return response; }
    });
    return service.call();
}

function createService(serviceName, method, endpoint, headers, payload, queryParams) {
    return createLoyaltyService(serviceName, method, {
        endpoint: endpoint,
        headers: headers,
        payload: payload,
        queryParams: queryParams
    });
}

function handleServiceResult(serviceResult, operation) {
    if (serviceResult.isOk()) {
        logger.info("Loyalty Cloud {0} operation successful", operation);
        return { success: true, data: serviceResult.object, error: null };
    } else {
        const errorMsg = serviceResult.errorMessage || "Unknown error";
        logger.error("Loyalty Cloud {0} operation failed: {1}", operation, errorMsg);
        return { success: false, data: null, error: { message: errorMsg, statusCode: serviceResult.statusCode || 500 } };
    }
}

function getBaseUrl() {
    const endpoint = customPrefs.getLoyaltyCloudEndpoint();
    const version = customPrefs.getLoyaltyCloudApiVersion();
    return `${endpoint}/services/data/v${version}`;
}

// == EXPORTS (core access only) ==
module.exports = {
    getAccessToken,
    createService,
    createLoyaltyService,
    handleServiceResult,
    getBaseUrl
};

