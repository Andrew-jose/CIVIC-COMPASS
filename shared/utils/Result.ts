/**
 * Result Monad Implementation
 * 
 * Decision: The Result monad is implemented as a discriminated union of two classes: Ok and Err.
 * Justification: 
 * 1. Using classes allows us to attach methods like `.map()` and `.flatMap()` natively to the instances,
 *    giving excellent intellisense and ergonomic chaining without wrapping values in utility functions.
 * 2. It remains a discriminated union (`ok: true | false`) to allow functional pattern matching
 *    and easy JSON serialization if needed.
 * 
 * Decision: `ok()` and `err()` are provided as standalone functions.
 * Justification:
 * This is far more ergonomic for callers. Writing `return ok(value)` is less boilerplate
 * than `return Result.ok(value)` or `return new Ok(value)`.
 */

export type Result<T, E> = Ok<T, E> | Err<T, E>;

export class Ok<T, E> {
  readonly ok = true;
  readonly isOk = true;
  readonly isErr = false;

  constructor(public readonly value: T) {}

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return new Ok<T, F>(this.value);
  }

  unwrapOr(defaultValue: T): T {
    return this.value;
  }

  match<R>(handlers: { ok: (value: T) => R; err: (error: E) => R }): R {
    return handlers.ok(this.value);
  }
}

export class Err<T, E> {
  readonly ok = false;
  readonly isOk = false;
  readonly isErr = true;

  constructor(public readonly error: E) {}

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Err<U, E>(this.error);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err<U, E>(this.error);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return new Err<T, F>(fn(this.error));
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  match<R>(handlers: { ok: (value: T) => R; err: (error: E) => R }): R {
    return handlers.err(this.error);
  }
}

/**
 * Creates an Ok variant of Result.
 */
export function ok<T, E = never>(value: T): Result<T, E> {
  return new Ok<T, E>(value);
}

/**
 * Creates an Err variant of Result.
 */
export function err<E, T = never>(error: E): Result<T, E> {
  return new Err<T, E>(error);
}

/**
 * Combines an array of Results into a single Result containing an array of values.
 * If any Result is an Err, the first Err is returned.
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (result.isErr) {
      return err(result.error);
    }
    values.push(result.value);
  }
  return ok(values);
}

/**
 * Converts a Promise into a Promise<Result<T, E>>.
 * Catches any unhandled rejections and maps them to an error using `mapError`.
 */
export async function fromPromise<T, E>(
  promise: Promise<T>,
  mapError: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (e) {
    return err(mapError(e));
  }
}

/**
 * Converts a Result to a Promise, throwing the error if it's an Err.
 * Note: Use with caution as this reintroduces throws into the code flow.
 */
export function toPromise<T, E>(result: Result<T, E>): Promise<T> {
  if (result.isErr) {
    return Promise.reject(result.error);
  }
  return Promise.resolve(result.value);
}
