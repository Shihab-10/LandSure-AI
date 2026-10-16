# LandSure AI — Frontend Foundation

React + TypeScript + Vite dashboard prototype.

## Features
- Responsive premium dashboard
- Parcel Explorer
- Evidence Center
- AI Copilot
- JWT login screen when backend is configured
- Explicit demo mode when no backend URL is configured

## Run locally
```bash
npm install
npm run dev
```

## Connect backend
Copy `.env.example` to `.env` and set:

```
VITE_API_URL=https://your-backend.example
```

Restart the Vite server after changing `.env`.

**Important:** The backend must configure CORS for the exact frontend
origin. Never put JWT secrets or database credentials in VITE_ variables.

The prototype stores the access token only in React memory. A refresh
requires login again. Production deployment requires a complete
session, authorization and security review.

## Status
- Frontend foundation only.
- 26 application features are NOT fully implemented.
- Evidence is synthetic and does not establish legal ownership.
- Demo records are illustrative and are never live DB records.
