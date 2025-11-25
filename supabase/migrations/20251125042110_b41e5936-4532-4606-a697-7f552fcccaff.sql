-- Add super_admin role to Janine Henderson
INSERT INTO user_roles (user_id, role)
VALUES ('49d7781f-0fc5-49e4-8892-b834fd56327d', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;