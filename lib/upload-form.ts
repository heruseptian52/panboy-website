/** Send images in small requests so the edge request limit cannot reject a large multipart body. */
export async function uploadForm(url: string, options: RequestInit): Promise<Response> {
  const form = options.body;
  if (!(form instanceof FormData)) return fetch(url, options);
  const file = [...form.values()].find(value => value instanceof File) as File | undefined;
  if (!file || file.size <= 512 * 1024) return fetch(url, options);
  const endpoint = new URL(url, location.origin);
  async function json(response: Response) {
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || (response.status === 413 ? "File melewati batas server." : `Upload gagal (${response.status}).`));
    return body;
  }
  const init = await json(await fetch(`${endpoint.pathname}?action=init`, { method: "POST", body: JSON.stringify({ size: file.size }), headers: { "Content-Type": "application/json" } }));
  for (let index = 0; index < Math.ceil(file.size / init.chunkSize); index++) {
    await json(await fetch(`${endpoint.pathname}?action=chunk&uploadId=${encodeURIComponent(init.uploadId)}&index=${index}`, { method: "POST", body: file.slice(index * init.chunkSize, (index + 1) * init.chunkSize) }));
  }
  const response = await fetch(`${endpoint.pathname}?action=complete&uploadId=${encodeURIComponent(init.uploadId)}`, { method: "POST" });
  await json(response.clone());
  return response;
}
