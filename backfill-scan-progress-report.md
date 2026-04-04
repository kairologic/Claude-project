# KairoLogic Backfill Scan Progress Report

**Timestamp:** 2026-03-29 (automated check)

## Metrics Summary

| Metric              | Baseline (pre-Run #5) | Current | Delta       |
| ------------------- | --------------------- | ------- | ----------- |
| web_address         | 29,364                | 40,143  | **+10,779** |
| scan_scores         | 49,793                | 55,033  | **+5,240**  |
| mismatches_flagged  | 17,470                | 25,852  | **+8,382**  |
| workflows           | 14,770                | 14,823  | **+53**     |
| alerts              | 14,763                | 14,816  | **+53**     |
| sites_scanned_today | 21                    | 0       | **-21**     |

## Scan Timing (Today)

| Metric              | Value                   |
| ------------------- | ----------------------- |
| Earliest scan today | _null_ (no scans today) |
| Latest scan today   | _null_ (no scans today) |
| Duration (minutes)  | _null_                  |

## Analysis

**No scans have run today (2026-03-29).** The `sites_scanned_today` count is 0 and all timing fields are null, meaning the GitHub Actions backfill workflow has not executed any scans today.

Looking at cumulative deltas since the baseline:

- **scan_scores +5,240** — This is very close to the ~5,295 never-scanned site target, suggesting the backfill likely completed on a previous day.
- **web_address +10,779** — Significant growth in provider web addresses enriched.
- **mismatches_flagged +8,382** — Substantial new mismatches discovered from the scanned sites.
- **workflows +53 / alerts +53** — Modest new workflow and alert activity.

## Conclusion

**The backfill run appears to have already completed on a prior day.** The scan_scores delta of +5,240 closely matches the ~5,295 target for never-scanned sites. No scanning activity has occurred today, which is consistent with the backfill having finished. The run can be considered **complete**.
