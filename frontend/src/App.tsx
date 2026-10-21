import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'
import Calendar from './Calendar'
import { STATUS_LABEL, monthKey } from './task'
import type { Task } from './task'

const TITLE_MAX = 100
const DESCRIPTION_MAX = 300

type Page = { items: Task[]; has_more: boolean }

async function fetchMonth(key: string) {
  const res = await fetch(`/api/tasks?month=${key}`)
  if (!res.ok) throw new Error('목록을 불러오지 못했습니다.')
  return ((await res.json()) as { items: Task[] }).items
}

async function fetchUndated(offset: number) {
  const res = await fetch(`/api/tasks?undated=true&offset=${offset}`)
  if (!res.ok) throw new Error('목록을 불러오지 못했습니다.')
  return (await res.json()) as Page
}

function App() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  // 어느 달의 응답인지 함께 들고 있어, 달을 옮긴 직후 이전 달의 카드가 새 달에 보이지 않게 한다.
  const [monthData, setMonthData] = useState<{ key: string; items: Task[] } | null>(null)
  const [undated, setUndated] = useState<Task[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const viewKey = monthKey(viewYear, viewMonth)

  useEffect(() => {
    let cancelled = false
    fetchMonth(viewKey)
      .then((items) => {
        if (!cancelled) setMonthData({ key: viewKey, items })
      })
      .catch(() => {
        if (!cancelled) setError('목록을 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [viewKey, reloadTick])

  useEffect(() => {
    let cancelled = false
    fetchUndated(0)
      .then((page) => {
        if (cancelled) return
        setUndated(page.items)
        setHasMore(page.has_more)
      })
      .catch(() => {
        if (!cancelled) setError('목록을 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [reloadTick])

  const monthLoaded = monthData?.key === viewKey
  const monthTasks = monthLoaded ? monthData.items : []
  const selected = [...monthTasks, ...undated].find((t) => t.id === selectedId) ?? null

  function moveMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  function goToday() {
    const d = new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  async function submit(e: SyntheticEvent) {
    e.preventDefault()
    setNotice('')
    setError('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, scheduled_date: scheduledDate || null }),
      })
      if (!res.ok) throw new Error()
      const created = (await res.json()) as Task
      setTitle('')
      setDescription('')
      setScheduledDate('')
      setNotice('등록되었습니다.')
      setSelectedId(created.id)
      // 예정일이 보고 있는 달이 아니면 그 달로 옮겨 방금 만든 카드가 보이게 한다.
      if (created.scheduled_date) {
        const [y, m] = created.scheduled_date.split('-').map(Number)
        setViewYear(y)
        setViewMonth(m - 1)
      }
      setReloadTick((n) => n + 1)
    } catch {
      setError('등록하지 못했습니다.')
    }
  }

  async function loadMoreUndated() {
    try {
      const page = await fetchUndated(undated.length)
      setUndated((prev) => [...prev, ...page.items])
      setHasMore(page.has_more)
    } catch {
      setError('목록을 불러오지 못했습니다.')
    }
  }

  return (
    <main>
      <section>
        <h2>카드 작성</h2>
        <form onSubmit={submit}>
          <div>
            <label>
              제목 (필수)
              <br />
              <input
                value={title}
                maxLength={TITLE_MAX}
                style={{ width: '30%', boxSizing: 'border-box' }}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div>
              {title.length} / {TITLE_MAX}
            </div>
          </div>
          <div>
            <label>
              설명 (선택)
              <br />
              <textarea
                value={description}
                maxLength={DESCRIPTION_MAX}
                rows={6}
                style={{ width: '30%', boxSizing: 'border-box' }}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div>
              {description.length} / {DESCRIPTION_MAX}
            </div>
          </div>
          <div>
            <label>
              예정일 (선택)
              <br />
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={!title.trim()}>
            등록
          </button>
        </form>
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
      </section>

      <section>
        <h2>캘린더</h2>
        <Calendar
          year={viewYear}
          month={viewMonth}
          tasks={monthTasks}
          loading={!monthLoaded}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPrev={() => moveMonth(-1)}
          onNext={() => moveMonth(1)}
          onToday={goToday}
        />
        {selected && (
          <div className="task-detail">
            <strong>{selected.title}</strong> [{STATUS_LABEL[selected.status]}]
            {selected.scheduled_date && <div>예정일: {selected.scheduled_date}</div>}
            <div>{selected.description || '(설명 없음)'}</div>
          </div>
        )}
      </section>

      <section>
        <h2>날짜 없음</h2>
        {undated.length === 0 ? (
          <p>날짜 없는 카드가 없습니다.</p>
        ) : (
          <ul>
            {undated.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setSelectedId(t.id)}>
                  {t.title} [{STATUS_LABEL[t.status]}]
                </button>
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <button type="button" onClick={loadMoreUndated}>
            더 보기
          </button>
        )}
      </section>
    </main>
  )
}

export default App
