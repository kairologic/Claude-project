#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════
// Quick Aetna FHIR connection test
// Usage: npx tsx scripts/test-aetna-connection.ts
// ═══════════════════════════════════════════════════════════════

const TOKEN_URL = 'https://apif1.aetna.com/fhir/v1/fhirserver_auth/oauth2/token';
const FHIR_BASE = 'https://apif1.aetna.com/fhir/v1/providerdirectorydata';
const CLIENT_ID = process.env.AETNA_CLIENT_ID || '6cd3465567ea1ceb234aa86ca4976a87';
const CLIENT_SECRET = process.env.AETNA_CLIENT_SECRET || '0b8da76a727d10cc264daf2a2043c178';

// Test NPI: a well-known provider to verify the lookup works
const TEST_NPI = '1326061003';

async function main() {
  console.log('═══ Aetna FHIR Connection Test ═══\n');

  // Step 1: Get OAuth2 token
  console.log('1. Requesting OAuth2 token...');
  console.log(`   Token URL: ${TOKEN_URL}`);
  console.log(`   Client ID: ${CLIENT_ID.substring(0, 8)}...`);

  try {
    // Aetna requires Basic Auth header + scope parameter
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'Public NonPII',
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error(`   ✗ Token request failed: ${tokenRes.status} ${tokenRes.statusText}`);
      console.error(`   Response: ${body.substring(0, 500)}`);
      process.exit(1);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
    };
    console.log(
      `   ✓ Token received (type: ${tokenData.token_type}, expires in: ${tokenData.expires_in}s)`,
    );
    console.log(`   Token: ${tokenData.access_token.substring(0, 20)}...\n`);

    // Step 2: Test FHIR Practitioner lookup
    console.log(`2. Looking up Practitioner by NPI ${TEST_NPI}...`);
    const npiParam = encodeURIComponent(`http://hl7.org/fhir/sid/us-npi|${TEST_NPI}`);
    const fhirUrl = `${FHIR_BASE}/Practitioner?identifier=${npiParam}`;
    console.log(`   URL: ${fhirUrl}`);

    const fhirRes = await fetch(fhirUrl, {
      headers: {
        Accept: 'application/fhir+json',
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      signal: AbortSignal.timeout(30_000),
    });

    console.log(`   Status: ${fhirRes.status} ${fhirRes.statusText}`);

    if (!fhirRes.ok) {
      const body = await fhirRes.text();
      console.error(`   ✗ FHIR request failed`);
      console.error(`   Response: ${body.substring(0, 500)}`);
      process.exit(1);
    }

    const bundle = (await fhirRes.json()) as {
      resourceType: string;
      total?: number;
      entry?: Array<{
        resource: { resourceType: string; name?: Array<{ given?: string[]; family?: string }> };
      }>;
    };
    console.log(`   ✓ Bundle received (total: ${bundle.total ?? 'unknown'})`);

    if (bundle.entry && bundle.entry.length > 0) {
      const practitioner = bundle.entry[0].resource;
      const name = practitioner.name?.[0];
      console.log(`   Provider: ${name?.given?.join(' ')} ${name?.family || '(no name)'}`);
    } else {
      console.log(`   (No practitioner found for this NPI — but the API responded successfully)`);
    }

    console.log('\n═══ Connection test PASSED ═══');
  } catch (err) {
    console.error(`\n✗ Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();
