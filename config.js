/* =========================================================
   Подключение к Supabase.

   Два значения из панели Supabase:
     Project Settings → API → Project URL и anon (publishable) key.

   Этот ключ публичный по своей природе — его видно в браузере, это норма.
   Доступ к данным решают политики из supabase/schema.sql.
   Ключ service_role / secret сюда класть НЕЛЬЗЯ: он обходит все политики.

   Пока значения не вставлены, сайт берёт каталог из data/products.json,
   а форма заявки работает в демо-режиме.
   ========================================================= */
window.MASLOV_CONFIG = {
  supabaseUrl: 'https://qkmpkehcsrpowjnqtuca.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrbXBrZWhjc3Jwb3dqbnF0dWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNjA0MDMsImV4cCI6MjEwNTczNjQwM30.70XKC18DHosNct6QsGVLqOu7O5m0-bCqcrm70ZVR6PU'
};
