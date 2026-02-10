// app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { supabaseAdmin } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'prathameshgaikwad964006@gmail.com';

// Anyone can POST a report
export async function POST(request: NextRequest) {
  try {
    const { message, userid } = await request.json();

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Use admin client for inserts (no RLS issues)
    const { error } = await supabaseAdmin
      .from('reports')
      .insert({ 
        message: message.trim(),
        userid: userid || null
      });

    if (error) {
      console.error('Error creating report:', error);
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Report submitted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only admin can GET reports
export async function GET(request: NextRequest) {
  try {
    // ✅ Use YOUR custom auth verification
    const auth = await verifyAuth(request);

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (auth.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Forbidden - Admin only' },
        { status: 403 }
      );
    }

    // Fetch all reports using admin client
    const { data: reports, error } = await supabaseAdmin
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}