// This file defines the Next.js App Router page for the /login route.
//
// Its main responsibilities are:
// 1. To render a login form with email and password fields.
// 2. To manage the state of the form's inputs and its submission loading status.
// 3. To call the NextAuth `signIn` function when the form is submitted, sending the
//    user's credentials to the backend for verification.
// 4. To provide feedback to the user (via toasts) and redirect them upon success or failure.

// This directive is essential. It marks this component as a "Client Component", meaning its
// JavaScript will be sent to and run in the user's browser. This is required because this
// component uses hooks (`useState`, `useRouter`) and handles user interactions (form submission),
// which can only happen on the client side.
"use client";

// Imports the `useState` hook from the React library. This is a fundamental hook that allows
// function components to have "state" — variables whose changes will cause the component to
// re-render and update the UI. We will use it to store the user's input and the form's loading status.
import { useState } from "react";

// Imports the `signIn` function from the `next-auth/react` library. This is the primary
// client-side function used to initiate a sign-in attempt.
import { signIn } from "next-auth/react";

// Imports the `useRouter` and `useSearchParams` hooks from Next.js's App Router navigation library.
// - `useRouter`: This hook gives us access to the router instance, which allows us to programmatically
//   navigate the user to a different page (e.g., redirecting to the `/tasks` page after a successful login).
// - `useSearchParams`: This hook lets us read the current URL's query parameters (such as `?callbackUrl=/tasks`),
//   making it easy to access values passed in the URL for things like redirects or conditional logic.
import { useRouter, useSearchParams } from "next/navigation";

// Imports the `toast` function from the `react-hot-toast` library. This is a utility for
// displaying small, non-intrusive notification pop-ups (toasts) to provide immediate
// feedback to the user, such as "Logged in!" or "Login failed".
import { toast } from "react-hot-toast";

// Imports the main `z` object from the "zod" library. Zod is a powerful tool for runtime data validation,
// which helps ensure that data we receive matches the exact shape and type we expect.
import { z } from "zod";

// This defines a "schema" using Zod, which acts as a blueprint or a set of rules for our data.
// We are declaring that a valid response from our `/api/auth/check-email` endpoint must be an object
// containing an `exists` property that is a boolean, and an `emailVerified` property that is also a boolean.
const checkEmailResponseSchema = z.object({
  exists: z.boolean(),
  emailVerified: z.boolean(),
});

