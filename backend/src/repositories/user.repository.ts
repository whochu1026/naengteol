import type { User } from "../types";
import { userTable } from "./store";

export const userRepository = {
  async list(): Promise<User[]> {
    return userTable.read();
  },

  async findByEmail(email: string): Promise<User | undefined> {
    const users = await userTable.read();
    return users.find((user) => user.email === email);
  },

  async findById(id: string): Promise<User | undefined> {
    const users = await userTable.read();
    return users.find((user) => user.id === id);
  },

  async create(user: User): Promise<User> {
    await userTable.update((users) => [...users, user]);
    return user;
  },

  async save(user: User): Promise<User> {
    let saved = false;
    await userTable.update((users) =>
      users.map((row) => {
        if (row.id !== user.id) return row;
        saved = true;
        return user;
      }),
    );
    if (!saved) {
      throw new Error("저장할 사용자를 찾지 못했습니다.");
    }
    return user;
  },

  async deleteById(id: string): Promise<void> {
    await userTable.update((users) => users.filter((user) => user.id !== id));
  },
};
