'use strict';

var server = require('server');
var loyaltyConnector = require('*/cartridge/scripts/services/connector');
var Logger = require('dw/system/Logger');
server.extend(module.superModule);
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var dto = require('*/cartridge/scripts/helpers/dto');

/**
 * @author Zakaryae Mazouzi
 * @email zakaryae.mazouzi@gmail.com
 * @description Appends loyalty programs data to account dashboard.
 * @route GET Account-Show (append)
 * @memberof Account
 */
server.append('Show', server.middleware.https, userLoggedIn.validateLoggedIn, function (req, res, next) {
    try {

        var loyaltyProgram =
        {
            programName: loyaltyConnector.getLoyaltyProgramName(),
            membershipNumber: "",
            memberStatus: "",
            qualifyingPoints: 0,
            nonQualifyingPoints: 0,
            totalPoints: 0,
            tier: "",
            enrollmentDate: "",
            programType: "",
            benefits: [],
            nextTierPoints: 0,
            tierProgress: 0
        };

        // Get single loyalty program with two currencies
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var customer = CustomerMgr.getCustomerByCustomerNumber(
            req.currentCustomer.profile.customerNo
        );
        var programMemberId = customer && customer.profile && customer.profile.custom ?
            customer.profile.custom.LoyaltyCloud_memberId : null;

        // Get member profile for single program with both currencies
        if (programMemberId) {

            var memberProfileResult = loyaltyConnector.getMemberProfile(
                programMemberId,  // memberId
                req.currentCustomer.profile.customerNo // membershipNumber
            );

            memberProfileResult = JSON.parse(memberProfileResult.object.client.text);

            // Map Salesforce Loyalty Cloud response to template-expected format using the service function
            var mappedProgram = dto.mapMemberProfileData(memberProfileResult);

            // Get transaction history for the member
            try {
                var transactionHistoryResult = loyaltyConnector.getTransactionHistory(
                    req.currentCustomer.profile.customerNo,
                    "Accrual"
                );

                if (transactionHistoryResult && transactionHistoryResult.ok) {
                    var transactionHistoryData = JSON.parse(transactionHistoryResult.object.client.text);
                    mappedProgram.transactionHistory = transactionHistoryData.transactionJournals || [];
                    mappedProgram.transactionHistoryTotal = transactionHistoryData.totalCount || 0;
                } else {
                    mappedProgram.transactionHistory = [];
                    mappedProgram.transactionHistoryTotal = 0;
                }
            } catch (historyError) {
                var logger = Logger.getLogger('Account');
                logger.error('Error getting transaction history: {0}', historyError.message);
                mappedProgram.transactionHistory = [];
                mappedProgram.transactionHistoryTotal = 0;
            }

            // Get transaction ledger summary for the member

            var ledgerSummaryPayload = {
                journalTypeName: "Accrual",
                pageNumber: 1
            };

            var ledgerSummaryResult = loyaltyConnector.getTransactionLedgerSummary(ledgerSummaryPayload);

            if (ledgerSummaryResult && ledgerSummaryResult.ok) {
                var ledgerSummaryData = JSON.parse(ledgerSummaryResult.object.client.text);
                mappedProgram.transactionLedgerSummary = ledgerSummaryData.transactionJournals || [];
                mappedProgram.transactionLedgerCount = ledgerSummaryData.transactionJournalCount || 0;
            } else {
                mappedProgram.transactionLedgerSummary = [];
                mappedProgram.transactionLedgerCount = 0;
            }

            loyaltyProgram = mappedProgram;

        }

        res.setViewData({
            loyaltyProgram: loyaltyProgram,
        })


        next();
    } catch (error) {
        // Log error but don't break the account page
        var logger = Logger.getLogger('Account');
        logger.error('Error adding loyalty programs data to account dashboard: {0}', error.message);

        // Set empty data to prevent template errors
        res.setViewData({
            loyaltyProgram: null,
            loyaltySummary: {
                totalPrograms: 0,
                activePrograms: 0,
                totalPoints: 0,
                highestTier: 'None'
            }
        });

        next();
    }
});

/**
 * @author Zakaryae Mazouzi
 * @email zakaryae.mazouzi@gmail.com
 * @description Render full page view of loyalty program details using profile layout, fetching current member profile, transactions, ledger, and vouchers.
 * @route GET Account-LoyaltyPrograms
 * @memberof Account
 */
