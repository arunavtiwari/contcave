import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import getCurrentUser from '@/app/actions/getCurrentUser';
import { adminHomeFor } from '@/constants/adminNav';
import { isStaff } from '@/lib/user/permissions';

import LoginForm from './LoginForm';

export const metadata: Metadata = {
    title: 'Admin Login',
    description: 'Login to Contcave Admin',
    robots: {
        index: false,
        follow: false,
    },
};

export default async function AdminLoginPage() {
    const currentUser = await getCurrentUser();

    if (currentUser && isStaff(currentUser.role)) {
        redirect(adminHomeFor(currentUser.role));
    }

    return <LoginForm />;
}
