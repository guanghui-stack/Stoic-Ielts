export const context = { user: { id: "viewer", role: "STUDENT", active: true, isBot: false } };
export async function getCurrentUser() { return context.user; }
