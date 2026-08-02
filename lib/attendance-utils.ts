export function isCheckInLate(checkInTime: Date, shiftStartTime = "08:00", graceMin = 15) {
  const [hours, minutes] = shiftStartTime.split(":").map(Number)
  const expectedStart = new Date(checkInTime)
  expectedStart.setHours(hours || 0, (minutes || 0) + graceMin, 0, 0)
  return checkInTime > expectedStart
}

export function computeElapsedMinutes(checkIn: Date, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - checkIn.getTime()) / 60000))
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours === 0 ? `${rest} นาที` : `${hours} ชม. ${rest} นาที`
}

export function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export function endOfToday() {
  const date = startOfToday()
  date.setDate(date.getDate() + 1)
  return date
}
