package com.example.todo.controller;

import com.example.todo.TodoApplication;
import com.example.todo.model.Todo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = TodoApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TodoControllerIntegrationTest {
    @Autowired
    private TestRestTemplate rest;

    @Test
    void create_and_list() {
        Todo t = new Todo("Integration", false);
        ResponseEntity<Todo> resp = rest.postForEntity("/api/todos", t, Todo.class);
        assertEquals(200, resp.getStatusCodeValue());

        Todo[] list = rest.getForObject("/api/todos", Todo[].class);
        assertTrue(list.length >= 1);
    }
}
