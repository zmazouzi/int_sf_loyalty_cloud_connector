'use strict';

var server = require('server');
var Logger = require('dw/system/Logger').getLogger('Voucher');
var Transaction = require('dw/system/Transaction');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var customPreferences = require('*/cartridge/scripts/helpers/customPreferences');

/**
 * @author Zakaryae Mazouzi
 * @email zakaryae.mazouzi@gmail.com
 * @description Submit voucher redemption request.
 * @route GET Voucher-SubmitRedeemVoucher
 * @queryparam {number} pointsToRedeem - The number of points to redeem
 * @returns {json} - The response body
 * @returns {boolean} success - Whether the redemption was successful
 * @returns {string} message - The message to display
 * @returns {object} data - The data to display
 * @returns {string} voucherCode - The voucher code
 * @returns {number} voucherValue - The voucher value
 * @returns {string} expirationDate - The expiration date
 * @returns {number} pointsRedeemed - The points redeemed
 * @memberof Voucher
 */
server.get('SubmitRedeemVoucher', userLoggedIn.validateLoggedIn, server.middleware.https, function (req, res, next) {
    try {
        var pointsToRedeem = req.querystring.pointsToRedeem;
        var pointsToRedeemStr = Array.isArray(pointsToRedeem) ? pointsToRedeem[0] : pointsToRedeem;
        var pointsToRedeemNum = pointsToRedeemStr ? parseInt(pointsToRedeemStr, 10) : 0;
        
        if (!pointsToRedeemNum || isNaN(pointsToRedeemNum) || pointsToRedeemNum < 1000) {
            res.setStatusCode(400);
            res.json({ 
                success: false, 
                message: 'Minimum 1000 points required for voucher redemption' 
            });
            return next();
        }
        
        // Calculate voucher value (100 points = $1)
        var voucherValue = Math.floor(pointsToRedeemNum / 100);
        
        // Generate voucher code (you might want to implement a more sophisticated code generation)
        var voucherCode = 'VOUCHER' + Date.now().toString().substr(-6);
        
        // Calculate expiration date (1 year from now)
        var expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        var voucherExpirationDate = expirationDate.toISOString().split('T')[0];

        // Get member ID from customer profile
        var memberId = null;
        if (req.currentCustomer && req.currentCustomer.profile) {
            var customerNo = req.currentCustomer.profile.customerNo;
            var CustomerMgr = require('dw/customer/CustomerMgr');
            var customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
            memberId = customer.profile.custom.LoyaltyCloud_memberId;
        }
        
        if (!memberId) {
            res.setStatusCode(400);
            res.json({ 
                success: false, 
                message: 'Customer not enrolled in loyalty program' 
            });
            return next();
        }
        
        // Prepare voucher data
        var voucherData = {
            memberId: memberId,
            voucherCode: voucherCode,
            voucherFaceValue: voucherValue,
            voucherExpirationDate: voucherExpirationDate
        };
        
        // Call the redeem voucher service
        var result = loyaltyVoucher.redeemVoucher(voucherData);
        
        if (result && result.ok) {
            var responseBody = JSON.parse(result.object.client.text);
            
            res.json({ 
                success: true, 
                message: 'Voucher redeemed successfully',
                data: {
                    voucherCode: voucherCode,
                    voucherValue: voucherValue,
                    expirationDate: voucherExpirationDate,
                    pointsRedeemed: pointsToRedeemNum
                }
            });
        } else {
            var errorMessage = result && result.errorMessage ? result.errorMessage : 'Voucher redemption failed';
            var errorDetails = result && result.object && result.object.client && result.object.client.text ? result.object.client.text : null;
            
            Logger.error('Voucher redemption failed: {0}', errorMessage);
            res.setStatusCode(500);
            res.json({ 
                success: false, 
                message: errorMessage,
                error: errorDetails
            });
        }
        
        return next();
    } catch (error) {
        Logger.error('SubmitRedeemVoucher error: {0}', error && error.message);
        res.setStatusCode(500);
        res.json({ 
            success: false, 
            message: error && error.message ? error.message : 'Unexpected error during voucher redemption' 
        });
        return next();
    }
});

