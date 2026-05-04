'use client';

import { useEffect } from 'react';

import Button from '@/components/ui/Button';
import Heading from '@/components/ui/Heading';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[Dashboard Error]', { message: error.message, digest: error.digest });
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 text-center">
            <Heading
                title="Something went wrong"
                subtitle="We encountered an error while loading this page."
                center
            />
            <Button label="Try Again" onClick={() => reset()} fit />
        </div>
    );
}