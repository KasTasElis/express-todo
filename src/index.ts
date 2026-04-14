import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { connectDB, db } from "./db.js";
import { z } from "zod";
import morgan from "morgan";

const CreateTodoSchema = z.object({
  title: z.string().min(3),
});

const app = express();
const port = 3000;

app.use(express.json());

app.use(morgan("dev"));

// a bit of protection against invalid JSON
function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
}

app.use(errorHandler);

await connectDB();

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
app.post("/todo", async (req, res) => {
  try {
    const parsed = CreateTodoSchema.safeParse(req.body);

    if (parsed.error) {
      res.status(400).json({ errors: parsed.error.issues });
      return;
    }

    const newTodo = {
      title: parsed.data.title,
      completed: false,
    };

    const result = await db.collection("todos").insertOne(newTodo);

    res.status(201).json({ ...newTodo, _id: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create todo" });
  }
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
