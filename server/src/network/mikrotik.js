const { RouterOSAPI } = require("node-routeros");

async function connectRouter() {
  const api = new RouterOSAPI({
    host: process.env.MIKROTIK_HOST,
    user: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASSWORD,
    port: Number(process.env.MIKROTIK_PORT),
  });

  api.on("error", (err) => {
    console.error("MikroTik connection error:", err.message);
  });

  await api.connect();

  return api;
}

async function closeRouter(api) {
  if (!api) return;

  try {
    await api.close();
  } catch (err) {
    console.error("Error closing MikroTik connection:", err.message);
  }
}

module.exports = {
  connectRouter,
  closeRouter,
};
