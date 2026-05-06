import { exec } from "child_process"

export async function POST() {
  console.log("🔥 API HIT → running bot.py")

  exec("python bot.py", (err, stdout, stderr) => {
    if (err) console.log("❌ ERROR:", err)
    if (stdout) console.log(stdout)
    if (stderr) console.log(stderr)
  })

  return Response.json({ ok: true })
}