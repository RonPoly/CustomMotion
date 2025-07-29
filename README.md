# CustomMotion

# Building a Unified AI-Driven Scheduler: Step-by-Step Guide

## Introduction & Key Features

This guide outlines how to create a unified AI-driven scheduling system that intelligently manages your tasks and calendar. The system will use AI (referred to here as the **Gemini API**) to optimize how tasks are broken down and scheduled. Key features include:

* **Calendar Ingestion:** Connect to your Google Calendar to **ingest** existing events and a “future” task list.
* **Task Metadata Tagging:** **Tag** each task with structured metadata – e.g. estimated duration, deadline, priority, context, required buffer times, and energy profile.
* **Task Chunking:** Automatically **chunk-break** long tasks into manageable sub-tasks (time slots) using AI. For example, a 3-hour task might be split into 3 one-hour chunks if your preference (chunk rule) is 60 minutes.
* **Intelligent Scoring:** **Smart-score** every open time slot on your calendar for each task chunk. Scoring considers task tags, your energy profile (times of day you work best), task dependencies, etc., to determine the best fit for each chunk.
* **Dynamic Rebalancing:** **Rebalance** your upcoming week on the fly. If meetings are added or urgent tasks arise, the system can adjust (reschedule or move) your task chunks to accommodate changes while still meeting all deadlines.
* **What-If Simulations:** **Simulate** schedule changes by inserting hypothetical events (e.g. a new meeting) and see how the schedule adjusts. This helps you explore scenarios without actually committing them.
* **Daily AI Summaries:** **Notify** yourself each day with AI-drafted summaries of your schedule – highlighting what’s on your plate, which tasks are upcoming or delayed, etc.
* **Unified Calendar Feed:** **Fuse** work and personal tasks into one optimized schedule. The system can publish an **.ics calendar feed** that any calendar client (Google Calendar, Outlook, etc.) can subscribe to, so you see the AI-managed schedule alongside other events.
* **Analytics and Insights:** **Analyze** your focus time and task history. The system will track metrics like how often tasks get rescheduled, time spent per tag (e.g. how much time on “deep work” vs “meetings”), etc., and provide AI-generated insights or suggestions for improvement.

These features together provide a smart scheduling assistant that optimizes your time management across personal and work commitments.

## System Architecture Overview

To achieve the above, we will build several layers and components working together:

* **AI Core – Gemini API:** The brain of the system. We’ll use the Gemini API (a hypothetical or actual AI service) to handle complex reasoning: breaking tasks into sub-tasks, scoring time slots, rebalancing schedules, drafting notifications, etc. This involves carefully crafted prompts for each function. *For example, Google’s Gemini API can analyze a set of tasks with deadlines and return an optimized schedule suggestion.* We will design **composite prompts** that supply structured data (tasks, calendar openings, etc.) and ask the AI for JSON-formatted results (for deterministic processing).

* **Backend Orchestrator – Node.js + Express:** A Node.js server (written in TypeScript) will coordinate all parts of the system. It will expose RESTful endpoints (such as `/chunk`, `/score`, `/rebalance`, `/simulate`, `/notify`, `/analytics`) that each implement a piece of the scheduling logic. This single backend service handles requests from the frontend and communicates with the AI core, database, and external APIs.

* **Database – PostgreSQL or SQLite:** A database is needed to persist tasks, tags, user preferences, and scheduling history. We can use a free-tier PostgreSQL instance (for example on Heroku or Railway) or simply SQLite for early development. The data schema will include tables for **Tasks**, **Tags/Metadata**, and **RunHistory** (past scheduling runs and outcomes).

* **Calendar Integration – Google Calendar API:** We will integrate with Google Calendar via OAuth 2.0 to read and write events. This involves setting up a Google Cloud Project and enabling the Calendar API for our app. (Remember to **enable the Google Calendar API** in your Google Cloud project and obtain OAuth credentials.) Using Google’s Calendar REST API, the app will fetch busy slots (existing events) and insert new events (the scheduled task chunks). All OAuth tokens and sensitive data must be stored securely (environment variables or a secure secrets store).

* **Frontend – React + FullCalendar + Tailwind CSS:** The user interface will be a React application. We’ll use **FullCalendar** (a popular JavaScript calendar library with a React wrapper) to display the schedule in an interactive calendar view. Tailwind CSS will provide utility classes for styling. The frontend will allow users to log in via Google OAuth, view their calendar (with AI-scheduled tasks distinguished visually), manage their task list and tags, run “what-if” simulations, and view analytics.

