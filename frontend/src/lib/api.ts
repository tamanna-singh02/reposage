let _token: string | null = localStorage.getItem('rs_token')

export function setToken(token: string | null) {
  _token = token
}

export function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const { headers = {}, ...rest } = opts
  return fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...(headers as Record<string, string>),
    },
  })
}
