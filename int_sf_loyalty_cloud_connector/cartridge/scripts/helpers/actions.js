"use strict";

var Logger = require("dw/system/Logger");
var log = Logger.getLogger("loyalty");
var Money = require("dw/value/Money");
var BasketMgr = require("dw/order/BasketMgr");
var Transaction = require("dw/system/Transaction");
var Resource = require("dw/web/Resource");
// Import the loyalty connector service
var loyaltyConnector = require("*/cartridge/scripts/services/connector");

/**
 * Build enrollment payload from currentCustomer request context
 * @param {dw.system.Request} req - Request object with currentCustomer
 * @returns {Object} Enrollment payload matching Loyalty Cloud API structure
 */
function buildMemberEnrollmentPayload(req) {
    var Site = require("dw/system/Site");

    var currentCustomer = req && req.currentCustomer;
    var profile = currentCustomer && currentCustomer.profile;

    var firstName = profile ? profile.firstName : "";
    var lastName = profile ? profile.lastName : "";

    // Enforce required fields
    if (!firstName || !lastName) {
        log.error("Enrollment payload validation failed: missing firstName or lastName. firstNamePresent={0}, lastNamePresent={1}", !!firstName, !!lastName);
        throw new Error("First name and last name are required to enroll a loyalty member");
    }
    var phone = profile ? (profile.phoneMobile || profile.phoneHome || "") : "";
    var membershipNumber = String(currentCustomer.profile.customerNo);

    var website = Site.getCurrent().getCustomPreferenceValue("loyaltyDefaultWebsite") || "";

    var payload = {
        enrollmentDate: new Date().toISOString(),
        membershipNumber: membershipNumber || "",
        associatedAccountDetails: {
            name: (firstName || lastName) ? (firstName + " " + lastName).trim() : "",
            phone: phone || "0000000000",
            website: website || "www.test.com",
            allowDuplicateRecords: "false"
        },
        memberStatus: "Active",
        createTransactionJournals: "true"
    };

    log.debug("Enrollment payload constructed for customer. membershipNumber={0}, name={1}", payload.membershipNumber, payload.associatedAccountDetails.name);
    return payload;
}

/**
 * Redeem voucher and create loyalty-voucher payment instrument
 * @param {Object} voucherData - Voucher redemption data
 * @param {string} voucherData.voucherCode - Voucher code to redeem
 * @param {number} voucherData.faceValue - Face value of the voucher
 * @param {string} voucherData.currencyCode - Currency code for the voucher
 * @param {string} voucherData.memberId - Member ID for redemption
 * @param {string} [voucherData.expirationDate] - Optional expiration date for the voucher
 * @returns {Object} Result object with success status and details
 */
