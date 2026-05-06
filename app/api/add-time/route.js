const { addSchedule } = require("../../../scheduleStore")

export async function POST(req) {
  const body = await req.json()

  addSchedule(body.time)

  return Response.json({
    ok: true,
    time: body.time
  })
}