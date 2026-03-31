
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = 'ce9c6b92-9793-4dc5-8151-234bcb144f1d' AND role = 'admin';

UPDATE public.profiles 
SET role = 'super_admin' 
WHERE id = 'ce9c6b92-9793-4dc5-8151-234bcb144f1d';
