"use strict";

const customPrefs = require("*/cartridge/scripts/helpers/customPreferences");
const urls = require("*/cartridge/scripts/helpers/urls");
const LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
const Logger = require("dw/system/Logger");
const logger = Logger.getLogger("connector");

const getLoyaltyProgramName = require("./connector").getLoyaltyProgramName;
const createLoyaltyService = require("./connector").createLoyaltyService;

function redeemVoucher(voucherData) {
    var loyaltyProgramName = getLoyaltyProgramName();
    var payload = {
        processParameters: [
            {
                MemberId: voucherData.memberId,
                VoucherCode: voucherData.voucherCode,
                VoucherFaceValue: voucherData.voucherFaceValue,
                VoucherExpirationDate: voucherData.voucherExpirationDate
            }
        ]
    };
    return createLoyaltyService("LoyaltyCloud_invokeProcessRule", "POST", {
        payload: payload,
        endpointProcessor: function(url) {
            return url
                .replace("loyalty-program-name", encodeURIComponent(loyaltyProgramName))
                .replace("process-name", encodeURIComponent("Issue Voucher"))
                .replace("version", "v" + customPrefs.getLoyaltyCloudApiVersion());
        }
    });
}

function consumeVoucher(voucherId, membershipNumber) {
    var loyaltyProgramName = getLoyaltyProgramName();
    var payload = {
        processParameters:[
           {
              MembershipNumber: membershipNumber,
              VoucherId: voucherId
           }
        ]
    };
    return createLoyaltyService("LoyaltyCloud_invokeProcessRule", "POST", {
        payload: payload,
        endpointProcessor: function(url) {
            return url
                .replace("loyalty-program-name", encodeURIComponent(loyaltyProgramName))
                .replace("process-name", encodeURIComponent("Consume Voucher"))
                .replace("version", "v" + customPrefs.getLoyaltyCloudApiVersion());
        }
    });
}

function getVouchers(membershipNumber) {
    var loyaltyProgramName = getLoyaltyProgramName();
    return createLoyaltyService("LoyaltyCloud_getVouchers", "GET", {
        queryParams: {
            membershipNumber: membershipNumber
        },
        endpointProcessor: function(url) {
            return url
                .replace("loyalty-program-name", encodeURIComponent(loyaltyProgramName))
                .replace("membership-number", membershipNumber)
                .replace("version", "v" + customPrefs.getLoyaltyCloudApiVersion());
        }
    });
}

module.exports = {
    redeemVoucher,
    consumeVoucher,
    getVouchers
};
