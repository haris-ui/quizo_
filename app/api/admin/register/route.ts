import { registerAdmin } from '@/lib/auth';
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

    const { data: admin, error } = await registerAdmin(email, password);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Registration failed' },
        { status: 400 }
      );
    }

    if (!admin) {
      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 400 }
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
    console.error('[v0] Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
