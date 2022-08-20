import moment from 'moment';

// Convert a decimal minutes value to a string with minutes and seconds, e.g:
// 20.5 => '20m30s'
// 1.0 => '1m'
// 2.1 => '2m6s'
export const minuteDecimalToMinutesSeconds = (duration_minutes: number): string => {
  const duration = moment.duration(duration_minutes, 'minutes');
  let durString = `${duration.minutes()}m`;
  if (duration.seconds() != 0) {
    durString += `${duration.seconds()}s`;
  }
  return durString;
}

