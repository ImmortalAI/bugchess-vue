export type UserData = {
  id: string;
  email: string;
  username: string;
  rating: number;
  sigma: number;
};

export type UserSearchResults = string[];

export type UserPatch = {
  email?: string;
  username?: string;
  old_password?: string;
  password?: string;
  repeat_password?: string;
};
