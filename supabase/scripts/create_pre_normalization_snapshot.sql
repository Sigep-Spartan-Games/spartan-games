-- One-time safety snapshot for the 2026-09-09 normalization release.
-- This schema is intentionally outside the Supabase API's exposed schemas.

begin;

create schema release_backup_20260909_pre_normalization;
revoke all on schema release_backup_20260909_pre_normalization from public, anon, authenticated;

create table release_backup_20260909_pre_normalization.backup_manifest (
  source_schema text not null,
  source_relation text not null,
  backup_relation text not null,
  row_count bigint not null,
  captured_at timestamptz not null default clock_timestamp(),
  primary key (source_schema, source_relation)
);

do $$
declare
  source_table record;
  copied_rows bigint;
begin
  for source_table in
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  loop
    execute format(
      'create table release_backup_20260909_pre_normalization.%I as table %I.%I',
      source_table.table_name,
      source_table.table_schema,
      source_table.table_name
    );

    execute format(
      'select count(*) from release_backup_20260909_pre_normalization.%I',
      source_table.table_name
    ) into copied_rows;

    insert into release_backup_20260909_pre_normalization.backup_manifest (
      source_schema,
      source_relation,
      backup_relation,
      row_count
    ) values (
      source_table.table_schema,
      source_table.table_name,
      source_table.table_name,
      copied_rows
    );
  end loop;
end;
$$;

create table release_backup_20260909_pre_normalization.storage_buckets as
select *
from storage.buckets
where id = 'submission-proofs';

insert into release_backup_20260909_pre_normalization.backup_manifest (
  source_schema,
  source_relation,
  backup_relation,
  row_count
)
select
  'storage',
  'buckets',
  'storage_buckets',
  count(*)
from release_backup_20260909_pre_normalization.storage_buckets;

create table release_backup_20260909_pre_normalization.storage_objects as
select *
from storage.objects
where bucket_id = 'submission-proofs';

insert into release_backup_20260909_pre_normalization.backup_manifest (
  source_schema,
  source_relation,
  backup_relation,
  row_count
)
select
  'storage',
  'objects',
  'storage_objects',
  count(*)
from release_backup_20260909_pre_normalization.storage_objects;

create table release_backup_20260909_pre_normalization.schema_migrations as
select * from supabase_migrations.schema_migrations;

insert into release_backup_20260909_pre_normalization.backup_manifest (
  source_schema,
  source_relation,
  backup_relation,
  row_count
)
select
  'supabase_migrations',
  'schema_migrations',
  'schema_migrations',
  count(*)
from release_backup_20260909_pre_normalization.schema_migrations;

create table release_backup_20260909_pre_normalization.catalog_functions as
select
  p.oid::regprocedure::text as identity,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';

create table release_backup_20260909_pre_normalization.catalog_views as
select schemaname, viewname, definition
from pg_views
where schemaname = 'public';

create table release_backup_20260909_pre_normalization.catalog_policies as
select *
from pg_policies
where schemaname in ('public', 'storage');

create table release_backup_20260909_pre_normalization.catalog_triggers as
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema in ('public', 'storage');

revoke all on all tables in schema release_backup_20260909_pre_normalization
from public, anon, authenticated;

commit;
