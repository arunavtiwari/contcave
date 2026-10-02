export function isAdminDomainHost(hostname: string): boolean {
    const host = hostname.split(':')[0]?.toLowerCase() ?? ''
    return host === 'admin.contcave.com'
        || host === 'staging.admin.contcave.com'
        || host.startsWith('admin.')
        || host.includes('.admin.')
}