* **Hosting – Vercel and/or Heroku:** We aim to utilize free tiers where possible. The frontend React app can be easily deployed on Vercel (which provides free hosting for hobby projects). The backend can be deployed as serverless functions on Vercel as well (Vercel supports Node.js API routes), or on Heroku’s free tier dynos (if still available). Using Vercel’s serverless functions for the API endpoints is attractive because we can also leverage **Vercel Cron Jobs** for scheduling (see below).

* **Notifications – Slack Webhook or Email:** For daily summaries or alerts, the system can use either Slack or email:

  * *Slack:* If you use Slack, you can set up an **Incoming Webhook** URL (through your Slack app configuration). The backend’s `/notify` endpoint can send an HTTP POST with a JSON payload to this URL to post the daily summary message to your Slack channel.
  * *Email:* Alternatively, using an email API like SendGrid, the `/notify` endpoint could send out an email summary each morning.

* **Cron Jobs – Vercel Cron or GitHub Actions:** To automate tasks like sending daily notifications or periodically running rebalances, we’ll set up scheduled jobs:

  * Vercel has built-in Cron Job support on all plans, which can trigger serverless function endpoints on a schedule using cron expressions. We can configure, for example, a cron job to hit the `/notify` endpoint every weekday at 7am.
  * Alternatively, if not using Vercel’s cron, GitHub Actions can be scheduled (or a small cron daemon on Heroku) to ping the appropriate endpoints at set times.

With these components in place, the architecture will allow tasks to flow from the user (via the frontend) into the database, get processed by the AI through the backend, and end up as events on the user’s calendar, with continuous feedback loops (notifications and analytics).

## Detailed Implementation Steps

Following is a step-by-step breakdown of how to implement this system. Each step builds on the previous, so executing in this order will ensure all dependencies are met.

### Step 1: Environment Setup

1. **Project Repository:** Initialize a new Git repository for your project. Set up two directories or projects – one for the backend (`scheduler-backend`) and one for the frontend (`scheduler-frontend`). Ensure you have Node.js and npm installed on your system.

   * For the backend, initialize a Node.js project with TypeScript. For example, run `npm init -y` and then add TypeScript and Express: `npm install express cors dotenv` and `npm install -D typescript @types/express ts-node`. Set up a basic Express server file (e.g. `src/index.ts`) listening on a port, just to verify the setup.
   * For the frontend, you can bootstrap a React project (using Create React App or Vite or Next.js). If using Create React App: `npx create-react-app scheduler-frontend --template typescript`.

2. **Google API Credentials:** Create a project in **Google Cloud Console** and enable the Google Calendar API for it. Set up OAuth 2.0 credentials for a Web Application.

   * In the Cloud Console, go to *APIs & Services* and **enable the Google Calendar API** (you may use the Quickstart as a guide).
   * Configure the OAuth consent screen (give your app a name, add yourself as test user, etc.), then create OAuth client credentials. As a web app, you’ll need to provide authorized redirect URIs (e.g. `http://localhost:5000/oauth2callback` for testing).
   * Note down the **Client ID** and **Client Secret**. These will be used by the backend to perform the OAuth flow. Also note the **Redirect URI** you set; the backend will handle that callback.
   * During development, you can use a library like `googleapis` for Node.js to simplify auth. In production, ensure you securely store refresh tokens (in DB or encrypted file) to keep access long-term.

3. **Database Provisioning:** Set up your database.

   * For development or a small-scale app, using **SQLite** might be simplest – a single file DB, no server needed. SQLite can be accessed in Node with packages like `better-sqlite3` or via an ORM like Prisma/TypeORM.
   * For a more robust solution or cloud deployment, use **PostgreSQL**. You could use a free tier of a cloud Postgres service or Dockerize a Postgres instance. Define connection strings in your environment config.
   * Run initial migrations or SQL scripts to create the necessary tables (we’ll define the schema in the next step).

4. **Miscellaneous Setup:** Create a `.env` file for environment variables (never commit this to Git). Here you will store things like:

   * `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`
   * Database connection string (if needed), e.g. `DATABASE_URL`
   * Slack webhook URL or SendGrid API key (if using notifications)
   * A session secret if using session management, etc.
   * Configure your Node app to load these (using `dotenv` package).

### Step 2: Define Data Models

Design the data schema for tasks, tags, and history. This helps both in the database design and in structuring data passed to the AI.

