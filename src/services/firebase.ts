// Gutted for stability
export const auth: any = { currentUser: null };
export const db: any = {};

export async function initAuth() { return null; }
export async function testConnection() { return null; }
export async function submitScore() { return null; }
export function subscribeToLeaderboard() { return () => {}; }
export function handleFirestoreError() {}
export enum OperationType { CREATE, UPDATE, DELETE, LIST, GET, WRITE }
