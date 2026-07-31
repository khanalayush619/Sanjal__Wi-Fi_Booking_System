require("dotenv").config();

const { connectRouter } = require("./mikrotik");

async function main() {
  try {
    const api = await connectRouter();

    const identity = await api.write("/system/identity/print");

    console.log("Router Identity:");
    console.log(identity);

    process.exit(0);
  } catch (err) {
    console.error("Connection failed:");
    console.error(err);

    process.exit(1);
  }
}

main();
