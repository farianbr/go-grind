# Kendro

A virtual co-working space. Take a desk, say what you're working on, and work
the block alongside your team, your friends, or whoever else is in the room.
Built for remote companies, small teams, study groups and people working alone.

![The dashboard](docs/screenshots/03-dashboard.png)

---

## What it does

**Your record, then the room.** The dashboard opens with the week's hours and a
year of squares, then who else is at their desk right now, across your teams,
your rooms and your friends, what they're working on and how long they've been
at it.

**Desks and sessions.** A session is a goal, a duration and a running clock.
Solo sessions belong to no room and need no permission, so a brand-new account
is working within thirty seconds of signing up. While it runs you tick off
tasks, take a break, extend the block if you're in flow, and log a line about
how it went when you close it out.

Breaks are subtracted from the clock, so "43 minutes of work" means forty-three
minutes of work, not forty-three minutes of the timer being open.

**Rooms.** Shared spaces with live audio and video. Open rooms admit anyone
instantly; approval rooms queue a request for the host. Hosts get real controls,
approve, reject, remove, post a notice, all enforced on the server rather than
hidden in the UI.

Any member can open a room, not just whoever created it. A team spread across
three timezones should not have to wait for one person to show up first.

Inside a room you get a floor of desks rather than a grid of video tiles. Every
person is a nameplate: who they are, what they're working on, and how long
they've been at it. Video fills the desk when someone turns their camera on, and
the desk shows them when they don't, which is most of the time. Your own clock
and task list sit in a panel beside the floor.

**Conversations that follow the structure.** Every room and every team has its
own channel, created from the database rather than by hand, so joining a room
puts its conversation in your list and leaving takes it away. Direct messages
sit alongside them. A room channel offers a desk; a team channel opens the team;
a direct message starts a call.

**Teams and companies.** Create a team, invite people by email, and give them
private rooms only your members can open. The team page shows who is at their
desk right now, how many hours each person logged this week, and every room the
team runs. Owners and admins manage members; everyone else just works.

Creating a team is the paid capability. **Joining one is always free**, so an
invited employee or classmate never meets a paywall.

**People, not just friends.** The people page leads with your teammates, the
people you actually work with, and keeps the friend graph behind them.

**A record that compounds.** Every finished session fills a square on a
contribution grid. Days are bucketed by *your* local calendar date, so a session
finished at 11pm lands where you'd expect it to.

## Screenshots

**A room session.** Two people at their desks, each showing what they're working
on and how long they've been at it, with your own clock and tasks alongside.
Cameras are optional; the presence is the point.

![A room session](docs/screenshots/05-room-session.png)

| | |
|---|---|
| ![Landing](docs/screenshots/01-landing.png) | ![Pricing](docs/screenshots/02-pricing.png) |
| Landing | Pricing, free for people and paid for companies |
| ![Chats](docs/screenshots/04-chats.png) | ![Room](docs/screenshots/06-room.png) |
| A channel per room and per team | A room: who's at a desk, and the way in |
| ![Session setup](docs/screenshots/10-session-setup.png) | ![Session running](docs/screenshots/11-session-running.png) |
| Working alone: plan the block | The session workspace |
| ![Teams](docs/screenshots/08-teams.png) | ![Team detail](docs/screenshots/09-team-detail.png) |
| Teams you belong to | Presence, rooms, members and invites |
| ![Rooms](docs/screenshots/07-rooms.png) | ![People](docs/screenshots/12-people.png) |
| Rooms you've joined | Teammates first, friends behind them |
| ![Profile](docs/screenshots/14-profile.png) | ![Settings](docs/screenshots/13-settings.png) |
| A profile, with the rooms you share | Settings: profile, plan and appearance |
| ![Notifications](docs/screenshots/15-notifications.png) | |
| Join requests, room notices and nudges | |

<p align="center">
  <img src="docs/screenshots/16-mobile-landing.png" width="200" alt="Landing on mobile">
  <img src="docs/screenshots/17-mobile-dashboard.png" width="200" alt="Dashboard on mobile">
  <img src="docs/screenshots/18-mobile-chats.png" width="200" alt="Conversations on mobile">
  <img src="docs/screenshots/19-mobile-room.png" width="200" alt="A room floor on mobile">
</p>

More in [`docs/screenshots`](docs/screenshots).

## Tech

| | |
|---|---|
| **Frontend** | React 18, Vite, Tailwind v4, DaisyUI 5, TanStack Query, Zustand, React Router 7 |
| **Backend** | Node, Express 4, Mongoose, JWT, bcrypt |
| **Data** | MongoDB (Atlas) |
| **Services** | Stream (chat + video), Nodemailer over Gmail (invites), ImgBB (avatar uploads) |

## Running it

**Requirements:** Node 18+, a MongoDB connection string, and a Stream account
for chat and video.

