import "dotenv/config";
import mongoose from "mongoose";
import express, {
  type NextFunction,
  type Response,
  type Request,
} from "express";
import morgan from "morgan";
import z, { ZodError } from "zod";
import { ObjectId } from "mongodb";

const app = express();
const port = 3000;
app.use(express.json());
app.use(morgan("dev"));

const { Schema, model } = mongoose;

await mongoose.connect(process.env.MONGODB_URI!, { dbName: "todo" });

const ZMongoIdSchema = z.string().refine((val) => ObjectId.isValid(val), {
  error: "Invalid Object ID.",
});

const ZCreateTodoSchema = z.object({
  title: z.string().min(3),
});

const ZUpdateTodoSchema = z.object({
  title: z.string().min(3).optional(),
  completed: z.boolean().optional(),
});

const ZGetTodosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  completed: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

const todoSchema = new Schema(
  {
    title: String,
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Todo = model("Todo", todoSchema);

const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error("Something went wrong: ", err);

  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({
    error:
      "Something went wrong, please double check your request or try again later.",
  });
};

// create
app.post("/todo", async (req, res) => {
  const { title } = ZCreateTodoSchema.parse(req.body);

  const todo = await Todo.create({
    title,
  });

  return res.status(201).json(todo);
});

// get by id
app.get("/todo/:id", async (req, res) => {
  const id = ZMongoIdSchema.parse(req.params.id);

  const todo = await Todo.findById(id);

  if (todo === null) {
    return res.sendStatus(404);
  }
  return res.status(200).json(todo);
});

// get many
app.get("/todo", async (req, res) => {
  const { limit, page, search, completed } = ZGetTodosSchema.parse(req.query);

  const filter: Record<string, unknown> = {};

  if (completed !== undefined) {
    filter.completed = completed;
  }

  if (search !== undefined) {
    filter.title = { $regex: search, $options: "i" };
  }

  const todos = await Todo.find(filter)
    .limit(limit)
    .skip((page - 1) * limit);

  return res.status(200).json({ data: todos });
});

// update
app.patch("/todo/:id", async (req, res) => {
  const id = ZMongoIdSchema.parse(req.params.id);
  const body = ZUpdateTodoSchema.parse(req.body);

  const todo = await Todo.findByIdAndUpdate(id, body, {
    returnDocument: "after",
  });

  if (todo === null) {
    return res.sendStatus(404);
  }

  return res.status(200).json(todo);
});

// delete
app.delete("/todo/:id", async (req, res) => {
  const id = ZMongoIdSchema.parse(req.params.id);

  const todo = await Todo.findByIdAndDelete(id);

  if (todo === null) {
    return res.sendStatus(404);
  }

  return res.status(200).json(todo);
});

// Let' allow errors to bubble up, handle them in a single place.
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Eli's todo app listening on port ${port}`);
});
