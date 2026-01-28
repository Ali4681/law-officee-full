export interface Court {
  _id?: string;
  id?: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCourtDto {
  name: string;
}

export interface UpdateCourtDto {
  name?: string;
}
