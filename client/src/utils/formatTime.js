export function formatTime(timeString) {
  // Handles "14:00:00" or "12:21:26.714289" -> "2:00 PM"
  const [hoursStr, minutesStr] = timeString.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHour}:${displayMinutes} ${period}`;
}
