# B- Lunder — Leadership Overview

## In one minute

B- Lunder is a campus community platform for Stiftung Louisenlund. It brings common campus updates and services into one authenticated web app: announcements, events, deadlines, food menus, lost and found, mentor groups, Guilds, and notifications. The goal is to make useful information easier to find and help students and staff stay connected.

## What people can do

- Read school-wide, academic-track, class, and mentor-group announcements; react and vote in polls.
- View campus events, academic deadlines, and food information.
- Post and discuss lost or found items, and claim or unclaim items.
- Create Guilds, invite existing members, and share Guild announcements.
- Receive in-app notifications and optionally enable browser push notifications.
- Use the interface in English or German.

Access to some actions depends on the account role. For example, selected roles can manage announcements, events, food menus, users, or Guilds.

## Technology

- **Web app:** React 19, Vite, Tailwind CSS, and React Router.
- **Server/API:** Node.js with Express 5; real-time updates use Socket.IO.
- **Database:** PostgreSQL, accessed through the `pg` library.
- **Images:** Cloudinary stores uploaded images; the app keeps their URLs with the related records.
- **Email:** Resend sends account invitation and password-reset messages.
- **Browser alerts:** Web Push sends optional notifications to subscribed browsers.

## Where information is stored

PostgreSQL stores account details (such as name, email, role, and campus affiliations) and app content such as announcements, events, deadlines, meal information, Guilds, comments, claims, and notification records. Passwords are stored as bcrypt hashes rather than readable passwords. Uploaded profile and post images are sent to Cloudinary; the database stores image links and other related records.

Browser push subscriptions are stored in PostgreSQL so the server can send alerts to opted-in browsers. Email addresses and the content needed to deliver an invitation or password-reset email are sent to Resend.

**Hosting locations, database region, backup schedule, retention periods, and vendor account settings are not specified in the application code.** Those should be confirmed with the people managing the production environment and provider accounts.

## Security and privacy in the code

The application includes several useful safeguards:

- Password hashing with bcrypt (12 rounds).
- Short-lived signed access tokens and refresh tokens; the server checks that accounts are active.
- Server-side authentication and role checks on protected routes.
- One-time codes for account setup and password recovery.
- Helmet security headers, a configured CORS origin, and API rate limiting.
- Uploads are limited to image files up to 5 MB.
- Environment files are excluded from Git by `.gitignore`.

### Points to verify before a broad production rollout

These are deployment and security review items visible from the current code, not claims that an incident has occurred:

1. **Confirm the live hosting and storage setup.** Document which accounts own the app host, PostgreSQL, Cloudinary, Resend, and push configuration; confirm data region, backups, access controls, and deletion/retention practices.
2. **Harden database certificate validation.** The PostgreSQL connection enables SSL but currently sets `rejectUnauthorized: false`, so the client does not verify the database server certificate.
3. **Protect real-time private rooms.** The Socket.IO server currently accepts user, track, and mentor-group room names from the connecting browser. Bind room membership to a verified server-side identity so a client cannot request another user's private room.
4. **Review browser token storage and web security.** The browser stores access and refresh tokens in `sessionStorage`. Review the XSS protections and token handling as part of a security review.
5. **Set and review production secrets.** Ensure JWT signing keys, database credentials, and vendor API keys are strong, private, rotated when needed, and never placed in client-side settings or source control.

## Do AI services receive user information?

No AI provider or AI API integration was found in the application code reviewed. The app does send specific information to its configured non-AI providers when their features are used: images to Cloudinary, email delivery details to Resend, and push notification data through browser push services for subscribed users. This is a code review finding; verify production configuration and any external scripts or hosting integrations separately.

## Simple presentation for a meeting

> “B- Lunder gives our campus one secure place for announcements, events, deadlines, food updates, lost and found, and student Guilds. It uses a modern web application with a PostgreSQL database, and connects to specialist services for images, email, and optional browser notifications. The reviewed code contains no AI integration. Before expanding use, we should confirm hosting and data-retention arrangements and complete a focused security review of real-time access and database connection settings.”

---

*Prepared from the application source and configuration in this repository. Production infrastructure, provider contracts, and operational policies were not available for review.*
