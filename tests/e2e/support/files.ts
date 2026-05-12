export type E2EFilePayload = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADggGOSHzRgQAAAABJRU5ErkJggg==",
  "base64"
);

export function sampleImage(name = "qa-studio.png"): E2EFilePayload {
  return {
    name,
    mimeType: "image/png",
    buffer: tinyPng,
  };
}

export function sampleSignature(name = "qa-signature.png"): E2EFilePayload {
  return {
    name,
    mimeType: "image/png",
    buffer: tinyPng,
  };
}

export function samplePdf(name = "qa-verification-document.pdf"): E2EFilePayload {
  return {
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"),
  };
}