* **Task Model:** Each task is an item the user wants to schedule. Fields might include:

  * `id` – primary key
  * `title` – short description of the task.
  * `estimate` – estimated effort in minutes (e.g., 120 for a 2-hour task).
  * `deadline` – due date/time in ISO format (if the task must be done by a certain time).
  * `tags` – JSON or a structured set of fields for metadata like priority, context, etc. (Alternatively, you may have a separate table for tags, but storing a JSON blob of attributes in the task can be simpler).
  * `dependsOn` – (optional) reference to another task’s ID that must be completed first (for task dependencies).

* **Tag Types/Metadata:** Define the taxonomy of tags you’ll use for scheduling logic. These could be enums or reference data:

  * **Priority:** e.g. High, Medium, Low – might affect scoring (higher priority tasks get scheduled earlier).
  * **Type:** category of task (deep work, shallow work, meeting, personal, etc.).
  * **Context:** tags like *“needs 2-hour block”* vs *“can be done in short bursts”*, or location-specific context if relevant.
  * **ChunkRule:** default maximum chunk length for the task (e.g., 60 minutes max at a time, or perhaps a task that must be done all at once vs. can be split).
  * **Buffer:** required buffer time around the task (maybe some tasks need a 10-minute prep or cooldown).
  * **EnergyProfile:** what kind of energy or focus the task needs (e.g., creative vs. administrative) – this can be matched to times of day (if user’s profile says mornings are for creative work, etc.).

  These tag definitions can be stored in a simple table or even just as constants in code and referenced in the `tags` JSON of a task.

* **RunHistory:** This table/log will store snapshots of each scheduling run or adjustments:

  * `timestamp` – when the schedule was generated or updated.
  * Details of slot assignments (which task chunk was assigned to which calendar slot).
  * Scores or ranking info (possibly store the scoring matrix for that run or at least the final score total).
  * Moves or changes – if tasks got rescheduled from a previous plan, note that.
  * This data is useful for analytics (e.g., “how often do tasks move?”, “did we meet all deadlines?” etc.). It can also help the AI (providing context of past runs if needed for better suggestions).

  Designing RunHistory might be iterative; you can start with just logging JSON blobs of the schedule and then refine for specific metrics.

**Implementation:** If using an ORM like Prisma, define your schema in the schema file and run `prisma migrate`. For raw SQL, write a script to create tables and run it on your DB. Make sure to also include a table for storing user info (if multi-user) and OAuth tokens (to store Google refresh tokens, etc., unless you use something like Google’s token JSON file approach for single-user).

### Step 3: Build the Orchestrator Service (Express Backend)

Now, build the core backend service step by step. We will create an Express server that exposes several API endpoints. Each endpoint corresponds to one of the major functions of our scheduler. Implement and test them in a logical order (since some depend on others):

1. **`POST /chunk` – Task Chunking:** This endpoint takes a list of tasks as input (likely from the database or provided by the user via the frontend) and returns a set of **chunks** (sub-tasks) for those tasks. It will send a prompt to the Gemini AI asking it to break down tasks into chunks.

   * *Input:* The request could include a specific task or the entire task list. Likely, you’ll use all tasks that are not yet scheduled and need chunking.
   * *AI Logic:* For each task, determine how many chunks to split it into based on its `estimate` and `chunkRule` tag. For example, a task estimated at 120 minutes with a chunkRule of 60 minutes might be split into two 60-minute chunks. The AI can decide chunk durations and maybe even suggest titles or descriptions for each sub-task.
   * *Prompt Example:* You might send something like:

     ```text
     "Break these tasks into sub-tasks no longer than {chunkRule} minutes. Output as JSON: [{title:..., duration:..., tags:...}, …]."
     ```

     The AI (Gemini) would return JSON like `[{ "title": "Task1 Part 1", "duration": 60, "tags": {...}}, ...]`. You then parse this and return it from the endpoint.
   * *Output:* The API response is the list of chunk objects (which can be stored or passed to the next step).

   Implement this first because other steps (scoring, scheduling) need chunk data. Test it with sample tasks and ensure the AI responds with valid JSON.

