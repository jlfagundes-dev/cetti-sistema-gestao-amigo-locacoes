drop policy if exists "authenticated users can access users" on public.users;
drop policy if exists "authenticated users can access customers" on public.customers;
drop policy if exists "authenticated users can access customer addresses" on public.customer_addresses;
drop policy if exists "authenticated users can access equipment" on public.equipment;
drop policy if exists "authenticated users can access price rules" on public.equipment_price_rules;
drop policy if exists "authenticated users can access quotes" on public.quotes;
drop policy if exists "authenticated users can access quote items" on public.quote_items;
drop policy if exists "authenticated users can access contracts" on public.contracts;
drop policy if exists "authenticated users can access contract items" on public.contract_items;
drop policy if exists "authenticated users can access renewals" on public.contract_renewals;
drop policy if exists "authenticated users can access payments" on public.payments;
drop policy if exists "authenticated users can access collection tasks" on public.collection_tasks;
drop policy if exists "authenticated users can access signed documents" on public.signed_documents;
drop policy if exists "authenticated users can access notifications" on public.notifications;
drop policy if exists "authenticated users can access settings" on public.system_settings;

create policy "users can access own profile" on public.users
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users can access own customers" on public.customers
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "users can access own customer addresses" on public.customer_addresses
  for all to authenticated
  using (exists (
    select 1 from public.customers
    where customers.id = customer_addresses.customer_id
      and customers.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.customers
    where customers.id = customer_addresses.customer_id
      and customers.created_by = auth.uid()
  ));

create policy "users can access own equipment" on public.equipment
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "users can access own price rules" on public.equipment_price_rules
  for all to authenticated
  using (exists (
    select 1 from public.equipment
    where equipment.id = equipment_price_rules.equipment_id
      and equipment.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.equipment
    where equipment.id = equipment_price_rules.equipment_id
      and equipment.created_by = auth.uid()
  ));

create policy "users can access own quotes" on public.quotes
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "users can access own quote items" on public.quote_items
  for all to authenticated
  using (exists (
    select 1 from public.quotes
    where quotes.id = quote_items.quote_id
      and quotes.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.quotes
    where quotes.id = quote_items.quote_id
      and quotes.created_by = auth.uid()
  ));

create policy "users can access own contracts" on public.contracts
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "users can access own contract items" on public.contract_items
  for all to authenticated
  using (exists (
    select 1 from public.contracts
    where contracts.id = contract_items.contract_id
      and contracts.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.contracts
    where contracts.id = contract_items.contract_id
      and contracts.created_by = auth.uid()
  ));

create policy "users can access own renewals" on public.contract_renewals
  for all to authenticated
  using (exists (
    select 1 from public.contracts
    where contracts.id = contract_renewals.contract_id
      and contracts.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.contracts
    where contracts.id = contract_renewals.contract_id
      and contracts.created_by = auth.uid()
  ));

create policy "users can access own payments" on public.payments
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "users can access own collection tasks" on public.collection_tasks
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "users can access own signed documents" on public.signed_documents
  for all to authenticated
  using (
    (quote_id is null or exists (
      select 1 from public.quotes
      where quotes.id = signed_documents.quote_id
        and quotes.created_by = auth.uid()
    ))
    and (contract_id is null or exists (
      select 1 from public.contracts
      where contracts.id = signed_documents.contract_id
        and contracts.created_by = auth.uid()
    ))
  )
  with check (
    (quote_id is null or exists (
      select 1 from public.quotes
      where quotes.id = signed_documents.quote_id
        and quotes.created_by = auth.uid()
    ))
    and (contract_id is null or exists (
      select 1 from public.contracts
      where contracts.id = signed_documents.contract_id
        and contracts.created_by = auth.uid()
    ))
  );

create policy "users can access own notifications" on public.notifications
  for all to authenticated
  using (
    (customer_id is null or exists (
      select 1 from public.customers
      where customers.id = notifications.customer_id
        and customers.created_by = auth.uid()
    ))
    and (contract_id is null or exists (
      select 1 from public.contracts
      where contracts.id = notifications.contract_id
        and contracts.created_by = auth.uid()
    ))
  )
  with check (
    (customer_id is null or exists (
      select 1 from public.customers
      where customers.id = notifications.customer_id
        and customers.created_by = auth.uid()
    ))
    and (contract_id is null or exists (
      select 1 from public.contracts
      where contracts.id = notifications.contract_id
        and contracts.created_by = auth.uid()
    ))
  );

create policy "authenticated users can access settings" on public.system_settings
  for all to authenticated using (true) with check (true);
