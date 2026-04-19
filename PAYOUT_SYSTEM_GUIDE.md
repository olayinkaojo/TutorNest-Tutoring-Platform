# Comprehensive Payout System Implementation Guide

## Overview
TutorNest now implements a production-grade payout system following international financial standards and fintech best practices. Tutors receive weekly automatic payouts with full transparency and audit trails.

---

## Architecture

### Core Components

#### 1. **Database Schema** (`payout_enhancement.sql`)
**Implements:**
- State machine for payout lifecycle management
- Batch processing support for scalability
- Complete audit trail for regulatory compliance
- KYC/verification status tracking
- Idempotency keys to prevent duplicate charges

**Key Tables:**
```
payouts              - Individual payout requests with state machine
payout_batches       - Weekly batch processing (scheduled, processing, completed)
payout_audit_log     - Complete transaction history for compliance
payout_verifications - KYC status and bank verification
payout_settings      - Per-tutor configuration (schedule, thresholds)
earnings             - Enhanced with transaction IDs and tax tracking
```

#### 2. **Backend Scheduler** (`weekly-payout-scheduler.tsx`)
**Implements:**
- Cron-triggered job (Fridays 2 PM UTC)
- Multi-step validation pipeline:
  1. Identify eligible tutors (balance ≥ ₦50 minimum)
  2. Create batch with ISO 8601 timestamps
  3. Validate KYC and bank verification
  4. Process payments with idempotency checks
  5. Update balances and log audit trail
  6. Retry failed payouts (up to 3 attempts)

**Key Features:**
- ISO 8601 timestamp format throughout
- Unique idempotency keys per tutor/amount/date
- Comprehensive logging for debugging
- Error recovery with exponential backoff

#### 3. **Tutor Dashboard** (`EnhancedTutorPayoutDashboard.tsx`)
**Displays:**
- Real-time earnings breakdown per lesson
- Net earnings calculation (gross - platform fee - tax)
- Next payout date and amount
- Automatic weekly payout schedule
- Tax withholding transparency (5%)
- Complete transaction history with ISO 8601 timestamps
- CSV export for accounting software

**Key Metrics:**
- Total earnings (all-time)
- Available balance (ready for next payout)
- Paid this month
- Tax withheld
- Lessons completed
- Average per-lesson earnings

#### 4. **Admin Batch Manager** (`AdminPayoutBatchManager.tsx`)
**Features:**
- View all payout batches with status filtering
- Batch approval workflow (scheduled → approved → processing)
- Detailed inspection of each payout in batch
- Success/failure metrics and retry functionality
- Approval notes for audit trail

---

## Workflow: Weekly Payout Process

### Step 1: Identification (Automated)
Every Friday at 2 PM UTC, the system:
1. Queries all tutors with earnings ≥ ₦50 minimum
2. Creates a batch (e.g., `BATCH-20260419-ABC123`)
3. Generates ISO 8601 timestamps for all operations

### Step 2: Validation
For each payout request:
- ✓ Check KYC verification status
- ✓ Check bank account verification
- ✓ Verify idempotency key (prevent duplicates)
- ✓ Validate amount >= minimum threshold

### Step 3: Processing
1. **State Update**: `pending_approval` → `processing`
2. **Payment Call**: Send to Flutterwave/payment provider
3. **Reference Generation**: Unique transaction ID (TN-{timestamp}-{id})
4. **Audit Log**: Record state change with timestamp

### Step 4: Completion
1. **State Update**: `processing` → `completed`
2. **Balance Update**: Deduct from `available_balance`, add to `total_payouts`
3. **Mark Idempotent**: Store key to prevent re-processing
4. **Audit Trail**: Final entry with reference ID

### Step 5: Failure Handling
If payment fails:
- Increment `retryCount`
- Check if `retryCount < maxRetries` (3)
- If yes: Revert to `pending_approval` for retry
- If no: Set to `failed` with `failureReason`
- Log audit entry for investigation

---

## International Standards Compliance

