// path: src/types/common.ts
export type Environment = 'dev' | 'stg' | 'prod';

export type User = {
  id: string;
  email?: string;
  display_name?: string;
  working_style_data?: Record<string, unknown>;
  created_at?: string;
  environment?: Environment;
};

export type AuthMode = 'internal' | 'multi';

export type AuthState = {
  user: User | null;
  loading: boolean;
  mode: AuthMode;
  environment: Environment;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupCredentials = {
  email: string;
  password: string;
  displayName?: string;
};

export type ProfileUpdateData = {
  display_name?: string;
  working_style_data?: Record<string, unknown>;
};

export const INTERNAL_USER_ID = '00000000-0000-4000-8000-000000000000';

export function getEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  return (env === 'stg' || env === 'prod') ? env : 'dev';
}

export function isInternalMode(): boolean {
  return process.env.NEXT_PUBLIC_INTERNAL_MODE === 'true';
}