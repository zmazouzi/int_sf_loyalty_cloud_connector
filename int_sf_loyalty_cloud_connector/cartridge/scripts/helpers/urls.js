"use strict";
var Logger = require("dw/system/Logger");
var logger = Logger.getLogger("urls");

/**
 * URL Helper Functions
 * Provides utility functions for URL manipulation and parameter handling
 */

/**
 * Convert an object to URL query parameters string
 * @param {Object} obj - Object to convert to query parameters
 * @returns {string} URL-encoded query string
 */
function objectToQueryString(obj) {
    var str = [];
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
    }
    return str.join("&");
}

/**
 * Build URL with query parameters
 * @param {string} baseUrl - Base URL
 * @param {Object} params - Query parameters object
 * @returns {string} Complete URL with query string
 */
function buildUrlWithParams(baseUrl, params) {
    if (!params || Object.keys(params).length === 0) {
        return baseUrl;
    }
    
    var queryString = objectToQueryString(params);
    var separator = baseUrl.includes("?") ? "&" : "?";
    return baseUrl + separator + queryString;
}

/**
 * Parse query string into object
 * @param {string} queryString - Query string to parse
 * @returns {Object} Parsed parameters object
 */
function parseQueryString(queryString) {
    var params = {};
    if (!queryString) {
        return params;
    }
    
    var pairs = queryString.split("&");
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("=");
        if (pair.length === 2) {
            params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
    }
    return params;
}

/**
 * Get access token from CustomObject for a given service
 * @returns {string|null} Access token or null if not found
 */
function getAccessTokenFromCustomObject() {
    try {
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        var obj = CustomObjectMgr.getCustomObject('LoyaltyCloud', "loyalty_cloud");
        
        if (obj && obj.custom && obj.custom.access_token) {
            return obj.custom.access_token;
        }
        
        return null;
    } catch (error) {
        logger.error('Error retrieving access token: {0}', error.message);
        return null;
    }
}

/**
 * Set access token header for a service
 * @param {Object} svc - Service object
 * @param {string} serviceName - Name of the service to get token for
 * @param {string} headerName - Header name (default: 'Authorization')
 * @param {string} tokenPrefix - Token prefix (default: 'Bearer ')
 * @returns {boolean} True if token was set successfully
 */
function setAccessTokenHeader(svc, headerName, tokenPrefix) {
    headerName = headerName || 'Authorization';
    tokenPrefix = tokenPrefix || 'Bearer ';
    
    var accessToken = getAccessTokenFromCustomObject();
    
    if (accessToken) {
        svc.addHeader(headerName, tokenPrefix + accessToken);
        return true;
    }
    
    return false;
}

/**
 * Add query parameters to a service URL
 * @param {Object} svc - Service object
 * @param {Object} queryParams - Object containing query parameters
 * @returns {void}
 */
function addQueryParametersToServiceUrl(endpoint, queryParams) {
    if (!queryParams || Object.keys(queryParams).length === 0) {
        return endpoint;
    }
    
    var queryString = Object.keys(queryParams)
        .map(function(key) {
            return encodeURIComponent(key) + "=" + encodeURIComponent(queryParams[key]);
        })
        .join("&");
    
    endpoint = endpoint + (endpoint.includes("?") ? "&" : "?") + queryString;
    return endpoint;
}

module.exports = {
    objectToQueryString: objectToQueryString,
    buildUrlWithParams: buildUrlWithParams,
    parseQueryString: parseQueryString,
    getAccessTokenFromCustomObject: getAccessTokenFromCustomObject,
    setAccessTokenHeader: setAccessTokenHeader,
    addQueryParametersToServiceUrl: addQueryParametersToServiceUrl
};
