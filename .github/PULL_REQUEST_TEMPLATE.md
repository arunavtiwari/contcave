## Description
Please include a summary of the changes and the related issue/ticket. Include relevant motivation and context.

Fixes # (issue)

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactor (non-functional code cleanups or restructuring)
- [ ] Documentation update
- [ ] CI/CD or build script modification

## Core Architecture Compliance Checklist
- [ ] **Strict TypeScript**: Verified that no `any` or `any[]` types were used.
- [ ] **Next.js 16 Routing**: Verified that all `params` and `searchParams` are properly awaited before property access.
- [ ] **React 19 Rendering**: Verified that state synchronization from props uses inline pre-paint rendering state adjustment rather than `useEffect` or `key`.
- [ ] **Server Actions**: All write mutations are wrapped inside the `createAction` helper and serialize Dates to safe types.
- [ ] **Security**: Highly sensitive bank accounts, GSTIN, and Cashfree vendor details are encrypted using the `encryptionService`.
- [ ] **Cashfree Proxy**: Any new Cashfree endpoints pass through the Fixie proxy agent (`getFixieProxyAgent`).

## How Has This Been Tested?
Please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce.

- [ ] **Lint and Type Checks**: Passed `npm run check` locally.
- [ ] **End-to-End Tests**: Verified changes with Playwright:
  ```bash
  npm run test:e2e
  ```

### Visual Verification (if UI changes were made)
Please attach screenshots or recordings showing the visual changes before and after the modification.
