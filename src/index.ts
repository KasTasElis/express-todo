import express from "express";
const app = express();
const port = 3000;

app.use(express.json());

// hello world
app.get("/", (req, res) => {
  res.send("Hello Eli!");
});

// get one
app.get("/todo/:id", (req, res) => {
  const todo = { id: req.params.id, title: "hello world" };
  res.status(200).json(todo);
});

// get many
app.get("/todo", (req, res) => {
  // play with search params
  console.log("Query: ", req.query.name);
  console.log("Query: ", req.query.age);

  const todos = [1, 2, 3, 4, 5, 6, 7, 8].map((item) => ({
    id: item,
    title: `Item ${item}`,
  }));
  res.status(200).json({ data: todos });
});

// insert one
app.post("/todo", (req, res) => {
  const newTodo = {
    id: req.body.id,
    title: req.body.title,
  };

  res.status(201).json(newTodo);
});

// update one
app.patch("/todo/:id", (req, res) => {
  const updatedTodo = {
    id: req.params.id,
    title: req.body.title,
  };

  res.status(200).json(updatedTodo);
});

// delete one
app.delete("/todo/:id", (req, res) => {
  res.sendStatus(204);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
