import { useState, useEffect, useCallback } from 'react'

export function useBooks(collection) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true)
      const result = await window.api.getBooks(collection)
      if (result.success) setBooks(result.data)
      else setError(result.error)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [collection])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const addBook = useCallback(async (book) => {
    const result = await window.api.addBook(book)
    if (result.success) { setBooks(prev => [result.data, ...prev]); return result.data }
    throw new Error(result.error)
  }, [])

  const updateBook = useCallback(async (id, updates) => {
    const result = await window.api.updateBook(id, updates)
    if (result.success) {
      setBooks(prev => prev.map(b => b.id === id ? result.data : b))
      return result.data
    }
    throw new Error(result.error)
  }, [])

  const deleteBook = useCallback(async (id) => {
    const result = await window.api.deleteBook(id)
    if (result.success) setBooks(prev => prev.filter(b => b.id !== id))
    else throw new Error(result.error)
  }, [])

  return { books, loading, error, refetch: fetchBooks, addBook, updateBook, deleteBook }
}
