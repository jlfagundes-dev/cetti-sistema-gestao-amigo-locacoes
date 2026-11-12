update public.equipment
set billing_mode = 'period'
where lower(billing_unit) like '%período%'
  and billing_mode <> 'period';

update public.equipment
set billing_mode = 'daily'
where lower(billing_unit) like '%diária%'
  and billing_mode <> 'daily';
