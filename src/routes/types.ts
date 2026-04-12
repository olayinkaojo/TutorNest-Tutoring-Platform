export interface UserProfile {
  id: string;
  userId?: string;
  email: string;
  role: string;
  full_name?: string;
  availableRoles?: string[];
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface NavigateOptions {
  replace?: boolean;
}

export type NavigateTo = (path: string, options?: NavigateOptions) => void;
