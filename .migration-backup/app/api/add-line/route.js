import fs from "fs"
import path from "path"

const filePath = path.join(process.cwd(), "data", "lines.json")

function extractId(input) {
  if (!input) return ""

  // ถ้าเป็น URL → ดึงท้าย
  if (input.includes("/account/")) {
    return input.split("/account/")[1].replace("@", "").toLowerCase()
  }

  // ถ้าเป็น @xxxx
  return input.replace("@", "").toLowerCase()
}

export async function POST(req) {
  const body = await req.json()
  const { url, type, site } = body

  let data = []

  try {
    const file = fs.readFileSync(filePath, "utf-8")
    data = JSON.parse(file)
  } catch {}

  // 🔥 แปลง input เป็น id
  const newId = extractId(url)

  // 🔥 normalize ของเก่าทั้งหมด
  data = data.map(item => {
    const raw = item.url || item.id || ""
    return {
      id: extractId(raw),
      type: item.type,
      site: item.site
    }
  })

  // 🔥 ลบตัวที่ id ซ้ำ (เหลือของใหม่)
  data = data.filter(item => item.id !== newId)

  // 🔥 เพิ่มตัวใหม่เข้าไป
  data.push({
    id: newId,
    type,
    site
  })

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

  return Response.json({ ok: true })
}