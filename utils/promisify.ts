// utils/promisify.ts
export function promisify<T>(fn: Function): (...args: any[]) => Promise<T> {
    return (...args: any[]) => {
      return new Promise((resolve, reject) => {
        fn(...args, (error: Error | null, result?: T) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as T);
          }
        });
      });
    };
  }