-- Функция сохранения профиля
create or replace function upsert_user(
  p_id bigint,
  p_first_name text,
  p_username text,
  p_weight_kg int
) returns void language plpgsql volatile as $$
begin
  insert into users (id, first_name, username, weight_kg, water_goal_ml)
  values (p_id, p_first_name, p_username, p_weight_kg, p_weight_kg * 30)
  on conflict (id) do update
    set first_name = coalesce(p_first_name, users.first_name),
        username = coalesce(p_username, users.username),
        weight_kg = coalesce(p_weight_kg, users.weight_kg),
        water_goal_ml = coalesce(p_weight_kg * 30, users.water_goal_ml),
        updated_at = now();
end;
$$;

-- Функция добавления воды со Стриком и Алмазами
-- Strick растёт ТОЛЬКО в день выполнения нормы (goal_reached_date),
-- все даты считаем по Москве, т.к. сервер Postgres живёт в UTC.
create or replace function record_water_log(
  p_user_id bigint,
  p_amount_ml int
) returns void language plpgsql volatile as $$
declare
  v_today date := (now() at time zone 'Europe/Moscow')::date;
  v_goal int;
  v_daily_drunk int;
  v_goal_reached date;
  v_streak int;
begin
  -- Получаем текущие данные
  select water_goal_ml, goal_reached_date, streak_days
  into v_goal, v_goal_reached, v_streak
  from users where id = p_user_id;

  -- Вставляем лог
  insert into water_logs (user_id, amount_ml) values (p_user_id, p_amount_ml);

  -- Считаем, сколько выпито сегодня (московский день)
  select coalesce(sum(amount_ml), 0) into v_daily_drunk
  from water_logs
  where user_id = p_user_id
    and (logged_at at time zone 'UTC' at time zone 'Europe/Moscow')::date = v_today;

  if v_daily_drunk >= v_goal and (v_goal_reached is null or v_goal_reached <> v_today) then
    -- Норма выполнена впервые за день: +1 алмаз и стрик
    if v_goal_reached = v_today - 1 then
      v_streak := coalesce(v_streak, 0) + 1;  -- вчера норма была — стрик растёт
    else
      v_streak := 1;                          -- пропуск дня — стрик начинается заново
    end if;

    update users
      set diamonds = diamonds + 1,
          streak_days = v_streak,
          goal_reached_date = v_today,
          last_water_date = v_today
      where id = p_user_id;

  elsif v_goal_reached is not null and v_goal_reached < v_today - 1 then
    -- Норма не выполнена больше суток — стрик мёртв, обнуляем и в базе
    update users
      set streak_days = 0, last_water_date = v_today
      where id = p_user_id;

  else
    -- Обычная запись воды: на стрик не влияем
    update users set last_water_date = v_today where id = p_user_id;
  end if;
end;
$$;