-- Vídeos de cabecera: subidas más grandes que imágenes (bucket `site`).
update storage.buckets
set file_size_limit = 104857600
where id = 'site';
