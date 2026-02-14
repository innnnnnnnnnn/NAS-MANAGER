# NAS Manager

An intelligent NAS file management system with real-time scanning, automatic classification, and dynamic learning capabilities.

## Hardware Support
Optimized for NAS (Network Attached Storage) and external drives with high-latency handling and automatic retry logic.

## Key Features
- **Real-time Scanning**: High-stability scanner V15 with individual file streaming for instant feedback.
- **Recursive Browsing**: Deep tree browsing directly from the categorized view.
- **Smart Classification**: Automatic categorization (Games, Media, Documents, etc.) based on file signatures and extensions.
- **Persistent Learning Engine**: Remembers your manual reclassifications. If you move a file once, the system learns the pattern for next time.
- **Batch Actions**: Execute mass movements or deletions across entire categories or bundles.
- **Retry Logic**: Industrial-grade recovery for NAS connection drops or directory locking.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, SSE (Server-Sent Events) for real-time updates.

## Getting Started
1. Clone the repository.
2. Install dependencies for both folders:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Start the application:
   - Backend: `npm start` (or `node index.js`)
   - Frontend: `npm run dev`

## Deployment
This project is ready to be pushed to GitHub. Remote origin is set to `https://github.com/innnnnnnnnnn/NAS-MANAGER.git`.
