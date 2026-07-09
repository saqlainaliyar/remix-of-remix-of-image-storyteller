CREATE TABLE IF NOT EXISTS image_jobs (
  uid             text PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id     text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  image_url       text,
  width           integer,
  height          integer,
  render_time_ms  integer,
  webhook_url     text,
  metadata        text,
  transparent     boolean NOT NULL DEFAULT false,
  render_pdf      boolean NOT NULL DEFAULT false,
  modifications   jsonb NOT NULL,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS image_jobs_user_idx ON image_jobs(user_id, created_at DESC);