server.get('LoyaltyProgramDetails', server.middleware.https, userLoggedIn.validateLoggedIn, consentTracking.consent, function (req, res, next) {
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');
    var CustomerMgr = require('dw/customer/CustomerMgr');

    // Get single program with two currencies
    var customer = CustomerMgr.getCustomerByCustomerNumber(
        req.currentCustomer.profile.customerNo
    );
    var programMemberId = customer && customer.profile && customer.profile.custom ?
        customer.profile.custom.LoyaltyCloud_memberId : null;
    var program = null;

    if (programMemberId) {
        try {
            var memberProfileResult = loyaltyConnector.getMemberProfile(
                programMemberId,
                req.currentCustomer.profile.customerNo
            );

            memberProfileResult = JSON.parse(memberProfileResult.object.client.text);

            // Map the member profile data to the expected format using the service function
            program = dto.mapMemberProfileData(memberProfileResult);

            // Get transaction history for the member
            try {
                var transactionHistoryResult = loyaltyConnector.getTransactionHistory(
                    req.currentCustomer.profile.customerNo,
                    "Accrual"
                );

                if (transactionHistoryResult && transactionHistoryResult.ok) {
                    var transactionHistoryData = JSON.parse(transactionHistoryResult.object.client.text);
                    program.transactionHistory = transactionHistoryData.transactionJournals || [];
                    program.transactionHistoryTotal = transactionHistoryData.totalCount || 0;
                } else {
                    program.transactionHistory = [];
                    program.transactionHistoryTotal = 0;
                }
            } catch (historyError) {
                const errrrr = historyError;
                var logger = Logger.getLogger('Account');
                logger.error('Error getting transaction history: {0}', historyError.message);
                program.transactionHistory = [];
                program.transactionHistoryTotal = 0;
            }

            // Get transaction ledger summary for the member
            try {

                var ledgerSummaryResult = loyaltyConnector.getTransactionLedgerSummary({
                    membershipNumber: req.currentCustomer.profile.customerNo,
                    journalTypeName: "Accrual",
                    pageNumber: req.querystring.pageNumber || 1
                });

                if (ledgerSummaryResult && ledgerSummaryResult.ok) {
                    var ledgerSummaryData = JSON.parse(ledgerSummaryResult.object.client.text);
                    program.transactionLedgerSummary = ledgerSummaryData.transactionJournals || [];
                    program.transactionLedgerCount = ledgerSummaryData.transactionJournalCount || 0;
                } else {
                    program.transactionLedgerSummary = [];
                    program.transactionLedgerCount = 0;
                }
            } catch (ledgerError) {
                const errrr = ledgerError;
                var logger = Logger.getLogger('Account');
                logger.error('Error getting transaction ledger summary: {0}', ledgerError.message);
                program.transactionLedgerSummary = [];
                program.transactionLedgerCount = 0;
            }

            // Get vouchers for the member
            try {
                var vouchersResult = loyaltyConnector.getVouchers(req.currentCustomer.profile.customerNo);

                if (vouchersResult && vouchersResult.ok) {
                    var vouchersData = JSON.parse(vouchersResult.object.client.text);
                    program.vouchers = dto.mapVouchersData(vouchersData).vouchers;
                } else {
                    program.vouchers = [];
                }
            } catch (vouchersError) {
                const vouchersErrorF = vouchersError;
                var logger = Logger.getLogger('Account');
                logger.error('Error getting vouchers: {0}', vouchersError.message);
                program.vouchers = [];
            }
        } catch (error) {
            const err = error;
            var logger = Logger.getLogger('Account');
            logger.error('Error getting member profile for loyalty program page: {0}', error.message);
        }
    }

    // Fallback to mock data if no program found
    if (!program) {
        program = null;
    }

    res.render('account/loyalty/programPage', {
        loyaltyProgram: program,
        activeTab: req.querystring.activeTab || 'track',
        breadcrumbs: [
            {
                htmlValue: Resource.msg('global.home', 'common', null),
                url: URLUtils.home().toString()
            },
            {
                htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                url: URLUtils.url('Account-Show').toString()
            }
        ]
    });
    next();
});

module.exports = server.exports();