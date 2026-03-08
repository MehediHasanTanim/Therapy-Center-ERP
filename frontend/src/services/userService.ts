import { apiClient } from "./apiClient";
import { Role, User } from "../types";

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  password: string;
}

export interface UpdateUserInput {
  name: string;
  email: string;
  role: Role;
  password?: string;
}

export const userService = {
  async list() {
    const { data } = await apiClient.get<User[]>("/users/");
    return data;
  },
  async create(payload: CreateUserInput) {
    const { data } = await apiClient.post<User>("/users/", payload);
    return data;
  },
  async update(userId: string, payload: UpdateUserInput) {
    const { data } = await apiClient.put<User>(`/users/${userId}/`, payload);
    return data;
  },
  async remove(userId: string) {
    await apiClient.delete(`/users/${userId}/`);
  }
};
