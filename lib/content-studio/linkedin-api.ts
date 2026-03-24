/**
 * LinkedIn Marketing API integration (stubbed).
 * Implements OAuth 2.0 flow and Posts API for organic posting.
 * Configure LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_ACCESS_TOKEN,
 * and LINKEDIN_PERSON_URN in environment variables.
 */

export interface LinkedInPostResult {
  success: boolean;
  postUrn?: string;
  postUrl?: string;
  error?: string;
}

export async function publishToLinkedIn(
  text: string,
  imageUrl?: string
): Promise<LinkedInPostResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!accessToken || !personUrn) {
    return {
      success: false,
      error: 'LinkedIn credentials not configured. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN.',
    };
  }

  try {
    // Step 1: If there's an image, upload it first
    let imageUrn: string | undefined;
    if (imageUrl) {
      imageUrn = await uploadLinkedInImage(accessToken, personUrn, imageUrl);
    }

    // Step 2: Create the post
    const postBody: Record<string, unknown> = {
      author: personUrn,
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
    return {
      success: true,
      postUrn,
      postUrl: `https://www.linkedin.com/feed/update/${postUrn}`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

async function uploadLinkedInImage(
  accessToken: string,
  personUrn: string,
  imageUrl: string
): Promise<string | undefined> {
  try {
    // Register upload
    const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: personUrn,
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

    // Download the image and upload to LinkedIn
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
 * Check if LinkedIn credentials are configured
 */
export function isLinkedInConfigured(): boolean {
  return !!(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_PERSON_URN);
}
