// Simple in-memory user model for demo/testing.
// For production, replace with persistent DB model (Mongo/SQL/etc.).

const users = [];

module.exports = {
  all: () => users,
  add: (user) => {
    users.push(user);
    return user;
  },
  findByEmail: (email) => users.find(u => u.email === email),
  findById: (id) => users.find(u => u.id === id),
  findByToken: (token) => users.find(u => u.token === token),
};
