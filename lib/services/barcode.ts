import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";

import { prisma } from "@/lib/prisma";

const BARCODE_PREFIX = "LIB";
const QR_PREFIX = "LIBQR";

function randomNumericSegment(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

export async function generateUniqueBarcodeValue(
  organizationId: string
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const value = `${BARCODE_PREFIX}${randomNumericSegment(10)}`;
    const existing = await prisma.book.findFirst({
      where: { organizationId, barcodeValue: value, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return value;
  }
  throw new Error("Unable to generate unique barcode value");
}

export async function generateUniqueQrValue(
  organizationId: string
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const value = `${QR_PREFIX}${randomNumericSegment(12)}`;
    const existing = await prisma.book.findFirst({
      where: { organizationId, qrCodeValue: value, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return value;
  }
  throw new Error("Unable to generate unique QR code value");
}

export function generateBarcodeSvg(value: string): string {
  const document = new DOMImplementation().createDocument(
    "http://www.w3.org/1999/xhtml",
    "html",
    null
  );
  const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  JsBarcode(svgNode, value, {
    xmlDocument: document as unknown as XMLDocument,
    format: "CODE128",
    width: 2,
    height: 80,
    displayValue: true,
    fontSize: 14,
    margin: 10,
    background: "#ffffff",
    lineColor: "#000000",
  });

  const svg = new XMLSerializer().serializeToString(svgNode);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function generateQrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

export async function generateBookCodes(organizationId: string): Promise<{
  barcodeValue: string;
  qrCodeValue: string;
  barcodeImage: string;
  qrCodeImage: string;
}> {
  return resolveBookCodes(organizationId);
}

export async function resolveBookCodes(
  organizationId: string,
  barcodeValue?: string | null
): Promise<{
  barcodeValue: string;
  qrCodeValue: string;
  barcodeImage: string;
  qrCodeImage: string;
}> {
  let barcode: string;

  if (barcodeValue?.trim()) {
    barcode = barcodeValue.trim();
    const existing = await prisma.book.findFirst({
      where: { organizationId, barcodeValue: barcode, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new Error("Barcode already in use");
    }
  } else {
    barcode = await generateUniqueBarcodeValue(organizationId);
  }

  const qrCodeValue = await generateUniqueQrValue(organizationId);
  const barcodeImage = generateBarcodeSvg(barcode);
  const qrCodeImage = await generateQrDataUrl(qrCodeValue);

  return {
    barcodeValue: barcode,
    qrCodeValue,
    barcodeImage,
    qrCodeImage,
  };
}
