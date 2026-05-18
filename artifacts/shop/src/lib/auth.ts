export function getAdminToken(): string | null {
  return localStorage.getItem("admin_token");
}

export function setAdminToken(token: string): void {
  localStorage.setItem("admin_token", token);
}

export function removeAdminToken(): void {
  localStorage.removeItem("admin_token");
}

export function isAuthenticated(): boolean {
  return !!getAdminToken();
}
