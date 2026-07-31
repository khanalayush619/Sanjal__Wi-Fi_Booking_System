const { connectRouter, closeRouter } = require("./mikrotik");

// Create Hotspot User
async function createHotspotUser(username, password, profile = "default") {
  const api = await connectRouter();

  try {
    await api.write("/ip/hotspot/user/add", [
      `=name=${username}`,
      `=password=${password}`,
      `=profile=${profile}`,
    ]);

    console.log(`Hotspot user ${username} created`);

    return true;
  } finally {
    await closeRouter(api);
  }
}

// Disable Hotspot User
async function disableHotspotUser(username) {
  const api = await connectRouter();

  try {
    const users = await api.write("/ip/hotspot/user/print", [
      `?name=${username}`,
    ]);

    if (!users.length) {
      console.log(`${username} not found`);
      return false;
    }

    await api.write("/ip/hotspot/user/set", [
      `=.id=${users[0][".id"]}`,
      "=disabled=yes",
    ]);

    console.log(`${username} disabled`);

    return true;
  } finally {
    await closeRouter(api);
  }
}

// Remove Hotspot User
async function removeHotspotUser(username) {
  const api = await connectRouter();

  try {
    const users = await api.write("/ip/hotspot/user/print", [
      `?name=${username}`,
    ]);

    if (!users.length) {
      console.log(`${username} not found`);
      return false;
    }

    await api.write("/ip/hotspot/user/remove", [`=.id=${users[0][".id"]}`]);

    console.log(`${username} removed`);

    return true;
  } finally {
    await closeRouter(api);
  }
}

// Disconnect Active User
async function disconnectUser(username) {
  const api = await connectRouter();

  try {
    let activeUsers = [];

    try {
      activeUsers = await api.write("/ip/hotspot/active/print", [
        `?user=${username}`,
      ]);
    } catch (err) {
      if (err.errno === "UNKNOWNREPLY") {
        return false;
      }
      throw err;
    }

    if (!activeUsers || activeUsers.length === 0) {
      return false;
    }

    for (const session of activeUsers) {
      await api.write("/ip/hotspot/active/remove", [`=.id=${session[".id"]}`]);
    }

    return true;
  } finally {
    await closeRouter(api);
  }
}

module.exports = {
  createHotspotUser,
  disableHotspotUser,
  removeHotspotUser,
  disconnectUser,
};
