import { useState } from 'react'
import { STATUS_LABEL, dateKey } from './task'
import type { Task } from './task'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const VISIBLE_PER_DAY = 3

type Cell = { day: number; inMonth: boolean }

// 일요일 시작 7열 격자. 앞뒤 달의 날짜는 칸을 채우는 용도로만 쓴다.
function buildCells(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const total = Math.ceil((first + days) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const day = i - first + 1
    if (day < 1) return { day: prevDays + day, inMonth: false }
    if (day > days) return { day: day - days, inMonth: false }
    return { day, inMonth: true }
  })
}

type Props = {
  year: number
  month: number // 0 부터 시작
  tasks: Task[] // 이 달의 카드. 불러오는 중이면 비어 있다.
  loading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function Calendar({ year, month, tasks, loading, selectedId, onSelect, onPrev, onNext, onToday }: Props) {
  const [expanded, setExpanded] = useState<string[]>([])
  // 화면을 연 시점의 오늘. 자정을 넘겨 켜 둔 경우의 갱신은 다루지 않는다.
  const [todayKey] = useState(() => {
    const now = new Date()
    return dateKey(now.getFullYear(), now.getMonth(), now.getDate())
  })

  const byDate = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t.scheduled_date) continue
    byDate.set(t.scheduled_date, [...(byDate.get(t.scheduled_date) ?? []), t])
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" onClick={onPrev}>
          이전 달
        </button>
        <strong>
          {year}년 {month + 1}월
        </strong>
        <button type="button" onClick={onNext}>
          다음 달
        </button>
        <button type="button" onClick={onToday}>
          오늘
        </button>
        {loading && <span role="status">불러오는 중...</span>}
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar-weekday">
            {w}
          </div>
        ))}
        {buildCells(year, month).map((cell, i) => {
          if (!cell.inMonth) {
            return (
              <div key={i} className="calendar-cell dim">
                <div className="day-number">{cell.day}</div>
              </div>
            )
          }
          const key = dateKey(year, month, cell.day)
          const dayTasks = byDate.get(key) ?? []
          const open = expanded.includes(key)
          const shown = open ? dayTasks : dayTasks.slice(0, VISIBLE_PER_DAY)
          const hidden = dayTasks.length - shown.length
          return (
            <div key={i} className={key === todayKey ? 'calendar-cell today' : 'calendar-cell'}>
              <div className="day-number">{cell.day}</div>
              {shown.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={t.id === selectedId ? 'calendar-card selected' : 'calendar-card'}
                  onClick={() => onSelect(t.id)}
                >
                  {t.title} [{STATUS_LABEL[t.status]}]
                </button>
              ))}
              {hidden > 0 && (
                <button type="button" className="calendar-more" onClick={() => toggleExpanded(key)}>
                  {hidden}개 더
                </button>
              )}
              {open && dayTasks.length > VISIBLE_PER_DAY && (
                <button type="button" className="calendar-more" onClick={() => toggleExpanded(key)}>
                  접기
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Calendar
