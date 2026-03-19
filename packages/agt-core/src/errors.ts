// ============================================================
// AGT Common Error Classes
// Hierarchical error system for structured error handling
// ============================================================

/** Base error for all AGT operations */
export class AgtError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AgtError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Schema or data validation failure */
export class ValidationError extends AgtError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value?: unknown,
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/** .agt file loading failure */
export class LoadError extends AgtError {
  constructor(
    message: string,
    public readonly path: string,
    code: string = 'LOAD_ERROR',
  ) {
    super(message, code);
    this.name = 'LoadError';
  }
}

/** LLM inference failure */
export class LLMError extends AgtError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly model: string,
    code: string = 'LLM_ERROR',
  ) {
    super(message, code);
    this.name = 'LLMError';
  }
}

/** Memory operation failure */
export class MemoryError extends AgtError {
  constructor(
    message: string,
    public readonly operation: 'query' | 'store' | 'init' | 'close',
    code: string = 'MEMORY_ERROR',
  ) {
    super(message, code);
    this.name = 'MemoryError';
  }
}

/** .agt packaging/unpackaging failure */
export class PackageError extends AgtError {
  constructor(
    message: string,
    code: string = 'PACKAGE_ERROR',
  ) {
    super(message, code);
    this.name = 'PackageError';
  }
}
