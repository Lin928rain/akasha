# Akasha

![Akasha](https://github.com/h16nning/akasha/assets/48356881/fa7e08d5-af5d-4d5a-bd1c-3dafb68cc033)

An early project aiming to create a web-based spaced repetition flash card app like anki. View a demo [here](https://akasha.cards).

#### Current state of the project:
- normal / double-sided and cloze cards
- rich text content (html)
- learning algorithm with using fsrs.js (implementation of free spaced repetition scheduler)
- card managing tool (to be improved upon)
- light / dark / system mode

#### What doesn't work (yet)?
- image occlusion
- audio
- today view
- statistics
- spotlight search like feature
- caching for offline usage

#### Goals:
- open source and free
- user-friendly, intuitive design
- fun and rewarding experience
- responsive design optimized for mobile and desktop experience
- single-user, multi-device sync via Supabase (Postgres)
- PWA and caching for offline usage (possibly usage of Notification API)
- customizability

#### Technologies:
- Typescript
- React
- Mantine React
- Supabase (Postgres) for data storage

#### Local development (Supabase)
1) Install Docker and Supabase CLI.
2) From the repo root, run:
   ```bash
   supabase start
   ```
3) Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   using values shown by `supabase status`.
4) Apply migrations:
   ```bash
   supabase db reset
   ```
5) Start the app:
   ```bash
   npm start
   ```

#### Import existing data (optional)
If you exported data to JSON from the app, you can import it with:
```bash
node scripts/import-supabase.mjs path/to/export.json --overwrite
```
Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` before running.

#### Security note
The default RLS policies in `supabase/migrations/0002_rls_policies.sql` allow full access
for the `anon` role (single-user/dev convenience). Tighten these policies before exposing
the instance to the public internet.

#### Motivation
Many students and other learners use spaced repetition tools, mainly Anki. Anki is very useful, but it has an overall offputting user interface that is often unintuitive und doesn't reward the user for learning. Other alternatives are costly or closed source.
If you are interested, you are very welcome to contribute to this project. If you have any questions or suggestions, please go ahead by creating an issue or starting a discussion.

<img width="627" alt="Bildschirmfoto 2024-02-21 um 02 30 53" src="https://github.com/h16nning/akasha/assets/48356881/774fa6fb-0f1c-4d60-8134-4af7cf2c4510">
<img width="916" alt="Bildschirmfoto 2024-02-21 um 02 30 28" src="https://github.com/h16nning/akasha/assets/48356881/ddc6380f-2354-4dda-9928-4ae7cd924b1c">
<img width="612" alt="Bildschirmfoto 2024-02-21 um 02 30 03" src="https://github.com/h16nning/akasha/assets/48356881/bccd9367-381f-4bf2-9052-1b56ed0aca76">