2. **`POST /score` – Slot Scoring:** This endpoint evaluates which calendar slots are good for which chunks. Essentially, given a set of available time slots (holes in the calendar) and a list of task chunks (from `/chunk`), it returns a **score matrix** or list of scores for placing each chunk in each slot.

   * *Input:* A payload containing:

     * A list of free time slots (each with a start and end time) for the scheduling window (e.g., the next 7 days).
     * A list of task chunks (each with duration and tags).
   * *AI Logic:* For each slot and chunk pair, the AI will consider the chunk’s tags (priority, type, etc.) and the slot’s context (time of day, length, proximity to deadlines) and assign a **suitability score** (e.g., 1 to 10). It might also suggest any needed buffer or adjustments (e.g., “Task needs a 15-min break before this slot because it follows another focus session”).
   * *Prompt Example:* For each slot–chunk pair (or batch of pairs), something like:

     ```text
     "Given a time slot from {start} to {end} and a task with tags {priority:X, energy:Y, ...}, rate how suitable this slot is for the task on a scale of 1-10. Explain if any buffer is needed before or after."
     ```

     The AI could return a score and rationale. We might simplify and have the AI output just a numeric score for each pair, or a list of recommended slot assignments ranked by score.
   * *Output:* The response might be structured as a list of `{ slotId, chunkId, score }` triplets or a nested structure mapping slots to chunk scores. The backend will use these scores in the next step (rebalance).

   This step depends on `/chunk` having been run to supply chunks, and also on having the free slots from the calendar (which requires calendar integration from step 5). For now, you can mock some free slots for testing or integrate calendar reading first.

3. **`POST /rebalance` – Schedule Optimization:** This is the core scheduling algorithm that produces the final calendar plan. It takes all tasks (with chunks and scores) plus the calendar availability and produces an **assignment of chunks to specific time slots**.

   * *Input:* All unscheduled task chunks, all available free slots in the upcoming week (or scheduling horizon), and possibly existing schedule (to know what’s already placed).
   * *AI or Logic:* You might attempt a custom algorithm here (this starts to look like a constraint optimization problem). However, the prompt suggests using AI here as well: asking Gemini to “optimize the upcoming week” given the scores and constraints.
   * **Constraints to respect:** No two chunks overlapping, tasks must be done before their deadline, respect dependencies (if task B depends on A, A’s chunks must be scheduled before B’s), and perhaps limit per-day workload as per user’s work hours.
   * *AI Prompt Example:*

     ```text
     "You are an assistant that schedules tasks. We have these open slots (with times) and these task chunks (with durations, deadlines, priorities, and scores for each slot). Optimize the schedule to maximize total score (i.e., put each chunk in its highest-scoring slot), ensure all deadlines and dependencies are met, and do not double-book any slots. Output the schedule as JSON: [{chunkId, slotStart, slotEnd, slotDate}, …]."
     ```

     The AI would then assign chunks to slots. If some tasks can’t fit, it should flag that (or leave them unassigned).
   * *Output:* A list of scheduled chunks with the specific time slot each is placed in. This can be used to create calendar events.

   After getting the AI’s suggestion, the backend can adjust or validate it (e.g., double-check no overlaps, all chunks placed). This endpoint essentially performs what a user would perceive as “scheduling my tasks for the week”.

4. **`POST /simulate` – What-If Simulation:** This endpoint helps in exploring changes. It could accept a hypothetical event or change (like “what if I add a 1-hour meeting tomorrow at 3pm?”) and then internally perform a scheduling run to show the impact.

   * *Input:* The hypothetical scenario – e.g., an event (with time and duration) to add, or a task marked as dropped, etc.
   * *Process:* The handler will copy the current state of tasks and schedule, apply the hypothetical change (e.g., remove that free slot or mark some chunk as moved), then call the earlier logic (it might call `/rebalance` internally or directly invoke the scheduling function) to get a new schedule.
   * *Output:* The result could be a diff of what changed from the current schedule: e.g., “Task A moved from Tuesday 10am to Wednesday 2pm because Tuesday 10am was taken by the new meeting.”
   * Essentially, this is a convenience endpoint that reuses the chunking/scoring/rebalancing logic to show consequences of a change without actually committing it to the database or calendar.

5. **`GET /notify` – Daily Summary Notification:** This endpoint generates the content for daily notifications (and can also directly send them).

   * *Process:* It will fetch the tasks/chunks scheduled for the next day (say, tomorrow) from the database or via the last run. It may also fetch any important changes (e.g., tasks due tomorrow, or any tasks that slipped).
   * *AI Draft:* Using the AI, you can create a nicely worded summary. For example:

     ```text
     "Summarize my schedule for {date}. Include first the tasks and meetings for that day in order, then mention any deadlines coming up or tasks that were rescheduled. Be brief and motivational in tone."
     ```

     The AI could produce a short paragraph: “Tomorrow you have 3 focus sessions: finish Project X in the morning, Team Meeting at 1pm, and review documents in the afternoon. You’re on track with all deadlines. Good luck!”
   * *Sending:* If using Slack, format the AI text into a JSON payload and POST to the Slack webhook URL. If email, send via SendGrid API.
   * This endpoint can be triggered by a cron job every day at a set time. (For testing, you can hit it manually and see the console or logs rather than actually sending messages.)

