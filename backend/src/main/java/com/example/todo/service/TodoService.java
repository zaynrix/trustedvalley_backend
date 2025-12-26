package com.example.todo.service;

import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TodoService {
    private final TodoRepository repo;

    public TodoService(TodoRepository repo) { this.repo = repo; }

    public List<Todo> findAll() { return repo.findAll(); }

    public Todo create(Todo todo) { return repo.save(todo); }

    public Todo update(Long id, Todo todo) {
        return repo.findById(id).map(existing -> {
            existing.setTitle(todo.getTitle());
            existing.setCompleted(todo.isCompleted());
            return repo.save(existing);
        }).orElseThrow(() -> new RuntimeException("Not found"));
    }

    public void delete(Long id) { repo.deleteById(id); }
}
