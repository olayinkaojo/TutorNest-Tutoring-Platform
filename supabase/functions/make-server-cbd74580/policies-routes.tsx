import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Platform policies
const PLATFORM_POLICIES = {
  'no-show': {
    id: 'no-show',
    title: 'No-Show Policy',
    version: '1.0',
    lastUpdated: '2024-01-01',
    content: `
## No-Show Policy

### Student No-Shows
- **First occurrence**: Warning issued
- **Second occurrence**: £10 penalty charge
- **Third occurrence**: £20 penalty charge + 7-day booking restriction
- **Fourth+ occurrence**: Account review and potential suspension

### Tutor No-Shows
- **First occurrence**: Warning + £50 compensation to student
- **Second occurrence**: £100 compensation + 14-day suspension
- **Third occurrence**: Account review and potential permanent removal

### Cancellation Policy
- **24+ hours notice**: Full refund, no penalty
- **12-24 hours notice**: 50% refund
- **Less than 12 hours**: No refund
- **Emergency situations**: Contact support for case-by-case review

### Strike Expiration
All strikes expire after 90 days of good behavior.
    `,
    category: 'conduct',
  },
  'prohibited-content': {
    id: 'prohibited-content',
    title: 'Prohibited Content Policy',
    version: '1.0',
    lastUpdated: '2024-01-01',
    content: `
## Prohibited Content Policy

### Strictly Prohibited
The following content is not allowed on Knowledge Fons Academy:

#### Contact Sharing
- Email addresses, phone numbers, or social media handles
- Requests to move conversations off-platform
- Third-party messaging app links (WhatsApp, Telegram, etc.)

#### Payment Circumvention
- Requests for direct payment outside the platform
- Sharing payment details (PayPal, Venmo, bank accounts)
- Discussing ways to avoid platform fees

#### Inappropriate Content
- Sexually explicit material
- Harassment or bullying
- Discriminatory language
- Violence or threats
- Illegal activities

### Consequences
- **First violation**: Content removed + warning
- **Second violation**: 7-day messaging suspension
- **Third violation**: 30-day account suspension
- **Severe violations**: Immediate permanent ban

### Reporting
If you encounter prohibited content, please report it immediately using the report button.
    `,
    category: 'safety',
  },
  'code-of-conduct': {
    id: 'code-of-conduct',
    title: 'Community Code of Conduct',
    version: '1.0',
    lastUpdated: '2024-01-01',
    content: `
## Community Code of Conduct

### Expected Behavior
- Be respectful and professional
- Communicate clearly and promptly
- Honor commitments and schedules
- Protect student privacy
- Use the platform as intended

### Unacceptable Behavior
- Harassment or intimidation
- Discrimination of any kind
- Sharing personal information without consent
- Attempting to circumvent platform processes
- False or misleading information

### Enforcement
Violations will result in progressive discipline:
1. Warning
2. Temporary suspension
3. Permanent ban

All decisions may be appealed through our appeals process.
    `,
    category: 'conduct',
  },
  'data-privacy': {
    id: 'data-privacy',
    title: 'Data Privacy & GDPR',
    version: '1.0',
    lastUpdated: '2024-01-01',
    content: `
## Data Privacy Policy

### Your Rights (GDPR Compliant)
- **Right to access**: Request your data
- **Right to rectification**: Correct inaccurate data
- **Right to erasure**: Request account deletion
- **Right to portability**: Export your data
- **Right to object**: Opt-out of processing

### Data We Collect
- Account information (name, email, profile)
- Session records and progress data
- Messages and communications
- Payment information (processed securely)
- Usage analytics

### Data Protection
- All data encrypted in transit and at rest
- Regular security audits
- Strict access controls
- Third-party processor agreements
- Incident response procedures

### Data Retention
- Active accounts: Data retained indefinitely
- Deleted accounts: Data removed within 30 days
- Legal requirements: Some data retained for 7 years

### Contact
For data requests: privacy@tutornest.org
For DPO: dpo@tutornest.org
    `,
    category: 'legal',
  },
};

// Get all policies
app.get('/', async (c) => {
  try {
    const category = c.req.query('category');
    
    let policies = Object.values(PLATFORM_POLICIES);
    
    if (category) {
      policies = policies.filter(p => p.category === category);
    }
    
    return c.json({ policies });
  } catch (error: any) {
    console.error('Error fetching policies:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get specific policy
app.get('/:policyId', async (c) => {
  try {
    const policyId = c.req.param('policyId');
    const policy = PLATFORM_POLICIES[policyId as keyof typeof PLATFORM_POLICIES];
    
    if (!policy) {
      return c.json({ error: 'Policy not found' }, 404);
    }
    
    return c.json({ policy });
  } catch (error: any) {
    console.error('Error fetching policy:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Record policy acceptance
app.post('/:policyId/accept', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const policyId = c.req.param('policyId');
    const { userId } = await c.req.json();

    const policy = PLATFORM_POLICIES[policyId as keyof typeof PLATFORM_POLICIES];
    if (!policy) {
      return c.json({ error: 'Policy not found' }, 404);
    }

    const acceptanceId = `policy-acceptance:${userId}:${policyId}`;
    await kv.set(acceptanceId, {
      id: acceptanceId,
      userId,
      policyId,
      policyVersion: policy.version,
      acceptedAt: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error recording policy acceptance:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Check if user has accepted policy
app.get('/:policyId/acceptance/:userId', async (c) => {
  try {
    const policyId = c.req.param('policyId');
    const userId = c.req.param('userId');

    const acceptanceId = `policy-acceptance:${userId}:${policyId}`;
    const acceptance = await kv.get(acceptanceId);

    return c.json({ 
      accepted: !!acceptance,
      acceptedAt: acceptance ? (acceptance as any).acceptedAt : null,
    });
  } catch (error: any) {
    console.error('Error checking policy acceptance:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default app;
