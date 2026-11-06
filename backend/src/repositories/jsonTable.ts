import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

/**
 * 프로세스 안에서 파일 읽기/쓰기를 한 줄로 직렬화하고,
 * 임시 파일에 쓴 뒤 이름을 바꿔 저장이 중간에 끊겨도 기존 파일이 남게 한다.
 */
export class JsonTable<T> {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private lock<R>(task: () => Promise<R>): Promise<R> {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async ensure(): Promise<void> {
    await this.lock(async () => {
      await this.readUnsafe();
    });
  }

  async read(): Promise<T[]> {
    return this.lock(() => this.readUnsafe());
  }

  async write(rows: T[]): Promise<void> {
    await this.lock(() => this.writeUnsafe(rows));
  }

  async update(mutator: (rows: T[]) => T[]): Promise<T[]> {
    return this.lock(async () => {
      const rows = await this.readUnsafe();
      const next = mutator(rows);
      await this.writeUnsafe(next);
      return next;
    });
  }

  private async readUnsafe(): Promise<T[]> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error(`${path.basename(this.filePath)} 형식이 배열이 아닙니다.`);
      }
      return parsed as T[];
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        await this.writeUnsafe([]);
        return [];
      }
      throw error;
    }
  }

  private async writeUnsafe(rows: T[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(tmp, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}
