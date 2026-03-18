# Cisco Finance Intelligence Platform

A React-based financial analysis and compliance management application built as a proof-of-concept for Cisco's finance organization. It combines variance reporting, budget analysis, AI-driven insights, and SOX compliance tracking in a single interface.

## Features

- **Variance Narrative** — Budget variance analysis with decomposition across volume, rate, FX, and mix drivers
- **Flux Report** — Detailed variance reporting across GL codes, regions, and entities
- **AI Intelligence** — AI-generated insights and anomaly detection powered by Claude
- **Scenario & Sensitivity** — Scenario planning and sensitivity analysis
- **SOX Compliance** — SOX compliance tracking and certification workflows
- **Period Locking** — Period-level locking controls

### Role-Based Access

| Role | Permissions |
|------|-------------|
| CFO | Full approval authority, dual-approval signing, compliance certification |
| FP&A Analyst | Prepare and submit items for review, full audit log access |
| BU Controller | View and approve Americas-only items |
| Auditor | Read-only access to audit logs and compliance packages |
| SOX Compliance | Full SOX authority, approve any item, export compliance packages |

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — dev server and build tool
- **Anthropic Claude API** (`claude-sonnet-4-20250514`) — AI insights and narrative generation

## Getting Started

### Prerequisites

- Node.js (v18+)
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Development

```bash
npm run dev
```

The app runs at `http://localhost:5173`. The Vite dev server proxies all `/api/anthropic` requests to the Anthropic API, keeping your key server-side.

### Build

```bash
npm run build
```

Outputs to `dist/`. Preview the production build with:

```bash
npm run preview
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required for AI features) |

## Project Structure

```
cisco-finance-platform/
├── src/
│   ├── App.tsx        # Main application (all components and logic)
│   └── main.tsx       # Entry point
├── index.html
├── vite.config.ts     # Dev server + API proxy config
├── tsconfig.json
├── .env.example
└── package.json
```

## Financial Data Dimensions

- **Regions**: Americas, EMEA, APAC, Splunk, Enterprise, SMB
- **GL Codes**: 6000-OpEx, 6100-COGS, 6200-R&D, 6300-S&M, 6400-G&A, 6500-D&A
- **Entities**: Cisco Systems Inc., Cisco Splunk LLC, Cisco Meraki Inc., Cisco AppDynamics
- **Currencies**: USD, EUR, GBP, JPY, SGD, AUD
