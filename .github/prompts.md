Prompt files are Markdown files and use the .prompt.md extension and have this structure:

Header (optional): YAML frontmatter

description: Short description of the prompt
mode: Chat mode used for running the prompt: ask, edit, or agent (default).
model: Language model used when running the prompt. If not specified, the currently selected model in model picker is used.
tools: Array of tool (set) names that can be used. Select Configure Tools to select the tools from the list of available tools in your workspace. If a given tool (set) is not available when running the prompt, it is ignored.
Body: Prompt instructions in Markdown format

Reference other workspace files, prompt files, or instruction files by using Markdown links. Use relative paths to reference these files, and ensure that the paths are correct based on the location of the prompt file.

Within a prompt file, you can reference variables by using the ${variableName} syntax. You can reference the following variables:

Workspace variables - ${workspaceFolder}, ${workspaceFolderBasename}
Selection variables - ${selection}, ${selectedText}
File context variables - ${file}, ${fileBasename}, ${fileDirname}, ${fileBasenameNoExtension}
Input variables - ${input:variableName}, ${input:variableName:placeholder} (pass values to the prompt from the chat input field)

EXAMPLE:

---

mode: 'agent'
model: GPT-4o
tools: ['githubRepo', 'codebase']
description: 'Generate a new React form component'

---

Your goal is to generate a new React form component based on the templates in #githubRepo contoso/react-templates.

Ask for the form name and fields if not provided.

Requirements for the form:

- Use form design system components: [design-system/Form.md](../docs/design-system/Form.md)
- Use `react-hook-form` for form state management:
- Always define TypeScript types for your form data
- Prefer _uncontrolled_ components using register
- Use `defaultValues` to prevent unnecessary rerenders
- Use `yup` for validation:
- Create reusable validation schemas in separate files
- Use TypeScript types to ensure type safety
- Customize UX-friendly validation rules