6. **`GET /analytics` – AI Insights and Analytics:** This endpoint aggregates data from the RunHistory and possibly user’s task completion stats to provide insights.

   * *Process:* Query the RunHistory and tasks to compute some metrics. For example:

     * Total focus time scheduled this week vs. meetings.
     * Number of times tasks were moved/rescheduled.
     * Time spent per tag category (e.g., 10 hours on coding, 5 on emails).
     * How far ahead tasks are being scheduled (average slack before deadlines).
   * *AI Insights:* Feed these metrics or raw data to the AI with a prompt to “give some insight or tips”. For instance:

     ```text
     "Here are some stats from the past month: (list stats). Provide 2-3 insights or observations, and any suggestions to improve productivity or balance."
     ```

     The AI might respond with things like: “You spend a lot of time on meetings in the afternoon when your energy is low; consider scheduling focus work in the mornings. Also, tasks tagged `learning` are consistently postponed – maybe allocate dedicated time for learning.”
   * *Output:* The endpoint returns these insights (and possibly the raw data or charts). The frontend can display them in a dashboard.

Implement each of these endpoints in the order given. Start with `/chunk` and test it thoroughly (since it underpins the rest). Then move to `/score`, etc. By the time you implement `/analytics`, you will have a lot of data structures and past data to work with.

Throughout this process, maintain good logging and error handling. For example, if the AI returns an invalid JSON or a poor suggestion, handle it (maybe retry or fall back to a basic rule). Also ensure each endpoint validates inputs.

### Step 4: Integrate the AI (Gemini API and Prompt Design)

Integrating the AI means using the Gemini API (or an equivalent LLM service) in each of the above endpoints to perform the heavy reasoning. Key considerations:

* **API Access:** Obtain access to the Gemini API (assuming it’s available – if not, you might use OpenAI’s GPT-4 or another model for now). You’ll need an API key or credentials. Set up a client in your backend to call the AI service with prompts and get responses.

* **Prompt Templates:** Define prompt templates for each AI-powered function. As noted, some examples:

  * **Chunking Prompt:** `"Break these tasks into sub-tasks no longer than {chunkRule} minutes each. Output a JSON array of chunks with fields title, duration, and any tags."`
  * **Scoring Prompt:** `"Evaluate the suitability of scheduling a task with attributes {tags} in the time slot {slot_start} to {slot_end}. Return a score 1-10 and a short reason."`
  * **Rebalancing Prompt:** This one might be more complex. You could feed the model a structured summary of all slots and tasks, or possibly format it as an optimization problem. For example: `"You have these slots (list dates/times) and these task chunks (with deadlines and scores for each slot). Assign each chunk to a slot (or mark unassigned) to maximize total score, ensuring no overlapping and deadlines met. Output as JSON of assignments."`
  * **Simulation Prompt:** Similar to rebalancing, but you might prepend the hypothetical change description: `"Assume we add an event on Monday 3-4pm. Recalculate the schedule adjustments."`
  * **Notification Prompt:** `"Summarize the following schedule for tomorrow: (list tasks). Mention start times and any due items. Be concise."`
  * **Analytics Prompt:** As described, feed stats and ask for insights.

* **Function Calling or Tools:** If the Gemini API supports function calling or tool usage, you could set up the prompt such that the AI returns a structured object directly (which it seems we are doing by asking for JSON output). Make sure to instruct the model clearly to output JSON without extra commentary, so parsing is straightforward.

* **Testing AI Outputs:** For each prompt, test with sample data. Adjust the wording of prompts if the model output isn’t as expected. For example, if the chunking output isn’t well-formatted, you may need to be more explicit in instructions or provide an example in the prompt.

* **Rate Limits & Performance:** Keep in mind API call limits. Chunking and scoring might involve many calls (if done per task or per slot). You could batch some operations to minimize calls, but the prompts could become very large. Alternatively, use simpler heuristic code for scoring and reserve the AI for more complex decisions (depends on your budget and the API’s pricing).

By the end of this step, you should have your backend endpoints calling the AI service where appropriate and handling the responses. With `/chunk`, `/score`, and `/rebalance` now implemented using Gemini API calls, the “AI core” of your scheduler is functional.

### Step 5: Calendar Integration (Google Calendar API)

Next, connect the scheduler with the user’s actual calendar:

