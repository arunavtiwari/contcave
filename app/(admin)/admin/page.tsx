import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import getCurrentUser from '@/app/actions/getCurrentUser';

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
    const isAdmin = (currentUser as unknown as { isAdmin?: boolean })?.isAdmin;

    if (currentUser && isAdmin) {
        redirect('/dashboard/listings');
    }

    return <LoginForm />;
}
