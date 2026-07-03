import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Helper function to get user ID from access token
const getUserId = async (accessToken: string | null, supabase: any): Promise<string | null> => {
  if (!accessToken) {
    console.log('No access token provided');
    return null;
  }
  
  try {
    // Decode JWT to extract user ID (same approach as main getUserId function)
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT token format');
      return null;
    }

    // Decode the payload (second part of JWT)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Extract user ID from payload (Supabase uses 'sub' claim for user ID)
    const userId = payload.sub;
    
    if (!userId) {
      console.error('No user ID found in token payload');
      return null;
    }
    
    return userId;
  } catch (err) {
    console.error('Exception in getUserId:', err);
    return null;
  }
};

// Initialize Google OAuth URL
app.get('/make-server-cbd74580/google-calendar/auth-url', async (c) => {
  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!clientId) {
      return c.json({ error: 'Google Calendar integration not configured. Please set GOOGLE_CLIENT_ID.' }, 500);
    }
    if (!redirectUri) {
      return c.json({ error: 'GOOGLE_REDIRECT_URI secret is not set.' }, 500);
    }

    const accessToken = c.req.header('Authorization')?.split(' ')[1] ?? null;
    const supabase = c.get('supabase');
    const userId = await getUserId(accessToken, supabase);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    // Store userId against a nonce so the server-side callback can identify the user
    const nonce = crypto.randomUUID();
    await kv.set(`gcal_state:${nonce}`, { userId, createdAt: new Date().toISOString() });

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${nonce}`;

    return c.json({ authUrl });
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Server-side OAuth callback — Google redirects here, we exchange the code and redirect back to the app.
// This avoids Supabase JS intercepting the ?code= param and logging the user out.
app.get('/make-server-cbd74580/google-calendar/callback', async (c) => {
  const appUrl = Deno.env.get('VITE_APP_URL') || 'https://app.knowledgefonsacademy.com';
  const profileUrl = `${appUrl}/dashboard/tutor/profile`;

  const code = c.req.query('code');
  const state = c.req.query('state');
  const oauthError = c.req.query('error');

  if (oauthError || !code || !state) {
    return c.redirect(`${profileUrl}?calendar=error&msg=${encodeURIComponent(oauthError || 'missing_params')}`);
  }

  try {
    const pendingState = await kv.get(`gcal_state:${state}`) as any;
    if (!pendingState?.userId) {
      return c.redirect(`${profileUrl}?calendar=error&msg=invalid_state`);
    }
    const { userId } = pendingState;

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      return c.redirect(`${profileUrl}?calendar=error&msg=not_configured`);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Token exchange error:', errText);
      return c.redirect(`${profileUrl}?calendar=error&msg=exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    await kv.set(`google_calendar_tokens:${userId}`, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
      tokenType: tokens.token_type,
      createdAt: new Date().toISOString(),
    });

    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile) {
      await kv.set(`user:${userId}`, {
        ...userProfile,
        googleCalendarConnected: true,
        googleCalendarConnectedAt: new Date().toISOString(),
      });
    }

    await kv.del(`gcal_state:${state}`);

    return c.redirect(`${profileUrl}?calendar=connected`);
  } catch (err: any) {
    console.error('Google Calendar callback error:', err);
    return c.redirect(`${profileUrl}?calendar=error&msg=server_error`);
  }
});

// Exchange authorization code for tokens
app.post('/make-server-cbd74580/google-calendar/exchange-token', async (c) => {
  try {
    const { code } = await c.req.json();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const supabase = c.get('supabase');
    const userId = await getUserId(accessToken, supabase);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:5173/google-callback';
    
    if (!clientId || !clientSecret) {
      return c.json({ error: 'Google Calendar integration not configured' }, 500);
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange error:', error);
      return c.json({ error: 'Failed to exchange authorization code' }, 400);
    }
    
    const tokens = await tokenResponse.json();
    
    // Store tokens in KV store
    await kv.set(`google_calendar_tokens:${userId}`, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
      tokenType: tokens.token_type,
      createdAt: new Date().toISOString(),
    });
    
    // Mark user as having Google Calendar connected
    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile) {
      await kv.set(`user:${userId}`, {
        ...userProfile,
        googleCalendarConnected: true,
        googleCalendarConnectedAt: new Date().toISOString(),
      });
    }
    
    return c.json({ success: true, message: 'Google Calendar connected successfully' });
  } catch (error: any) {
    console.error('Error exchanging token:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get fresh access token (handles refresh if needed)
async function getAccessToken(userId: string): Promise<string | null> {
  const tokens = await kv.get(`google_calendar_tokens:${userId}`) as any;
  
  if (!tokens) {
    return null;
  }
  
  // Check if token is expired or expiring soon (within 5 minutes)
  if (tokens.expiresAt && Date.now() >= tokens.expiresAt - 300000) {
    // Refresh the token
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    if (!clientId || !clientSecret || !tokens.refreshToken) {
      return null;
    }
    
    try {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: tokens.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });
      
      if (!refreshResponse.ok) {
        console.error('Token refresh failed:', await refreshResponse.text());
        return null;
      }
      
      const newTokens = await refreshResponse.json();
      
      // Update stored tokens
      await kv.set(`google_calendar_tokens:${userId}`, {
        ...tokens,
        accessToken: newTokens.access_token,
        expiresAt: Date.now() + (newTokens.expires_in * 1000),
        refreshToken: newTokens.refresh_token || tokens.refreshToken,
      });
      
      return newTokens.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }
  
  return tokens.accessToken;
}

// Create a calendar event
app.post('/make-server-cbd74580/google-calendar/events', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const supabase = c.get('supabase');
    const userId = await getUserId(accessToken, supabase);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { summary, description, startDateTime, endDateTime, attendees, location } = await c.req.json();
    
    const googleAccessToken = await getAccessToken(userId);
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google Calendar not connected or token expired' }, 400);
    }
    
    // Create event in Google Calendar
    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: 'Africa/Lagos',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Africa/Lagos',
      },
      attendees: attendees?.map((email: string) => ({ email })) || [],
      location: location || 'Knowledge Fons Academy Virtual Classroom',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };
    
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create calendar event:', error);
      return c.json({ error: 'Failed to create calendar event' }, 500);
    }
    
    const createdEvent = await response.json();
    
    return c.json({ success: true, event: createdEvent });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get calendar events (for checking availability)