* **OAuth Flow:** Implement Google OAuth in the backend:

  * Add an endpoint like `GET /auth/google` that redirects the user to Google’s OAuth consent screen. Scopes needed are primarily `https://www.googleapis.com/auth/calendar` (for read/write access to calendar events).
  * Google will redirect back to your specified callback (e.g. `/auth/callback`), which you handle by exchanging the authorization code for tokens. The `googleapis` Node library can simplify this. Obtain the `access_token` and `refresh_token` and store them (likely in your database associated with the user).
  * Once authenticated, the backend can use these tokens to make Calendar API calls on behalf of the user.

* **Fetching Free Slots:** To know where tasks can be scheduled, fetch the user’s busy times:

  * The Google Calendar API provides a `freebusy.query` method, where you supply a time range and it returns busy intervals. You could use that, or simply list all events in the user’s calendar for the next X days and invert the times.
  * For simplicity, you might fetch events via `events.list` (for primary calendar and possibly any other calendars the user wants considered) for the window (say next 7 days). Then compute the gaps between events during the user’s working hours each day.
  * These gaps (holes) become the **candidate slots** that the `/score` and `/rebalance` logic will fill with task chunks.
  * Consider user preferences for work hours or “do not schedule” times (maybe store in settings – e.g., only schedule between 9am-5pm on weekdays).