// Defines and exports the main React component for the login page.
// `export default` makes this component available to be imported by the Next.js routing system.
export default function LoginPage() {

  // Calls the `useRouter` hook to get access to the Next.js router instance.
  // The returned `router` object contains methods for navigation, like `router.push()`,
  // which we will use to redirect the user after a successful login.
  const router = useRouter();

  // Get the search parameters from the URL (e.g., "?callbackUrl=/tasks")
  const params = useSearchParams();

  // `params.get("callbackUrl")` reads the query string, for example `?callbackUrl=/tasks`.
  // It returns that string, or `null` when the parameter is missing.
  // This value is not trusted. It comes from the URL, so a link can set it to anything,
  // including an address on another site.
  const rawCallbackUrl = params.get("callbackUrl");

  // After a successful login, `router.push(callbackUrl)` sends the browser to this value.
  // Only a path on this site is allowed:
  // - `startsWith("/")` keeps absolute URLs like `https://evil.example` out.
  // - `startsWith("//")` is rejected because a browser treats `//evil.example` as a
  //   URL on another site, even though the string starts with `/`.
  // Anything else, including a missing parameter, falls back to `/tasks`.
  const callbackUrl = rawCallbackUrl?.startsWith("/") && !rawCallbackUrl.startsWith("//") ? rawCallbackUrl : "/tasks";

  // 1. `useState({ email: "", password: "" })`: This calls the `useState` hook. We pass it an
  //    initial value: an object with `email` and `password` keys set to empty strings.

  // 2. The `useState` function always returns an array containing
  //    exactly two elements: `[ currentValue, setterFunction ]`.

  //    In this case, on the first render, it returns: `[ { email: "", password: "" }, [function] ]`.
  // 3. `const [formData, setFormData] = ...`: This is JavaScript's "Array Destructuring" syntax.
  //    It's a shortcut for unpacking values from an array into distinct variables.
  //    - The first variable, `formData`, is assigned the first element from the returned array (the current state value).
  //    - The second variable, `setFormData`, is assigned the second element from the returned array (the setter function).
  const [formData, setFormData] = useState({ email: "", password: "" });

  // 1. `useState(false)`: We call the `useState` hook again. This time, the initial value is `false`.
  // 2. On the first render, this call returns an array: `[ false, [function] ]`.
  //
  // 3. `const [isLoading, setIsLoading] = ...`: We use array destructuring again.
  //    - The `isLoading` variable is assigned the first element of the array (`false`). We will use this
  //      boolean value to conditionally disable the submit button or change its text.
  //    - The `setIsLoading` variable is assigned the second element (the setter function for this specific
  //      piece of state). We will call `setIsLoading(true)` when the form submission starts.
  const [isLoading, setIsLoading] = useState(false);

  // This function is an event handler. Its purpose is to be executed every time a user
  // interacts with a form input. Specifically, it will be attached to the `onChange` prop of
  // our input fields in the JSX below. The `onChange` event fires on every single keystroke,
  // which means this function will run each time the user types or deletes a character.
  //
  // Instead of creating a separate handler for each input (like `handleEmailChange`),
  // this single function can handle all of them by using the `name` attribute of the HTML
  // input to dynamically update the correct piece of state.
  //
  // 1. `const handleChange = ...`
  //    - This is an arrow function expression. We are defining a function and assigning it to a
  //      constant variable named `handleChange`. This is the standard way to define functions
  //      inside a React component.
  //
  // 2. `(e: React.ChangeEvent<HTMLInputElement>)`
  //    - `(`...`)`: These parentheses contain the parameter list for the function.
  //
  //    - `e`: The name of the single parameter this function accepts. When the `onChange` event
  //      fires, React automatically calls this handler and passes a "Synthetic Event" object
  //      as this argument. Different browsers (Chrome, Firefox, etc.) can have minor
  //        differences in their native event objects. React creates a "Synthetic Event" as a
  //        consistent, cross-browser wrapper. This ensures properties like `e.target.value`
  //        work identically for every user on every browser.
  //
  //    - `:`: The colon begins a TypeScript "type annotation," which specifies the data type of the `e` parameter.
  //
  //    - `React.ChangeEvent<HTMLInputElement>`: This is the specific data type for the `e` parameter.
  //
  //      - `React.ChangeEvent` (The Base Type): The base type for any change event.
  //
  //      - `<...>` (The Generic Syntax): The angle brackets make the base type more specific.
  //
  //      - `HTMLInputElement` (The Specific Type): This specifies that the event is guaranteed
  //        to have come from a standard HTML `<input>` element. `HTMLInputElement` is a globally
  //        available type provided by TypeScript's built-in DOM library.
  //
  //    By providing this very specific data type, our code becomes safer and our editor can provide
  //    perfect autocompletion for properties like `e.target.value` and `e.target.name`.
  //
  // 3. `=>`: This is the "arrow" that separates the parameter list from the function's body.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    // This line updates the form's state whenever the user types into an input field.
    // `setFormData(...)`: We call the state setter function to provide the new state.
    // `{ ... }`: We are creating a new object for the updated state.
    // `...formData`: This is the "spread syntax". It copies all the current key-value pairs from the
    //   `formData` object into this new object. This is crucial because it ensures that when we update
    //   one field (like 'email'), we don't lose the value of the other fields (like 'password').
    // 
    // `[e.target.name]: e.target.value`: This is a "computed property name". It's the key to making this function reusable.
    // The brackets [] around a property name are a special signal to the JavaScript engine. They mean:
    // "Don't use what's inside the brackets as a literal key. Instead, treat it as an expression, evaluate it 
    // first, and then use the result of that expression as the property name."
    // 
    //   - `e.target`: Refers to the specific `<input>` element the user typed into.
    //   - `e.target.name`: Gets the `name` attribute from that input (e.g., "email" or "password").
    //   - `e.target.value`: Gets the new text content of that input.
    //   This syntax dynamically sets the key in our new state object. If the user typed in the email
    //   field, this line effectively becomes `email: "new-email-value"`.
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // This defines the asynchronous event handler function that will be executed when the user submits the form.
  // This function is assigned to the `onSubmit` prop of the `<form>` element in the JSX below.
  //
  // - `const handleSubmit = ...`: An "Arrow Function" is defined and assigned to a constant named `handleSubmit`.
  // - `async`: This keyword is essential. It declares that this function contains asynchronous operations (the `await signIn` call)
  //   and allows us to use the `await` keyword inside it to pause execution.
  // - `(e: React.FormEvent)`: The parameter list.
  //   - `e`: The name of the parameter that will hold React's "Synthetic Event" object.
  //   - `: React.FormEvent`: This is the TypeScript data type for the `e` parameter. It specifies that this
  //     is a `FormEvent` (like a submission), which is different from a `ChangeEvent` (like typing).
  const handleSubmit = async (e: React.FormEvent) => {

    // This is a CRITICAL line for single-page applications (SPAs).
    // By default, when a browser form is submitted, the browser performs a full-page reload.
    // `e.preventDefault()`: This method on the event object stops that default browser behavior, allowing
    // us to handle the form submission with our own JavaScript logic without a page refresh.
    e.preventDefault();

    // We immediately call our state setter function to set the loading status to `true`.
    // This will trigger a re-render of the component, which will update the UI to show a
    // "Logging in..." message and disable the submit button, preventing duplicate submissions.
    setIsLoading(true);

    // A network request, like logging in, takes time. JavaScript doesn't wait for it by default. It
    // moves on to the next line immediately. A `Promise` is a special JavaScript object that acts
    // as a placeholder for the future result of an asynchronous operation.
    // A Promise starts in a pending state. Eventually, it will settle into one of two states:
    // 1. Fulfilled: The operation was successful, and the Promise now holds the resulting value.
    // 2. Rejected: The operation failed, and the Promise now holds an error.
    //
    // `signIn(...)`: This function does not immediately return the login result. Instead, it
    // immediately returns a `Promise` that is in the pending state.
    //
    // `await`: This keyword is the key to working with Promises. It tells JavaScript:
    // "Pause the execution of this `handleSubmit` function right here. Wait until the Promise
    // returned by `signIn` has settled. Once it has settled,
    // unwrap the result from the Promise and assign it to the `res` variable, then resume execution."
    
    // The `signIn` function takes two arguments:
    //
    // 1. `"credentials"`: A string identifying which authentication provider to use. This must
    //    match the ID of the provider configured in the backend auth options.
    //
    // 2. An `options` object:
    //    - `redirect: false`: This is the key setting. By default, `signIn` would automatically
    //      redirect the user to the previous page on success. We set this to `false` to
    //      prevent that automatic redirect. Instead, the promise returned by `signIn` will
    //      resolve with an object containing the login result (`ok`, `error`, etc.).
    //      This gives us manual control to show a success/error toast before we redirect.
    //
    //    - `...formData`: This is the JavaScript "spread syntax" for objects. It's a concise way
    //      to copy all of the key-value pairs from one object into another.
    //
    //      Imagine our `formData` state object looks like this: `{ email: "user@test.com", password: "123" }`.
    //      The spread syntax `...formData` effectively "unpacks" that object. The final options
    //      object passed to `signIn` becomes the equivalent of writing this manually:
    //      {
    //        redirect: false,
    //        email: "user@test.com",  <-- Copied from formData
    //        password: "123"          <-- Copied from formData
    //      }
    //
    //      This is how the credentials typed by the user into the form (and stored in our state) are
    //      actually passed to the `signIn` function to be sent to the backend.
    const res = await signIn("credentials", {
      redirect: false,
      ...formData,

      // This is the key that makes our dynamic redirection work. We are passing the `callbackUrl`
      // variable (which we extracted from the URL search params earlier) into the `signIn` function.
      //
      // NextAuth's "credentials" provider is smart enough to look for this specific `callbackUrl`
      // property in the options. While it won't perform the redirect itself (because we set `redirect: false`),
      // it will include this URL in the response object it returns upon a successful login.
      //
      // For example, the `res` object might look like:
      // { ok: true, error: null, url: "http://localhost:3000/tasks" }
      //
      // We can then use this `res.url` in our manual redirect logic (`router.push(...)`), ensuring
      // the user is sent to the correct destination that was originally requested.
      callbackUrl,
    });
    
    // Immediately after the login attempt, we call `setIsLoading(false)` to reset the form's loading state. This will
    // trigger a re-render, re-enabling the submit button and changing its text back to "Login",
    // allowing the user to try again if the login failed.
    setIsLoading(false);

    // This block of code checks if the login attempt resulted in an error.
    // `res`: This is the response object returned from `await signIn(...)`.
    // `?.`: This is the "optional chaining" operator. It's a safety check. If the `res` object
    // is for some reason `null` or `undefined`, the entire expression will short-circuit and
    // evaluate to `undefined` without crashing.
    // `.error`: We access the `error` property of the response. If the login failed, NextAuth.js
    // populates this property with a string describing the reason (e.g., "Invalid password").
    // If the login was successful, this property will be `null`.
    if (res?.error) {

      // try { ... } : Start of a try block. `try` is a JavaScript keyword that begins a block of code
      // where runtime exceptions (errors) will be caught by the following `catch` block if any are thrown.
      // The runtime will execute the code in the try block and if an exception is raised, control jumps
      // to the corresponding catch block; otherwise the catch block is skipped.
      try {

      // The `fetch` function initiates a network request to the "/api/auth/check-email" endpoint.
      // We `await` the completion of this request, and the resulting `Response` object is assigned to the `resp` variable.
      const resp = await fetch("/api/auth/check-email", {

          // Specifies the HTTP method as `POST`, indicating we are sending data to the server.
          method: "POST",

          // The request's `body` is the data being sent. Here, an object containing the user's email is converted
          // into a JSON string to serve as the request's payload.
          body: JSON.stringify({ email: formData.email }),

            // The `headers` provide metadata. This `Content-Type` header tells the server that the `body` is formatted as JSON.
          headers: { "Content-Type": "application/json" },
        });

      
      // The `resp.json()` method reads the raw response body from the server and parses it from a JSON-formatted string
      // into a JavaScript object. This operation is asynchronous, so we `await` its completion. Critically, the result
      // is typed as `any` by default in TypeScript, which dangerously disables all type-checking. By explicitly casting the result
      // `as unknown`, we are telling TypeScript that we cannot trust the shape of this incoming data. This is a best
      // practice that forces us to perform a validation check (using Zod in the next line) before the data can be safely used.
      const rawCheck = (await resp.json()) as unknown;

      // Here we use our Zod schema to validate the `rawCheck` data. The `.safeParse()` method is used because it
      // never throws a program crashing error. Instead of halting execution (like `.parse()` would), it always returns
      // one of two possible objects:
      //  1. On success: `{ success: true, data: { ... } }` where `data` is the fully validated, type-safe data.
      //  2. On failure: `{ success: false, error: ZodError }` where `error` is a Zod-specific object containing
      //     detailed information about why the validation failed.
      // This allows us to handle validation failures gracefully in our own code, rather than jumping to the `catch` block.
      const parsedCheck = checkEmailResponseSchema.safeParse(rawCheck);

      // This line uses a ternary operator to safely unwrap the validation result from the previous step.
      // If the `safeParse` was successful (`parsedCheck.success` is true), the `check` variable is assigned the
      // validated and now type-safe `parsedCheck.data`. If validation failed for any reason, `check` is assigned
      // a fallback object, `{ exists: false, emailVerified: false }`.
      const check = parsedCheck.success
        ? parsedCheck.data
        : { exists: false, emailVerified: false };

      // This conditional statement inspects the properties of the `check` object received from the server.
      // The condition is true only if the user's account `exists` AND their email is NOT `verified`
      if (check.exists && !check.emailVerified) {
        toast.error("Please verify your email before logging in.");

      // If the `if` condition is false (meaning the user doesn't exist OR is already verified), this `else` block is executed.
      } else {
        toast.error("Incorrect email or password.");
      }

      // If any error occurs within the `try` block (like a network failure or invalid server response),
      // control jumps to this `catch` block. The error itself is captured in the `err` variable.
      } catch (err) {
        // Use the caught error so the linter won't complain about an unused variable.
        // Also log the error server-side for debugging.
        console.error("check-email fetch error:", err);
        toast.error("Login failed.");
      }

      // This is an "early return". It explicitly stops the function's execution now that the
      // login error has been fully handled.
      return;

    // If `res.error` is null, this `else` block is executed, meaning the login was successful.
    } else {

      // If login was successful, show a success toast
      toast.success("Logged in!");

      // `router.push()`: This method from the Next.js `useRouter` hook performs a client-side navigation.
      // It changes the URL in the browser's address bar and updates the page's content without a full-page reload.
      //
      // `callbackUrl`: This is the variable we created at the top of the component.
      router.push(callbackUrl);
    } 
  };

  // The `return` statement specifies the UI that this component will render.
  // The code inside the parentheses is JSX, a syntax extension for JavaScript that
  // allows you to write HTML-like code to describe the component's structure.
  return (

    // This `div` acts as the main full-screen container for the entire login page.
    // The `className` uses Tailwind CSS utilities to style it.
    //
    //  - `flex`: This sets `display: flex`, which enables the "Flexbox" layout model for the form's 
    // direct children. By default, Flexbox arranges items in a horizontal row. This unlocks 
    // a powerful set of alignment properties for the elements direct children.
    //
    // - `min-h-screen`: Sets `min-height: 100vh` (100% of the viewport height), ensuring the container
    //   takes up at least the full height of the browser window.
    //
    // - `items-center`: A Flexbox property. It aligns the children (the form) along the "cross axis".
    //   For a default row-based flex container, this means it centers the form vertically.
    //
    // - `justify-center`: A Flexbox property. It aligns the children along the "main axis".
    //   For a default row-based flex container, this means it centers the form horizontally.
    //   By combining `items-center` and `justify-center`, we achieve perfect centering on the page.
    //
    // - `bg-gray-900`: Sets the background color to a very dark gray.
    // - `text-white`: Sets the default text color for all child elements to white.
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">

      {// This renders the HTML `<form>` element, which will contain all the login inputs and the submit button.
      // `onSubmit={handleSubmit}`: When the user submits the form, React will call our `handleSubmit` function.
      //
      // The `className` styles the form itself to look like a card.
      // - `w-full`: Sets `width: 100%`.
      // - `max-w-md`: Sets a `max-width` of `28rem` (`448px`).
      //
      //   This is a standard responsive design pattern. On small screens (narrower
      //   than `28rem`), the form will be `w-full`, perfectly fitting the screen. On large screens,
      //   the form will stop growing at `max-w-md`. The form is then centered on the page by the
      //   `justify-center` flexbox property of its parent `<div>`.
      //
      // - `space-y-6`: Adds vertical space (`margin-top`) between all direct children of the form
      //   (the heading, the input divs, and the button), creating consistent spacing.
      // - `bg-gray-800`: Sets the form's background color.
      // - `p-8`: Adds large padding (`2rem`) inside the form.
      // - `rounded-lg`: Applies rounded corners.
      // - `shadow`: Adds a subtle box-shadow.
      } 
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 bg-gray-800 p-8 rounded-lg shadow">

        {// This renders the main heading for the login form.
        // - `text-3xl`: Sets a large `font-size`.
        // - `font-bold`: Sets the `font-weight` to bold.
        }
        <h2 className="text-3xl font-bold">Login</h2>

        {// This `div` acts as a container or wrapper for the email label and its corresponding input field.
        // This grouping helps with layout and ensures the `space-y-6` on the parent `<form>` works correctly.
        }
        <div>

          {// This renders the visible text label for the email input field.
          // `htmlFor="email"`: This is a crucial attribute for accessibility and user experience. It
          // programmatically links this label to the input field that has a matching `id` of "email".
          // When a user clicks on the text "Email", the browser will automatically focus the cursor
          // inside the email input box, creating a larger, more user-friendly target.
          }
          <label htmlFor="email">Email</label>

          {// This renders the actual `<input>` element for the user to type in their email.
          }
          <input

            //`This HTML attribute is ESSENTIAL for our reusable `handleChange` function.
            // The handler's logic (`[e.target.name]: e.target.value`) uses this string "email" as the key
            // to update the correct property in our `formData` state object.
            name="email"

            // `id="email"`: This ID is used to link the `<label>` above to this input via the `htmlFor` attribute.
            // This is essential for accessibility.
            id="email" 

            // `value={formData.email}`: This is what makes this input a controlled component.
            // By default, an HTML `<input>` is an uncontrolled element. This means the browser's
            // DOM itself keeps track of the input's state (the text you type into it). The DOM is the
            // source of truth. You can type freely, and to get the value in JavaScript, you would
            // have to manually "pull" it from the DOM (e.g., using a `ref` or `document.getElementById`).
            //
            // A controlled component flips this relationship on its head. By setting the `value` prop,
            // we are telling React to take control. The input's displayed value
            // is now forced to be whatever is in our `formData.email` state. React becomes the
            // single source of truth.
            //
            // The Data Flow (the controlled loop):
            // 1. User Types a Character: The user presses a key (e.g., 'a').
            // 2. `onChange` Fires: The `onChange` event is triggered.
            // 3. State is Updated: Our `handleChange` function is called, which calls `setFormData`.
            //    This tells React to update the `formData.email` state to include the 'a'.
            // 4. Component Re-renders: React re-renders the `LoginPage` component with the new state.
            // 5. Value is Passed Back: During the re-render, this input receives the new state value
            //    via its `value` prop. The character 'a' now officially appears in the input box.
            value={formData.email}

            // `onChange={handleChange}`: The event handler that fires on every keystroke, completing the controlled loop.
            onChange={handleChange}

            // `type="email"`: A standard HTML attribute that instructs the browser on how to treat this input field.
            // This provides several important, free benefits for user experience and validation:
            // 1. Mobile Keyboard Optimization: On most mobile devices, the browser will display a keyboard
            //    that is optimized for email entry, featuring prominent '@' and '.' keys.
            // 2. Built-in Validation: If this input is inside a `<form>` tag, many browsers will prevent
            //    submission if the text entered does not conform to a standard email address format (e.g., text@text.com).
            // 3. Accessibility: It provides semantic meaning to screen readers, which can announce to the
            //    user that this is an "email edit text field".
            type="email"

            // `className`: This prop is used to apply CSS classes for styling. We are using utility classes
            // from the Tailwind CSS framework. Each class is a small, single-purpose style rule.
            //
            // Let's break down each class in the string:
            // - `mt-1`: Sets a `margin-top` of `0.25rem`, creating a small space between the label above and this input.
            // - `w-full`: Sets `width: 100%`, making the input expand to fill the full width of its parent `<div>`.
            // - `rounded`: Applies a default `border-radius` of `0.25rem`, giving the input slightly rounded corners.
            // - `bg-gray-900`: Sets the `background-color` to a very dark gray from Tailwind's color palette.
            // - `border`: Applies a default 1px solid border.
            // - `border-gray-700`: Specifies the `border-color` to be a specific shade of gray.
            // - `p-2`: Sets `padding` on all sides to `0.5rem`, giving the text inside the input some breathing room.
            className="mt-1 w-full rounded bg-gray-900 border border-gray-700 p-2"

            // `required`: A standard HTML attribute that prevents form submission if this field is empty.
            required
          />
        </div>

        {// This `div` acts as a container for the password label and its corresponding input field.
        // This grouping ensures consistent spacing due to the `space-y-6` on the parent `<form>`.
        }
        <div>

          {// This renders the visible text label for the password input field.
          // `htmlFor="password"`: This accessibility attribute links this label to the input field
          // that has a matching `id` of "password". When a user clicks on this label text, the
          // browser will automatically focus the cursor inside the password input box.
          }
          <label htmlFor="password">Password</label>

          {// This renders the `<input>` element for the user's password. It's also a "Controlled Component".
          }
          <input

            
            // `name="password"`: This is crucial. Our reusable `handleChange` function uses this
            // string "password" as the key to update the correct `password` property in our `formData` state object.
            name="password"

            // `id="password"`: This ID is used to link the `<label>` above to this input via the `htmlFor` attribute,
            // which is essential for accessibility.
            id="password"

            // `value={formData.password}`: This forces the input's displayed value to be determined solely by
            // our `formData.password` state variable, making React the single source of truth.
            value={formData.password}

            // `onChange={handleChange}`: We reuse the exact same event handler as the email input. On every
            // keystroke, this function is called, and it updates the `password` part of our `formData` state.
            onChange={handleChange}

            // `type="password"`: A standard and important HTML attribute for password fields.
            // It instructs the browser to obscure the characters as the user types them (e.g., showing dots `••••••`
            // or asterisks `******`), which is a fundamental security practice.
            type="password"

            // `className`: This applies the exact same Tailwind CSS styling as the email input for a consistent look.
            className="mt-1 w-full rounded bg-gray-900 border border-gray-700 p-2"

            // `required`: A standard HTML attribute that prevents form submission if this field is empty.
            required
          />
        </div>

        {// This renders a submit button.
        }
        <button

          // `type="submit"`: A standard HTML attribute. This is what makes this button the default
          // submit button for the parent `<form>`. Clicking it (or pressing Enter in an input field)
          // will trigger the `onSubmit` event handler attached to the `<form>` tag.
          type="submit"

          // `disabled={isLoading}`: This is a dynamic attribute. Its value is bound to our `isLoading`
          // state variable.
          // - When `isLoading` is `true` (during the API call), the button's `disabled` attribute will be set,
          //   making it unclickable. This is a crucial UX feature to prevent the user from submitting the form multiple times.
          // - When `isLoading` is `false`, the `disabled` attribute is removed, and the button is clickable.
          disabled={isLoading}

          // `className`: This applies Tailwind CSS utility classes for styling, including special "state variants".
          // - `w-full`: Makes the button take up 100% of its container's width.
          // - `bg-blue-600`: Sets the default background color to a shade of blue.
          // - `hover:bg-blue-700`: This is a "state variant". It applies a slightly darker blue background color
          //   only when the user's mouse is hovering over the button, providing visual feedback.
          // - `p-2 rounded font-semibold`: Applies padding, rounded corners, and a bold font weight.
          // - `disabled:opacity-50`: This is another state variant. It applies an opacity of 50% only when
          //   the button is in a `disabled` state (when `isLoading` is true). This visually indicates to the
          //   user that the button is temporarily inactive.
          className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded font-semibold disabled:opacity-50"
        >

          {// This is the text displayed inside the button. Its content is rendered conditionally
          // based on the current value of the `isLoading` state variable. This provides immediate
          // visual feedback to the user about the form's submission status.
          // We use a "ternary operator" (`condition ? value_if_true : value_if_false`) for this logic.
          // - If `isLoading` is `true`, the text "Logging in..." is rendered.
          // - If `isLoading` is `false`, the text "Login" is rendered.
          }
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}