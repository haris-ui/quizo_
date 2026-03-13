import { loginAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const { data: admin, error } = await loginAdmin(email, password);

    if (error || !admin) {
      return NextResponse.json(
        { error: error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      adminId: admin.id,
      email: admin.email,
    });
  } catch (error: any) {
    console.error('[v0] Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
