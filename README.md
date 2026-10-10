# Love2Connect

A static HTML and vanilla JavaScript site with a dark navy, pink, and purple design, deployed through the existing GitHub-to-Netlify connection. Netlify serves `index.html` directly; no build or new dependencies are needed.

## Current scope

The static repair restores startup and the Discover, Chat, Calls, and Profile navigation. The existing Supabase project URL and browser publishable key remain unchanged. A configured client is not a verified database connection or authenticated session.

Fictional profiles, simulated chats, fake match notifications, and the hardcoded wallet balance have been removed. Registration, login, profile storage, matching, and messaging remain unavailable. M-Pesa and voice/video calls are explicitly unavailable; no payments, credit awards, or calls are simulated.

## Deployment and setup

Keep the existing Netlify repository connection and publish directory (`.`). No framework migration, deployment configuration change, or additional environment variables are required for the static repair. No SQL migration is required or provided because database and authentication implementation were excluded from the selected scope. Existing Supabase tables were not inspected or changed in this pass.

Full dating functionality requires a separate authentication and database implementation. This site does not yet operate as a dating platform.
