function cleanKey(value) {
  const key = String(value || "");
  return key.startsWith("bus-media/") && !key.includes("..") ? key : "";
}

export async function onRequestGet({ request, env }) {
  if (!env.MEDIA) return new Response("Media storage is not configured.", { status: 503 });
  const key = cleanKey(new URL(request.url).searchParams.get("key"));
  if (!key) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=86400");
  return new Response(object.body, { headers });
}