* **Creating Events for Task Chunks:** Once `/rebalance` produces a schedule (list of chunk assignments), the system can create calendar events for each chunk:

  * Choose which calendar to add tasks to. It could be the primary calendar, or you might create a new secondary calendar (e.g., “AI Scheduled Tasks”) so that all inserted events are in one place (this can make management easier, and user can hide/show them).
  * Use the Calendar API’s `events.insert` to create events. Provide details like start time, end time, title (perhaps the task title or “Focus: \[Task Name]”), and maybe a description or special tag (e.g., add a label like “#AISchedule” so they are identifiable).
  * You might also color-code these events via the API (Google Calendar allows setting an event colorId) to distinguish from other events.

* **Updating and Deleting Events:** On subsequent rebalances, you’ll need to update the calendar:

  * The system should keep track (in DB) of which calendar event corresponds to which task chunk (store the event ID from Google when you create it, alongside the task chunk in the DB).
  * If a chunk gets moved, update that event’s time via `events.update`.
  * If a chunk is removed (task cancelled or rescheduled outside the window), delete the event.
  * Handle edge cases like events moved by the user manually on the calendar – if that happens, your system might get out of sync. (One way to mitigate is listen to calendar change notifications via webhooks, but that’s advanced. Initially, you might assume the user doesn’t manually move the AI events.)

* **ICS Feed Publishing:** Provide an .ics feed of the schedule as an alternative to direct API integration:

  * Not all users will want to fully grant edit access to their calendar. An .ics feed can be subscribed to read-only.
  * Using a library like **ical-generator** in Node, you can generate an iCalendar feed string from the scheduled tasks. Essentially, you create a calendar, add events (with start/end times, summary, etc.), and serve that `.ics` content at a URL (maybe an endpoint like `/calendar.ics`).
  * The user can copy that URL and subscribe in Google Calendar or any client (Google updates subscribed ICS feeds periodically, e.g., every few hours).
  * Keep in mind that an ICS feed is public if someone has the URL – you might include a secret token in the URL to obscure it. (e.g., `/calendar.ics?token=LONG_RANDOM`).
  * This is optional since we already integrate via API, but it’s a nice feature for broader compatibility.

At this stage, your system can read the user’s busy schedule and add new events for tasks. Test this end-to-end: create a dummy task via the frontend or a script, run the chunk/score/rebalance, then verify on Google Calendar that the events show up in the right slots.

### Step 6: Frontend Setup & Features

Develop the React frontend to allow user interaction with all these features:

* **Login Page:** The first screen should allow the user to authenticate with Google. This could be a simple button “Sign in with Google” which hits your backend `/auth/google` endpoint (from Step 5). Once logged in (you might manage a session or JWT to keep the user logged in), redirect to the main dashboard.

* **Dashboard (Calendar View):** This page will display the unified calendar:

  * Use the FullCalendar React component to render events. FullCalendar can be fed an array of events (with start, end, title, etc.). Fetch the events from your backend (either from your DB or directly from Google Calendar API if easier). Possibly, your backend could have an endpoint like `/events` to list all scheduled chunks plus any other calendar events.
  * Show both the AI-scheduled tasks (maybe in one color) and the user’s other calendar events (in another color). FullCalendar supports custom rendering or classes per event – you can mark events coming from our system distinctly.
  * The calendar should be interactive to some extent – e.g., clicking on an AI task event could show details (task name, tags, etc.), maybe allow deletion or editing.

* **Task Manager Page:** A CRUD interface for tasks and their tags:

  * A form to create a new task (fields: title, estimate, deadline, priority, etc.). Allow adding tasks to a list.
  * Display the list of tasks (perhaps those not yet completed). Each item could have an “Auto-Chunk” button or an option to trigger scheduling for that task.
  * You might not chunk tasks one by one (it’s usually done collectively), but you could allow a user to request chunking for a specific task if they just entered a big one.
  * Also allow editing tasks, marking dependencies (maybe a dropdown to select another task that must come first), etc.
  * **Tag Manager:** If you want, include a section to manage tag definitions (like if the user can define custom contexts or energy profiles). This could be a simple static list for now.

* **What-If Simulator UI:** A place where the user can add a hypothetical event or drag things around to see impact:

  * This could be part of the calendar interface – e.g., a button “simulate” that toggles a mode. In simulate mode, the user could drag an event on the calendar or add a new event (not actually saved) and then the frontend calls the `/simulate` endpoint to get a provisional revised schedule. You’d then visually show (perhaps highlight changes on the calendar).
  * Or simpler: a form that asks “If I schedule an event on \[date/time] of \[duration], what happens?” After submission, call `/simulate` and then show a text summary of changes or a temp calendar overlay.

* **Analytics Dashboard:** A page showing charts and stats:

  * You might use a charting library (like Chart.js or Recharts) to plot data like weekly focus time vs meetings, tasks completed vs deferred, etc. The data comes from the backend `/analytics` endpoint.
  * Also display the AI-generated insights (from `/analytics` endpoint) in a panel, perhaps as a list of bullet-point tips or observations.
  * Over time, as more data accumulates, this page becomes more useful. Initially, you might just have placeholders.

* **Settings Page:** Allow the user to adjust preferences:

  * Working hours (e.g., do not schedule outside 8am-6pm).
  * Preferred “focus times” or energy profile configuration (maybe they say “I’m a morning person” and you map that in tags).
  * Notification preferences (Slack webhook URL input or email address for summaries, what time to send daily summary).
  * Provide the unique ICS feed URL if they want to subscribe in external calendars.

* **General UI/UX:** Use Tailwind CSS to style forms and layout quickly. Ensure mobile-friendliness if needed (FullCalendar has responsive settings, or you may restrict to desktop use). Make the interface intuitive: e.g., on the dashboard, tasks that are not scheduled yet could be listed on the side as “unscheduled tasks” that the AI will place.

As you build the frontend, you’ll integrate it with the backend API:

* Use Axios or fetch to call endpoints like `/chunk`, `/rebalance`, etc., when the user triggers actions (like an “Optimize Schedule” button which calls your backend to run chunk/score/rebalance and then refreshes the calendar view).
* Handle loading states and errors (e.g., if the AI service fails, inform the user and perhaps retry).

### Step 7: Deployment, Notifications, and Cron Jobs

With both backend and frontend functional, prepare to deploy and set up automation:

* **Deploy Frontend on Vercel:** If using Vercel, simply push the frontend project to a Git repository (like GitHub) and connect it to Vercel. Set environment variables in Vercel for any config the frontend needs (though mostly the frontend will just talk to the backend).

* **Deploy Backend:** You have a couple of options:

  * **Vercel Serverless:** You can port the Express app to Vercel’s serverless functions. Vercel supports creating API routes in a Next.js project, or deploying a standalone serverless function. This might require refactoring – each endpoint becomes its own function. Ensure your Google API credentials and other secrets are set in Vercel.
  * **Heroku or Others:** Deploy the Node app to Heroku (which at one time had a free tier) or another service like Railway or Render. Ensure the OAuth redirect URI matches the deployed URL.
  * **CORS:** If frontend and backend are on different domains, enable CORS in the backend (using the cors middleware, which you likely did in setup).

* **Set Up Cron Jobs:** Finally, configure scheduled jobs for daily notifications and periodic rebalancing:

  * In Vercel, you can add a cron job in `vercel.json` (or via their dashboard) to call, say, `/api/notify` every day at 7:00 AM. Cron jobs on Vercel trigger an HTTP GET to the specified path on your deployed app. For example, schedule `0 7 * * *` to hit the notify endpoint each morning.
  * If using GitHub Actions instead, create a workflow with a `cron:` schedule, and in the job have it curl your endpoint.
  * You might also schedule `/simulate` or `/rebalance` to run maybe every hour or so to continuously keep the schedule updated. However, automatic rebalancing might not be desired too frequently – maybe only trigger when an external change is detected (which could be a future improvement using Google Calendar push notifications).

* **Zero-Cost Considerations:** All components were chosen to fit free tiers:

  * Vercel’s hobby tier and GitHub Actions are free. The Google Calendar API has a free quota sufficient for moderate use.
  * Slack webhooks are free to use. SendGrid has a free tier for low-volume emails.
  * The main cost could be the AI API (Gemini or GPT-4) usage – monitor this and perhaps only run heavy AI calls when needed (e.g., don’t re-chunk tasks every minute unnecessarily).

* **Logging & Monitoring:** Add logging for cron triggers and important events (like “Scheduled task X at time Y” or “Daily summary sent”). This can be as simple as console logs visible in Vercel’s function logs or Heroku logs. For more robust monitoring, integrate a logging service or at least log to a file/DB for later review if something goes wrong.

## Development Order and Dependency Management

To avoid running into missing components during development, follow this linear build order (each step assumes previous ones are done):

1. **Environment & OAuth Setup:** Get your Google OAuth and basic server running *first*. Without OAuth, you can’t fetch or write calendar events, so set that up and test a simple auth flow early.
2. **Database & Models:** Design and create your database tables and data access code (either raw SQL queries or set up an ORM). This underpins tasks, tags, etc., which all other steps use.
3. **`/chunk` Endpoint (AI Chunking):** Implement the chunking logic and ensure you can get AI output. This is foundational for scheduling.
4. **`/score` Endpoint (Slot Scoring):** Once you have chunks and can get free slots (you might hard-code some free slots for initial testing), implement scoring. It will use the output of chunk, so build in that order.
5. **`/rebalance` Endpoint (Scheduling):** Develop the scheduling optimizer, which uses both chunk results and scores. By now, you can test the trio: given tasks -> chunks -> scores -> schedule.
6. **Calendar Helpers (API Integration):** Now write the code to connect to Google Calendar – fetching events (to produce free slots) and inserting/updating events with the schedule from `/rebalance`. Test reading the calendar and writing a test event to ensure auth is working.
7. **Task Chunk Insertion Script:** With calendar write ability in place, create a script or function that ties it together: calls `/chunk`, `/score`, `/rebalance` in sequence, then writes the resulting schedule to Google Calendar. This can be triggered via an API endpoint or a manual run. This essentially “publishes” the AI schedule to the calendar.
8. **Frontend: Login & Basic Dashboard:** Implement the Google login flow on the frontend and set up the calendar view to show events. At first, just display the user’s Google Calendar events to ensure the connection works (you can have an endpoint on backend that proxies Google events to the frontend).
9. **Task Manager UI:** Build the interface to add/edit tasks and tags. Integrate it with the backend (e.g., a form that sends a POST to a `/tasks` endpoint you create). Include a way to invoke the chunking for new tasks – e.g., a button “Schedule Tasks” that calls the backend to run the chunk/score/rebalance, then refreshes the calendar display.
10. **What-If Simulator UI:** Create a UI element to test schedule changes. This could be a small form as discussed or an interactive mode on the calendar. Hook it up to call the `/simulate` endpoint and then display the returned diff or temporary schedule.
11. **Notifications (Cron & /notify):** Set up the cron job (or a manual trigger button for testing) to call your `/notify`. Ensure that the notify endpoint composes the message correctly. Test with a Slack webhook (it’s straightforward: Slack will immediately show the message if it succeeds).
12. **Analytics UI & /analytics:** Populate the RunHistory with some data by doing a few schedule runs. Then build the analytics endpoint to compute some aggregates, and the frontend page to display them. This can be one of the last pieces since it’s not critical to core functionality.
13. **ICS Feed Generation:** Implement the generation of the .ics feed (if you choose to). This might be an Express route like `/feed.ics` that calls a function to build the calendar file from all future scheduled events in the DB. Test subscribing to it in a calendar client.
14. **Polish and Error Handling:** Finally, go through the app and handle edge cases:

    * Better error messages from AI output issues.
    * What if a task can’t be scheduled (no available slot before deadline)? The AI or your logic should mark it as unscheduled; ensure the user is alerted (maybe in the daily summary or an icon on the task list).
    * Security: ensure that API endpoints that modify data check the user’s identity (since we use Google OAuth, maybe use the Google account as the user ID in your system).
    * Optimize performance: e.g., cache the AI results if running the same request again, etc., if needed.

Following this sequence will prevent situations like calling the scoring function before chunking exists, or writing to calendar before having auth ready. Each step builds on the previous. By the end, you’ll have a fully functional AI-driven scheduler.
