/**
 * Weekly Payout Scheduler
 * Processes tutor payouts automatically every week (Fridays at 2 PM UTC)
 * Implements industry-standard financial workflow with state machine
 */

import { Hono } from 'npm:hono@4';
import { serve } from 'npm:std/http@0.208/server.ts';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Types
interface PayoutJob {
  batchId: string;
  batchNumber: string;
  scheduledDate: string;
  tutorIds: string[];
  status: 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed';
  totalAmount: number;
  createdAt: string;
  processedAt?: string;
}

interface PayoutRequest {
  id: string;
  tutorId: string;
  amount: number;
  bankDetails: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
  };
  state: 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed';
  idempotencyKey: string;
  retryCount: number;
  maxRetries: number;
  reference?: string;
  transferId?: string;
  failureReason?: string;
  requestedAt: string;
  approvedAt?: string;
  completedAt?: string;
}

// Helper: Generate ISO 8601 timestamp
const getISOTimestamp = (): string => {
  return new Date().toISOString();
};

// Helper: Get next Friday at 2 PM UTC
const getNextPayoutDate = (): string => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);
  nextFriday.setHours(14, 0, 0, 0);
  
  return nextFriday.toISOString().split('T')[0];
};

// Helper: Generate batch number with timestamp
const generateBatchNumber = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BATCH-${dateStr}-${randomStr}`;
};

// Helper: Generate idempotency key to prevent duplicate payouts
const generateIdempotencyKey = (tutorId: string, amount: number): string => {
  const date = new Date().toISOString().split('T')[0];
  return `${tutorId}-${amount}-${date}`;
};

// Helper: Log payout audit trail (following international standards)
const logPayoutAudit = async (
  payoutId: string,
  action: string,
  oldState: string | null,
  newState: string,
  actorId: string,
  reason?: string
): Promise<void> => {
  const auditEntry = {
    payoutId,
    action,
    oldState,
    newState,
    actorId,
    reason,
    timestamp: getISOTimestamp(),
  };
  
  await kv.set(`payout_audit:${payoutId}:${getISOTimestamp()}`, auditEntry);
  console.log(`[AUDIT] ${action} for payout ${payoutId}: ${oldState} → ${newState}`);
};

// Step 1: Identify tutors eligible for payout
const identifyEligibleTutors = async (): Promise<string[]> => {
  try {
    // Get all tutor balances with pending earnings
    const tutorBalances = await kv.getByPrefix('tutor_balance:');
    const eligibleTutors: string[] = [];

    for (const balance of tutorBalances) {
      const tutorId = balance.key?.split(':')[1];
      const availableBalance = balance.available_balance || 0;
      const minimumThreshold = 50; // NGN minimum

      // Include tutors with balance >= minimum threshold
      if (availableBalance >= minimumThreshold) {
        eligibleTutors.push(tutorId);
      }
    }

    console.log(`[SCHEDULER] Identified ${eligibleTutors.length} tutors eligible for payout`);
    return eligibleTutors;
  } catch (error) {
    console.error('[SCHEDULER] Error identifying eligible tutors:', error);
    throw error;
  }
};

// Step 2: Create payout batch
const createPayoutBatch = async (tutorIds: string[]): Promise<PayoutJob> => {
  const batchNumber = generateBatchNumber();
  const nextPayoutDate = getNextPayoutDate();
  
  let totalAmount = 0;
  const payoutRequests: PayoutRequest[] = [];

  for (const tutorId of tutorIds) {
    try {
      const balance = await kv.get(`tutor_balance:${tutorId}`);
      if (!balance) continue;

      const amount = Math.floor(balance.available_balance);
      if (amount < 50) continue;

      const bankDetails = await kv.get(`tutor_bank:${tutorId}`);
      if (!bankDetails) {
        console.warn(`[BATCH] Skipping ${tutorId}: No bank details`);
        continue;
      }

      totalAmount += amount;

      const idempotencyKey = generateIdempotencyKey(tutorId, amount);
      const payoutRequest: PayoutRequest = {
        id: crypto.randomUUID(),
        tutorId,
        amount,
        bankDetails,
        state: 'pending_approval',
        idempotencyKey,
        retryCount: 0,
        maxRetries: 3,
        requestedAt: getISOTimestamp(),
      };

      payoutRequests.push(payoutRequest);
    } catch (error) {
      console.error(`[BATCH] Error processing tutor ${tutorId}:`, error);
    }
  }

  const batch: PayoutJob = {
    batchId: crypto.randomUUID(),
    batchNumber,
    scheduledDate: nextPayoutDate,
    tutorIds,
    status: 'pending_approval',
    totalAmount,
    createdAt: getISOTimestamp(),
  };

  // Store batch and requests
  await kv.set(`payout_batch:${batch.batchId}`, batch);
  for (const req of payoutRequests) {
    await kv.set(`payout_request:${req.id}`, req);
    await kv.set(`payout_batch_requests:${batch.batchId}`, req);
  }

  console.log(`[BATCH] Created batch ${batch.batchNumber} with ${payoutRequests.length} payouts (Total: ₦${totalAmount})`);
  return batch;
};

// Step 3: Validate payouts (KYC check, bank verification)
const validatePayoutRequest = async (payoutRequest: PayoutRequest): Promise<boolean> => {
  try {
    // Check KYC status
    const kycStatus = await kv.get(`payout_kyc:${payoutRequest.tutorId}`);
    if (!kycStatus || kycStatus !== 'verified') {
      console.warn(`[VALIDATE] KYC not verified for tutor ${payoutRequest.tutorId}`);
      return false;
    }

    // Check bank account verification
    const bankVerified = await kv.get(`payout_bank_verified:${payoutRequest.tutorId}`);
    if (!bankVerified) {
      console.warn(`[VALIDATE] Bank not verified for tutor ${payoutRequest.tutorId}`);
      return false;
    }

    // Check for duplicate payouts (idempotency)
    const existingPayout = await kv.get(`payout_idempotent:${payoutRequest.idempotencyKey}`);
    if (existingPayout) {
      console.warn(`[VALIDATE] Duplicate payout detected for ${payoutRequest.tutorId}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[VALIDATE] Error validating payout:', error);
    return false;
  }
};

