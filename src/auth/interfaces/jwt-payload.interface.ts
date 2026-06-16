export interface JwtPayload {
  email: string;
  sub: string;
  role?: string[];
  Issuer?: string;
}
