import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase/info', () => ({
  projectId: 'test-project-ref',
  publicAnonKey: 'test-anon-key',
  authDomain: undefined,
}));

describe('supabase-edge-fetch', () => {
  it('edgeFunctionBaseUrl matches Supabase functions path', async () => {
    const { edgeFunctionBaseUrl } = await import('./supabase-edge-fetch');
    expect(edgeFunctionBaseUrl()).toBe(
      'https://test-project-ref.supabase.co/functions/v1/make-server-cbd74580'
    );
  });

  it('edgeFunctionUrl normalizes suffix with or without leading slash', async () => {
    const { edgeFunctionUrl } = await import('./supabase-edge-fetch');
    expect(edgeFunctionUrl('profile')).toBe(
      'https://test-project-ref.supabase.co/functions/v1/make-server-cbd74580/profile'
    );
    expect(edgeFunctionUrl('/admin/health')).toBe(
      'https://test-project-ref.supabase.co/functions/v1/make-server-cbd74580/admin/health'
    );
  });

  it('edgeFunctionHeaders sends Bearer and apikey when anon key is set', async () => {
    const { edgeFunctionHeaders } = await import('./supabase-edge-fetch');
    expect(edgeFunctionHeaders('jwt-here')).toEqual({
      Authorization: 'Bearer jwt-here',
      apikey: 'test-anon-key',
    });
  });
});
