export async function retry(operation, {
  maxAttempts = 3,
  shouldRetry = () => true,
  delay = async () => {},
} = {}) {
  let attempt = 0;
  while (attempt <= maxAttempts) {
    attempt += 1;
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= maxAttempts || shouldRetry(error, attempt)) {
        throw error;
      }
      await delay(attempt, error);
    }
  }
}
