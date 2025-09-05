export type TLoginUser = {
  email: string;
  password: string;
};
export type TAuthResponse = {
  accessToken: string;
  refreshToken: string;
  needsPasswordChange: boolean;
  user: {
    id: string;
    email: string;
    role: string;
    accountAge?: number;
  };
};