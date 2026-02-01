function toPlanningCenterTimestamp(date = new Date()) {
  const iso = date.toISOString();
  const [datePart] = iso.split("T");
  return `${datePart}T05:00:00Z`;
}

module.exports = { toPlanningCenterTimestamp };
