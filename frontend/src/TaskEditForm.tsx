import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { DESCRIPTION_MAX, TITLE_MAX } from './task'
import type { Task } from './task'

export type TaskValues = { title: string; description: string; scheduled_date: string }

type Props = {
  task: Task
  saving: boolean
  error: string
  onSave: (values: TaskValues) => void
  onCancel: () => void
}

// 카드 상세 영역에서 바로 제목 · 설명 · 예정일을 고친다 (D-025).
// 입력값은 이 컴포넌트가 들고 있어, 저장이 실패해도 입력 중이던 내용이 남는다.
function TaskEditForm({ task, saving, error, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [scheduledDate, setScheduledDate] = useState(task.scheduled_date)

  function submit(e: SyntheticEvent) {
    e.preventDefault()
    onSave({ title, description, scheduled_date: scheduledDate })
  }

  return (
    <form onSubmit={submit}>
      <div>
        <label>
          제목 (필수)
          <br />
          <input
            value={title}
            maxLength={TITLE_MAX}
            style={{ width: '60%', boxSizing: 'border-box' }}
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
            rows={4}
            style={{ width: '60%', boxSizing: 'border-box' }}
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
          <input type="date" required value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={saving || !title.trim() || !scheduledDate}>
        저장
      </button>{' '}
      <button type="button" disabled={saving} onClick={onCancel}>
        취소
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

export default TaskEditForm
