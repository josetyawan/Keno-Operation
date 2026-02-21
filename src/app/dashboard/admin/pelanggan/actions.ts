
'use server';

// This file is no longer used and can be removed in the future.
// The data fetching logic has been moved to a client-side CSV import feature.

export async function fetchFromSheet() {
  console.error('DEPRECATED: fetchFromSheet is no longer in use.');
  throw new Error('This function is deprecated. Please use the CSV import feature.');
}
