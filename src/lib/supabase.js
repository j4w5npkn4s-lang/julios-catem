import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://qequpvxotwqtokyfkgkl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcXVwdnhvdHdxdG9reWZrZ2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MzE3NzUsImV4cCI6MjA5NTQwNzc3NX0.chWag-kOkjHwPDOZrdvwAuUm7K2by5dHWgCISjE5YHw',
  {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: { persistSession: true, autoRefreshToken: true }
  }
)
