import type { ImageLoaderProps } from 'next/image';

const CF_ASSET_HOST = 'assets.contcave.com';
const GOOGLE_USER_CONTENT_PREFIX = 'https://lh3.googleusercontent.com/';

function getGoogleSizedImageUrl(src: string, width: number): string {
    const cleanSrc = src.split('?')[0];
    return cleanSrc.replace(/=s\d+(?:-c)?$/, `=s${width}-c`);
}

export default function cloudflareImageLoader({ src, width, quality }: ImageLoaderProps): string {
    const prefix = `https://${CF_ASSET_HOST}/`;

    if (src.startsWith(prefix)) {
        const relativePath = src.substring(prefix.length);
        const params = [
            `width=${width}`,
            `quality=${quality || 75}`,
            'format=auto',
            'fit=cover',
            'onerror=redirect',
        ].join(',');

        return `https://${CF_ASSET_HOST}/cdn-cgi/image/${params}/${relativePath}`;
    }

    if (src.startsWith(GOOGLE_USER_CONTENT_PREFIX)) {
        return getGoogleSizedImageUrl(src, width);
    }

    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}w=${width}&q=${quality || 75}`;
}
