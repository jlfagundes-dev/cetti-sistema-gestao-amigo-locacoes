grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.users,
  public.customers,
  public.customer_addresses,
  public.equipment,
  public.equipment_price_rules,
  public.quotes,
  public.quote_items,
  public.contracts,
  public.contract_items,
  public.contract_renewals,
  public.payments,
  public.collection_tasks,
  public.signed_documents,
  public.notifications,
  public.system_settings
to authenticated;
