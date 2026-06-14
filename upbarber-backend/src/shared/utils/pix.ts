import QRCode from "qrcode";
import { env } from "../env.js";

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

function crc16(value: string) {
  let crc = 0xffff;
  for (let i = 0; i < value.length; i++) {
    crc ^= value.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

const clean = (value: string, max: number) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().slice(0, max);

export function createPixPayload(amount: number, reference: string) {
  const merchant = field("00", "BR.GOV.BCB.PIX") + field("01", env.PIX_KEY.replace(/\D/g, ""));
  const base = field("00", "01") + field("26", merchant) + field("52", "0000") + field("53", "986") +
    field("54", amount.toFixed(2)) + field("58", "BR") + field("59", clean(env.PIX_RECEIVER_NAME, 25)) +
    field("60", clean(env.PIX_RECEIVER_CITY, 15)) + field("62", field("05", clean(reference, 25))) + "6304";
  return base + crc16(base);
}

export async function createPixCharge(amount: number, reference: string) {
  const copyPaste = createPixPayload(amount, reference);
  return {
    copyPaste,
    qrCodeDataUrl: await QRCode.toDataURL(copyPaste, { width: 360, margin: 2 }),
    key: "52.671.137/0001-71",
    bank: "Banco do Brasil",
    amount
  };
}
