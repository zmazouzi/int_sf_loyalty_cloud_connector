"use strict";

var Site = require("dw/system/Site");

function getLoyaltyCloudClientId() {
    return Site.getCurrent().getCustomPreferenceValue("LoyaltyCloud_clientId");
}

function getLoyaltyCloudClientSecret() {
    return Site.getCurrent().getCustomPreferenceValue("LoyaltyCloud_clientSecret");
}

function getLoyaltyCloudUsername() {
    return Site.getCurrent().getCustomPreferenceValue("LoyaltyCloud_username");
}

function getLoyaltyCloudPassword() {
    return Site.getCurrent().getCustomPreferenceValue("LoyaltyCloud_password");
}

function getLoyaltyCloudSecretToken() {
    return Site.getCurrent().getCustomPreferenceValue("LoyaltyCloud_secretToken");
}

function getLoyaltyCloudEndpoint() {
    return Site.getCurrent().getCustomPreferenceValue("LoyaltyCloud_endpoint");
}

function getLoyaltyCloudAccessToken() {
    return Site.getCurrent().getCustomPreferenceValue("LoyaltyCloud_accessToken");
}

function getLoyaltyCloudTokenExpiry() {
    return Site.getCurrent().getCustomPreferenceValue("LoyaltyCloud_tokenExpiry");
}

function setLoyaltyCloudAccessToken(token) {
    return Site.getCurrent().setCustomPreferenceValue("LoyaltyCloud_accessToken", token);
}

function setLoyaltyCloudTokenExpiry(expiry) {
    return Site.getCurrent().setCustomPreferenceValue("LoyaltyCloud_tokenExpiry", expiry);
}

function getLoyaltyCloudApiVersion() {
    return Site.getCurrent().getCustomPreferenceValue("LoyaltyCloud_apiVersion");
}

module.exports = {
    getLoyaltyCloudClientId: getLoyaltyCloudClientId,
    getLoyaltyCloudClientSecret: getLoyaltyCloudClientSecret,
    getLoyaltyCloudUsername: getLoyaltyCloudUsername,
    getLoyaltyCloudPassword: getLoyaltyCloudPassword,
    getLoyaltyCloudSecretToken: getLoyaltyCloudSecretToken,
    getLoyaltyCloudEndpoint: getLoyaltyCloudEndpoint,
    getLoyaltyCloudAccessToken: getLoyaltyCloudAccessToken,
    getLoyaltyCloudTokenExpiry: getLoyaltyCloudTokenExpiry,
    setLoyaltyCloudAccessToken: setLoyaltyCloudAccessToken,
    setLoyaltyCloudTokenExpiry: setLoyaltyCloudTokenExpiry
};
