export interface Proxy {
  server: string;
  username: string;
  password: string;
}

export async function getProxy() {
  try {
    const proxyRequest = await fetch(
      `${process.env.FUNCTIONS_DOMAIN}/api/${process.env.INTUNED_WORKSPACE_ID}/functions/${process.env.INTUNED_INTEGRATION_ID}/getProxy`
    );
    const proxy: Proxy = await proxyRequest.json();
    return proxy;
  } catch (error) {
    throw new Error("Failed to get proxy");
  }
}