function applyVoucher(voucherData) {
    var result = {
        error: true,
        message: "",
        serviceResponse: {
            voucherCode: "",
            faceValue: null,
            redeemedAmount: null,
            errorCode: "",
            errorMessage: ""
        }
    };

    try {
        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket) {
            result.message = Resource.msg("error.no.basket", "loyalty", null);
            return result;
        }

        var orderTotal = currentBasket.totalGrossPrice.value;

        // Validate the voucher first
        var validationResult = validateVoucher(voucherData.voucherCode, voucherData.memberId);
        
        if (validationResult.error) {
            result.message = validationResult.message;
            result.serviceResponse.errorMessage = validationResult.message;
            return result;
        }

        // Use validated voucher data
        var validatedVoucher = validationResult.voucherData;
        var validatedFaceValue = validatedVoucher.faceValue;

        // Validate that voucher face value is greater than order total
        if (validatedFaceValue <= orderTotal) {
            log.error("Voucher redemption validation failed: face value {0} is not greater than order total {1}", validatedFaceValue, orderTotal);
            result.message = Resource.msg("error.voucher.insufficient.value", "loyalty", null);
            return result;
        }

        // Calculate amount to apply (use order total since voucher value is greater)
        var amountToApply = orderTotal;

        // Create payment instrument in transaction
        Transaction.wrap(function () {
            // Add PaymentInstrument to the basket
            var paymentInstrument = currentBasket.createPaymentInstrument(
                "LOYALTY_MANAGEMENT_VOUCHER",
                new Money(amountToApply, currentBasket.currencyCode)
            );
            
            // Store additional information in the payment instrument
            if (paymentInstrument) {
                // Store custom attributes - these will be available as custom attributes
                // Note: Custom attributes need to be defined in the system first
                try {
                    paymentInstrument.custom.voucherCode = voucherData.voucherCode;
                    paymentInstrument.custom.voucherId = validatedVoucher.voucherId;
                    paymentInstrument.custom.voucherFaceValue = validatedFaceValue;
                    paymentInstrument.custom.voucherRedeemedAmount = amountToApply;
                } catch (customError) {
                    log.warn("Could not set custom attributes on payment instrument: {0}", customError.message);
                }
            }
        });

        // Success
        result.error = false;
        result.message = Resource.msg("success.voucher.applied", "loyalty", null);
        result.serviceResponse.voucherCode = voucherData.voucherCode;
        result.serviceResponse.faceValue = new Money(validatedFaceValue, currentBasket.currencyCode);
        result.serviceResponse.redeemedAmount = new Money(amountToApply, currentBasket.currencyCode);


    } catch (err) {
        log.error("Error in applyVoucher: {0}", err.message);
        result.message = Resource.msg("error.voucher.unexpected", "loyalty", null);
        result.serviceResponse.errorMessage = err.message;
    }

    return result;
}

/**
 * Validate voucher by calling getVouchers service and checking if voucher exists and is active
 * @param {string} voucherCode - Voucher code to validate
 * @param {string} membershipNumber - Member's membership number
 * @returns {Object} Result object with validation status and voucher details
 */