/**
 * @author Zakaryae Mazouzi
 * @email zakaryae.mazouzi@gmail.com
 * @description Apply voucher to basket using updated actions functions.
 * @route GET Voucher-ApplyVoucher
 * @queryparam {string} voucherCode - The voucher code to apply
 * @returns {json} - The response body
 * @returns {boolean} success - Whether the voucher was applied successfully
 * @returns {string} message - The message to display
 * @returns {object} data - The data to display
 * @returns {string} voucherCode - The voucher code
 * @returns {number} faceValue - The face value of the voucher
 * @returns {number} remainingBalance - The remaining balance of the voucher
 * @returns {number} redeemedAmount - The amount redeemed from the voucher
 * @memberof Voucher
 */
server.get('ApplyVoucher', userLoggedIn.validateLoggedIn, server.middleware.https, function (req, res, next) {
    try {
        var actions = require('*/cartridge/scripts/helpers/actions');
        var voucherCode = req.querystring.voucherCode;
        var membershipNumber = req.currentCustomer.profile.customerNo;

        if (!voucherCode || !membershipNumber || voucherCode.trim() === '') {
            res.setStatusCode(400);
            res.json({ 
                success: false, 
                message: 'Voucher code is required' 
            });
            return next();
        }
        
        if (!membershipNumber) {
            res.setStatusCode(400);
            res.json({ 
                success: false, 
                message: 'Membership number is required' 
            });
            return next();
        }
        
        // Prepare voucher data for applyVoucher function
        var voucherData = {
            voucherCode: voucherCode.trim(),
            memberId: membershipNumber,
            faceValue: 0, // Will be validated and retrieved from the service
            currencyCode: 'USD' // Default currency, can be made configurable
        };
        
        // Apply voucher using the updated actions function
        var result = actions.applyVoucher(voucherData);
        
        if (!result.error) {
            res.json({ 
                success: true, 
                message: result.message,
                voucherData: {
                    voucherCode: result.serviceResponse.voucherCode,
                    faceValue: result.serviceResponse.faceValue,
                    remainingBalance: result.serviceResponse.remainingBalance,
                    redeemedAmount: result.serviceResponse.redeemedAmount
                }
            });
        } else {
            res.setStatusCode(400);
            res.json({ 
                success: false, 
                message: result.message,
                error: result.serviceResponse.errorMessage
            });
        }
        
        return next();
    } catch (error) {
        Logger.error('ApplyVoucher error: {0}', error && error.message);
        res.setStatusCode(500);
        res.json({ 
            success: false, 
            message: error && error.message ? error.message : 'Unexpected error during voucher application' 
        });
        return next();
    }
});


/**
 * @author Zakaryae Mazouzi
 * @email zakaryae.mazouzi@gmail.com
 * @description Submit voucher payment; ultra-simplified version for voucher-only payments.
 * @route POST Voucher-SubmitVoucherPayment
 * @memberof Voucher
 */
