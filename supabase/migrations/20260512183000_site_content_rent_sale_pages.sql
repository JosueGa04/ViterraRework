-- Añade páginas editables «Renta» y «Venta» (listados) al CMS del sitio.

alter table public.site_content_sections
  drop constraint if exists site_content_sections_page_chk;

alter table public.site_content_sections
  add constraint site_content_sections_page_chk
  check (
    page in (
      'home',
      'contact',
      'services',
      'about',
      'developments',
      'rent',
      'sale'
    )
  );
