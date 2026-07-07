export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  /** JSON Schema describing the tool's arguments. */
  readonly parametersSchema: unknown;
}

export interface ToolInvocation {
  readonly toolName: string;
  readonly argumentsJson: string;
}

export interface ToolInvocationResult {
  readonly resultJson: string;
  readonly isError: boolean;
}

/**
 * Exposes callable tools to the conversation runtime. A tool provider may
 * be backed by plugins declaring `ai.tool` capabilities; the runtime
 * never calls a tool implementation directly.
 */
export interface ToolProvider {
  listTools(): readonly ToolDefinition[];
  invoke(invocation: ToolInvocation): Promise<ToolInvocationResult>;
}
