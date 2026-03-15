/**
 * Test upload.lighthouse.storage/api/v0/add (the CORRECT endpoint from docs)
 */
const https = require("https");
const API_KEY = "d3267d89.33c348048b9944c28b335806c60b3dc3";
const mdContent = `# Test Skill\nUploaded: ${new Date().toISOString()}\n`;

const boundary = "----B" + Math.random().toString(36).slice(2);
const fileData = Buffer.from(mdContent, "utf-8");
const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.md"\r\nContent-Type: text/markdown\r\n\r\n`),
  fileData,
  Buffer.from(`\r\n--${boundary}--\r\n`),
]);

console.log("Testing: https://upload.lighthouse.storage/api/v0/add");
console.log(`File: test.md (${fileData.length} bytes)`);
const start = Date.now();

const req = https.request({
  hostname: "upload.lighthouse.storage",
  port: 443,
  path: "/api/v0/add",
  method: "POST",
  headers: {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": body.length,
    "Authorization": `Bearer ${API_KEY}`,
  },
  timeout: 15000,
}, (res) => {
  let data = "";
  res.on("data", (c) => data += c);
  res.on("end", () => {
    const t = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\nStatus: ${res.statusCode} (${t}s)`);
    console.log(`Response: ${data}`);
    try {
      const j = JSON.parse(data);
      if (j.Hash) {
        console.log(`\n✅ SUCCESS!`);
        console.log(`CID: ${j.Hash}`);
        console.log(`Gateway: https://gateway.lighthouse.storage/ipfs/${j.Hash}`);
      }
    } catch (e) {
      console.log("(not JSON)");
    }
  });
});

req.on("timeout", () => { console.log("⏱ TIMEOUT after 15s"); req.destroy(); });
req.on("error", (e) => { console.error("❌ ERROR:", e.message); });
req.write(body);
req.end();
