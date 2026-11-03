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
create or replace function record_water_log(
  p_user_id bigint,
  p_amount_ml int
) returns void language plpgsql volatile as $$
declare
  v_today date := current_date;
  v_last_date date;
  v_goal int;
  v_daily_drunk int;
  v_goal_reached date;
begin
  -- Получаем текущие данные
  select last_water_date, water_goal_ml, goal_reached_date 
  into v_last_date, v_goal, v_goal_reached
  from users where id = p_user_id;

  -- Вставляем лог
  insert into water_logs (user_id, amount_ml) values (p_user_id, p_amount_ml);

  -- Считаем, сколько выпито сегодня
  select coalesce(sum(amount_ml), 0) into v_daily_drunk
  from water_logs where user_id = p_user_id and logged_at::date = v_today;

  -- Логика Стрика
  if v_last_date is null or v_last_date < v_today - 1 then
    -- Если давно не пили, сбрасываем на 1
    update users set streak_days = 1, last_water_date = v_today where id = p_user_id;
  elsif v_last_date = v_today - 1 then
    -- Если пили вчера, увеличиваем
    update users set streak_days = streak_days + 1, last_water_date = v_today where id = p_user_id;
  else
    -- Если уже пили сегодня, просто обновляем дату (стрик не трогаем)
    update users set last_water_date = v_today where id = p_user_id;
  end if;

  -- Логика Алмазов (только 1 раз в день, если норма выполнена)
  if v_daily_drunk >= v_goal and (v_goal_reached is null or v_goal_reached != v_today) then
    update users set diamonds = diamonds + 1, goal_reached_date = v_today where id = p_user_id;
  end if;
end;
$$;