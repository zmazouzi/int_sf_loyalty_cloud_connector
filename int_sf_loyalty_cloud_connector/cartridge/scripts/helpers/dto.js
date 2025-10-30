"use strict";

var Logger = require("dw/system/Logger");
var CustomObjectMgr = require("dw/object/CustomObjectMgr");
var logger = Logger.getLogger("dto");

/**
 * DTO Helper Functions
 * Provides utility functions for working with Loyalty Cloud configuration data
 * and looking up IDs based on object type and name
 */

/**
 * Get loyalty configuration data from CustomObject
 * @returns {Object|null} Parsed loyalty configuration or null if not found
 */
function getLoyaltyConfigData() {
    try {
        var obj = CustomObjectMgr.getCustomObject('LoyaltyCloud', "loyalty_cloud");
        
        if (obj && obj.custom && obj.custom.loyalty_program_ids) {
            return JSON.parse(obj.custom.loyalty_program_ids);
        }
        
        return null;
    } catch (error) {
        logger.error('Error retrieving loyalty config data: {0}', error.message);
        return null;
    }
}

/**
 * Find ID by object type and name in loyalty configuration
 * @param {string} objectType - Type of object to search for
 * @param {string} name - Name to search for
 * @returns {string|null} ID if found, null otherwise
 */
function findIdByName(objectType, name) {
    try {
        var configData = getLoyaltyConfigData();
        if (!configData) {
            logger.warn('Loyalty configuration data not found');
            return null;
        }

        var searchArray = null;
        
        // Determine which array to search based on object type
        switch (objectType.toLowerCase()) {
            case 'loyaltyprogramcurrency':
                searchArray = configData.loyaltyProgramCurrencies;
                break;
            case 'loyaltytiergroup':
                searchArray = configData.loyaltyTierGroups;
                break;
            case 'loyaltytier':
                // Search through all tier groups for tiers
                if (configData.loyaltyTierGroups) {
                    for (var i = 0; i < configData.loyaltyTierGroups.length; i++) {
                        var tierGroup = configData.loyaltyTierGroups[i];
                        if (tierGroup.loyaltyTiers) {
                            for (var j = 0; j < tierGroup.loyaltyTiers.length; j++) {
                                var tier = tierGroup.loyaltyTiers[j];
                                if (tier.name && tier.name.toLowerCase() === name.toLowerCase()) {
                                    return tier.id;
                                }
                            }
                        }
                    }
                }
                return null;
            case 'journaltype':
                searchArray = configData.journalTypes;
                break;
            case 'journalsubtype':
                searchArray = configData.journalSubtypes;
                break;
            case 'loyaltyprogram':
                // For the main program, return the program ID
                if (configData.name && configData.name.toLowerCase() === name.toLowerCase()) {
                    return configData.id;
                }
                return null;
            default:
                logger.warn('Unknown object type: {0}', objectType);
                return null;
        }

        if (!searchArray) {
            logger.warn('No data found for object type: {0}', objectType);
            return null;
        }

        // Search for the name in the array
        for (var i = 0; i < searchArray.length; i++) {
            var item = searchArray[i];
            if (item.name && item.name.toLowerCase() === name.toLowerCase()) {
                return item.id;
            }
        }

        logger.warn('No {0} found with name: {1}', objectType, name);
        return null;
    } catch (error) {
        logger.error('Error finding ID by name: {0}', error.message);
        return null;
    }
}

/**
 * Get all objects of a specific type
 * @param {string} objectType - Type of objects to retrieve
 * @returns {Array} Array of objects of the specified type
 */
function getObjectsByType(objectType) {
    try {
        var configData = getLoyaltyConfigData();
        if (!configData) {
            logger.warn('Loyalty configuration data not found');
            return [];
        }

        switch (objectType.toLowerCase()) {
            case 'loyaltyprogramcurrency':
                return configData.loyaltyProgramCurrencies || [];
            case 'loyaltytiergroup':
                return configData.loyaltyTierGroups || [];
            case 'loyaltytier':
                // Flatten all tiers from all tier groups
                var allTiers = [];
                if (configData.loyaltyTierGroups) {
                    for (var i = 0; i < configData.loyaltyTierGroups.length; i++) {
                        var tierGroup = configData.loyaltyTierGroups[i];
                        if (tierGroup.loyaltyTiers) {
                            allTiers = allTiers.concat(tierGroup.loyaltyTiers);
                        }
                    }
                }
                return allTiers;
            case 'journaltype':
                return configData.journalTypes || [];
            case 'journalsubtype':
                return configData.journalSubtypes || [];
            case 'loyaltyprogram':
                return [{
                    id: configData.id,
                    name: configData.name,
                    type: configData.type
                }];
            default:
                logger.warn('Unknown object type: {0}', objectType);
                return [];
        }
    } catch (error) {
        logger.error('Error getting objects by type: {0}', error.message);
        return [];
    }
}

