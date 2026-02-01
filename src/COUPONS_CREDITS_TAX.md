# Coupons, Credits & Tax Handling - Feature Documentation

## Overview

This document describes the implementation of three integrated features for TutorNest's subscription system:

1. **Coupons & Promo Codes** - Marketing tool for discount campaigns
2. **Referral Credits** - User referral program with automatic credit rewards
3. **Tax Handling & Invoicing** - VAT calculation, invoice generation, and accounting exports

---

## 1. Coupons & Promo Codes

### Features

- **Flexible Discount Types**: Percentage (%) or fixed amount (£) discounts
- **Usage Limits**: Set maximum number of times a coupon can be used
- **Tier Eligibility**: Apply coupons to specific tiers (Starter, Plus, Premium) or all
- **Expiry Dates**: Automatic expiration handling
- **Abuse Protection**: Rate limiting (5 attempts/hour) by email and IP address
- **Single-Use Per User**: Users can only use each coupon once

### Admin Management

**Component**: `CouponManager.tsx`

Admins can:
- Create new coupon codes with customizable parameters
- View all active and inactive coupons
- Monitor usage statistics (current uses / usage limit)
- Deactivate coupons when needed

### User Experience

Users can apply coupons during subscription checkout:
1. Enter coupon code
2. System validates:
   - Code exists and is active
   - Not expired
   - Usage limit not reached
   - Tier is eligible
   - User hasn't used it before
3. Discount automatically applied to payment

### Backend Routes

```typescript
// Coupon Management (Admin)
POST /make-server-cbd74580/coupons/create
GET  /make-server-cbd74580/coupons/all
PUT  /make-server-cbd74580/coupons/:couponId
POST /make-server-cbd74580/coupons/:couponId/deactivate

// Coupon Validation & Application (User)
POST /make-server-cbd74580/coupons/validate
POST /make-server-cbd74580/coupons/apply
```

---

## 2. Referral System

### Features

- **£25 Credit for Both Parties**: Inviter and invitee both receive £25
- **90-Day Expiry**: Referrals expire if not completed within 90 days
- **Email Invitations**: Send referrals directly via email
- **Unique Referral Links**: Each user has a personal referral link
- **Automatic Credit Application**: Credits applied when invitee subscribes
- **Status Tracking**: Monitor pending, completed, and expired referrals

### User Components

**Component**: `ReferralSystem.tsx`

Features:
- View referral statistics (total earned, pending, completed)
- Copy personal referral link
- Send email invitations
- Track referral history with status updates

**Component**: `CreditsManager.tsx`

Features:
- View available credit balance
- See total earned and used credits
- View complete transaction history
- Automatic application messaging

### How It Works

1. **User A** sends referral to **User B** (via email or link)
2. **User B** signs up using referral link/email
3. **User B** subscribes to any tier
4. System automatically:
   - Awards £25 to **User A**
   - Awards £25 to **User B**
   - Updates referral status to "completed"
5. Credits automatically applied to next payment

### Backend Routes

```typescript
// Referral Management
POST /make-server-cbd74580/referrals/create
POST /make-server-cbd74580/referrals/complete
GET  /make-server-cbd74580/referrals/user/:userId

// Credits Management
GET  /make-server-cbd74580/credits/:userId
POST /make-server-cbd74580/credits/apply
POST /make-server-cbd74580/credits/add (admin only)
```

---

## 3. Tax Handling & Invoicing

### Features

**VAT Handling**:
- Support for 13 jurisdictions (UK, EU countries, US, Canada, Australia)
- Automatic rate calculation based on user country
- VAT breakdown on all invoices
- Default to UK (20%) if country not specified

**Invoice Generation**:
- Automatic invoice creation for all payments
- Unique invoice numbers (INV-YYYYMM-XXXXXX format)
- Detailed line items
- Discount and credit tracking
- Professional invoice layout

**Accounting Exports**:
- CSV exports for accounting software
- Custom date ranges
- Complete transaction details
- Tax report generation

### Components

**Component**: `InvoiceManager.tsx`

User features:
- View all invoices
- See payment status (Paid, Issued, Void)
- Download invoices
- View detailed invoice breakdowns

**Component**: `TaxReportsManager.tsx`

Admin features:
- Generate tax reports (monthly, quarterly, yearly)
- Quick date range selection
- Revenue and VAT summaries
- Breakdown by tier and country
- Export accounting data as CSV

### VAT Rates Supported

| Country | Code | Rate | Type |
|---------|------|------|------|
| United Kingdom | GB | 20% | Standard |
| Ireland | IE | 23% | Standard |
| France | FR | 20% | Standard |
| Germany | DE | 19% | Standard |
| Spain | ES | 21% | Standard |
| Italy | IT | 22% | Standard |
| Netherlands | NL | 21% | Standard |
| Belgium | BE | 21% | Standard |
| Sweden | SE | 25% | Standard |
| Denmark | DK | 25% | Standard |
| United States | US | 0% | Zero (no federal VAT) |
| Canada | CA | 5% | GST |
| Australia | AU | 10% | GST |

### Invoice Example

```
TutorNest Invoice
Invoice #: INV-202411-ABC123
Date: 15 Nov 2025

Subtotal:          £59.99
Coupon (SAVE20):   -£12.00
Credits Applied:   -£25.00
                   -------
After Discounts:   £22.99
VAT (20%):         £4.60
                   -------
Total:             £27.59
```

### Backend Routes

