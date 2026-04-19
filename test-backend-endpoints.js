/**
 * Test script for Phase 1 backend endpoints
 * Tests batch reports and refund calculation endpoints
 */

const API_BASE = 'https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580';
const SAMPLE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with real token

async function testBatchReportsEndpoint() {
  console.log('\n📋 Testing: GET /bookings/:ids/reports');
  console.log('━'.repeat(50));

  try {
    // Test 1: Single booking
    console.log('\n✓ Test 1: Single booking report');
    const singleRes = await fetch(`${API_BASE}/bookings/booking123/reports`, {
      headers: { 'Authorization': `Bearer ${SAMPLE_TOKEN}` }
    });
    console.log(`Status: ${singleRes.status}`);
    const singleData = await singleRes.json();
    console.log('Response:', JSON.stringify(singleData, null, 2));

    // Test 2: Multiple bookings
    console.log('\n✓ Test 2: Multiple bookings (batch)');
    const batchRes = await fetch(`${API_BASE}/bookings/booking1,booking2,booking3/reports`, {
      headers: { 'Authorization': `Bearer ${SAMPLE_TOKEN}` }
    });
    console.log(`Status: ${batchRes.status}`);
    const batchData = await batchRes.json();
    console.log('Response:', JSON.stringify(batchData, null, 2));
    
    // Verify response structure
    console.log('\n✓ Response Structure Check:');
    if (batchData.bookingIds) console.log('  ✓ bookingIds field present');
    if (batchData.count !== undefined) console.log('  ✓ count field present');
    if (batchData.reports) console.log('  ✓ reports array present');
    if (batchData.missing) console.log('  ✓ missing array present');

    // Test 3: No bookings provided
    console.log('\n✓ Test 3: Error handling (no IDs)');
    const emptyRes = await fetch(`${API_BASE}/bookings//reports`, {
      headers: { 'Authorization': `Bearer ${SAMPLE_TOKEN}` }
    });
    console.log(`Status: ${emptyRes.status} (should be 400)`);
    const emptyData = await emptyRes.json();
    console.log('Response:', emptyData);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function testRefundEndpoint() {
  console.log('\n💰 Testing: POST /bookings/:bookingId/calculate-refund');
  console.log('━'.repeat(50));

  try {
    // Test 1: Valid booking (>24 hours away)
    console.log('\n✓ Test 1: Booking >24 hours away (should return 100% refund)');
    const futureRes = await fetch(`${API_BASE}/bookings/future-booking-123/calculate-refund`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SAMPLE_TOKEN}` }
    });
    console.log(`Status: ${futureRes.status}`);
    const futureData = await futureRes.json();
    console.log('Response:', JSON.stringify(futureData, null, 2));

    // Verify response structure
    console.log('\n✓ Response Structure Check:');
    if (futureData.refundAmount !== undefined) console.log('  ✓ refundAmount field present');
    if (futureData.refundPercentage !== undefined) console.log('  ✓ refundPercentage field present');
    if (futureData.policy) console.log('  ✓ policy field present');
    if (futureData.hoursUntilBooking !== undefined) console.log('  ✓ hoursUntilBooking field present');
    if (futureData.bookingId) console.log('  ✓ bookingId field present');
    if (futureData.price) console.log('  ✓ price field present');

    // Test 2: Booking within 24 hours (should return 50%)
    console.log('\n✓ Test 2: Booking <24 hours away (should return 50% refund)');
    const soonRes = await fetch(`${API_BASE}/bookings/soon-booking-456/calculate-refund`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SAMPLE_TOKEN}` }
    });
    console.log(`Status: ${soonRes.status}`);
    const soonData = await soonRes.json();
    console.log('Response:', JSON.stringify(soonData, null, 2));

    // Test 3: Booking already started (should return 0%)
    console.log('\n✓ Test 3: Booking already started (should return 0% refund)');
    const pastRes = await fetch(`${API_BASE}/bookings/past-booking-789/calculate-refund`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SAMPLE_TOKEN}` }
    });
    console.log(`Status: ${pastRes.status}`);
    const pastData = await pastRes.json();
    console.log('Response:', JSON.stringify(pastData, null, 2));

    // Test 4: Non-existent booking (should return 404)
    console.log('\n✓ Test 4: Non-existent booking (should return 404)');
    const notFoundRes = await fetch(`${API_BASE}/bookings/nonexistent-booking/calculate-refund`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SAMPLE_TOKEN}` }
    });
    console.log(`Status: ${notFoundRes.status}`);
    const notFoundData = await notFoundRes.json();
    console.log('Response:', notFoundData);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function testCancelBookingWithRefund() {
  console.log('\n🔴 Testing: POST /bookings/:bookingId/cancel (uses new refund endpoint)');
  console.log('━'.repeat(50));

  try {
    console.log('\n✓ Test: Cancel booking (should include refund fields)');
    const cancelRes = await fetch(`${API_BASE}/bookings/booking-to-cancel/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SAMPLE_TOKEN}` }
    });
    console.log(`Status: ${cancelRes.status}`);
    const cancelData = await cancelRes.json();
    console.log('Response:', JSON.stringify(cancelData, null, 2));

    // Verify refund fields are in response
    console.log('\n✓ Response Structure Check:');
    if (cancelData.booking?.refundAmount !== undefined) console.log('  ✓ booking.refundAmount present');
    if (cancelData.booking?.refundPercentage !== undefined) console.log('  ✓ booking.refundPercentage present');
    if (cancelData.booking?.refundPolicy) console.log('  ✓ booking.refundPolicy present');
    if (cancelData.booking?.status === 'cancelled') console.log('  ✓ booking.status = cancelled');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function main() {
  console.log('\n🧪 PHASE 1 BACKEND ENDPOINT VERIFICATION');
  console.log('='.repeat(50));
  console.log('Testing batch reports and refund calculation endpoints\n');

  console.log('⚠️  NOTE: Replace SAMPLE_TOKEN with a real access token');
  console.log('   and API_BASE with your actual Supabase endpoint\n');

  // Only run if token is replaced
  if (SAMPLE_TOKEN.includes('...')) {
    console.log('❌ Please update SAMPLE_TOKEN and API_BASE before running');
    return;
  }

  await testBatchReportsEndpoint();
  await testRefundEndpoint();
  await testCancelBookingWithRefund();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests complete. Check results above.\n');
}

main().catch(console.error);
