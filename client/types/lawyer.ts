export type LawyerProfile = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  title?: string;
};

export type Lawyer = {
  _id: string;
  email?: string;
  role?: string;
  avatarUrl?: string | null;
  profile?: LawyerProfile;
  courts?: string[];
};
