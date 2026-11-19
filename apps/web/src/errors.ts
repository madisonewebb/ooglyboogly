/**
 * Readable text for anything thrown. The Discord SDK rejects with plain
 * objects like { code, message }, which String() turns into "[object Object]".
 */
export function errorText(err: unknown): string {
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null) {
    const { message, code } = err as { message?: unknown; code?: unknown };
    const text = typeof message === 'string' && message ? message : JSON.stringify(err);
    return code === undefined ? text : `${text} (code ${String(code)})`;
  }
  return String(err);
}

/** Runs one sign-in step, naming it in any error so a report says where it broke. */
export async function step<T>(name: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw new Error(`${name}: ${errorText(err)}`, { cause: err });
  }
}
