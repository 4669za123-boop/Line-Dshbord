const cron = require("node-cron")
const http = require("http")

console.log("🔥 worker started")

function runBot() {
  console.log("🚀 calling API /run-bot")

  const req = http.request({
    hostname: "localhost",
    port: 3000,
    path: "/api/run-bot",
    method: "POST"
  }, (res) => {
    console.log("✅ API STATUS:", res.statusCode)
  })

  req.on("error", (err) => {
    console.log("❌ ERROR:", err)
  })

  req.end()
}

// ⏱ ทุก 1 นาที (ทดสอบ)
cron.schedule("* * * * *", runBot)