```bash
# 1. Server
cd backend
cp .env.example .env          # set MONGO_URI, JWT_SECRET_KEY, STREAM_*, IMGBB_API_KEY
npm install
npm run seed:demo             # demo account with a populated streak
npm run dev                   # http://localhost:5000

# 2. Client
cd ../frontend
cp .env.example .env          # set VITE_API_URL and VITE_STREAM_API_KEY
npm install
npm run dev                   # http://localhost:5173
```

The seed creates `demo@kendro.dev` / `000000`, joined to four rooms with about
ten weeks of session history. Re-running it is safe: it replaces the demo's
sessions so the streak stays anchored to today rather than drifting.

### Invite emails

Team invites are emailed through Gmail. Set both variables:

```
GMAIL_USER=you@gmail.com
GMAIL_PASS=your_google_app_password
```

`GMAIL_PASS` must be a Google **App Password**, since Google rejects account
passwords for SMTP. Leave either blank and the app still works: the invite is
created, the toast offers a shareable link instead, and the reason is logged. A
send failure is caught for the same reason, so a mail outage can never stop a
team being built.

### Billing

There is no payment provider wired up. `POST /api/teams/upgrade` grants the Pro
plan directly and is marked in the source as the place a real checkout goes. The
gate itself is real: `createTeam` rejects free accounts with `402`, and every
other team route works regardless of plan.

### A note on cookies

In production the API is deployed separately from the client, so the auth cookie
is `SameSite=None; Secure`, third-party, which Safari's ITP drops. The client
therefore also mirrors the JWT into `localStorage` and sends it as a Bearer
token. That weakens the `httpOnly` guarantee and is documented as such in
[`frontend/src/lib/axios.js`](frontend/src/lib/axios.js); the proper fix is to
serve the API from the client's origin behind a rewrite, after which both the
fallback and the interceptor should go.

## How it's laid out

```
frontend/src
  pages/           routed screens; FocusPage is the session workspace,
                   RoomDetailPage the room, TeamDetailPage the team console,
                   ChatsPage the conversation surface
  components/      LiveNow (presence), ChatList and ChatWindow, CallContent
                   (the room floor) with SessionSidebar (your own desk),
                   the contribution grid, layout and nav
  hooks/           useActiveSession is the single source of truth for
                   "is this person mid-session"
  lib/             axios instance, API client, chat helpers, avatar helpers
backend/src
  controllers/     request handlers, one per domain
  lib/session.js   session lifecycle: break accounting, duration capping,
                   abandonment sweep
  lib/stream.js    Stream tokens plus the room and team channel reconcile
  lib/mail.js      transactional email; degrades to link-sharing when unset
  models/          Mongoose schemas
  scripts/         demo seed
```

Eight ideas carry most of the product.

**Sessions are the unit, rooms are optional.** A `Session` may have a `room` of
`null`. That single nullable field is what separates "sign up and start working"
from "sign up, find a room, request to join, wait for a stranger to approve
you." Everything downstream, the grid, statistics, presence, reads the same
collection either way.

**A room is a floor of desks, not a call.** `CallContent` renders a nameplate
per person, carrying their name, their work topic and a clock since they sat
down, with video filling the desk only when the camera is on. Camera-off is the
common case in co-working, so it gets a real state instead of a black rectangle,
and the tiles are laid out with `auto-fill` rather than viewport breakpoints
because the desk panel takes 384px out of the column those breakpoints assume.

**Presence is one query, not a client-side stitch.** `GET /sessions/live`
resolves everyone you share a team, room or friendship with, then returns their
open sessions with the connection labelled. The dashboard renders it directly,
so it cannot drift from what the team page shows.

**Chat channels are reconciled, not hooked.** `POST /chat/sync` diffs your rooms
and teams against your Stream channels and fixes the difference. Hooking eight
mutation sites instead would mean any one of them failing quietly strands a
member in a channel for a room they had left. The reconcile is idempotent, heals
rooms that predate chat, and makes the database the only source of truth.

**Durations are never trusted from the wire.** `actualDuration` is derived
server-side, has break time subtracted, and is capped at twice the session's own
target. Sessions are only closed by an explicit call, so a dropped connection
would otherwise accrue time indefinitely; a throttled sweep closes anything that
stops sending a heartbeat and flags it `abandoned`, and abandoned rows are
excluded from every aggregate.

**The paywall is one line, in one place.** `createTeam` checks `user.plan`.
Nothing else does. That keeps the free tier honest, since an invited member gets
the whole team experience without an upgrade, and means pricing changes touch a
single function.

**Team rooms are private by construction.** `getAllRooms` only returns rooms
whose `team` is null or one of yours, and `requestToJoinRoom` re-checks
membership before admitting anyone. Visibility and access are enforced
separately, so neither is the only thing between a stranger and a company room.

**One hook owns "in session".** The dashboard, the sidebar and the session page
all read `useActiveSession`, so they cannot disagree. The dashboard used to
offer "take a desk" to someone who already had a session running; now the hero
is replaced by the live session card and the sidebar carries a pulse.
