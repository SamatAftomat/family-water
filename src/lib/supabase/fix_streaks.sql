-- Пересчёт стрика из истории water_logs.
-- Старое правило в БД увеличивало streak_days за ЛЮБУЮ запись воды,
-- поэтому у многих пользователей счётчик завышен и не совпадает с
-- приложением (там стрик считается по выполненной норме).
-- Новое правило: стрик = серия дней подряд, в которые выполнена дневная норма.
-- Запустить один раз после обновления record_water_log.

create or replace function recalculate_all_streaks() returns text
language plpgsql volatile as $$
declare
  v_today date := (now() at time zone 'Europe/Moscow')::date;
  v_updated int;
begin
  with goal_days as (
    -- Дни (по Москве), когда пользователь закрыл свою дневную норму
    select l.user_id,
           (l.logged_at at time zone 'UTC' at time zone 'Europe/Moscow')::date as d
    from water_logs l
    join users u on u.id = l.user_id
    group by l.user_id, 2
    having sum(l.amount_ml) >= coalesce(nullif(u.water_goal_ml, 0), 2100)
  ),
  islands as (
    -- Группируем дни в непрерывные серии
    select user_id,
           d,
           d - (row_number() over (partition by user_id order by d))::int as grp
    from goal_days
  ),
  runs as (
    select user_id, grp, count(*)::int as len, max(d) as last_day
    from islands
    group by user_id, grp
  ),
  best as (
    select distinct on (user_id) user_id, len, last_day
    from runs
    order by user_id, last_day desc
  )
  update users u
  set streak_days = case
        when b.last_day >= v_today - 1 then b.len
        else 0
      end,
      goal_reached_date = case
        when b.last_day >= v_today - 1 then b.last_day
        else u.goal_reached_date
      end
  from best b
  where b.user_id = u.id;

  get diagnostics v_updated = row_count;

  -- У кого норма не выполнялась вообще — обнуляем счётчик
  update users
  set streak_days = 0
  where id not in (
    select l.user_id
    from water_logs l
    join users u2 on u2.id = l.user_id
    group by l.user_id, (l.logged_at at time zone 'UTC' at time zone 'Europe/Moscow')::date, u2.water_goal_ml
    having sum(l.amount_ml) >= coalesce(nullif(u2.water_goal_ml, 0), 2100)
  )
  and streak_days <> 0;

  return 'Пересчитано профилей с сериями: ' || v_updated;
end;
$$;

select recalculate_all_streaks();

-- Проверка результата
select id, first_name, water_goal_ml, streak_days, goal_reached_date
from users
order by streak_days desc;
