# ResourceLoop AI

**AI-powered Circular Renovation Decision Support Platform**  
*Preserve Value. Reduce Waste. Make Better Decisions.*

## Vision & Core Principles

ResourceLoop AI supports architects, structural engineers, renovation project managers, demolition contractors, and asset owners in preparing, comparing, and documenting circular renovation decisions on a transparent data basis.

- **AI supports the decision. Humans make the decision.**
- Missing data is explicitly labeled `UNKNOWN` — never replaced with `0 EUR`, assumed low risk, or fabricated EPD metrics.
- Technical safety and compliance constraints cannot be overridden by cost or environmental scores.
- Deterministic engineering calculations (`Net Area = Gross Area − Opening Area`, `Volume`, `Mass`, `Cost`, `MCDA`) run strictly outside the LLM.

## Implemented Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Recharts + Leaflet + SheetJS (`xlsx`) + `jsPDF`
- **Backend (`server.ts`)**: Express server with Vite middleware, Zod input validation, server-side `@google/genai` (`gemini-4-hydrogen`), live OpenStreetMap Nominatim & Overpass adapters, and local file-backed demonstrator persistence (`./data/workspace.json` + browser `localStorage`).
- **Security**: `GEMINI_API_KEY` stays strictly on the server (`process.env.GEMINI_API_KEY`). Prompt-injection boundaries treat external documents and user hints as untrusted data.

## Core Modules

1. **Dashboard & Projekte**: Portfolio overview distinguishing forecast vs. realized savings, project CRUD, JSON export, and DEMO vs. REAL separation.
2. **Building Intelligence**: Address & construction year intake, live Nominatim geocoding, Overpass building footprint context, interactive Leaflet GIS map (OSM, Satellite, Topo, GeoBasis NRW ALKIS WMS), climate/environmental risk matrix (`UNKNOWN` when unavailable), and Gemini AI Building Briefing.
3. **Smart Scanner & Document Intelligence**: Camera capture / photo upload, multimodal Gemini Vision scan with mandatory human review, XLSX/CSV validation wizard, and PDF/datasheet extraction.
4. **Product Twin / Resource DNA**: Component hierarchy, multi-layer materials, and live deterministic Quantity Engine (`12 m² − 2 m² = 10 m²` reference case).
5. **Material Intelligence**: 12-category material library and Material Flow visualization (documented stock vs. scenario forecast).
6. **Circular Decision Compass & Szenarienvergleich**: 5 R-strategies (`R1 KEEP`, `R2 REPAIR/REUSE`, `R3 REFURBISH`, `R4 REMANUFACTURE`, `R5 RECYCLE`) plus separated `Conventional Replacement` benchmark, editable cost positions, sensitivity ranges, non-compensatory technical gates, and MCDA ranking lock when critical criteria are `UNKNOWN`.
7. **Decision Memory & Data Trust Center**: Versioned immutable decision snapshots, expert approval workflow, Data Quality metrics, and Audit Trail.
8. **Reports**: 18-section Renovation Decision Report with downloadable PDF and CSV exports.

## Setup & Local Development

```bash
npm install
# Configure GEMINI_API_KEY in environment / Secrets
npm run dev      # Starts Express + Vite on port 3000
npm test         # Runs deterministic Calculation Engine unit tests (Vitest)
npm run lint     # TypeScript check
npm run build    # Production Vite bundle
```

## Technical Limitations & Unavailable External Sources

- **Persistence**: Currently runs in local demonstrator mode (`./data/workspace.json` + `localStorage`). Cloud Firestore & Firebase Auth are prepared in the data model (`PLANNED`) and not falsely claimed as active.
- **Blocked/Manual Geo Sources**: Municipal contaminated-site registers (*Altlastenkataster NRW*), *BKG Starkregen*, and *ELWAS Hochwasser* parcel-level JSON APIs require manual import or municipal access (`BLOCKED` / `MANUAL_IMPORT_REQUIRED`).
- **Disclaimer**: Reports and AI briefings are decision-support artifacts and do not replace certified structural, fire-safety, or hazardous-material expert assessments.
