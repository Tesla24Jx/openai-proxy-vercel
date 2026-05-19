// 核心：强制将此函数部署在美国东部（华盛顿）节点，完美绕过 OpenAI 封锁
export const config = {
  runtime: 'edge',
  regions: ['iad1'], 
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

  // 1. 将域名替换为 OpenAI 的官方 API 域名
  const url = new URL(req.url);
  url.host = 'api.openai.com';

  // 2. 清洗 Header，防止你的香港真实 IP 被暴露给 OpenAI
  const newHeaders = new Headers(req.headers);
  newHeaders.delete('x-forwarded-for');
  newHeaders.delete('x-real-ip');

  // 3. 构造新的请求
  const newReq = new Request(url.toString(), {
    method: req.method,
    headers: newHeaders,
    body: req.body,
    redirect: 'follow'
  });
  newReq.headers.set('Host', 'api.openai.com');

  // 4. 发送给 OpenAI 并将结果返回
  try {
    const response = await fetch(newReq);
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    return modifiedResponse;
  } catch (e) {
    return new Response(e.stack || e, { status: 500 });
  }
}