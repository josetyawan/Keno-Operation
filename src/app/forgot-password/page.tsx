'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/auth-layout';

export default function ForgotPasswordPage() {

  return (
    <AuthLayout>
        <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
            <p className="text-muted-foreground mb-6">
                This feature is currently under construction.
            </p>
            <div className="flex flex-col gap-4">
                <Button asChild>
                    <Link href="/login">Back to Login</Link>
                </Button>
                 <Button variant="outline" asChild>
                    <Link href="/signup">Sign Up Instead</Link>
                </Button>
            </div>

        </div>
    </AuthLayout>
  );
}
