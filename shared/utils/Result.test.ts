import { ok, err, combine, fromPromise, toPromise } from './Result';

describe('Result Monad', () => {
  it('ok creates an Ok instance that executes ok branches', () => {
    const result = ok(42);
    
    expect(result.isOk).toBe(true);
    expect(result.isErr).toBe(false);
    expect(result.unwrapOr(0)).toBe(42);
    
    const mapped = result.map(x => x * 2);
    expect(mapped.unwrapOr(0)).toBe(84);
    
    const matchRes = result.match({
      ok: val => `Success: ${val}`,
      err: e => `Error: ${e}`
    });
    expect(matchRes).toBe('Success: 42');
  });

  it('err creates an Err instance that executes err branches', () => {
    const result = err('Failed');
    
    expect(result.isOk).toBe(false);
    expect(result.isErr).toBe(true);
    expect(result.unwrapOr(0)).toBe(0);
    
    const mapped = result.map((x: number) => x * 2);
    expect(mapped.isErr).toBe(true);
    
    const matchRes = result.match({
      ok: val => `Success: ${val}`,
      err: e => `Error: ${e}`
    });
    expect(matchRes).toBe('Error: Failed');
  });

  it('combine aggregates multiple Ok results', () => {
    const results = [ok(1), ok(2), ok(3)];
    const combined = combine(results);
    
    expect(combined.isOk).toBe(true);
    if (combined.isOk) {
      expect(combined.value).toEqual([1, 2, 3]);
    }
  });

  it('combine short-circuits on first Err', () => {
    const results = [ok(1), err('First Error'), ok(3), err('Second Error')];
    const combined = combine(results);
    
    expect(combined.isErr).toBe(true);
    if (combined.isErr) {
      expect(combined.error).toBe('First Error');
    }
  });

  it('fromPromise wraps successful resolution in Ok', async () => {
    const promise = Promise.resolve(42);
    const result = await fromPromise(promise, e => String(e));
    expect(result.isOk).toBe(true);
    expect(result.unwrapOr(0)).toBe(42);
  });

  it('fromPromise wraps rejection in Err using mapError', async () => {
    const promise = Promise.reject(new Error('Network failure'));
    const result = await fromPromise(promise, e => (e as Error).message);
    expect(result.isErr).toBe(true);
    if (result.isErr) {
      expect(result.error).toBe('Network failure');
    }
  });

  it('toPromise rejects on Err', async () => {
    const result = err('Fatal error');
    await expect(toPromise(result)).rejects.toBe('Fatal error');
  });

  it('toPromise resolves on Ok', async () => {
    const result = ok(100);
    await expect(toPromise(result)).resolves.toBe(100);
  });
});
