// DIRECT FIX SCRIPT FOR USER ROLE
// Copy and paste this entire script into your browser's console and press Enter

(async function fixUserRole() {
  const email = 'meetrejoiceali@gmail.com';
  const correctRole = 'parent';
  
  const projectId = 'wevmvbskunhnhuxzaqoz';
  const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indldm12YnNrdW5obmh1eHphcW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjQzNDcsImV4cCI6MjA3ODcwMDM0N30.L_N8kMAOitpFO28SJx_OpS7uAb7NYwMCOo5RiRBvx5c';
  
  console.log('🔧 Fixing user role...');
  console.log('Email:', email);
  console.log('Correct Role:', correctRole);
  
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/fix-user-role`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userEmail: email,
          correctRole: correctRole
        })
      }
    );
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ SUCCESS!', data.message);
      console.log('Profile:', data.profile);
      console.log('');
      console.log('🔄 Next steps:');
      console.log('1. Sign out of your account');
      console.log('2. Sign in again with:', email);
      console.log('3. You should now see the Parent Dashboard!');
      alert('✅ User role fixed successfully!\n\nPlease sign out and sign in again to see the changes.');
    } else {
      console.error('❌ ERROR:', data.error);
      alert('❌ Failed to fix user role: ' + data.error);
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR:', error);
    alert('❌ Network error: ' + error.message);
  }
})();