server.post('SubmitVoucherPayment', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    try {
        var BasketMgr = require('dw/order/BasketMgr');
        var Transaction = require('dw/system/Transaction');
        var URLUtils = require('dw/web/URLUtils');
        var Resource = require('dw/web/Resource');
        var actions = require('*/cartridge/scripts/helpers/actions');
        var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var OrderModel = require('*/cartridge/models/order');
        var AccountModel = require('*/cartridge/models/account');
        var Locale = require('dw/util/Locale');

        var currentBasket = BasketMgr.getCurrentBasket();


        // Validate basket exists
        if (!currentBasket) {
            res.json({
                error: true,
                cartError: true,
                message: Resource.msg('error.basket.not.found', 'checkout', 'Basket not found'),
                redirectUrl: URLUtils.url('Cart-Show').toString()
            });
            return next();
        }

        // Validate products in basket
        var validatedProducts = validationHelpers.validateProducts(currentBasket);
        if (validatedProducts.error) {
            res.json({
                error: true,
                cartError: true,
                message: Resource.msg('error.basket.validation.failed', 'checkout', 'Basket validation failed'),
                redirectUrl: URLUtils.url('Cart-Show').toString()
            });
            return next();
        }




        // Calculate basket totals after voucher application
        if (currentBasket) {
            Transaction.wrap(function () {
                basketCalculationHelpers.calculateTotals(currentBasket);
            });
        }

        // Create order model for response
        var currentLocale = Locale.getLocale(req.locale.id);
        var basketModel = null;
        if (currentBasket) {
            basketModel = new OrderModel(
                currentBasket,
                {
                    usingMultiShipping: false,
                    countryCode: currentLocale.country,
                    containerView: 'basket'
                }
            );
        }

        var accountModel = new AccountModel(req.currentCustomer, req.locale, req.locale);

        res.json({
            error: false,
            message: Resource.msg('success.voucher.applied', 'loyalty', 'Voucher applied successfully'),
            order: basketModel,
            customer: accountModel,
            renderedPaymentInstruments: 'test',
        });

    } catch (error) {
        Logger.error('SubmitVoucherPayment error: {0}', error && error.message);
        res.json({
            error: true,
            message: error && error.message ? error.message : Resource.msg('error.voucher.payment.failed', 'loyalty', 'Voucher payment failed')
        });
    }

    return next();
});

/**
 * @author Zakaryae Mazouzi
 * @email zakaryae.mazouzi@gmail.com
 * @description Validate voucher using updated actions functions.
 * @route GET Voucher-ValidateVoucher
 * @memberof Voucher
 */
server.get('ValidateVoucher', userLoggedIn.validateLoggedIn, server.middleware.https, function (req, res, next) {
    try {
        var actions = require('*/cartridge/scripts/helpers/actions');
        var voucherCode = req.querystring.voucherCode;
        var membershipNumber = req.querystring.membershipNumber;
        
        // Ensure parameters are strings
        var voucherCodeStr = Array.isArray(voucherCode) ? voucherCode[0] : voucherCode;
        var membershipNumberStr = Array.isArray(membershipNumber) ? membershipNumber[0] : membershipNumber;
        
        if (!voucherCodeStr || voucherCodeStr.trim() === '') {
            res.setStatusCode(400);
            res.json({ 
                success: false, 
                message: 'Voucher code is required' 
            });
            return next();
        }
        
        if (!membershipNumberStr) {
            res.setStatusCode(400);
            res.json({ 
                success: false, 
                message: 'Membership number is required' 
            });
            return next();
        }
        
        // Validate voucher using the updated actions function
        var result = actions.validateVoucher(voucherCodeStr.trim(), membershipNumberStr);
        
        if (!result.error) {
            res.json({ 
                success: true, 
                message: result.message,
                voucherData: result.voucherData
            });
        } else {
            res.setStatusCode(400);
            res.json({ 
                success: false, 
                message: result.message
            });
        }
        
        return next();
    } catch (error) {
        Logger.error('ValidateVoucher error: {0}', error && error.message);
        res.setStatusCode(500);
        res.json({ 
            success: false, 
            message: error && error.message ? error.message : 'Unexpected error during voucher validation' 
        });
        return next();
    }
});

/**
 * @author Zakaryae Mazouzi
 * @email zakaryae.mazouzi@gmail.com
 * @description Rollback voucher by removing the payment instrument from basket.
 * @route GET Voucher-RollbackVoucher
 * @memberof Voucher
 */
server.get('RollbackVoucher', userLoggedIn.validateLoggedIn, server.middleware.https, function (req, res, next) {
    try {
        var actions = require('*/cartridge/scripts/helpers/actions');
        
        // Rollback voucher using the actions function
        var result = actions.rollbackVoucher();
        
        if (!result.error) {
            res.json({ 
                success: true, 
                message: result.message
            });
        } else {
            res.setStatusCode(400);
            res.json({ 
                success: false, 
                message: result.message
            });
        }
        
        return next();
    } catch (error) {
        Logger.error('RollbackVoucher error: {0}', error && error.message);
        res.setStatusCode(500);
        res.json({ 
            success: false, 
            message: error && error.message ? error.message : 'Unexpected error during voucher rollback' 
        });
        return next();
    }
});

module.exports = server.exports();
;
