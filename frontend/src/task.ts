export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type Task = {
  id: number
  title: string
  description: string
  status: Status
  scheduled_date: string | null
}

export const STATUS_LABEL: Record<Status, string> = {
  TODO: '할 일',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
}

const pad = (n: number) => String(n).padStart(2, '0')

// 브라우저의 로컬 날짜를 YYYY-MM-DD 로 만든다. month 는 0 부터 시작한다.
export function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

// 달 조회에 쓰는 YYYY-MM. month 는 0 부터 시작한다.
export function monthKey(year: number, month: number) {
  return `${year}-${pad(month + 1)}`
}
