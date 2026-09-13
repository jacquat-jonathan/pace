type Row = Record<string, any>

export function createFakeSupabase(initial: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.entries(initial).map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
  )

  function from(table: string) {
    tables[table] ??= []
    const filters: Array<(r: Row) => boolean> = []
    let orderBy: { col: string; ascending: boolean } | null = null
    let pendingOp:
      | null
      | { type: 'insert' | 'upsert' | 'update' | 'delete'; payload?: Row } = null

    function applyFilters(list: Row[]) {
      return list.filter((r) => filters.every((f) => f(r)))
    }

    function currentResult(): { data: any; error: null } {
      if (pendingOp?.type === 'insert') {
        const row = { id: crypto.randomUUID(), ...pendingOp.payload }
        tables[table].push(row)
        return { data: [row], error: null }
      }
      if (pendingOp?.type === 'upsert') {
        const payload = pendingOp.payload!
        const idx = tables[table].findIndex((r) => r.id === payload.id)
        const row = { id: payload.id ?? crypto.randomUUID(), ...payload }
        if (idx >= 0) tables[table][idx] = { ...tables[table][idx], ...row }
        else tables[table].push(row)
        return { data: [tables[table].find((r) => r.id === row.id)], error: null }
      }
      if (pendingOp?.type === 'update') {
        const matched = applyFilters(tables[table])
        matched.forEach((r) => Object.assign(r, pendingOp!.payload))
        return { data: matched, error: null }
      }
      if (pendingOp?.type === 'delete') {
        const matched = applyFilters(tables[table])
        tables[table] = tables[table].filter((r) => !matched.includes(r))
        return { data: matched, error: null }
      }
      let result = applyFilters(tables[table])
      if (orderBy) {
        const { col, ascending } = orderBy
        result = [...result].sort((a, b) => {
          const dir = ascending ? 1 : -1
          return a[col] > b[col] ? dir : a[col] < b[col] ? -dir : 0
        })
      }
      return { data: result, error: null }
    }

    const builder: any = {
      select() {
        return builder
      },
      eq(col: string, val: any) {
        filters.push((r) => r[col] === val)
        return builder
      },
      order(col: string, opts: { ascending: boolean }) {
        orderBy = { col, ascending: opts.ascending }
        return builder
      },
      insert(payload: Row) {
        pendingOp = { type: 'insert', payload }
        return builder
      },
      upsert(payload: Row) {
        pendingOp = { type: 'upsert', payload }
        return builder
      },
      update(payload: Row) {
        pendingOp = { type: 'update', payload }
        return builder
      },
      delete() {
        pendingOp = { type: 'delete' }
        return builder
      },
      maybeSingle() {
        const { data, error } = currentResult()
        return Promise.resolve({ data: data?.[0] ?? null, error })
      },
      single() {
        const { data, error } = currentResult()
        return Promise.resolve({ data: data?.[0] ?? null, error })
      },
      then(resolve: any, reject: any) {
        return Promise.resolve(currentResult()).then(resolve, reject)
      },
    }

    return builder
  }

  return { from, _tables: tables }
}