function validateVoucher(voucherCode, membershipNumber) {
    var result = {
        error: true,
        message: "",
        voucherData: {
            voucherId: null,
            voucherCode: null,
            faceValue: null,
            remainingValue: null,
            status: null,
            expirationDate: null,
            isExpired: false,
            isActive: false
        }
    };

    try {
        if (!voucherCode || !membershipNumber) {
            result.message = Resource.msg("error.voucher.validation.missing.params", "loyalty", null);
            return result;
        }


        // Call the getVouchers service
        var serviceResult = loyaltyConnector.getVouchers(membershipNumber);

        if (!serviceResult || !serviceResult.ok) {
            var errorMessage = serviceResult && serviceResult.errorMessage ? serviceResult.errorMessage : "Failed to retrieve vouchers";
            log.error("GetVouchers service failed: {0}", errorMessage);
            result.message = Resource.msg("error.voucher.retrieval.failed", "loyalty", null);
            return result;
        }

        // Parse service response
        var vouchersResponse = null;
        try {
            vouchersResponse = JSON.parse(serviceResult.object.client.text);
        } catch (parseError) {
            log.error("Failed to parse vouchers response: {0}", parseError.message);
            result.message = Resource.msg("error.voucher.response.parse", "loyalty", null);
            return result;
        }

        // Check if vouchers exist in response
        if (!vouchersResponse || !vouchersResponse.vouchers || vouchersResponse.vouchers.length === 0) {
            result.message = Resource.msg("error.voucher.not.found", "loyalty", null);
            return result;
        }

        // Find the specific voucher by code
        var targetVoucher = null;
        for (var i = 0; i < vouchersResponse.vouchers.length; i++) {
            if (vouchersResponse.vouchers[i].voucherCode === voucherCode) {
                targetVoucher = vouchersResponse.vouchers[i];
                break;
            }
        }

        if (!targetVoucher) {
            result.message = Resource.msg("error.voucher.code.not.found", "loyalty", null);
            return result;
        }

        // Check if voucher is expired
        var isExpired = false;
        if (targetVoucher.expirationDate) {
            var expirationDate = new Date(targetVoucher.expirationDate);
            var currentDate = new Date();
            isExpired = currentDate > expirationDate;
        }

        // Check if voucher is active (not expired, not redeemed, not cancelled)
        var isActive = !isExpired && 
                      targetVoucher.status === 'Issued' && 
                      targetVoucher.isVoucherDefinitionActive === true;

        if (!isActive) {
            var statusMessage = "";
            if (isExpired) {
                statusMessage = Resource.msg("error.voucher.expired", "loyalty", null);
            } else if (targetVoucher.status === 'Redeemed') {
                statusMessage = Resource.msg("error.voucher.already.redeemed", "loyalty", null);
            } else if (targetVoucher.status === 'Cancelled') {
                statusMessage = Resource.msg("error.voucher.cancelled", "loyalty", null);
            } else if (targetVoucher.isVoucherDefinitionActive === false) {
                statusMessage = Resource.msg("error.voucher.definition.inactive", "loyalty", null);
            } else {
                statusMessage = Resource.msg("error.voucher.inactive", "loyalty", null);
            }
            
            result.message = statusMessage;
            return result;
        }

        // Voucher is valid and active
        result.error = false;
        result.message = Resource.msg("success.voucher.valid", "loyalty", null);
        result.voucherData.voucherId = targetVoucher.voucherId;
        result.voucherData.voucherCode = targetVoucher.voucherCode;
        result.voucherData.faceValue = targetVoucher.faceValue;
        result.voucherData.remainingValue = targetVoucher.remainingValue;
        result.voucherData.status = targetVoucher.status;
        result.voucherData.expirationDate = targetVoucher.expirationDate;
        result.voucherData.isExpired = isExpired;
        result.voucherData.isActive = isActive;

        log.debug("Voucher validation successful. voucherCode={0}, status={1}, faceValue={2}, remainingValue={3}", 
            voucherCode, targetVoucher.status, targetVoucher.faceValue, targetVoucher.remainingValue);

    } catch (err) {
        log.error("Error in validateVoucher: {0}", err.message);
        result.message = Resource.msg("error.voucher.validation.unexpected", "loyalty", null);
    }

    return result;
}

/**
 * Rollback voucher by removing the loyalty voucher payment instrument from the basket
 * @returns {Object} Result object with success status and details
 */
function rollbackVoucher() {
    var result = {
        error: true,
        message: ""
    };

    try {
        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket) {
            result.message = Resource.msg("error.no.basket", "loyalty", null);
            return result;
        }

        var paymentInstruments = currentBasket.getPaymentInstruments();
        var voucherPaymentInstrument = null;

        // Find the loyalty voucher payment instrument
        for (var i = 0; i < paymentInstruments.length; i++) {
            if (paymentInstruments[i].paymentMethod === "LOYALTY_MANAGEMENT_VOUCHER") {
                voucherPaymentInstrument = paymentInstruments[i];
                break;
            }
        }

        if (!voucherPaymentInstrument) {
            result.message = Resource.msg("error.voucher.not.applied", "loyalty", null);
            return result;
        }

        // Remove payment instrument in transaction
        Transaction.wrap(function () {
            currentBasket.removePaymentInstrument(voucherPaymentInstrument);
        });

        // Success
        result.error = false;
        result.message = Resource.msg("success.voucher.removed", "loyalty", null);

        log.debug("Voucher payment instrument removed from basket");

    } catch (err) {
        log.error("Error in rollbackVoucher: {0}", err.message);
        result.message = Resource.msg("error.voucher.rollback.unexpected", "loyalty", null);
    }

    return result;
}

module.exports = {
    buildMemberEnrollmentPayload: buildMemberEnrollmentPayload,
    applyVoucher: applyVoucher,
    validateVoucher: validateVoucher,
    rollbackVoucher: rollbackVoucher
};


