declare module 'pdf-parse' {
  function pdf(
    dataBuffer: Buffer,
    options?: unknown,
  ): Promise<{
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }>;
  export = pdf;
}
