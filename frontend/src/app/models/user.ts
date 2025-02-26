export interface User {
  id?: number;
  username: string;
  registration_source?: 'friend' | 'social_media' | 'advertisement';
  has_played?: boolean;
  accept_terms?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserCredentials {
  username: string;
  password: string;
}

export interface RegistrationData extends UserCredentials {
  password_confirmation: string;
  registration_source: 'friend' | 'social_media' | 'advertisement';
  has_played: boolean;
  accept_terms: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}
