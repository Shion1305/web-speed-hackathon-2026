declare module "encoding-japanese" {
  interface ConvertOptions {
    from?: string;
    to?: string;
    type?: "arraybuffer" | "array" | "string";
  }

  const Encoding: {
    convert(data: Buffer | Uint8Array | number[], options?: ConvertOptions): string;
  };

  export default Encoding;
}
