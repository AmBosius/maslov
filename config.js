/* =========================================================
   Подключение к Supabase.

   Два значения из панели Supabase:
     Project Settings → API → Project URL и publishable (anon) key.

   Этот ключ публичный по своей природе — его видно в браузере, это норма.
   Доступ к данным решают политики из supabase/schema.sql.
   Ключ service_role / secret сюда класть НЕЛЬЗЯ: он обходит все политики.

   Пока значения не вставлены, сайт берёт каталог из data/products.json,
   а форма заявки работает в демо-режиме.
   ========================================================= */
window.MASLOV_CONFIG = {
  supabaseUrl: 'ВСТАВЬТЕ_PROJECT_URL',
  supabaseKey: 'ВСТАВЬТЕ_PUBLISHABLE_KEY'
};