/**
 * Get loyalty program information
 * @returns {Object|null} Program information or null if not found
 */
function getLoyaltyProgram() {
    try {
        var configData = getLoyaltyConfigData();
        if (!configData) {
            return null;
        }

        return {
            id: configData.id,
            name: configData.name,
            type: configData.type
        };
    } catch (error) {
        logger.error('Error getting loyalty program: {0}', error.message);
        return null;
    }
}

/**
 * Get journal type ID by name
 * @param {string} name - Journal type name
 * @returns {string|null} Journal type ID or null if not found
 */
function getJournalTypeId(name) {
    return findIdByName('JournalType', name);
}

/**
 * Get journal subtype ID by name
 * @param {string} name - Journal subtype name
 * @returns {string|null} Journal subtype ID or null if not found
 */
function getJournalSubtypeId(name) {
    return findIdByName('JournalSubType', name);
}

/**
 * Get loyalty tier ID by name
 * @param {string} name - Tier name
 * @returns {string|null} Tier ID or null if not found
 */
function getLoyaltyTierId(name) {
    return findIdByName('LoyaltyTier', name);
}

/**
 * Get loyalty program currency ID by name
 * @param {string} name - Currency name
 * @returns {string|null} Currency ID or null if not found
 */
function getLoyaltyProgramCurrencyId(name) {
    return findIdByName('LoyaltyProgramCurrency', name);
}

/**
 * Map loyalty program configuration data to simplified format
 * @param {Object} configResponse - Raw loyalty program config data from API
 * @param {Object} journalTypesResponse - Raw journal types data from API
 * @param {Object} journalSubtypesResponse - Raw journal subtypes data from API
 * @returns {Object} Mapped loyalty program configuration
 */
function mapLoyaltyProgramConfigData(configResponse, journalTypesResponse, journalSubtypesResponse) {
    if (!configResponse || !configResponse.records || configResponse.records.length === 0) {
        return {
            id: null,
            loyaltyProgramCurrencies: [],
            loyaltyTierGroups: [],
            journalTypes: [],
            journalSubtypes: []
        };
    }
    
    var program = configResponse.records[0];
    
    // Extract loyalty program currencies
    var loyaltyProgramCurrencies = [];
    if (program.LoyaltyProgramCurrencies && program.LoyaltyProgramCurrencies.records) {
        program.LoyaltyProgramCurrencies.records.forEach(function(currency) {
            loyaltyProgramCurrencies.push({
                id: currency.Id,
                name: currency.Name,
                type: currency.attributes.type
            });
        });
    }
    
    // Extract loyalty tier groups with their tiers
    var loyaltyTierGroups = [];
    if (program.LoyaltyTierGroups && program.LoyaltyTierGroups.records) {
        program.LoyaltyTierGroups.records.forEach(function(tierGroup) {
            var loyaltyTiers = [];
            if (tierGroup.LoyaltyTiers && tierGroup.LoyaltyTiers.records) {
                tierGroup.LoyaltyTiers.records.forEach(function(tier) {
                    loyaltyTiers.push({
                        id: tier.Id,
                        name: tier.Name,
                        type: tier.attributes.type
                    });
                });
            }
            
            loyaltyTierGroups.push({
                id: tierGroup.Id,
                name: tierGroup.Name,
                type: tierGroup.attributes.type,
                loyaltyTiers: loyaltyTiers
            });
        });
    }
    
    // Extract journal types from separate response
    var journalTypes = [];
    if (journalTypesResponse && journalTypesResponse.records) {
        journalTypesResponse.records.forEach(function(journalType) {
            journalTypes.push({
                id: journalType.Id,
                name: journalType.Name,
                type: journalType.attributes.type
            });
        });
    }
    
    // Extract journal subtypes from separate response
    var journalSubtypes = [];
    if (journalSubtypesResponse && journalSubtypesResponse.records) {
        journalSubtypesResponse.records.forEach(function(journalSubtype) {
            journalSubtypes.push({
                id: journalSubtype.Id,
                name: journalSubtype.Name,
                type: journalSubtype.attributes.type
            });
        });
    }
    
    return {
        id: program.Id,
        name: program.Name,
        type: program.attributes.type,
        loyaltyProgramCurrencies: loyaltyProgramCurrencies,
        loyaltyTierGroups: loyaltyTierGroups,
        journalTypes: journalTypes,
        journalSubtypes: journalSubtypes
    };
}

/**
 * Map member profile data to the expected UI format
 * @param {Object} memberProfileBody - Raw member profile data from API
 * @returns {Object} Mapped member data for UI consumption
 */
