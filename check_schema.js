const https = require("https");

https
  .get(
    "https://fkudsbomcwahlwmyqndb.supabase.co/rest/v1/?apikey=sb_publishable_odsjQPfDlCQy7DJAgMyBfQ_Ikg2FJzQ",
    (resp) => {
      let data = "";

      resp.on("data", (chunk) => {
        data += chunk;
      });

      resp.on("end", () => {
        const j = JSON.parse(data);
        if (!j.paths || !j.paths["/submissions"]) {
          console.log(
            "No submissions path found. Definitions:",
            Object.keys(j.definitions || {}),
          );
        }
        const def =
          j.definitions?.submissions || j.components?.schemas?.submissions;
        if (def) {
          const p = def.properties;
          Object.keys(p).forEach((k) => console.log(k, p[k].type, p[k].format));
        } else {
          console.log("Could not find submissions definition.");
        }
      });
    },
  )
  .on("error", (err) => {
    console.log("Error: " + err.message);
  });
