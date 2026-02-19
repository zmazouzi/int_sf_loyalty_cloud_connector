'use strict';

var server = require('server');
var loyaltyConnector = require('*/cartridge/scripts/services/connector');
var Logger = require('dw/system/Logger').getLogger('ProgramMember');
var Transaction = require('dw/system/Transaction');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var customPreferences = require('*/cartridge/scripts/helpers/customPreferences');
var loyaltyProgram = require('*/cartridge/scripts/services/program');

/**
 * @author Zakaryae Mazouzi
 * @email zakaryae.mazouzi@gmail.com
 * @description Enroll a new loyalty program member using profile and preferences.
 * @route GET ProgramMember-EnrollMember
 * @memberof ProgramMember
 */
server.get('EnrollMember', userLoggedIn.validateLoggedIn, server.middleware.https, function (req, res, next) {
    try {
        var actions = require('*/cartridge/scripts/helpers/actions');

        // Build payload from current customer context
        var payload = actions.buildMemberEnrollmentPayload(req);

        // Get single program name from site preferences
        var programName = customPreferences.getLoyaltyCloudProgramName();

        // Call service for single program
        var result = loyaltyProgram.enrollProgramMember(programName, payload);

        if (result && result.ok) {
            var body = JSON.parse(result.object.client.text);
            // Store single program member ID instead of array
            if (req.currentCustomer && req.currentCustomer.profile) {
                var customerNo = req.currentCustomer.profile.customerNo;
                var CustomerMgr = require('dw/customer/CustomerMgr');
                var customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
                if (customer) {
                    Transaction.wrap(function () {
                        customer.profile.custom.LoyaltyCloud_memberId = body.loyaltyProgramMemberId;
                    });
                }
            }
            

         // get member profile data 
         var memberProfileResult = loyaltyConnector.getMemberProfile(body.loyaltyProgramMemberId, req.currentCustomer.profile.customerNo);
         var memberProfileBody = JSON.parse(memberProfileResult.object.client.text);

         // Map the member profile data to the expected format using the DTO helper
         var dto = require("*/cartridge/scripts/helpers/dto");
         var mappedMemberData = dto.mapMemberProfileData(memberProfileBody);

        res.json({ success: true, data: mappedMemberData });
    } else {
        var errObj = (result && result.object && result.object.client && result.object.client.text) ? result.object.client.text : null;
        var message = result && result.errorMessage ? result.errorMessage : 'Enrollment failed';
        res.setStatusCode(500);
        res.json({ success: false, message: message, error: errObj });
    }
    return next();
 } catch (error) {
     Logger.error('EnrollMember error: {0}', error && error.message);
    res.setStatusCode(500);
    res.json({ success: false, message: error && error.message ? error.message : 'Unexpected error' });
    return next();
}
});

module.exports = server.exports();