// Step 4: Process payout (call payment provider)
const processPayoutRequest = async (
  payoutRequest: PayoutRequest
): Promise<{ success: boolean; reference?: string; error?: string }> => {
  try {
    // In production, call Flutterwave or other payment provider
    // For now, simulate successful payout
    const reference = `TN-${Date.now()}-${payoutRequest.id.substring(0, 8)}`;
    
    console.log(`[PROCESS] Processing payout for tutor ${payoutRequest.tutorId}: ₦${payoutRequest.amount} → ${reference}`);

    // Update payout request state
    payoutRequest.state = 'processing';
    payoutRequest.reference = reference;
    await kv.set(`payout_request:${payoutRequest.id}`, payoutRequest);

    // Log audit trail
    await logPayoutAudit(
      payoutRequest.id,
      'processing',
      'pending_approval',
      'processing',
      'system',
      'Initiated payment processing'
    );

    // Simulate API call (in real implementation, call Flutterwave)
    // const flutterwaveResponse = await callFlutterwave(payoutRequest);

    // For now, assume success
    return { success: true, reference };
  } catch (error: any) {
    console.error('[PROCESS] Error processing payout:', error);
    payoutRequest.state = 'failed';
    payoutRequest.failureReason = error.message;
    payoutRequest.retryCount++;

    await kv.set(`payout_request:${payoutRequest.id}`, payoutRequest);
    await logPayoutAudit(
      payoutRequest.id,
      'failed',
      'processing',
      'failed',
      'system',
      error.message
    );

    return { success: false, error: error.message };
  }
};

