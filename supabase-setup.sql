-- Ejecutar este SQL en Supabase → SQL Editor

create table if not exists usuarios (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  email text unique not null,
  password_hash text not null,
  rol text not null check (rol in ('admin','contador','aux_contador','checador','supervisor')),
  sede text default 'CDMX',
  color text default '#3B82F6',
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists minas (
  id uuid default gen_random_uuid() primary key,
  nombre text unique not null,
  km_default numeric default 0,
  activa boolean default true
);

create table if not exists estimaciones (
  id text primary key,
  year integer not null,
  descripcion text,
  cliente text,
  km_ruta numeric default 0,
  estado text default 'abierta' check (estado in ('abierta','cerrada')),
  pods jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists viajes (
  id text primary key,
  tipo text not null check (tipo in ('sencillo','full')),
  tracto text,
  eco text,
  gondola1 text,
  gondola2 text,
  m3_1 numeric default 0,
  m3_2 numeric default 0,
  km numeric default 0,
  estimacion_id text references estimaciones(id),
  estado text default 'abierto' check (estado in ('abierto','pendiente_conciliar','en_conciliacion','pendiente_pago','cerrado')),
  material text,
  mina text,
  fecha_salida date,
  hora_salida time,
  fecha_llegada date,
  hora_llegada time,
  operador text,
  foto_ticket_salida boolean default false,
  foto_tracto boolean default false,
  foto_ticket_llegada boolean default false,
  foto_ticket_salida_url text,
  foto_tracto_url text,
  foto_ticket_llegada_url text,
  notas text,
  registrado_por uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists conciliaciones (
  id text primary key,
  estimacion_id text references estimaciones(id),
  descripcion text,
  fecha date,
  estado text default 'abierta' check (estado in ('abierta','cerrada')),
  pod_url text,
  precio_total numeric,
  notas text,
  created_at timestamptz default now()
);

create table if not exists conciliacion_viajes (
  conciliacion_id text references conciliaciones(id) on delete cascade,
  viaje_id text references viajes(id),
  primary key (conciliacion_id, viaje_id)
);

create table if not exists pagos_camionero (
  id uuid default gen_random_uuid() primary key,
  viaje_id text references viajes(id),
  fecha date,
  monto numeric not null,
  parte integer default 1,
  folio text,
  comprobante_url text,
  masivo boolean default false,
  folio_masivo text,
  registrado_por uuid,
  created_at timestamptz default now()
);

create table if not exists configuracion (
  id integer primary key default 1,
  tarifa_cobro numeric default 0,
  tarifa_pago numeric default 0,
  empresa text default 'Julios Catem',
  obra text default 'Obra Veracruz (Tehuantepec)',
  logo_url text,
  check (id = 1)
);

insert into configuracion (id) values (1) on conflict (id) do nothing;

insert into usuarios (nombre, email, password_hash, rol, sede, color)
values ('Administrador', 'admin@catem.mx', 'admin123', 'admin', 'CDMX', '#F59E0B')
on conflict (email) do nothing;

-- Storage bucket para fotos
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict do nothing;

-- RLS Policies
alter table usuarios enable row level security;
alter table viajes enable row level security;
alter table estimaciones enable row level security;
alter table conciliaciones enable row level security;
alter table conciliacion_viajes enable row level security;
alter table pagos_camionero enable row level security;
alter table configuracion enable row level security;
alter table minas enable row level security;

create policy "public_all" on usuarios for all using (true) with check (true);
create policy "public_all" on viajes for all using (true) with check (true);
create policy "public_all" on estimaciones for all using (true) with check (true);
create policy "public_all" on conciliaciones for all using (true) with check (true);
create policy "public_all" on conciliacion_viajes for all using (true) with check (true);
create policy "public_all" on pagos_camionero for all using (true) with check (true);
create policy "public_all" on configuracion for all using (true) with check (true);
create policy "public_all" on minas for all using (true) with check (true);

create policy "fotos_public" on storage.objects for all using (bucket_id = 'fotos') with check (bucket_id = 'fotos');
