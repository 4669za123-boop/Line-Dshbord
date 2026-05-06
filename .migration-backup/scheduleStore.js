let schedules = []

function addSchedule(time) {
  schedules.push(time)
}

function getSchedules() {
  return schedules
}

module.exports = { addSchedule, getSchedules }