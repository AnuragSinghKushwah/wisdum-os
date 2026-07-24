declare module 'pdf-parse' {
  function pdf(
    dataBuffer: Buffer,
    options?: any,
  ): Promise<{
    text: string;
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
  }>;
  export = pdf;
}