### Timestamps: ISO 8601
All timestamps use `YYYY-MM-DDTHH:mm:ssZ` format:
```json
{
  "requestedAt": "2026-04-19T14:30:00Z",
  "approvedAt": "2026-04-19T14:35:00Z",
  "completedAt": "2026-04-19T15:45:00Z"
}
```

### Payment Reference: ISO 20022
Payment reference format: `TN-{date}-{random}`
Example: `TN-20260419-ABC123`

### Financial Standards
| Standard | Implementation |
|----------|-----------------|
| ISO 8601 | DateTime format |
| ISO 20022 | SEPA credit transfer ready |
| RFC 3339 | API response dates |
| RFC 7231 | HTTP headers & caching |
| OAuth 2.0 | Token management |
| REST | Idempotent operations |

### Compliance Frameworks
| Framework | Implementation |
|-----------|-----------------|
| KYC | Tutor identity & bank verification |
| AML | Transaction amount limits & patterns |
| PCI DSS | Bank details encrypted at rest |
| GDPR | Data retention policies applied |
| Tax | 5% withholding for Nigeria |

---

## API Endpoints

### Tutor Endpoints

#### Get Payout Summary
```http
GET /payouts/tutor/{tutorId}/summary
Authorization: Bearer {accessToken}
```

Response:
```json
{
  "summary": {
    "totalEarnings": 50000.00,
    "totalPaidOut": 30000.00,
    "pendingPayout": 20000.00,
    "currency": "NGN",
    "completedSessions": 100,
    "earningsRate": 80
  },
  "payoutHistory": [
    {
      "id": "uuid",
      "amount": 10000,
      "status": "completed",
      "reference": "TN-20260412-ABC123",
      "completedAt": "2026-04-12T14:30:00Z"
    }
  ]
}
```

#### Request Payout
```http
POST /payouts/request
Authorization: Bearer {accessToken}
Idempotency-Key: {tutorId}-{amount}-{date}
Content-Type: application/json

{
  "tutorId": "uuid",
  "amount": 5000,
  "idempotencyKey": "user-5000-2026-04-19"
}
```

#### Get Payout Status
```http
GET /payouts/{payoutId}
Authorization: Bearer {accessToken}
```

#### Get Audit Trail
```http
GET /payouts/{payoutId}/audit
Authorization: Bearer {accessToken}
```

### Admin Endpoints

#### Get All Batches
```http
GET /payouts/admin/batches?status=scheduled&startDate=2026-04-01&endDate=2026-04-30
Authorization: Bearer {accessToken}
```

#### Approve Batch
```http
POST /payouts/admin/batches/{batchId}/approve
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "approvalNotes": "Verified all KYC docs. Proceeding with payout.",
  "approvedAt": "2026-04-19T14:30:00Z"
}
```

#### Process Batch
```http
POST /payouts/admin/batches/{batchId}/process
Authorization: Bearer {accessToken}
```

#### Retry Failed Payouts
```http
POST /payouts/admin/batches/{batchId}/retry
Authorization: Bearer {accessToken}
```

---

## Database Queries

### Get Eligible Tutors for Payout
```sql
SELECT 
  p.id, p.full_name, p.email,
  tb.available_balance, tb.total_earnings,
  ps.payout_schedule,
  pv.kyc_status, pv.bank_verification_status
FROM profiles p
LEFT JOIN tutor_balance tb ON p.id = tb.tutor_id
LEFT JOIN payout_settings ps ON p.id = ps.tutor_id
LEFT JOIN payout_verifications pv ON p.id = pv.tutor_id
WHERE p.role = 'tutor'
  AND tb.available_balance >= 50
  AND pv.kyc_status = 'verified'
  AND pv.bank_verification_status = 'verified'
ORDER BY p.id;
```

