# Subscriptions, Pricing & Promotions Feature

## Overview
The Subscriptions system allows parents to subscribe to TutorNest with clear, transparent tier-based pricing. The system includes pro-rata billing for upgrades, credits for downgrades, renewal reminders, and self-serve cancellation.

## Features Implemented

### 1. Subscription Tiers
Three clear subscription tiers with transparent pricing:
- **Starter** (£29.99/month): 4 sessions, basic features
- **Plus** (£59.99/month): 10 sessions, advanced features (Most Popular)
- **Premium** (£99.99/month): 20 sessions, full features including multi-student support

Each tier includes:
- Clear session allocations
- List of benefits
- No hidden fees
- Transparent pricing display

### 2. Pro-rata Billing for Upgrades
When parents upgrade their subscription:
- Unused credit from the current plan is calculated based on days remaining
- New plan charge is calculated for the remaining days
- Pro-rata charge = New charge - Unused credit
- Upgrade is effective immediately
- Detailed breakdown shown in confirmation dialog

### 3. Credit System for Downgrades
When parents downgrade their subscription:
- Downgrade is scheduled for the next billing cycle
- Current plan remains active until then
- Credit equal to price difference is applied to next billing cycle
- Clear notification of effective date
- Full access to current plan features until downgrade takes effect

### 4. Renewal Management
- Auto-renew toggle (enabled by default)
- Renewal reminders when subscription is within 7 days of renewal
- Clear display of next billing date
- Self-service renewal control

### 5. Self-serve Cancellation
Parents can cancel subscriptions with:
- Structured cancellation reasons (radio button selection)
- Optional feedback textarea
- Scheduled cancellation (keeps access until end of billing period)
- Ability to reactivate before cancellation takes effect
- Clear confirmation of cancellation date

### 6. Subscription History
Complete audit trail including:
- New subscriptions
- Upgrades (with pro-rata charges)
- Scheduled downgrades (with credit amounts)
- Cancellations (with reasons)
- Reactivations
- Timestamps and details for all events

## Backend Routes

### GET /subscription-tiers
Returns all available subscription tiers with pricing and benefits.

### GET /subscription/:parentId
Get current subscription for a parent, including:
- Subscription details
- Days until renewal
- Renewal reminder flag
- Scheduled changes (downgrades/cancellations)

### POST /subscription/subscribe
Create a new subscription for a parent.
- **Body**: `{ parentId, tierId, paymentMethodId }`

### POST /subscription/upgrade
Upgrade to a higher-tier plan with immediate pro-rata billing.
- **Body**: `{ parentId, newTierId }`
- **Returns**: Pro-rata calculation breakdown

### POST /subscription/downgrade
Schedule a downgrade to a lower-tier plan.
- **Body**: `{ parentId, newTierId }`
- **Returns**: Credit amount and effective date

### POST /subscription/cancel
Cancel subscription (effective at end of billing period).
- **Body**: `{ parentId, reason, feedback }`

### POST /subscription/reactivate
Reactivate a subscription scheduled for cancellation.
- **Body**: `{ parentId }`

### POST /subscription/auto-renew
Toggle auto-renewal setting.
- **Body**: `{ parentId, autoRenew }`

### GET /subscription/:parentId/history
Get subscription history for a parent.

## Frontend Components

### SubscriptionsPage
Main container component that manages subscription state and orchestrates all subscription operations.

### SubscriptionTiers
Displays all available tiers in a grid with:
- Pricing information
- Feature lists with checkmarks
- "Most Popular" badge
- Current plan indicator
- Upgrade/downgrade action buttons

### CurrentSubscription
Shows active subscription with:
- Plan name and price
- Sessions used/remaining progress bar
- Next billing date
- Auto-renew status toggle
- Renewal reminders
- Scheduled downgrade notices
- Cancellation notices
- Action buttons (Change Plan, Cancel, Reactivate)

### ChangeTierDialog
Modal for confirming tier changes showing:
- Current vs new plan comparison
- Pro-rata billing breakdown (for upgrades)
- Credit notice (for downgrades)
- Effective dates
- Clear explanation of changes

### SubscriptionHistory
Timeline view of all subscription events with:
- Event icons and badges
- Event descriptions
- Amounts (charges/credits)
- Timestamps
- Grouped by type

## User Flow

### New Subscription
1. Parent views available tiers
2. Selects desired tier
3. Confirms subscription
4. Subscription activated immediately
5. First billing occurs immediately

### Upgrade
1. Parent selects higher tier
2. System calculates pro-rata charge
3. Shows detailed breakdown in modal
4. Parent confirms
5. Upgrade effective immediately
6. Pro-rata charge processed
7. Future billing at new rate

### Downgrade
1. Parent selects lower tier
2. System schedules downgrade for next billing cycle
3. Shows credit amount in modal
4. Parent confirms
5. Current plan remains active
6. Downgrade and credit applied at next billing date

### Cancellation
1. Parent clicks "Cancel Subscription"
2. Selects cancellation reason
3. Optionally provides feedback
4. Confirms cancellation
5. Subscription marked as "cancelling"
6. Access retained until end of billing period
7. Option to reactivate before effective date

## Data Storage
All subscription data is stored in the KV store with keys:
- `subscription_parent_{parentId}` - Current subscription details
- `subscription_history_{parentId}` - Array of subscription events

## Key Design Decisions

1. **Pro-rata for upgrades only**: Upgrades charge immediately with pro-rata calculation, while downgrades wait until next cycle with credits
2. **Scheduled cancellations**: Users retain access until end of paid period, building trust
3. **Transparent pricing**: All charges and credits shown upfront with detailed breakdowns
4. **Self-service**: All subscription management can be done by parents without contacting support
5. **Clear communication**: Multiple alert types (renewal, downgrade, cancellation) keep users informed
6. **Session tracking**: Shows sessions used/remaining to help parents choose appropriate tier

## Future Enhancements
- Payment method integration (currently using demo payment methods)
- Promotional codes and discounts
- Annual billing options with discounts
- Add-on purchases (extra sessions)
- Family plans with multiple student support
- Referral credits
- Usage-based recommendations (suggest upgrade/downgrade based on usage)
