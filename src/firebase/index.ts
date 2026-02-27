'use client';

// This barrel file re-exports all firebase utilities.
// Initialization logic is separated into `init.ts` to prevent potential
// module-loading cycles during Server-Side Rendering (SSR).

export * from './init';
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
// The non-blocking updates were causing issues and have been removed.
// We now use direct async/await calls to firestore functions.
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
