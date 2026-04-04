/**
 * LinkedIn Marketing API integration using OAuth 2.0.
 * Supports both personal (w_member_social) and organization (w_organization_social) posting.
 * Tokens are stored in the linkedin_connections table via OAuth flow.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

export type LinkedInAccountType = 'personal' | 'organization';

export interface LinkedInPostResult {
  success: boolean;
  postUrn?: string;
  postUrl?: string;
  error?: string;
}

interface LinkedInConnection {
  id: string;
  account_type: LinkedInAccountType;
  linkedin_person_id: string;
  organization_id: string | null;
  access_token: string;
  expires_at: string;
  refresh_token: string | null;
}

/**
 * Get active LinkedIn connection by account type, refreshing token if expired.
 */
async function getActiveConnection(
  accountType: LinkedInAccountType = 'personal',
): Promise<LinkedInConnection | null> {
  const supabase = createAdminSupabaseClient();

  const { data: connection, error } = await supabase
    .from('linkedin_connections')
    .select(
      'id, account_type, linkedin_person_id, organization_id, access_token, expires_at, refresh_token',
    )
    .eq('is_active', true)
    .eq('account_type', accountType)
    .single();

  if (error || !connection) return null;

  // Check if token is expired
  if (new Date(connection.expires_at) < new Date()) {
    if (connection.refresh_token) {
      const refreshed = await refreshToken(connection, supabase);
      if (refreshed) {
        return { ...connection, access_token: refreshed };
      }
    }
    return null;
  }

  return connection;
}

/**
 * Refresh an expired LinkedIn access token.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function refreshToken(connection: LinkedInConnection, supabase: any): Promise<string | null> {
  const clientId =
    connection.account_type === 'organization'
      ? process.env.LINKEDIN_ORG_CLIENT_ID || '86e4trpqib1zjv'
      : process.env.LINKEDIN_CLIENT_ID || '86mkxkw2wt1ped';
  const clientSecret =
    connection.account_type === 'organization'
      ? process.env.LINKEDIN_ORG_CLIENT_SECRET!
      : process.env.LINKEDIN_CLIENT_SECRET!;

  try {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token!,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const data = await res.json();
    if (!data.access_token) return null;

    await supabase
      .from('linkedin_connections')
      .update({
        access_token: data.access_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        refresh_token: data.refresh_token || connection.refresh_token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Publish a text post (with optional image) to LinkedIn.
 * Supports posting as personal profile or as an organization page.
 */
export async function publishToLinkedIn(
  text: string,
  imageUrl?: string,
  accountType: LinkedInAccountType = 'personal',
): Promise<LinkedInPostResult> {
  const connection = await getActiveConnection(accountType);

  if (!connection) {
    const label = accountType === 'organization' ? 'KairoLogic company page' : 'personal LinkedIn';
    return {
      success: false,
      error: `No active ${label} connection. Please connect in Content Studio.`,
    };
  }

  const {
    access_token: accessToken,
    linkedin_person_id: personId,
    organization_id: orgId,
  } = connection;

  // Determine author URN based on account type
  const authorUrn =
    accountType === 'organization' && orgId
      ? `urn:li:organization:${orgId}`
      : `urn:li:person:${personId}`;

  try {
    // Step 1: If there's an image, upload it first
    let imageUrn: string | undefined;
    if (imageUrl) {
      imageUrn = await uploadLinkedInImage(accessToken, authorUrn, imageUrl);
    }

    // Step 2: Create the post via UGC Posts API
    const postBody: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: imageUrn ? 'IMAGE' : 'NONE',
          ...(imageUrn
            ? {
                media: [
                  {
                    status: 'READY',
                    media: imageUrn,
                  },
                ],
              }
            : {}),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return { success: false, error: `LinkedIn API error ${res.status}: ${errorBody}` };
    }

    const postUrn = res.headers.get('x-restli-id') || '';

    // Track in linkedin_posts table
    const supabase = createAdminSupabaseClient();
    await supabase.from('linkedin_posts').insert({
      connection_id: connection.id,
      content_text: text,
      linkedin_post_id: postUrn,
      linkedin_post_url: postUrn ? `https://www.linkedin.com/feed/update/${postUrn}` : null,
      status: 'posted',
      posted_at: new Date().toISOString(),
      metadata: { had_image: !!imageUrn, account_type: accountType },
    });

    return {
      success: true,
      postUrn,
      postUrl: `https://www.linkedin.com/feed/update/${postUrn}`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Upload an image to LinkedIn for use in a post.
 */
async function uploadLinkedInImage(
  accessToken: string,
  ownerUrn: string,
  imageUrl: string,
): Promise<string | undefined> {
  try {
    const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: ownerUrn,
          serviceRelationships: [
            { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
          ],
        },
      }),
    });

    if (!registerRes.ok) return undefined;

    const registerData = await registerRes.json();
    const uploadUrl =
      registerData.value?.uploadMechanism?.[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ]?.uploadUrl;
    const asset = registerData.value?.asset;

    if (!uploadUrl || !asset) return undefined;

    const imageRes = await fetch(imageUrl);
    const imageBuffer = await imageRes.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'image/png',
      },
      body: imageBuffer,
    });

    return uploadRes.ok ? asset : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check if LinkedIn is connected for a given account type.
 */
export async function isLinkedInConnected(
  accountType: LinkedInAccountType = 'personal',
): Promise<boolean> {
  const connection = await getActiveConnection(accountType);
  return !!connection;
}
