import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerAdmin(email: string, password: string) {
  const supabase = await createClient();
  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from('admins')
    .insert([{ email, password_hash: passwordHash }])
    .select()
    .single();

  return { data, error };
}

export async function loginAdmin(email: string, password: string) {
  const supabase = await createClient();

  const { data: admin, error: fetchError } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !admin) {
    return { error: 'Admin not found' };
  }

  const passwordMatch = await verifyPassword(password, admin.password_hash);
  if (!passwordMatch) {
    return { error: 'Invalid password' };
  }

  return { data: admin };
}

export async function getAdminById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}