### Get Payout Batch Summary
```sql
SELECT 
  pb.id, pb.batch_number, pb.status,
  COUNT(p.id) as total_payouts,
  SUM(p.amount) as total_amount,
  SUM(CASE WHEN p.state = 'completed' THEN 1 ELSE 0 END) as successful_count,
  SUM(CASE WHEN p.state = 'failed' THEN 1 ELSE 0 END) as failed_count,
  pb.created_at, pb.processed_at
FROM payout_batches pb
LEFT JOIN payouts p ON pb.id = p.batch_id
GROUP BY pb.id
ORDER BY pb.created_at DESC;
```

### Get Audit Trail for Payout
```sql
SELECT 
  pal.action, pal.old_state, pal.new_state,
  pal.reason, pal.actor_role,
  pal.created_at
FROM payout_audit_log pal
WHERE pal.payout_id = $1
ORDER BY pal.created_at DESC;
```

---

## Configuration

### Payout Settings Table
All configuration stored in `payout_config`:

| Key | Default | Description |
|-----|---------|-------------|
| `payout_day_of_week` | friday | Day for weekly payouts |
| `payout_time_utc` | 14:00 | Time UTC for processing |
| `minimum_payout_amount` | 50 | Minimum in NGN |
| `tutor_commission_rate` | 0.80 | 80% to tutor |
| `platform_fee_rate` | 0.20 | 20% platform |
| `payout_retry_max` | 3 | Max retry attempts |
| `tax_withholding_enabled` | true | Enable tax |
| `tax_withholding_rate` | 0.05 | 5% tax |

### Per-Tutor Settings
Tutors can configure:
- Payout schedule: weekly / biweekly / monthly
- Minimum threshold: ₦50-₦5000
- Auto-payout enabled: true/false
- Hold period days: 0-30

---

## Monitoring & Troubleshooting

### Key Metrics
```sql
-- Weekly payout success rate
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total,
  SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(100 * SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END)::numeric / COUNT(*), 2) as success_rate
FROM payouts
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```

### Debug Logs
Check application logs for:
- `[SCHEDULER]` - Payout scheduler execution
- `[BATCH]` - Batch creation and processing
- `[VALIDATE]` - Validation checks
- `[PROCESS]` - Payment processing
- `[AUDIT]` - Audit trail entries
- `[FINALIZE]` - Payout completion

### Retry Failed Payouts
```typescript
// Via API
POST /payouts/admin/batches/{batchId}/retry

// Manual retry for specific payout
UPDATE payouts SET state = 'pending_approval', retry_count = retry_count + 1
WHERE id = $1 AND retry_count < max_retries;
```

---

## Testing Checklist

- [ ] Weekly scheduler triggers correctly (Friday 2 PM UTC)
- [ ] Tutor dashboard shows real-time earnings
- [ ] Payout request creates audit log entry
- [ ] Idempotency key prevents duplicate payouts
- [ ] Failed payouts retry up to 3 times
- [ ] Admin can view and approve batches
- [ ] Tax withholding calculated correctly (5%)
- [ ] CSV export works for accounting
- [ ] All timestamps are ISO 8601 format
- [ ] Audit trail shows complete history
- [ ] KYC verification required before payout
- [ ] Bank account verification required before payout

---

## Next Steps

1. **Run Migration**: Execute `payout_enhancement.sql` in Supabase
2. **Deploy Scheduler**: Deploy `weekly-payout-scheduler.tsx` as Edge Function
3. **Update Dashboard**: Replace old payout dashboard with `EnhancedTutorPayoutDashboard`
4. **Add Admin UI**: Integrate `AdminPayoutBatchManager` into admin dashboard
5. **Monitor**: Check logs and metrics for first few weeks
6. **Expand**: Add payment provider webhooks for real-time updates

---

## Support & Documentation

For questions or issues:
1. Check audit log: `SELECT * FROM payout_audit_log WHERE payout_id = $1`
2. Review batch status: `SELECT * FROM payout_batches ORDER BY created_at DESC LIMIT 10`
3. Verify tutor settings: `SELECT * FROM payout_settings WHERE tutor_id = $1`
4. Check KYC status: `SELECT * FROM payout_verifications WHERE tutor_id = $1`

All operations follow international financial standards with full transparency and compliance.
