import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'
import Calendar from './Calendar'
import TaskEditForm from './TaskEditForm'
import type { TaskValues } from './TaskEditForm'
import { DESCRIPTION_MAX, STATUS_LABEL, STATUS_OPTIONS, TITLE_MAX, monthKey, todayString } from './task'
import type { Status, Task } from './task'

async function fetchMonth(key: string) {
  const res = await fetch(`/api/tasks?month=${key}`)
  if (!res.ok) throw new Error('목록을 불러오지 못했습니다.')
  return ((await res.json()) as { items: Task[] }).items
}

function App() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // 예정일은 필수이고 오늘 날짜를 미리 채워 둔다 (D-021).
  const [scheduledDate, setScheduledDate] = useState(todayString)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  // 어느 달의 응답인지 함께 들고 있어, 달을 옮긴 직후 이전 달의 카드가 새 달에 보이지 않게 한다.
  const [monthData, setMonthData] = useState<{ key: string; items: Task[] } | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState('')
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

  const monthLoaded = monthData?.key === viewKey
  const monthTasks = monthLoaded ? monthData.items : []
  const selected = monthTasks.find((t) => t.id === selectedId) ?? null

  // 다른 카드를 고르면 하던 수정은 취소된다.
  function selectTask(id: number) {
    setSelectedId(id)
    setEditing(false)
    setEditError('')
  }

  function cancelEdit() {
    setEditing(false)
    setEditError('')
  }

  // 서버가 저장한 뒤에 화면을 바꾼다 (D-009). 실패하면 수정 칸을 연 채로 입력을 남기고 안내한다.
  async function updateTask(id: number, values: TaskValues) {
    setNotice('')
    setError('')
    setEditError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (res.status === 404) {
        setError('이미 없는 카드입니다. 목록을 다시 불러옵니다.')
        setSelectedId(null)
        setEditing(false)
        setReloadTick((n) => n + 1)
        return
      }
      if (!res.ok) throw new Error()
      const updated = (await res.json()) as Task
      // 예정일이 다른 달로 옮겨졌으면 그 달로 따라가서 카드를 계속 보여 준다.
      const [y, m] = updated.scheduled_date.split('-').map(Number)
      setViewYear(y)
      setViewMonth(m - 1)
      setReloadTick((n) => n + 1)
      setEditing(false)
      setNotice('수정되었습니다.')
    } catch {
      setEditError('수정하지 못했습니다. 입력한 내용은 그대로 남아 있습니다.')
    } finally {
      setSaving(false)
    }
  }

  function moveMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  function goToday() {}

  async function submit(e: SyntheticEvent) {
    e.preventDefault()
    setNotice('')
    setError('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, scheduled_date: scheduledDate }),
      })
      if (!res.ok) throw new Error()
      const created = (await res.json()) as Task
      setTitle('')
      setDescription('')
      setScheduledDate(todayString())
      setNotice('등록되었습니다.')
      setSelectedId(created.id)
      // 예정일이 보고 있는 달이 아니면 그 달로 옮겨 방금 만든 카드가 보이게 한다.
      const [y, m] = created.scheduled_date.split('-').map(Number)
      setViewYear(y)
      setViewMonth(m - 1)
      setReloadTick((n) => n + 1)
    } catch {
      setError('등록하지 못했습니다.')
    }
  }

  // 서버가 저장한 뒤에 화면을 바꾼다 (D-009). 실패하면 선택 상자는 이전 상태 그대로다.
  async function changeStatus(status: Status) {
    if (!selected) return
    setNotice('')
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${selected.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.status === 404) {
        setError('이미 없는 카드입니다. 목록을 다시 불러옵니다.')
        setSelectedId(null)
        setReloadTick((n) => n + 1)
        return
      }
      if (!res.ok) throw new Error()
      const updated = (await res.json()) as Task
      setMonthData((prev) =>
        prev && { ...prev, items: prev.items.map((t) => (t.id === updated.id ? updated : t)) },
      )
    } catch {
      setError('상태를 바꾸지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 삭제 전에 브라우저 확인창으로 한 번 묻는다 (D-013, D-024). 취소하면 아무 요청도 보내지 않는다.
  // 서버가 지운 뒤에 캘린더에서 카드가 사라진다 (D-009). 실패하면 카드는 그대로다.
  async function deleteTask() {
    if (!selected) return
    if (!window.confirm(`'${selected.title}' 카드를 삭제할까요? 삭제하면 되돌릴 수 없습니다.`)) return
    const id = selected.id
    setNotice('')
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (res.status === 404) {
        setError('이미 없는 카드입니다. 목록을 다시 불러옵니다.')
        setSelectedId(null)
        setReloadTick((n) => n + 1)
        return
      }
      if (!res.ok) throw new Error()
      setMonthData((prev) => prev && { ...prev, items: prev.items.filter((t) => t.id !== id) })
      setSelectedId(null)
      setNotice('삭제되었습니다.')
    } catch {
      setError('삭제하지 못했습니다.')
    } finally {
      setSaving(false)
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
              예정일 (필수)
              <br />
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </label>
          </div>
          <button type="submit" disabled={!title.trim() || !scheduledDate}>
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
          onSelect={selectTask}
          onPrev={() => moveMonth(-1)}
          onNext={() => moveMonth(1)}
          onToday={goToday}
        />
        {monthLoaded && monthTasks.length === 0 && <p>이 달에는 카드가 없습니다.</p>}
        {selected && (
          <div className="task-detail">
            {editing ? (
              <TaskEditForm
                key={selected.id}
                task={selected}
                saving={saving}
                error={editError}
                onSave={(values) => updateTask(selected.id, values)}
                onCancel={cancelEdit}
              />
            ) : (
              <>
            <strong>{selected.title}</strong> [{STATUS_LABEL[selected.status]}]
            <div>예정일: {selected.scheduled_date}</div>
            <div>
              <label>
                상태{' '}
                <select
                  value={selected.status}
                  disabled={saving}
                  onChange={(e) => changeStatus(e.target.value as Status)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>{' '}
              <button type="button" disabled={saving} onClick={() => setEditing(true)}>
                수정
              </button>{' '}
              <button type="button" disabled={saving} onClick={deleteTask}>
                삭제
              </button>
            </div>
            <div>{selected.description || '(설명 없음)'}</div>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
