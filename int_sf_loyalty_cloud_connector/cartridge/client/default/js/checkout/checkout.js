/* global $ */

'use strict';

var base = require('base/checkout/checkout');

/**
 * Toggle voucher state on the checkout form in a single place
 * Controls form action and visibility of related UI elements
 * @param {boolean} isApplied - true to apply voucher state, false to revert
 */
function toggleVoucherState(isApplied) {
    var $form = $('#dwfrm_billing');
    var currentAction = $form.attr('action');

    if (currentAction) {
        var from = isApplied ? 'CheckoutServices-SubmitPayment' : 'Voucher-SubmitVoucherPayment';
        var to = isApplied ? 'Voucher-SubmitVoucherPayment' : 'CheckoutServices-SubmitPayment';
        if (currentAction.indexOf(from) !== -1) {
            $form.attr('action', currentAction.replace(from, to));
        }
    }

    // Lists of selectors to hide/show when voucher is applied
    var hideWhenApplied = [
        '.payment-options',
        '.credit-card-selection-new',
        '#voucherCode',
        '#applyVoucherBtn'
    ];
    var showWhenApplied = [
        '.rollback-voucher-wrapper'
    ];

    // Toggle common elements
    hideWhenApplied.forEach(function (selector) {
        isApplied ? $(selector).addClass('d-none') : $(selector).removeClass('d-none');
    });
    showWhenApplied.forEach(function (selector) {
        isApplied ? $(selector).removeClass('d-none') : $(selector).addClass('d-none');
    });

    // Billing nav (also toggles marker class used at render time)
    var $billingNav = $('.billing-nav.payment-information');
    if (isApplied) {
        $billingNav.addClass('d-none voucher-applied');
    } else {
        $billingNav.removeClass('d-none voucher-applied');
    }
}

/**
 * Apply voucher state to the checkout form
 * This includes changing the form action, hiding sections, and disabling inputs
 */
function applyVoucherState() {
    toggleVoucherState(true);
};

/**
 * Revert voucher state from the checkout form
 * This includes reverting the form action, showing sections, and enabling inputs
 */
function revertVoucherState() {
    toggleVoucherState(false);
};

base.initializeVoucherSection = function () {
    var $body = $('body');
    
    // Check if voucher is already applied on page load
    if ($('.voucher-applied').length > 0) {
        applyVoucherState();
    }
    
    // Voucher application handler for checkout
    $body.on('click', '#applyVoucherBtn', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var voucherCode = $('#voucherCode').val();
        var $messageDiv = $('#voucherMessage');
        
        if (!voucherCode || voucherCode.trim() === '') {
            $messageDiv.removeClass('d-none').html('<div class="alert alert-warning">Please enter a voucher code</div>');
            return;
        }
        
        // Loading state
        $.spinner().start();
        $btn.prop('disabled', true).addClass('is-loading');
        
        $.ajax({
            url: $btn.data('url') + '?voucherCode=' + voucherCode.trim(),
            type: 'GET',
            dataType: 'json'
        }).done(function (res) {
            if (res && res.success) {
                var message = '<div class="alert alert-success">';
                message += '<strong>Voucher Applied Successfully!</strong><br>';
                message += 'Your voucher will cover the entire order.';
                message += '</div>';
                
                $messageDiv.html(message).removeClass('d-none');
                
                // Clear the input field
                $('#voucherCode').val('');
                
                // Apply voucher state
                applyVoucherState();
                
            } else {
                $messageDiv.html('<div class="alert alert-danger">' + (res && res.message || 'Failed to apply voucher') + '</div>').removeClass('d-none');
            }
        }).fail(function (xhr) {
            var msg = (xhr && xhr.responseJSON && xhr.responseJSON.message) || 'Failed to apply voucher';
            $messageDiv.html('<div class="alert alert-danger">' + msg + '</div>').removeClass('d-none');
        }).always(function () {
            $.spinner().stop();
            $btn.prop('disabled', false).removeClass('is-loading');
        });
    });
    
    // Voucher rollback handler for checkout
    $body.on('click', '#rollbackVoucherBtn', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var $messageDiv = $('#voucherMessage');
        
        // Loading state
        $.spinner().start();
        $btn.prop('disabled', true).addClass('is-loading');
        
        $.ajax({
            url: $btn.data('url'),
            type: 'GET',
            dataType: 'json'
        }).done(function (res) {
            if (res && res.success) {
                // Clear message div
                $messageDiv.addClass('d-none').html('');
                
                // Revert voucher state (show all hidden elements)
                revertVoucherState();
                
            } else {
                $messageDiv.removeClass('d-none').html('<div class="alert alert-danger">' + (res && res.message || 'Failed to remove voucher') + '</div>');
            }
        }).fail(function (xhr) {
            var msg = (xhr && xhr.responseJSON && xhr.responseJSON.message) || 'Failed to remove voucher';
            $messageDiv.removeClass('d-none').html('<div class="alert alert-danger">' + msg + '</div>');
        }).always(function () {
            $.spinner().stop();
            $btn.prop('disabled', false).removeClass('is-loading');
        });
    });
};
module.exports = base;
