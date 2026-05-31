export interface AuthUser {
  id: string;
  email: string | null;
  roles: string[];
}

export interface JwtPayload {
  sub: string;
  email?: string | null;
  roles?: string[];
  type?: 'access' | 'refresh';
}
