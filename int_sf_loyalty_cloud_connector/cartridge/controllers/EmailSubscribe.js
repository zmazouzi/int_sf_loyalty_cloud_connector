'use strict';

var server = require('server');
var loyaltyConnector = require('*/cartridge/scripts/services/connector');
var dto = require('*/cartridge/scripts/helpers/dto');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Transaction = require('dw/system/Transaction');
server.extend(module.superModule);

/**
 * @author Zakaryae Mazouzi
 * @email zakaryae.mazouzi@gmail.com
 * @description Subscribes customer to the newsletter and creates a loyalty transaction for signup.
 * @route POST EmailSubscribe-Subscribe
 * @memberof EmailSubscribe
 */
server.append('Subscribe',  function (req, res, next) {
    if (!req.currentCustomer.profile) {
        return next();
    }
    
    var customer = CustomerMgr.getCustomerByCustomerNumber(req.currentCustomer.profile.customerNo);
    
    // call create transaction journal service
    var transactionJournals = [
        {
            "ActivityDate": new Date().toISOString(),
            "JournalTypeId": dto.getJournalTypeId('Accrual'),
            "JournalSubTypeId": dto.getJournalSubtypeId('Newsletter Signup'),
            "MemberId": customer.profile.custom.LoyaltyCloud_memberId,
            "Status": "Pending"
        }
    ];
    
    loyaltyConnector.executeTransactionJournals(transactionJournals);

    return next();
});


module.exports = server.exports();