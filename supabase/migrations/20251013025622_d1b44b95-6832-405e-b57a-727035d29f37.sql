-- Enable RLS on user_roles table
alter table public.user_roles enable row level security;

-- Policy: Users can read their own roles
create policy "Users can read their own roles"
on public.user_roles
for select
using (user_id = auth.uid());

-- Policy: Admins can manage all roles (insert, update, delete)
create policy "Admins can manage all roles"
on public.user_roles
for all
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and role = 'admin'::user_role
  )
);