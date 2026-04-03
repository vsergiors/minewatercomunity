# 🛠️ Setup — Community Hub

## 1. Abre el SQL Editor en Supabase y ejecuta esto:

```sql
-- ─────────────────────────────────────────────
--  TABLA: profiles  (ya la tienes, no la toques)
--  id, email, name, avatar_url, bio, role,
--  twitter, github, created_at
-- ─────────────────────────────────────────────

-- Asegura que role tenga valor por defecto
ALTER TABLE profiles
  ALTER COLUMN role SET DEFAULT 'user';

-- ─────────────────────────────────────────────
--  EVENTOS
-- ─────────────────────────────────────────────
CREATE TABLE events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  location    text,
  event_date  timestamptz NOT NULL,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE event_attendees (
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

-- ─────────────────────────────────────────────
--  ENCUESTAS
-- ─────────────────────────────────────────────
CREATE TABLE polls (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question   text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  closed     boolean DEFAULT false
);

CREATE TABLE poll_options (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE,
  label   text NOT NULL
);

CREATE TABLE poll_votes (
  poll_id   uuid REFERENCES polls(id) ON DELETE CASCADE,
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (poll_id, user_id)
);

-- ─────────────────────────────────────────────
--  LEADERBOARD
-- ─────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS points integer DEFAULT 0;

-- ─────────────────────────────────────────────
--  GALERÍA
-- ─────────────────────────────────────────────
CREATE TABLE gallery (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text NOT NULL,
  title       text,
  description text,
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  hidden      boolean DEFAULT false
);

-- ─────────────────────────────────────────────
--  TICKETS DE SOPORTE
-- ─────────────────────────────────────────────
CREATE TABLE tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subject     text NOT NULL,
  body        text NOT NULL,
  status      text DEFAULT 'open' CHECK (status IN ('open','in_progress','closed')),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE ticket_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid REFERENCES tickets(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  body       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────
--  WIKI
-- ─────────────────────────────────────────────
CREATE TABLE wiki_pages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  category   text DEFAULT 'General',
  content    text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────
--  SORTEOS
-- ─────────────────────────────────────────────
CREATE TABLE raffles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  prize       text,
  ends_at     timestamptz NOT NULL,
  winner_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE raffle_entries (
  raffle_id uuid REFERENCES raffles(id) ON DELETE CASCADE,
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (raffle_id, user_id)
);

-- ─────────────────────────────────────────────
--  BUZÓN DE SUGERENCIAS ANÓNIMAS
-- ─────────────────────────────────────────────
CREATE TABLE suggestions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body       text NOT NULL,
  status     text DEFAULT 'pending' CHECK (status IN ('pending','reviewed','implemented')),
  created_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────
--  ROW LEVEL SECURITY (básico)
-- ─────────────────────────────────────────────

-- Profiles: lectura pública, edición solo al propio user
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Events: lectura pública; escritura solo admin/owner
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select"  ON events FOR SELECT USING (true);
CREATE POLICY "events_insert"  ON events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);
CREATE POLICY "events_delete"  ON events FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);

-- Event attendees: cualquiera puede apuntarse/borrarse
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ea_select" ON event_attendees FOR SELECT USING (true);
CREATE POLICY "ea_insert" ON event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ea_delete" ON event_attendees FOR DELETE USING (auth.uid() = user_id);

-- Polls
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls_select" ON polls FOR SELECT USING (true);
CREATE POLICY "polls_insert" ON polls FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_select" ON poll_options FOR SELECT USING (true);
CREATE POLICY "po_insert"  ON poll_options FOR INSERT WITH CHECK (true);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv_select" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "pv_insert" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Gallery
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_select" ON gallery FOR SELECT USING (hidden = false OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner')));
CREATE POLICY "gallery_insert" ON gallery FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gallery_update" ON gallery FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);

-- Tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_select" ON tickets FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);
CREATE POLICY "tickets_insert" ON tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tickets_update" ON tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);

ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tr_select" ON ticket_replies FOR SELECT USING (true);
CREATE POLICY "tr_insert" ON ticket_replies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wiki
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_select" ON wiki_pages FOR SELECT USING (true);
CREATE POLICY "wiki_insert" ON wiki_pages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);
CREATE POLICY "wiki_update" ON wiki_pages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);

-- Raffles
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raffles_select" ON raffles FOR SELECT USING (true);
CREATE POLICY "raffles_insert" ON raffles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);
CREATE POLICY "raffles_update" ON raffles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);

ALTER TABLE raffle_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "re_select" ON raffle_entries FOR SELECT USING (true);
CREATE POLICY "re_insert" ON raffle_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Suggestions (anónimas: sin RLS de usuario)
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sug_insert" ON suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "sug_select" ON suggestions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);
CREATE POLICY "sug_update" ON suggestions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','owner'))
);
```

## 2. Configura supabase.js
Abre `supabase.js` y pon tu URL y anon key:
```
const SUPABASE_URL  = 'https://xxxx.supabase.co';
const SUPABASE_ANON = 'eyJ...';
```
Los encuentras en **Supabase → Settings → API**.

## 3. Estructura de archivos
```
index.html      ← Landing pública
login.html      ← Login / registro con Supabase Auth
app.html        ← App completa (requiere sesión)
supabase.js     ← Config anon key + URL
README.md       ← Este archivo
```

## 4. Roles
- `owner` → máximo poder (tú). Cámbialo manualmente en la tabla `profiles`.
- `admin` → puede crear eventos, encuestas, sorteos, gestionar tickets y wiki.
- `user` → rol por defecto para cualquier nuevo registro.

Para hacer a alguien admin/owner:
```sql
UPDATE profiles SET role = 'owner' WHERE email = 'tu@email.com';
```

## 5. Auth en Supabase
Ve a **Authentication → Providers** y activa Email o el que uses.
Asegúrate de tener este trigger para que se cree el perfil automáticamente al registrar:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```
