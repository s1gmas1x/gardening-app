export async function handler() {
  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify({
      ok: true,
      source: 'netlify-function',
      timestamp: new Date().toISOString(),
    }),
  }
}
