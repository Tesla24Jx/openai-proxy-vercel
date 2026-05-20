export const config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export default async function reqHandler(req, res) {
  // 处理跨域请求 (CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).end();
    return;
  }

  const targetUrl = `https://api.openai.com${req.url}`;

  const newHeaders = { ...req.headers };
  delete newHeaders.host;
  delete newHeaders.connection;
  delete newHeaders['content-length'];
  delete newHeaders['x-forwarded-for'];
  delete newHeaders['x-real-ip'];
  delete newHeaders['cf-connecting-ip'];
  delete newHeaders['cf-ipcountry'];
  delete newHeaders['cf-ray'];
  delete newHeaders['x-vercel-id'];
  delete newHeaders['x-vercel-proxied-for'];
  delete newHeaders['accept-encoding'];

  let requestBody;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    requestBody = await readRawBody(req);
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: newHeaders,
      body: requestBody,
      redirect: 'follow'
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-encoding') {
        return;
      }
      res.setHeader(key, value);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const responseBuffer = Buffer.from(await response.arrayBuffer());
    res.end(responseBuffer);
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res
      .status(500)
      .send(error?.stack || error?.message || 'proxy request failed');
  }
}
