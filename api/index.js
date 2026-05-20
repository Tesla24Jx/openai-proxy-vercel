// 强制部署在美国东部节点，减少到 OpenAI 的网络绕行。
export const config = {
  runtime: 'edge',
  regions: ['iad1']
};

export default async function reqHandler(req) {
  // 处理跨域请求 (CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  // 1. 将当前请求映射到 OpenAI 官方 API
  const url = new URL(req.url);
  const targetUrl = `https://api.openai.com${url.pathname}${url.search}`;

  // 2. 清洗 Header，避免泄露来源 IP，并移除容易导致转发异常的头
  const newHeaders = new Headers(req.headers);
  newHeaders.delete('x-forwarded-for');
  newHeaders.delete('x-real-ip');
  newHeaders.delete('host');
  newHeaders.delete('content-length');
  newHeaders.delete('cf-connecting-ip');
  newHeaders.delete('cf-ipcountry');
  newHeaders.delete('cf-ray');
  newHeaders.delete('x-vercel-id');
  newHeaders.delete('x-vercel-proxied-for');

  // 3. 显式读取原始二进制 body，稳定转发 multipart/form-data
  let requestBody = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    requestBody = await req.arrayBuffer();
  }

  // 4. 转发到 OpenAI
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: newHeaders,
    body: requestBody,
    redirect: 'follow'
  });

  // 5. 将 OpenAI 返回结果透传回客户端
  const modifiedResponse = new Response(response.body, response);
  modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
  modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return modifiedResponse;
}
