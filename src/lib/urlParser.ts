export function parseUrl(input: string) {
  if (!input.trim()) throw new Error('Enter an absolute URL, including its protocol.')
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Error(
      'Enter a valid absolute URL, such as https://example.com:8080/path?q=hello#section.',
    )
  }
  const query = new URLSearchParams()
  const queryParameters = [...url.searchParams].map(([key, value]) => {
    const safeValue =
      /^(?:password|passwd|pwd|token|access_token|refresh_token|api[_-]?key|secret|authorization)$/i.test(
        key,
      )
        ? '[redacted]'
        : value
    query.append(key, safeValue)
    return { key, value: safeValue }
  })
  return {
    protocol: url.protocol,
    username: url.username,
    passwordPresent: url.password.length > 0,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    queryString: query.size ? `?${query.toString()}` : '',
    queryParameters,
    fragment: url.hash,
    origin: url.origin,
  }
}
