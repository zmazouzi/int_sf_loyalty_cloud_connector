'use strict';

/* global $ */

var base = require('base/checkout/billing');

// Keep reference to the original implementation
var originalUpdatePaymentInformation = base.methods.updatePaymentInformation;

/**
 * Override: updates the payment information in checkout
 * If a voucher is applied, show a message that the order is fully paid by voucher
 * and hide/disable standard payment UI. Otherwise, fall back to the base behavior.
 * @param {Object} order - checkout model to use as basis of new truth
 */
base.methods.updatePaymentInformation = function (order) {
    try {
        if (order && order.isVoucherApplied) {
            var $paymentSummary = $('.payment-details');
            var htmlToAppend = '';

            htmlToAppend += '<div class="alert alert-success w-100 mb-0">';
            htmlToAppend += 'Order will be fully paid by voucher.';
            htmlToAppend += '</div>';

            $paymentSummary.empty().append(htmlToAppend);

            // Hide payment UI to reflect voucher-only payment
            $('.payment-options').addClass('d-none');
            $('.billing-nav.payment-information').addClass('d-none');
            $('.credit-card-selection-new').addClass('d-none');

            return;
        }
    } catch (e) {
        // In case of any issue, gracefully fallback to base behavior
    }

    // Default behavior
    return originalUpdatePaymentInformation(order);
};

module.exports = base;