```typescript
// VAT & Tax
GET  /make-server-cbd74580/tax/vat-rates
GET  /make-server-cbd74580/tax/vat-rate/:countryCode

// Invoice Management
POST /make-server-cbd74580/invoices/create
GET  /make-server-cbd74580/invoices/:invoiceId
GET  /make-server-cbd74580/invoices/user/:userId
POST /make-server-cbd74580/invoices/:invoiceId/paid
POST /make-server-cbd74580/invoices/:invoiceId/void
GET  /make-server-cbd74580/invoices/:invoiceId/download

// Tax Reports & Exports
POST /make-server-cbd74580/tax/reports/generate
GET  /make-server-cbd74580/tax/reports
POST /make-server-cbd74580/tax/export
```

---

## Integration with Subscription Flow

### Standard Subscription Flow (with Coupons & Credits)

1. User selects tier (e.g., Plus - £59.99)
2. User applies coupon code (e.g., SAVE20 = 20% off)
   - Discount: £12.00
   - New subtotal: £47.99
3. System checks for available credits (e.g., £25.00)
   - Credits applied: £25.00
   - New subtotal: £22.99
4. System calculates VAT based on user country (e.g., UK 20%)
   - VAT: £4.60
5. **Final total: £27.59**
6. System generates invoice with full breakdown
7. Payment processed
8. Invoice marked as paid

### Referral Flow

1. **Parent A** invites **Parent B** via email
2. **Parent B** receives invitation with referral link
3. **Parent B** signs up using link
4. **Parent B** completes profile
5. **Parent B** subscribes to any tier
6. System automatically:
   - Creates invoice for **Parent B**
   - Awards £25 credit to **Parent A**
   - Awards £25 credit to **Parent B**
   - Updates referral status
7. Both users' credits automatically applied to next payment

---

## Abuse Prevention

### Rate Limiting

- Maximum 5 coupon validation attempts per hour per email
- Maximum 5 coupon validation attempts per hour per IP
- Automatic 1-hour block after exceeding limit
- Clear error messages with time remaining

### Single-Use Protection

- Each user can only use each coupon once
- System tracks coupon usage per user
- Prevents duplicate applications

### Referral Protection

- Referrals only valid for new users
- Can't refer existing email addresses
- 90-day expiry prevents abuse
- Only credits on actual subscription, not just signup

---

## Admin Capabilities

### Marketing Team

- Create promotional coupon campaigns
- Set usage limits and expiry dates
- Target specific subscription tiers
- Monitor campaign performance
- Track total discounts given

### Finance Team

- Generate VAT reports (monthly, quarterly, yearly)
- Export complete accounting data
- View revenue breakdowns by tier and country
- Track refunds and discounts
- Download invoices for any user

### Customer Support

- Manually add credits for compensation
- View user credit history
- Check coupon usage status
- Access all invoices

---

## Testing the Features

### Test Coupon Creation

1. Log in as admin
2. Navigate to Coupon Manager
3. Click "Create Coupon"
4. Fill in details:
   - Code: TEST20
   - Type: Percentage
   - Value: 20
   - Expiry: Future date
   - Usage Limit: 100
   - Eligible Tiers: All
5. Create and verify in list

### Test Referral Flow

1. Log in as User A
2. Go to Referral System
3. Send invitation to new email
4. Sign up as User B using referral link
5. Subscribe as User B
6. Check both accounts for £25 credits

### Test Invoice Generation

1. Subscribe to any tier
2. Go to Invoice Manager
3. View generated invoice
4. Verify VAT calculation
5. Download invoice

### Test Tax Report

1. Log in as admin
2. Go to Tax Reports
3. Generate monthly report
4. Review revenue and VAT totals
5. Export CSV for accounting

---

## Key Files

### Backend Routes
- `/supabase/functions/server/coupons-credits-routes.tsx` - Coupons & referrals
- `/supabase/functions/server/tax-invoicing-routes.tsx` - Tax & invoicing

### Frontend Components
- `/components/CouponManager.tsx` - Admin coupon management
- `/components/ReferralSystem.tsx` - User referral interface
- `/components/CreditsManager.tsx` - User credit balance & history
- `/components/InvoiceManager.tsx` - User invoice viewing
- `/components/TaxReportsManager.tsx` - Admin tax reports

### Types
- `/types/index.ts` - TypeScript interfaces for all features

---

## Future Enhancements

### Potential Additions

1. **Automatic Coupons**
   - Birthday discounts
   - Loyalty rewards
   - Seasonal campaigns

2. **Enhanced Referrals**
   - Tiered rewards (more referrals = higher credits)
   - Social media sharing
   - Referral leaderboards

3. **Advanced Tax Features**
   - US state-level sales tax
   - Reverse charge mechanism for B2B
   - Automatic VAT MOSS reporting

4. **Invoice Improvements**
   - PDF generation (currently text format)
   - Custom branding
   - Bulk download

5. **Analytics Dashboard**
   - Coupon performance metrics
   - Referral conversion rates
   - Revenue attribution

---

## Summary

The Coupons, Credits & Tax Handling system provides TutorNest with:

✅ **Marketing Tools**: Flexible coupon system for promotional campaigns  
✅ **Growth Engine**: Viral referral program with automatic credit rewards  
✅ **Financial Compliance**: Complete VAT handling and invoice generation  
✅ **Accounting Integration**: Export-ready data for accounting software  
✅ **User Transparency**: Clear invoices with full payment breakdowns  
✅ **Abuse Protection**: Rate limiting and single-use controls  
✅ **Admin Control**: Comprehensive management and reporting tools

All features are production-ready and integrated with the existing subscription system.
