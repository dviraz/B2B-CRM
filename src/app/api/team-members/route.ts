import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get admin team members (users with role = 'admin')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .eq('role', 'admin')
    .order('full_name', { ascending: true }) as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
