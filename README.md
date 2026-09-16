# sport-tracker

## Database migrations

Apply the SQL files in `supabase/migrations` in filename order whenever a new
migration is added. Migration `0002_custom_activity_types.sql` enables custom
calendar activity types and creates their row-level-security policy.

For the hosted Supabase project, use the CLI so the remote migration history is
kept in sync:

```sh
npx supabase init
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
```

`supabase migration up` without `--linked` belongs to the local-development
workflow. Before the first remote push, inspect the dry run: if it proposes
`0001_init.sql` even though those tables already exist remotely, mark that
baseline as applied with `npx supabase migration repair --status applied 0001`,
then repeat the dry run and push.

## Strava OAuth

The callback URL is derived from the current request origin: localhost in
development and the public site domain in production. In the Strava API
settings, set the Authorization Callback Domain to the production hostname
only (for example `sport.jacquatjonathan.ch`, with no protocol or path).
