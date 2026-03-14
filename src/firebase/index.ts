
'use client';

// This barrel file re-exports all firebase utilities.
// Initialization logic is separated into `init.ts` to prevent potential
// module-loading cycles during Server-Side Rendering (SSR).

export * from './init';
export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-login';
// NOTE: DO NOT re-export errors or error-emitter from here to avoid circular dependencies
// that can cause "Element type is invalid" errors.
// Import them directly where needed, e.g., `import { errorEmitter } from '@/firebase/error-emitter';`
// export * from './errors';
// export * from './error-emitter';
