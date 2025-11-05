# Go Grind — Focus Assistant & Accountability App

Go Grind is a focus-assistant accountability platform that helps users form public, time-boxed focus sessions called "Focus Rooms". Users join live stream-based sessions to work/study together, stay accountable, and boost productivity through public commitment, lightweight moderation, and real-time presence.


## Key features

Below is a breakdown of the product features.

1) Focus rooms & live sessions
	- Public, time-boxed live sessions where participants join a space to work/study together on focused tasks
	- Sessions show a live video or audio stream, participant list, timer, goal, and progress indicators
	- Session history and analytics (session counts, streaks, cumulative focus time)

2) Social accountability
	- Public participant lists and session history to increase commitment and social pressure to stay on task
	- Friends and recommended accountability partners
	- Live activity feeds when friends start Focus Sessions

3) Productivity mechanics
	- Built-in timers
	- Goal setting and post-session check-ins to record accomplishments and next steps

4) Analytics & habit tracking
	- Personal dashboards showing total focus time, streaks, session history and trends
	- Lightweight analytics (weekly focus time, average session length, completion rate)

5) Moderation & safety
	- Host controls (kick participants, restrict joining, approve requests)
	- Set rules for acceptable behavior and enforce community guidelines

6) Private messaging & video calls
	- Private chat and video calls with friends and accountability partners
	- Typing indicators, read receipts, and reply threads for organized conversations


## Tech stack

This project uses modern full-stack JS tooling.

Backend
- Node.js + Express
- MongoDB + Mongoose
- Authentication: jsonwebtoken (JWT) + bcryptjs for passwords
- Uploads: multer for multipart form handling
- Other middleware: cors, cookie-parser, dotenv (env config)
- Chat/streaming integrations: stream-chat and optional video SDKs

Frontend
- React 18 + Vite
- Styling/UI: Tailwind CSS + DaisyUI
- State & data:
  - Zustand for compact client state
  - @tanstack/react-query for server state, caching and mutations
- Routing: react-router
- HTTP: axios
- Streaming/Chat SDKs: stream-chat, stream-chat-react, @stream-io/video-react-sdk

## Where to look in the repo

- Backend entry: `backend/src/server.js`
- Backend controllers: `backend/src/controllers/` (auth, chat, notification, session, space, user)
- Backend models: `backend/src/models/` (User, Space, Session, Notification, FriendRequest)
- Middleware: `backend/src/middlewares/auth.middleware.js`
- Frontend entry: `frontend/src/main.jsx`
- Frontend components: `frontend/src/components/` and pages in `frontend/src/pages/`