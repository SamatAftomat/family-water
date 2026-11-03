-- Создание таблиц
create table if not exists users (
  id bigint primary key,
  first_name text not null,
  username text,
  weight_kg int,
  water_goal_ml int default 0,
  diamonds int default 0,
  streak_days int default 0,
  last_water_date date,
  goal_reached_date date, -- Новое поле: когда выполнена норма (для алмазов)
  updated_at timestamp default now(), -- Новое поле: время обновления
  created_at timestamp default now()
);

create table if not exists water_logs (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  amount_ml int not null,
  logged_at timestamp default now()
);

create table if not exists family_links (
  id bigserial primary key,
  requester_id bigint references users(id) on delete cascade,
  receiver_id bigint references users(id) on delete cascade,
  status text default 'pending', -- pending / accepted / rejected
  alias text,
  attempts int default 1, -- Новое поле: сколько раз отправляли запрос
  created_at timestamp default now()
);

-- Индексы
create index if not exists idx_water_logs_user_id on water_logs(user_id);
create index if not exists idx_family_requester on family_links(requester_id);
create index if not exists idx_family_receiver on family_links(receiver_id);