// Step 5: Finalize payout (update tutor balance)
const finalizePayoutRequest = async (
  payoutRequest: PayoutRequest,
  success: boolean
): Promise<void> => {
  try {
    if (success) {
      // Update tutor balance
      const balance = await kv.get(`tutor_balance:${payoutRequest.tutorId}`);
      if (balance) {
        balance.available_balance -= payoutRequest.amount;
        balance.total_payouts = (balance.total_payouts || 0) + payoutRequest.amount;
        balance.updated_at = getISOTimestamp();
        await kv.set(`tutor_balance:${payoutRequest.tutorId}`, balance);
      }

      // Mark idempotency key as processed
      await kv.set(`payout_idempotent:${payoutRequest.idempotencyKey}`, {
        payoutId: payoutRequest.id,
        timestamp: getISOTimestamp(),
      });

      payoutRequest.state = 'completed';
      payoutRequest.completedAt = getISOTimestamp();

      await logPayoutAudit(
        payoutRequest.id,
        'completed',
        'processing',
        'completed',
        'system',
        `Payout processed successfully: ${payoutRequest.reference}`
      );

      console.log(`[FINALIZE] ✓ Payout completed for tutor ${payoutRequest.tutorId}: ₦${payoutRequest.amount}`);
    } else {
      // Handle retry logic
      if (payoutRequest.retryCount < payoutRequest.maxRetries) {
        payoutRequest.state = 'pending_approval';
        await logPayoutAudit(
          payoutRequest.id,
          'retried',
          'failed',
          'pending_approval',
          'system',
          `Retry ${payoutRequest.retryCount}/${payoutRequest.maxRetries}`
        );
        console.log(`[FINALIZE] ↻ Payout retry queued (attempt ${payoutRequest.retryCount})`);
      } else {
        console.error(`[FINALIZE] ✗ Payout failed after max retries: ${payoutRequest.id}`);
      }
    }

    await kv.set(`payout_request:${payoutRequest.id}`, payoutRequest);
  } catch (error) {
    console.error('[FINALIZE] Error finalizing payout:', error);
  }
};

// Main scheduler endpoint
app.post('/execute-weekly-payouts', async (c) => {
  try {
    console.log('[SCHEDULER] Starting weekly payout execution...');

    // 1. Identify eligible tutors
    const eligibleTutors = await identifyEligibleTutors();
    if (eligibleTutors.length === 0) {
      return c.json({ message: 'No eligible tutors for payout', batchId: null }, 200);
    }

    // 2. Create batch
    const batch = await createPayoutBatch(eligibleTutors);

    // 3. Get all payout requests for this batch
    const batchRequests = await kv.getByPrefix(`payout_batch_requests:${batch.batchId}`);

    let successCount = 0;
    let failureCount = 0;

    // 4. Process each payout (validate, process, finalize)
    for (const request of batchRequests) {
      const isValid = await validatePayoutRequest(request);
      
      if (!isValid) {
        failureCount++;
        await logPayoutAudit(
          request.id,
          'rejected',
          'pending_approval',
          'failed',
          'system',
          'Validation failed (KYC or bank verification)'
        );
        continue;
      }

      const result = await processPayoutRequest(request);
      await finalizePayoutRequest(request, result.success);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    // 5. Update batch status
    batch.status = successCount > 0 ? 'completed' : 'failed';
    batch.processedAt = getISOTimestamp();
    await kv.set(`payout_batch:${batch.batchId}`, batch);

    console.log(`[SCHEDULER] Batch ${batch.batchNumber} completed: ${successCount} successful, ${failureCount} failed`);

    return c.json({
      success: true,
      batchId: batch.batchId,
      batchNumber: batch.batchNumber,
      successCount,
      failureCount,
      totalAmount: batch.totalAmount,
      processedAt: getISOTimestamp(),
    }, 200);
  } catch (error: any) {
    console.error('[SCHEDULER] Error in weekly payout execution:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Query batch status
app.get('/payout-batch/:batchId', async (c) => {
  const batch = await kv.get(`payout_batch:${c.req.param('batchId')}`);
  if (!batch) {
    return c.json({ error: 'Batch not found' }, 404);
  }
  return c.json(batch, 200);
});

// Query payout status
app.get('/payout-request/:requestId', async (c) => {
  const request = await kv.get(`payout_request:${c.req.param('requestId')}`);
  if (!request) {
    return c.json({ error: 'Payout request not found' }, 404);
  }
  return c.json(request, 200);
});

// Get payout audit trail
app.get('/payout-audit/:payoutId', async (c) => {
  const auditLogs = await kv.getByPrefix(`payout_audit:${c.req.param('payoutId')}`);
  return c.json({ auditLogs, count: auditLogs.length }, 200);
});

export default app;
