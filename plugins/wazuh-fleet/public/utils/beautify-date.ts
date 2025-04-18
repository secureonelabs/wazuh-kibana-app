// import { formatUIDate } from './time-service';

// This method was created because Wazuh API returns 1970-01-01T00:00:00Z dates or undefined ones
// when vulnerability module is not configured
// its meant to render nothing when such date is received
// TODO: this is being used for a generic component as the data grid, so we could move this service
export function beautifyDate(date?: string) {
  return date && !['-'].includes(date) && !date.startsWith('1970')
    ? //  ? formatUIDate(date)
      date
    : '-';
}
