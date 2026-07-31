require("dotenv").config();

const { createHotspotUser } = require("./hotspot");

(async () => {
  try {
    await createHotspotUser("student1", "123456", "default");

    console.log("Done");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
