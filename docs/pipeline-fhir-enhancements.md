# FHIR Client Enhancements — Pipeline

**Status:** Deferred (not blocking BCBS TX / Blue Shield CA integration)
**Tracking:** #42e/f
**Priority:** Medium — improves data quality across all payers

---

## 1. Organization Fallback Fetch

**Problem:** When `_include=PractitionerRole:organization` returns no Organization resource in the bundle (common with Humana and HCSC), `listed_org_name` stays null.

**Fix:** In `fhir-client.ts`, after the PractitionerRole fetch, if no Organization is found in the bundle but `PractitionerRole.organization.reference` exists, do a direct `GET /Organization/{id}`.

```typescript
// After findResourceInBundle<FhirOrganization>(roleBundle, 'Organization')
if (!organization && practitionerRole?.organization?.reference) {
  const orgRef = practitionerRole.organization.reference; // e.g., "Organization/12345"
  const orgBundle = await this.fhirGet<FhirBundle>(endpoint, `/${orgRef}`);
  organization = orgBundle as unknown as FhirOrganization;
}
```

**Impact:** Populates `listed_org_name` for all providers. Needed for org-level mismatch detection.

---

## 2. Accepting New Patients — Cross-Payer Validation

**Problem:** Each payer uses different FHIR extensions for `accepting_new_patients`:
- **UHC/Aetna:** `PractitionerRole.extension` with Da Vinci PDex `newpatients` URL
- **Cigna:** Custom extension URL (`cigna.com/...`)
- **Humana:** Often missing entirely

**Fix:** Add fallback chain in `buildSnapshot()`:

```typescript
const accepting = extractAcceptingPatients(practitionerRole)
  ?? extractAcceptingPatientsLegacy(practitionerRole)
  ?? extractAcceptingFromLocation(location);
```

Create helper functions for each extraction pattern.

**Impact:** More complete `listed_accepting_patients` data for comparison grid.

---

## 3. Organization Name Extraction

**Problem:** `listed_org_name` is null for all providers because the Organization resource is either not included or not extracted.

**Fix:** Combine with #1 (Organization Fallback Fetch). Once Organization is reliably fetched, extract `Organization.name`.

**Impact:** Enables org-level matching (is provider listed under the correct practice name?).

---

## 4. Specialty Display Name Resolution

**Problem:** When a FHIR response only includes a NUCC taxonomy code (e.g., `208600000X`) without a display name, `listed_specialty_display` stores the raw code instead of a human-readable name like "Surgery".

**Fix:** Add a NUCC taxonomy lookup table or CSV. When `specialty.coding[].display` is missing but `code` exists, resolve via the lookup.

```typescript
import { NUCC_TAXONOMY } from '../nucc-taxonomy';

function resolveSpecialtyDisplay(coding: { code?: string; display?: string }): string | null {
  if (coding.display) return coding.display;
  if (coding.code && NUCC_TAXONOMY[coding.code]) return NUCC_TAXONOMY[coding.code];
  return coding.code || null;
}
```

**Source:** NUCC taxonomy CSV available at https://nucc.org/index.php/code-sets-mainmenu-41/provider-taxonomy-mainmenu-40

**Impact:** Human-readable specialty names in comparison grid and mismatch reports.

---

## 5. Aetna Endpoint URL Update

**Current:** `https://vteapif1.aetna.com/fhir/v2/public-medicare-providerdirectory-fhir`
**Note:** This endpoint returned 403s in early testing. The brief references `https://vteam-fhir.aetna.com/fhir/v2/ProviderDirectory` as the working endpoint. Verify and update `payer_directory_endpoints` if needed.

---

## When to Tackle

These enhancements should be addressed after:
1. BCBS TX scraper field mapping is validated with live data
2. Blue Shield CA credentials are received and activated
3. First 10 customer demos are complete (founders cohort milestone)

Estimated effort: 1-2 sessions for all 4 items.