function mapMemberProfileData(memberProfileBody) {
    var Site = require("dw/system/Site");
    var site = Site.getCurrent();
    
    // Get currency names from site preferences
    var qualifyingCurrencyName = site.getCustomPreferenceValue("LoyaltyCloud_qualifyingCurrencyName") || "Qualifying Points";
    var nonQualifyingCurrencyName = site.getCustomPreferenceValue("LoyaltyCloud_nonQualifyingCurrencyName") || "Non-Qualifying Points";
    
    // Extract both currencies from the response
    var qualifyingPoints = 0;
    var nonQualifyingPoints = 0;
    
    if (memberProfileBody.memberCurrencies && memberProfileBody.memberCurrencies.length > 0) {
        memberProfileBody.memberCurrencies.forEach(function(currency) {
            if (currency.loyaltyMemberCurrencyName === qualifyingCurrencyName) {
                qualifyingPoints = currency.pointsBalance || 0;
            } else if (currency.loyaltyMemberCurrencyName === nonQualifyingCurrencyName) {
                nonQualifyingPoints = currency.pointsBalance || 0;
            }
        });
    }
    
    // Map the member profile data to the expected format
    return {
        id: memberProfileBody.loyaltyProgramMemberId,
        programName: memberProfileBody.loyaltyProgramName,
        membershipNumber: memberProfileBody.membershipNumber,
        memberStatus: memberProfileBody.memberStatus,
        qualifyingPoints: qualifyingPoints,
        nonQualifyingPoints: nonQualifyingPoints,
        totalPoints: qualifyingPoints + nonQualifyingPoints,
        tier: memberProfileBody.memberTiers && memberProfileBody.memberTiers.length > 0 
            ? memberProfileBody.memberTiers[0].loyaltyMemberTierName 
            : "",
        enrollmentDate: memberProfileBody.enrollmentDate,   
        programType: memberProfileBody.memberType,
        memberType: memberProfileBody.memberType,
        associatedAccount: memberProfileBody.associatedAccount,
        canReceivePromotions: memberProfileBody.canReceivePromotions,
        canReceivePartnerPromotions: memberProfileBody.canReceivePartnerPromotions,
        benefits: [],
        nextTierPoints: 0,
        tierProgress: 0
    };
}

/**
 * Map vouchers data to the expected UI format
 * @param {Object} vouchersResponse - Raw vouchers data from API
 * @returns {Object} Mapped vouchers data for UI consumption
 */
function mapVouchersData(vouchersResponse) {
    if (!vouchersResponse || !vouchersResponse.vouchers || vouchersResponse.vouchers.length === 0) {
        return {
            voucherCount: 0,
            vouchers: []
        };
    }
    
    var mappedVouchers = vouchersResponse.vouchers.map(function(voucher) {
        // Determine status badge class based on voucher status
        var statusClass = 'badge-info'; // default
        if (voucher.status === 'Issued') {
            statusClass = 'badge-success';
        } else if (voucher.status === 'Redeemed') {
            statusClass = 'badge-secondary';
        } else if (voucher.status === 'Expired') {
            statusClass = 'badge-danger';
        } else if (voucher.status === 'Cancelled') {
            statusClass = 'badge-warning';
        }
        
        // Check if voucher is expired
        var isExpired = false;
        if (voucher.expirationDate) {
            var expirationDate = new Date(voucher.expirationDate);
            var currentDate = new Date();
            isExpired = currentDate > expirationDate;
        }
        
        return {
            voucherId: voucher.voucherId,
            voucherCode: voucher.voucherCode,
            voucherNumber: voucher.voucherNumber,
            voucherDefinition: voucher.voucherDefinition,
            faceValue: voucher.faceValue,
            remainingValue: voucher.remainingValue,
            redeemedValue: voucher.redeemedValue,
            status: voucher.status,
            statusClass: statusClass,
            type: voucher.type,
            effectiveDate: voucher.effectiveDate,
            expirationDate: voucher.expirationDate,
            isExpired: isExpired,
            isVoucherDefinitionActive: voucher.isVoucherDefinitionActive,
            isVoucherPartiallyRedeemable: voucher.isVoucherPartiallyRedeemable,
            hasTimeBasedVoucherPeriod: voucher.hasTimeBasedVoucherPeriod,
            currency: 'USD' // You might want to get this from site preferences or API response
        };
    });
    
    return {
        voucherCount: vouchersResponse.voucherCount || mappedVouchers.length,
        vouchers: mappedVouchers
    };
}

module.exports = {
    getLoyaltyConfigData: getLoyaltyConfigData,
    findIdByName: findIdByName,
    getObjectsByType: getObjectsByType,
    getLoyaltyProgram: getLoyaltyProgram,
    getJournalTypeId: getJournalTypeId,
    getJournalSubtypeId: getJournalSubtypeId,
    getLoyaltyTierId: getLoyaltyTierId,
    getLoyaltyProgramCurrencyId: getLoyaltyProgramCurrencyId,
    mapLoyaltyProgramConfigData: mapLoyaltyProgramConfigData,
    mapMemberProfileData: mapMemberProfileData,
    mapVouchersData: mapVouchersData
};
