# SFCC Loyalty Cloud Connector

A comprehensive Salesforce Commerce Cloud cartridge that integrates with Salesforce Loyalty Cloud to provide loyalty program management, voucher redemption, and member profile functionality. This connector can be extended to implement more features provided by Loyalty Management Cloud, such as gamification and promotions.

## Overview

The `int_sf_loyalty_cloud_connector` cartridge enables seamless integration between Salesforce Commerce Cloud and Salesforce Loyalty Cloud, allowing customers to:

- Enroll in loyalty programs
- View loyalty points and tier status
- Redeem and consume vouchers
- Track transaction history
- Manage member profiles

## Features

### Loyalty Program Management
- **Program Enrollment**: Automatic enrollment of customers in loyalty programs
- **Points Tracking**: Real-time tracking of qualifying and non-qualifying points
- **Tier Management**: Dynamic tier assignment based on customer activity
- **Member Status**: Active/inactive member status management

### Voucher System
- **Voucher Redemption**: Redeem vouchers for purchases
- **Voucher Consumption**: Apply vouchers to order totals
- **Voucher History**: Track voucher usage and expiration
- **Payment Integration**: Seamless integration with checkout process

### Transaction Management
- **Transaction Journals**: Execute loyalty point transactions
- **Transaction History**: Complete audit trail of all loyalty activities
- **Ledger Summary**: Comprehensive points balance and activity summary

### Authentication & Security
- **OAuth Integration**: Secure authentication with Salesforce Loyalty Cloud
- **Token Management**: Automatic token refresh and management
- **API Security**: Secure API communication with proper error handling

## Configuration Steps

### 1. Add Cartridge to Path

Add `int_sf_loyalty_cloud_connector` to your cartridge path in Business Manager:

```
YourSite:app_storefront_base:modules:app_storefront_base:int_sf_loyalty_cloud_connector
```

### 2. Create Salesforce Connected App

Create a Salesforce Connected App for the username-password flow:

1. Navigate to **Setup** → **App Manager** → **New Connected App**
2. Configure OAuth settings:
   - **Enable OAuth Settings**: ✅
   - **Callback URL**: Your site URL
   - **Selected OAuth Scopes**: 
     - Access and manage your data (api)
     - Perform requests on your behalf at any time (refresh_token, offline_access)
3. Note down the **Consumer Key** and **Consumer Secret**

> **Note**: JWT authentication flow implementation is planned for future releases.

### 3. Configure Site Preferences

Set up the following site preferences in Business Manager:

| Preference | Description |
|------------|-------------|
| `LoyaltyCloud_clientId` | Salesforce Connected App Consumer Key |
| `LoyaltyCloud_clientSecret` | Salesforce Connected App Consumer Secret |
| `LoyaltyCloud_username` | Salesforce username for API access |
| `LoyaltyCloud_password` | Salesforce password |
| `LoyaltyCloud_secretToken` | Salesforce security token |
| `LoyaltyCloud_endpoint` | Salesforce instance URL |
| `LoyaltyCloud_apiVersion` | API version to use |
| `LoyaltyCloud_programName` | Loyalty program name |
| `LoyaltyCloud_qualifyingCurrencyName` | Qualifying points currency name |
| `LoyaltyCloud_nonQualifyingCurrencyName` | Non-qualifying points currency name |

### 4. Schedule Data Sync Job

Configure and schedule the `loyaltyCloudDataSync` job to:
- Refresh authentication tokens
- Sync loyalty component IDs
- Update member data

**Job Configuration:**
- **Frequency**: Every 30 minutes
- **Timeout**: 10 minutes
- **Retry**: 3 attempts

The following screenshot shows the service credentials configured in Business Manager:

<div style="display: flex; justify-content: center; margin: 20px 0;">
    <img src="screenshots/Service%20credentials%20in%20BM.png" alt="Service Credentials in Business Manager" style="max-width: 100%; height: auto;">
</div>
*Service credentials configured in Business Manager showing various Loyalty Cloud service endpoints*

### 5. Import Metadata Components

Import the following metadata components:

#### services.xml
```xml
<service service-id="LoyaltyCloud_getToken">
    <service-type>HTTP</service-type>
    <enabled>true</enabled>
    <log-prefix>loyaltyService</log-prefix>
    <comm-log-enabled>true</comm-log-enabled>
    <force-prd-enabled>true</force-prd-enabled>
    <profile-id>loyaltyProfile</profile-id>
</service>
```

#### system-objecttype-extensions.xml
Extends existing objects with loyalty-specific attributes:
- Payment instrument extensions for voucher data
- Customer profile extensions for loyalty information
- Order extensions for loyalty transaction tracking

#### custom-objecttype-definitions.xml
Defines new custom objects:
- Loyalty program configuration
- Voucher management
- Transaction journal tracking

#### paymentmethod.xml
```xml
<payment-method method-id="loyalty_management_voucher">
    <name xml:lang="x-default">Loyalty Voucher</name>
    <enabled-flag>true</enabled-flag>
    <processor-id>loyalty_management_voucher</processor-id>
</payment-method>
```

### 6. Add Voucher Payment Section

Add the voucher payment section to your checkout page:

```isml
<isinclude template="cartridge/templates/default/checkout/voucherPaymentSection.isml" />
```

> **Important**: Currently, vouchers can only be consumed if they cover the total order value. Split payment functionality will be included in the next release.

### 7. Configure SFRA Builder

Add the `loyalty` client path to your `sfraBuilderConfig.js` so the storefront assets are bundled correctly:

```js
loyalty: path.resolve(
    process.cwd(),
    'int_sf_loyalty_cloud_connector/cartridge/client/default/'
),
```

## API Reference

### Core Services

#### LoyaltyCloudConnector.js
Main service class providing all loyalty cloud integration functionality.

**Key Methods:**
- `getAccessToken()` - Retrieve Salesforce access token
- `enrollProgramMember(programName, memberData)` - Enroll new program member
- `getMemberProfile(memberId, membershipNumber)` - Get member profile with points
- `executeTransactionJournals(transactionJournals)` - Execute loyalty transactions
- `redeemVoucher(voucherData)` - Redeem voucher for member
- `consumeVoucher(voucherId, membershipNumber)` - Consume voucher during checkout
- `getVouchers(membershipNumber)` - Get member's vouchers

**Privacy Session Usage:**
The privacy session is used to securely store the program member ID and authentication token for subsequent service calls, ensuring data privacy and session management.

#### Payment Processor
**File**: `cartridge/scripts/hooks/payment/processor/loyalty_management_voucher.js`

Handles voucher payment processing during checkout:
- Validates voucher before authorization
- Consumes voucher through Loyalty Cloud API
- Manages payment transaction lifecycle

### Service Configuration

The cartridge uses the following service definitions:

```xml
<service service-id="LoyaltyCloud_getToken">
    <service-type>HTTP</service-type>
    <enabled>true</enabled>
    <log-prefix>loyaltyService</log-prefix>
    <comm-log-enabled>true</comm-log-enabled>
    <force-prd-enabled>true</force-prd-enabled>
    <profile-id>loyaltyProfile</profile-id>
</service>
```

## Error Handling


## Security Considerations

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify Connected App configuration
   - Check username/password and security token
   - Ensure proper API permissions

2. **Token Expiration**
   - Verify `loyaltyCloudDataSync` job is running
   - Check token refresh logic in service

3. **Voucher Redemption Issues**
   - Verify voucher is valid and not expired
   - Check voucher covers total order amount
   - Ensure proper payment method configuration

### Debugging

Enable detailed logging by setting:
- `comm-log-enabled`: true
- `log-prefix`: loyaltyService

## Future Enhancements

- **JWT Authentication**: Implementation of JWT-based authentication flow
- **Split Payment**: Support for partial voucher payments
- **Advanced Analytics**: Enhanced reporting and analytics capabilities
- **Mobile Optimization**: Improved mobile experience
- **Multi-Program Support**: Support for multiple loyalty programs

## Support

For technical support and questions:
- Review the service logs for detailed error information
- Check Salesforce Loyalty Cloud documentation
- Contact your system administrator for configuration issues

## License
---

*Last updated: October 2025*

**Note:** This project is meant for learning purposes.
