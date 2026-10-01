// This file defines the "task" router for our tRPC API. A router is a collection of
// related procedures that handle a specific data entity or feature. This file contains
// all the server-side logic for task-related operations.

// TRPCError is tRPC's error class. A `code` of "NOT_FOUND" becomes an HTTP 404.
// A plain `throw new Error(...)` would have become a generic 500 instead.
import { TRPCError } from "@trpc/server";

// Zod is a TypeScript-first schema validation library. In the T3 stack, it's used
// to define the expected shape and types of the input for your API procedures.
// This ensures that any data sent from the client to this endpoint is valid before
// your code even tries to process it.
import { z } from "zod";

// These are helper functions from the main tRPC configuration file (/server/api/trpc.ts).
// - createTRPCRouter is used to create a new router, which is like a container
//   for a group of related API endpoints (e.g., all endpoints for handling tasks).
// - protectedProcedure requires the caller to be logged in. If there is no
//   session it throws UNAUTHORIZED before the resolver runs, and afterwards
//   ctx.session.user is guaranteed to exist.
import { createTRPCRouter, protectedProcedure } from "../trpc";

  // Here, we're creating and exporting a router specifically for handling "task" operations.
  // This `taskRouter` will be merged into your main `appRouter` so that its endpoints
  // become accessible to the frontend under the `task` namespace (e.g., `api.task.getAll`).
  export const taskRouter = createTRPCRouter({

    // This defines the `getAll` API endpoint within the taskRouter.
  
    // - getAll: This is the name of the procedure. On the frontend, you'll call
    //   this using a hook like api.task.getAll.useQuery().
   
    // - protectedProcedure: Specifies that this endpoint is protected and requires the user to be authenticated.
   
    // - .query(async ({ ctx }) => { ... }):  This declares it as a data-fetching
    //   operation. The function inside is the "resolver" that runs on the server.
   
    // - async ({ ctx }): The resolver function receives a ctx (context) object.
    //   The context is configured in your main tRPC file and contains things
    //   that every procedure might need, like the database connection (db) and user
    //   session info.
   
    // - return ctx.db.task.findMany(...): This is where Prisma comes in.
    //   - ctx.db is your Prisma Client instance, providing type-safe access to your database.
    //   - .task directly corresponds to the Task model in your schema.prisma.
    //   - .findMany() with `where: { userId }` returns only the signed-in user's tasks.
    //     The id comes from the server-side session, not from the client.
    //   - orderBy: { createdAt: "desc" } is an option passed to findMany to sort
    //     the results by the createdAt field in descending order (newest tasks first).
   
    // The data returned by this function is automatically serialized by trpc and sent to the client.
    // tRPC also infers the TypeScript type of this return value (when trpc does this to the entire AppRouter), giving you full
    // end-to-end type safety on the frontend.
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return ctx.db.task.findMany({ where: { userId: ctx.session.user.id }, orderBy: { createdAt: "desc" } });
    }),

    // This defines the `create` API endpoint within the `taskRouter`.
    // It's a `mutation` procedure, meaning it's designed for writing or changing data.
    // Its purpose is to create a new task in the database.
    //
    // - `create:`: The name of the procedure. The frontend will use a hook like
    //   `api.task.create.useMutation()` to call this endpoint.
    //
    // - `protectedProcedure`: Again, this specifies that the endpoint is protected and
    //    requires the user to be authenticated.
    create: protectedProcedure

      //   - `.input()`: Declares that this procedure expects input data from the client.
      //   - `z.object({...})`: Uses Zod to define the schema for the input. It must be
      //     a JavaScript object.
      //   - `{ title: z.string().min(1) }`: Specifies that the object must have a `title`
      //     property which must be a string with at least 1 character (it cannot be empty).
      //     `.max(255)` Specifies that the object must have a `title`
      //     property which must be a string with a maximum length of 255 characters.
      //   - tRPC automatically validates incoming data against this schema.
      //     If the client sends invalid data (e.g., no title, or a title that isn't a string),
      //     tRPC will reject the request with an error before the mutation code even runs.
      // The `{ message: "..." }` is the second argument to `.min()` and `.max()`, providing a
      // specific error message if the title fails the validation.
      .input(z.object({ title: z.string().min(1, { message: "Task title cannot be empty." }).max(255, { message: "Task title must be at most 255 characters." }) }))

      // - `.mutation(async ({ ctx, input }) => { ... })`: This declares the procedure as
      //   a "mutation" (a data-changing operation).
      //   - The resolver function receives two arguments:
      //     - `ctx`: The context object, containing our Prisma database client (`ctx.db`).
      //     - `input`: The validated and type-safe input data from the client. Because of the
      //       Zod schema, TypeScript knows that `input` is an object with a `title` property
      //       of type `string`.
      .mutation(async ({ ctx, input }) => {

        // - `return ctx.db.task.create({ data: { title: input.title } });`: This is the
        //   core logic that executes if the input is valid.
        //   - `ctx.db.task.create()`: Calls the `create` method on the Prisma `Task` model.
        //   - `{ data: { title: input.title } }`: Provides the data for the new task record.
        //     We set the `title` column to the value we received in the validated `input`.
        //   - `userId` is set to the user's ID from the server-side session. It is not part of the Zod input,
        //     so a client cannot choose which user owns the new task.
        //   - Other fields like `id`, `completed`, `createdAt`, and `updatedAt` are handled
        //     automatically by Prisma/the database based on the `@default` rules in the schema.
        //
        // The newly created task object, including its database-generated ID and timestamps,
        // is returned by Prisma, and tRPC then sends it back to the client as the result
        // of the mutation.
        return ctx.db.task.create({ data: { title: input.title, userId: ctx.session.user.id } });
      }),


    // Defines a new protected procedure named 'toggle.
    toggle: protectedProcedure

      // Specifies that this procedure requires input from the client.
      // Using Zod, it validates that the input is an object containing a string 'id'.
      .input(z.object({ id: z.string() }))

      // Defines this as a mutation (a data-changing operation) and provides the server-side function to run.
      .mutation(async ({ ctx, input }) => {

        // Both fields are required. Matching on id alone would let any logged-in user
        // toggle someone else's task.
        const where = { id: input.id, userId: ctx.session.user.id };

        // Find the task by id and user id.
        const task = await ctx.db.task.findFirst({ where });

        // If the task is not found, throw an error.
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

        // If the task was found, update it in the database. The 'return' sends the updated task back to the client.
        return ctx.db.task.update({

          // Specifies that we want to update the task with the provided 'id' and 'user id'.
          where,

          // Updates the 'completed' field to its opposite value.
          data: { completed: !task.completed },
        });
      }),

    // Defines a new protected procedure named 'delete'.
    delete: protectedProcedure

      // Specifies that this procedure requires input from the client.
      // Using Zod, it validates that the input is an object containing a string 'id'.
      .input(z.object({ id: z.string() }))

      // Defines this as a mutation (a data-changing operation) and provides the server-side function to run.
      .mutation(async ({ ctx, input }) => {

        // Both fields are required. Matching on id alone would let any logged-in user
        // delete someone else's task.
        const where = { id: input.id, userId: ctx.session.user.id };

        // Find the task by id and user id.
        const task = await ctx.db.task.findFirst({ where });

        // If the task is not found, throw an error.
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

        // Delete the task by id and user id.
        return ctx.db.task.delete({ where });
      }),
  });