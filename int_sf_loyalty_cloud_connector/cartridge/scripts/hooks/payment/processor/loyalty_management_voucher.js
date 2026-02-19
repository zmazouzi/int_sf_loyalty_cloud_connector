'use strict';

var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var loyaltyVoucher = require('*/cartridge/scripts/services/voucher');

/**
 * Verifies the required information for billing form is provided.
 * @param {Object} req - The request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has error information or payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var viewData = viewFormData;

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };

    return {
        error: false,
        viewData: viewData
    };
}

/**
 * Handle payment
 * @return {Object} an object that contains error information
 */
function Handle() {
    return {
        success: true,
        error: false,
    };
}

/**
 * Authorize payment
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var serverErrors = [];
    var fieldErrors = {};
    var error = false;

    try {
        // get customer number from session 
        // Consume voucher before authorizing payment
        var result = loyaltyVoucher.consumeVoucher(paymentInstrument.custom.voucherId, session.customer.profile.customerNo);
        // parse result as json
        var resultJson = JSON.parse(result.object.client.text);
        if (!resultJson.status) {
            error = true;
            serverErrors.push(resultJson.message);
            return { fieldErrors: fieldErrors, serverErrors: serverErrors, error: error };
        }

        Transaction.wrap(function () {
            if (paymentInstrument.paymentTransaction) {
                paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                paymentInstrument.paymentTransaction.setType(require('dw/order/PaymentTransaction').TYPE_CAPTURE);
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            }
        });
    } catch (e) {
        var err =e;
        error = true;
        serverErrors.push(
            Resource.msg('error.technical', 'checkout', null)
        );
    }

    return { fieldErrors: fieldErrors, serverErrors: serverErrors, error: error };
}

exports.Handle = Handle;
exports.processForm = processForm;
exports.Authorize = Authorize;
