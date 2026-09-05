// Shared Utilities for Floor Hours Tracker (IST Timezone: Asia/Kolkata)

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

// Returns YYYY-MM-DD for current time in IST
export function getISTDateString(date = new Date()) {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
}

// Check if a given day is a configured working day (Default Mon-Fri; Sat/Sun are weekends)
export function isWorkingDay(dateObj, workDaysString = 'Mon,Tue,Wed,Thu,Fri') {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[dateObj.getUTCDay()];
  const allowed = workDaysString.split(',').map(d => d.trim());
  return allowed.includes(dayName);
}

export function isWeekendDay(dateObj) {
  const day = dateObj.getUTCDay();
  return day === 0 || day === 6; // 0 is Sun, 6 is Sat
}

// Calculate floor hours & breaks duration in seconds
export function calculateSessionSeconds(session, breaks = [], now = new Date()) {
  if (!session || !session.check_in_time) {
    return { floorSeconds: 0, breakSeconds: 0, grossSeconds: 0 };
  }

  // "Do not count time for WFH & Leave" - Floor Adherence only counts Office Floor time!
  if (session.work_mode === 'wfh' || session.work_mode === 'leave') {
    return { floorSeconds: 0, breakSeconds: 0, grossSeconds: 0 };
  }

  const checkIn = new Date(session.check_in_time).getTime();
  const checkOut = session.check_out_time ? new Date(session.check_out_time).getTime() : now.getTime();
  const grossMs = Math.max(0, checkOut - checkIn);

  let totalBreakMs = 0;
  for (const b of breaks) {
    if (b.break_start) {
      const bStart = new Date(b.break_start).getTime();
      const bEnd = b.break_end ? new Date(b.break_end).getTime() : now.getTime();
      totalBreakMs += Math.max(0, bEnd - bStart);
    }
  }

  const floorMs = Math.max(0, grossMs - totalBreakMs);

  return {
    floorSeconds: Math.floor(floorMs / 1000),
    breakSeconds: Math.floor(totalBreakMs / 1000),
    grossSeconds: Math.floor(grossMs / 1000),
  };
}
