-- Cabeceras con vídeo: subidas más grandes (p. ej. MP4 corto HD).
-- Si ya aplicaste 20260512194500, esta migración sube de nuevo el tope.
-- Alternativa sin CLI: en Supabase → Storage → bucket «site» → límite de tamaño, o ejecutar este UPDATE en el SQL Editor.
update storage.buckets
set file_size_limit = 524288000
where id = 'site';