app.get('/make-server-cbd74580/google-calendar/events', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const supabase = c.get('supabase');
    const userId = await getUserId(accessToken, supabase);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const timeMin = c.req.query('timeMin') || new Date().toISOString();
    const timeMax = c.req.query('timeMax');
    
    const googleAccessToken = await getAccessToken(userId);
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google Calendar not connected or token expired' }, 400);
    }
    
    let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`;
    
    if (timeMax) {
      url += `&timeMax=${encodeURIComponent(timeMax)}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to fetch calendar events:', error);
      return c.json({ error: 'Failed to fetch calendar events' }, 500);
    }
    
    const data = await response.json();
    
    return c.json({ events: data.items || [] });
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Delete a calendar event
app.delete('/make-server-cbd74580/google-calendar/events/:eventId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const supabase = c.get('supabase');
    const userId = await getUserId(accessToken, supabase);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const eventId = c.req.param('eventId');
    
    const googleAccessToken = await getAccessToken(userId);
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google Calendar not connected or token expired' }, 400);
    }
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`,
      },
    });
    
    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      console.error('Failed to delete calendar event:', error);
      return c.json({ error: 'Failed to delete calendar event' }, 500);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Update a calendar event
app.patch('/make-server-cbd74580/google-calendar/events/:eventId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const supabase = c.get('supabase');
    const userId = await getUserId(accessToken, supabase);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const eventId = c.req.param('eventId');
    const updates = await c.req.json();
    
    const googleAccessToken = await getAccessToken(userId);
    
    if (!googleAccessToken) {
      return c.json({ error: 'Google Calendar not connected or token expired' }, 400);
    }
    
    // Transform updates to Google Calendar format
    const eventUpdates: any = {};
    
    if (updates.summary) eventUpdates.summary = updates.summary;
    if (updates.description) eventUpdates.description = updates.description;
    if (updates.location) eventUpdates.location = updates.location;
    
    if (updates.startDateTime) {
      eventUpdates.start = {
        dateTime: updates.startDateTime,
        timeZone: 'Africa/Lagos',
      };
    }
    
    if (updates.endDateTime) {
      eventUpdates.end = {
        dateTime: updates.endDateTime,
        timeZone: 'Africa/Lagos',
      };
    }
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventUpdates),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to update calendar event:', error);
      return c.json({ error: 'Failed to update calendar event' }, 500);
    }
    
    const updatedEvent = await response.json();
    
    return c.json({ success: true, event: updatedEvent });
  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Disconnect Google Calendar
app.post('/make-server-cbd74580/google-calendar/disconnect', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const supabase = c.get('supabase');
    const userId = await getUserId(accessToken, supabase);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Remove tokens
    await kv.del(`google_calendar_tokens:${userId}`);
    
    // Update user profile
    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile) {
      await kv.set(`user:${userId}`, {
        ...userProfile,
        googleCalendarConnected: false,
        googleCalendarConnectedAt: null,
      });
    }
    
    return c.json({ success: true, message: 'Google Calendar disconnected' });
  } catch (error: any) {
    console.error('Error disconnecting Google Calendar:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get connection status
app.get('/make-server-cbd74580/google-calendar/status', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const supabase = c.get('supabase');
    const userId = await getUserId(accessToken, supabase);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const tokens = await kv.get(`google_calendar_tokens:${userId}`) as any;
    const userProfile = await kv.get(`user:${userId}`) as any;

    return c.json({
      connected: !!tokens,
      connectedAt: userProfile?.googleCalendarConnectedAt || tokens?.createdAt || null,
    });
  } catch (error: any) {
    console.error('Error checking connection status:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default function googleCalendarRoutes(mainApp: Hono, getSupabaseClient: () => any) {
  // Middleware to attach Supabase client
  app.use('*', async (c, next) => {
    c.set('supabase', getSupabaseClient());
    await next();
  });
  
  mainApp.route('/', app);
}