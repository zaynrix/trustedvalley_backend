import React, {useEffect, useState} from 'react';

function App(){
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');

  useEffect(()=>{ fetch('/api/todos').then(r=>r.json()).then(setTodos); }, []);

  async function add(){
    const res = await fetch('/api/todos', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title, completed:false})});
    const t = await res.json();
    setTodos(prev => [...prev, t]);
    setTitle('');
  }

  return (
    <div style={{padding:20}}>
      <h1>Todo App</h1>
      <input value={title} onChange={e=>setTitle(e.target.value)} />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map(t => <li key={t.id}>{t.title} {t.completed ? '✓':''}</li>)}
      </ul>
    </div>
  )
}

export default App;
