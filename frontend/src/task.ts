export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type Task = {
  id: number
  title: string
  description: string
  status: Status
  scheduled_date: string
}

export const STATUS_LABEL: Record<Status, string> = {
  TODO: '할 일',
  IN_PROGRESS: '처리중',
  DONE: '완료',
}

// 상태 선택 상자의 선택지 순서
export const STATUS_OPTIONS: Status[] = ['TODO', 'IN_PROGRESS', 'DONE']

const pad = (n: number) => String(n).padStart(2, '0')

// 브라우저의 로컬 날짜를 YYYY-MM-DD 로 만든다. month 는 0 부터 시작한다.
export function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

// 오늘의 로컬 날짜. 등록 화면의 예정일 기본값으로 쓴다.
export function todayString() {
  const now = new Date()
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate())
}

// 달 조회에 쓰는 YYYY-MM. month 는 0 부터 시작한다.
export function monthKey(year: number, month: number) {
  return `${year}-${pad(month + 1)}`
}
