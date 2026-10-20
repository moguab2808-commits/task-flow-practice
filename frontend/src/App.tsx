import { useCallback, useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

const TITLE_MAX = 100
const DESCRIPTION_MAX = 300

type Status = 'TODO' | 'IN_PROGRESS' | 'DONE'
type Task = {
  id: number
  title: string
  description: string
  status: Status
}

const STATUS_LABEL: Record<Status, string> = {
  TODO: '할 일',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
}

async function fetchTasks(offset: number) {
  const res = await fetch(`/api/tasks?offset=${offset}`)
  if (!res.ok) throw new Error('목록을 불러오지 못했습니다.')
  return (await res.json()) as { items: Task[]; has_more: boolean }
}

function App() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadFirstPage = useCallback(async () => {
    try {
      const page = await fetchTasks(0)
      setTasks(page.items)
      setHasMore(page.has_more)
    } catch {
      setError('목록을 불러오지 못했습니다.')
    }
  }, [])

  useEffect(() => {
    loadFirstPage()
  }, [loadFirstPage])

  async function submit(e: SyntheticEvent) {
    e.preventDefault()
    setNotice('')
    setError('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })
      if (!res.ok) throw new Error()
      setTitle('')
      setDescription('')
      setNotice('등록되었습니다.')
      await loadFirstPage()
    } catch {
      setError('등록하지 못했습니다.')
    }
  }

  async function loadMore() {
    try {
      const page = await fetchTasks(tasks.length)
      setTasks((prev) => [...prev, ...page.items])
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
          <button type="submit" disabled={!title.trim()}>
            등록
          </button>
        </form>
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
      </section>

      <section>
        <h2>카드 목록</h2>
        {tasks.length === 0 ? (
          <p>아직 카드가 없습니다.</p>
        ) : (
          <ul>
            {tasks.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong> [{STATUS_LABEL[t.status]}]
                {t.description && <div>{t.description}</div>}
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <button type="button" onClick={loadMore}>
            더 보기
          </button>
        )}
      </section>
    </main>
  )
}

export default App
