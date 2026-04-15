import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { connectDB, db } from "./db.js";
import { z } from "zod";
import morgan from "morgan";
import { ObjectId, type Document, type Filter } from "mongodb";

const TodoSchema = z.object({
  title: z.string(),
  completed: z.boolean(),
});

type Todo = z.infer<typeof TodoSchema> & { _id?: ObjectId };

const TodoIdSchema = z
  .string()
  .refine((val) => ObjectId.isValid(val), {
    error: "You passed an Invalid ID.",
  })
  .transform((val) => new ObjectId(val));

const CreateTodoSchema = z.object({
  title: z.string().min(3),
});

const UpdateTodoSchema = z.object({
  title: z.string().min(3).optional(),
  completed: z.boolean().optional(),
});

const GetTodosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  completed: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

const getCollection = <T extends Document>(name: string) =>
  db.collection<T>(name);

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

await connectDB();

const todos = getCollection<Todo>("todos");

// hello world
app.get("/", (req, res) => {
  res.send("Hello Eli!");
});

// get one
app.get("/todo/:id", async (req, res) => {
  const parsed = TodoIdSchema.safeParse(req.params.id);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  try {
    const result = await todos.findOne({ _id: parsed.data });
    if (result === null) {
      return res.sendStatus(404);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error." });
  }
});

// get many
app.get("/todo", async (req, res) => {
  const parsed = GetTodosSchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query parameters." });
  }

  const filter: Filter<Todo> = {} as Filter<Todo>;

  if (parsed.data.completed !== undefined) {
    filter.completed = parsed.data.completed;
  }

  if (parsed.data.search) {
    filter.title = { $regex: parsed.data.search, $options: "i" };
  }

  try {
    const response = await todos
      .find(filter)
      .skip((parsed.data.page - 1) * parsed.data.limit)
      .limit(parsed.data.limit)
      .toArray();

    return res.status(200).json({ data: response });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Problem while fetching todos." });
  }
});

// insert one
app.post("/todo", async (req, res) => {
  try {
    const parsed = CreateTodoSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }

    const newTodo = {
      title: parsed.data.title,
      completed: false,
    };

    const result = await todos.insertOne(newTodo);

    res.status(201).json({ ...newTodo, _id: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// update one
app.patch("/todo/:id", async (req, res) => {
  const parsedParams = TodoIdSchema.safeParse(req.params.id);
  const parsedBody = UpdateTodoSchema.safeParse(req.body);

  if (!parsedParams.success) {
    return res.status(400).json({ error: parsedParams.error.issues });
  }

  if (!parsedBody.success) {
    return res.status(400).json({ error: parsedBody.error.issues });
  }

  const newTodo = parsedBody.data;

  try {
    const response = await todos.findOneAndUpdate(
      { _id: parsedParams.data },
      { $set: newTodo as Partial<Todo> },
      { returnDocument: "after" },
    );

    if (response === null) {
      return res.sendStatus(404);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Problem while updating todo: ", error);
    return res.status(500).json({ error: "Problem while updating todo" });
  }
});

// delete one
app.delete("/todo/:id", async (req, res) => {
  const parsed = TodoIdSchema.safeParse(req.params.id);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  try {
    const result = await todos.deleteOne({ _id: parsed.data });

    if (result.deletedCount === 0) {
      return res.sendStatus(404);
    }

    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete todo." });
  }
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
