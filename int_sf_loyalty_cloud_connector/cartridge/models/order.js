var base = module.superModule;

/**
 * Check if a voucher payment instrument is already created
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current basket or order
 * @returns {boolean} - True if voucher is applied, false otherwise
 */
function isVoucherApplied(lineItemContainer) {
    if (!lineItemContainer) {
        return false;
    }
    
    var paymentInstruments = lineItemContainer.getPaymentInstruments('LOYALTY_MANAGEMENT_VOUCHER');
    return paymentInstruments.length > 0;
}

/**
 * OrderModel extends the base order model to add loyalty voucher information
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket/order
 * @param {Object} options - The current order's options
 */
function OrderModel(lineItemContainer, options) {
    base.apply(this, Array.prototype.slice.call(arguments));
    
    // Add voucher data to the order model
    this.isVoucherApplied = isVoucherApplied(lineItemContainer);
}

module.exports = OrderModel;

