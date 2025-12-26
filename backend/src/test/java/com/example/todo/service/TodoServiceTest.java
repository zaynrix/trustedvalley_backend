package com.example.todo.service;

import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TodoServiceTest {
    private TodoRepository repo;
    private TodoService service;

    @BeforeEach
    void setup() {
        repo = Mockito.mock(TodoRepository.class);
        service = new TodoService(repo);
    }

    @Test
    void findAll_returnsList() {
        when(repo.findAll()).thenReturn(Arrays.asList(new Todo("A", false)));
        assertEquals(1, service.findAll().size());
    }

    @Test
    void create_saves() {
        Todo t = new Todo("T", false);
        when(repo.save(any())).thenReturn(t);
        Todo saved = service.create(t);
        assertEquals("T", saved.getTitle());
    }

    @Test
    void update_existing() {
        Todo existing = new Todo("Old", false);
        existing.setId(1L);
        when(repo.findById(1L)).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        Todo updated = service.update(1L, new Todo("New", true));
        assertEquals("New", updated.getTitle());
        assertTrue(updated.isCompleted());
    }
}
