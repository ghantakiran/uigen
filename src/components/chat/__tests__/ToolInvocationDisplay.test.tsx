import { test, expect, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  ToolInvocationDisplay,
  getToolDescription,
} from "../ToolInvocationDisplay";

afterEach(() => {
  cleanup();
});

describe("getToolDescription", () => {
  test("str_replace_editor create returns Creating with filename", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      args: { command: "create", path: "/components/Card.jsx" },
      state: "result",
    });
    expect(result.label).toBe("Creating Card.jsx");
  });

  test("str_replace_editor str_replace returns Editing with filename", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      args: { command: "str_replace", path: "/App.jsx" },
      state: "result",
    });
    expect(result.label).toBe("Editing App.jsx");
  });

  test("str_replace_editor insert returns Inserting into filename", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      args: { command: "insert", path: "/utils/helpers.ts" },
      state: "result",
    });
    expect(result.label).toBe("Inserting into helpers.ts");
  });

  test("str_replace_editor view returns Reading with filename", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      args: { command: "view", path: "/index.tsx" },
      state: "result",
    });
    expect(result.label).toBe("Reading index.tsx");
  });

  test("str_replace_editor unknown command falls back to Editing", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      args: { command: "unknown_cmd", path: "/App.jsx" },
      state: "result",
    });
    expect(result.label).toBe("Editing App.jsx");
  });

  test("file_manager delete returns Deleting with filename", () => {
    const result = getToolDescription({
      toolName: "file_manager",
      args: { command: "delete", path: "/old-file.tsx" },
      state: "result",
    });
    expect(result.label).toBe("Deleting old-file.tsx");
  });

  test("file_manager rename returns both old and new filenames", () => {
    const result = getToolDescription({
      toolName: "file_manager",
      args: {
        command: "rename",
        path: "/Button.jsx",
        new_path: "/components/PrimaryButton.jsx",
      },
      state: "result",
    });
    expect(result.label).toBe("Renaming Button.jsx → PrimaryButton.jsx");
  });

  test("file_manager unknown command falls back to Managing", () => {
    const result = getToolDescription({
      toolName: "file_manager",
      args: { command: "copy", path: "/file.ts" },
      state: "result",
    });
    expect(result.label).toBe("Managing file.ts");
  });

  test("unknown tool name returns raw tool name", () => {
    const result = getToolDescription({
      toolName: "some_other_tool",
      args: {},
      state: "result",
    });
    expect(result.label).toBe("some_other_tool");
  });

  test("handles missing path gracefully", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      args: { command: "create" },
      state: "result",
    });
    expect(result.label).toBe("Creating ");
  });

  test("handles non-string path gracefully", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      args: { command: "create", path: 123 },
      state: "result",
    });
    expect(result.label).toBe("Creating ");
  });

  test("extracts filename from deeply nested path", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      args: { command: "create", path: "/src/components/ui/forms/Input.tsx" },
      state: "result",
    });
    expect(result.label).toBe("Creating Input.tsx");
  });
});

describe("ToolInvocationDisplay", () => {
  test("renders completed state with label text", () => {
    render(
      <ToolInvocationDisplay
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "create", path: "/App.jsx" },
          state: "result",
          result: "File created: /App.jsx",
        }}
      />
    );
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
  });

  test("renders green dot for completed invocations", () => {
    const { container } = render(
      <ToolInvocationDisplay
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "create", path: "/App.jsx" },
          state: "result",
          result: "File created",
        }}
      />
    );
    const greenDot = container.querySelector(".bg-emerald-500");
    expect(greenDot).not.toBeNull();
  });

  test("renders spinner for in-progress invocations", () => {
    const { container } = render(
      <ToolInvocationDisplay
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "str_replace", path: "/Card.jsx" },
          state: "call",
        }}
      />
    );
    expect(screen.getByText("Editing Card.jsx")).toBeDefined();
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
  });

  test("renders no spinner for completed invocations", () => {
    const { container } = render(
      <ToolInvocationDisplay
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "create", path: "/App.jsx" },
          state: "result",
          result: "done",
        }}
      />
    );
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeNull();
  });

  test("renders file_manager delete tool", () => {
    render(
      <ToolInvocationDisplay
        toolInvocation={{
          toolName: "file_manager",
          args: { command: "delete", path: "/old.tsx" },
          state: "result",
          result: { success: true },
        }}
      />
    );
    expect(screen.getByText("Deleting old.tsx")).toBeDefined();
  });

  test("renders file_manager rename tool with both names", () => {
    render(
      <ToolInvocationDisplay
        toolInvocation={{
          toolName: "file_manager",
          args: {
            command: "rename",
            path: "/old.tsx",
            new_path: "/components/new.tsx",
          },
          state: "result",
          result: { success: true },
        }}
      />
    );
    expect(screen.getByText("Renaming old.tsx → new.tsx")).toBeDefined();
  });

  test("treats result state without result value as in-progress", () => {
    const { container } = render(
      <ToolInvocationDisplay
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "create", path: "/App.jsx" },
          state: "result",
        }}
      />
    );
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
  });
});
