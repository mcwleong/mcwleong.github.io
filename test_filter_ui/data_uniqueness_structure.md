# Data Uniqueness Structure

Source: `test_filter_ui/sqllab_untitled_query_11_20260508T030355.csv`

## Relationship Model

- Cluster -> Hospital: one cluster has many hospitals.
- Hospital -> Asset Owner: one hospital has many asset owners.
- Hospital -> Location Code: one hospital has many location codes.

## Rule Validation Summary

| Rule | Expected | Result |
|---|---|---|
| Hospital is unique to Cluster | Each `hospital_code` maps to exactly one `cluster_code` | PASS |
| Asset Owner is unique to Hospital | Each `asset_owner` maps to exactly one `hospital_code` | PASS |
| Location Code is unique to Hospital | Each `location_code` maps to exactly one `hospital_code` | FAIL |

## Cluster-Hospital Structure

- `HEC` (3 hospitals): `PYN`, `RH`, `TEH`
- `HWC` (6 hospitals): `DKH`, `FYK`, `GH`, `MMR`, `QMH`, `TWH`
- `KCC` (6 hospitals): `BH`, `HCH`, `HKE`, `KWH`, `OLM`, `QEH`
- `KEC` (3 hospitals): `HHH`, `TKO`, `UCH`
- `KWC` (4 hospitals): `CMC`, `NLT`, `PMH`, `YCH`
- `NEC` (6 hospitals): `AHN`, `BBH`, `NDH`, `PWH`, `SCH`, `SH`
- `NWC` (5 hospitals): `CPH`, `POH`, `SLH`, `TMH`, `TSH`

## Exception Details

### Location codes mapped to multiple hospitals
- `CPH-FB-G-PT` -> `CPH`, `SLH`
- `CPH-SB-01-012` -> `CPH`, `SLH`
- `SLH-AHTC-G-NIL` -> `CPH`, `SLH`
- `SLH-BB-02-215` -> `CPH`, `SLH`

## Dataset Stats

- Total rows: `1538`
- Distinct clusters: `7`
- Distinct hospitals: `33`
- Distinct asset owners: `731`
- Distinct location codes: `1250`
