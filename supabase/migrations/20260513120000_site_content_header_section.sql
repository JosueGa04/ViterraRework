-- Página CMS «header»: redes sociales del encabezado global.

alter table public.site_content_sections
  drop constraint if exists site_content_sections_page_chk;

alter table public.site_content_sections
  add constraint site_content_sections_page_chk
  check (
    page in (
      'home',
      'header',
      'contact',
      'services',
      'about',
      'developments',
      'rent',
      'sale'
    )
  );

insert into public.site_content_sections (page, payload)
values ('header', '{}'::jsonb)
on conflict (page) do nothing;
