export async function onRequest({ request, params }) {
  const path = [].concat(params.path || []).join('/');
  const url = new URL(request.url);
  const target = `https://alandaluspc.asem-sharif-ai.workers.dev/${path}${url.search}`;
  return fetch(new Request(target, request));
}