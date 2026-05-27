-- NUEVAS TABLAS

-- Agremiados
create table if not exists agremiados (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  telefono text,
  correo text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- Destinos (origen + destino + km)
create table if not exists destinos (
  id uuid default gen_random_uuid() primary key,
  origen text not null,
  destino text not null,
  km numeric default 0,
  activo boolean default true,
  created_at timestamptz default now()
);

-- Flotilla
create table if not exists flotilla (
  id uuid default gen_random_uuid() primary key,
  tipo text not null check (tipo in ('sencillo','full')),
  placa_tracto text unique not null,
  placa_gondola1 text,
  m3_gondola1 numeric default 0,
  placa_gondola2 text,
  m3_gondola2 numeric default 0,
  foto_tracto_url text,
  agremiado_id uuid references agremiados(id),
  activo boolean default true,
  ultimo_viaje date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Agregar campos nuevos a viajes
alter table viajes add column if not exists origen text;
alter table viajes add column if not exists destino text;
alter table viajes add column if not exists agremiado_id uuid references agremiados(id);

-- RLS
alter table agremiados enable row level security;
alter table destinos enable row level security;
alter table flotilla enable row level security;

create policy "public_all" on agremiados for all using (true) with check (true);
create policy "public_all" on destinos for all using (true) with check (true);
create policy "public_all" on flotilla for all using (true) with check (true);
