import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import QRCode from "qrcode";
import { prisma } from "../prisma.js";
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

export type PixChargeOptions = {
  dueDate?: Date | string | null;
  description?: string;
  payerName?: string;
  payerDocument?: string | null;
  expirationSeconds?: number;
  reference?: string;
};

type GatewaySettings = {
  payment_gateway?: string;
  efi_environment?: string;
  efi_client_id?: string;
  efi_client_secret?: string;
  efi_cert_path?: string;
  efi_cert_password?: string;
  efi_cert_base64?: string;
  efi_pix_key?: string;
  efi_receiver_name?: string;
  efi_receiver_city?: string;
  pix_key?: string;
  pix_receiver_name?: string;
  pix_receiver_city?: string;
};

type EfiTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: EfiTokenCache | null = null;

export function buildPixTxid(reference: string) {
  const seed = crypto.createHash("sha256").update(reference).digest("hex").toUpperCase();
  return `UPB${seed}`.replace(/[^A-Z0-9]/g, "").slice(0, 32);
}

export function createPixPayload(amount: number, reference: string) {
  const merchant = field("00", "BR.GOV.BCB.PIX") + field("01", env.PIX_KEY.replace(/\D/g, ""));
  const base = field("00", "01") + field("26", merchant) + field("52", "0000") + field("53", "986") +
    field("54", amount.toFixed(2)) + field("58", "BR") + field("59", clean(env.PIX_RECEIVER_NAME, 25)) +
    field("60", clean(env.PIX_RECEIVER_CITY, 15)) + field("62", field("05", clean(reference, 25))) + "6304";
  return base + crc16(base);
}

export async function createPixCharge(amount: number, reference: string, options: PixChargeOptions = {}) {
  const settings = await loadGatewaySettings();
  const gateway = (settings.payment_gateway ?? env.PAYMENT_GATEWAY ?? "disabled").toLowerCase();
  const amountValue = Number(amount);
  const txid = buildPixTxid(options.reference ?? reference);

  if (gateway === "efi" && canUseEfi(settings)) {
    try {
      const charge = await createEfiCharge(amountValue, txid, settings, options);
      if (charge) return charge;
    } catch (error) {
      console.warn("[pix] fallback local payload after Efi error", error instanceof Error ? error.message : error);
    }
  }

  const copyPaste = createPixPayload(amountValue, reference);
  return {
    provider: "local",
    txid,
    copyPaste,
    qrCodeDataUrl: await QRCode.toDataURL(copyPaste, { width: 360, margin: 2 }),
    key: formatPixKey(settings.pix_key ?? env.PIX_KEY),
    bank: "Banco do Brasil",
    amount: amountValue
  };
}

async function createEfiCharge(amount: number, txid: string, settings: GatewaySettings, options: PixChargeOptions) {
  const envName = (settings.efi_environment ?? env.EFI_ENVIRONMENT ?? "production").toLowerCase();
  const baseUrl = envName === "sandbox" || envName === "homologacao" || envName === "homologation"
    ? "https://pix-h.api.efipay.com.br"
    : "https://pix.api.efipay.com.br";
  const token = await getEfiAccessToken(baseUrl, settings);
  const agent = createEfiAgent(settings);
  const original = amount.toFixed(2);
  const description = options.description ?? "Cobrança mensal UpBarber";
  const debtor = buildDebtor(options);
  const hasCompleteDueDebtor = Boolean(options.dueDate && debtor && (debtor.cpf || debtor.cnpj));
  const body = hasCompleteDueDebtor
    ? {
        calendario: {
          dataDeVencimento: toDateOnly(options.dueDate!),
          validadeAposVencimento: 30
        },
        valor: { original },
        chave: settings.efi_pix_key ?? settings.pix_key ?? env.EFI_PIX_KEY ?? env.PIX_KEY,
        solicitacaoPagador: description,
        devedor: debtor
      }
    : {
        calendario: {
          expiracao: options.expirationSeconds ?? expirationFromDueDate(options.dueDate) ?? 3600
        },
        valor: { original },
        chave: settings.efi_pix_key ?? settings.pix_key ?? env.EFI_PIX_KEY ?? env.PIX_KEY,
        solicitacaoPagador: description,
        ...(debtor ? { devedor: debtor } : {})
      };

  const created = await requestEfiJson(baseUrl, agent, "PUT", `/v2/${hasCompleteDueDebtor ? "cobv" : "cob"}/${txid}`, token, body);
  const pixCopy = created?.pixCopiaECola ?? created?.pixCopiaEcola ?? null;
  const locId = created?.loc?.id ?? created?.loc?.idLoc ?? null;
  let qrCode = created?.imagemQrcode ?? null;
  let viewLink = created?.linkVisualizacao ?? null;
  let copyPaste = pixCopy;

  if ((!copyPaste || !qrCode) && locId) {
    const qrcodeResponse = await requestEfiJson(baseUrl, agent, "GET", `/v2/loc/${locId}/qrcode`, token);
    copyPaste = copyPaste ?? qrcodeResponse?.qrcode ?? null;
    qrCode = qrCode ?? qrcodeResponse?.imagemQrcode ?? null;
    viewLink = viewLink ?? qrcodeResponse?.linkVisualizacao ?? null;
  }

  if (!copyPaste) throw new Error("A Efí não retornou o Pix copia e cola");
  if (!qrCode) qrCode = await QRCode.toDataURL(copyPaste, { width: 360, margin: 2 });
  if (!qrCode.startsWith("data:image")) {
    qrCode = await QRCode.toDataURL(copyPaste, { width: 360, margin: 2 });
  }

  return {
    provider: "efi",
    txid,
    copyPaste,
    qrCodeDataUrl: qrCode,
    key: formatPixKey(settings.efi_pix_key ?? settings.pix_key ?? env.EFI_PIX_KEY ?? env.PIX_KEY),
    bank: "Efí Bank",
    amount,
    location: created?.loc?.location ?? viewLink ?? null,
    raw: created
  };
}

async function getEfiAccessToken(baseUrl: string, settings: GatewaySettings) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken;
  const agent = createEfiAgent(settings);
  const clientId = settings.efi_client_id ?? env.EFI_CLIENT_ID;
  const clientSecret = settings.efi_client_secret ?? env.EFI_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credenciais Efí ausentes");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await requestEfiJson(
    baseUrl,
    agent,
    "POST",
    "/oauth/token",
    null,
    { grant_type: "client_credentials" },
    { Authorization: `Basic ${auth}` }
  );
  if (!response?.access_token) throw new Error("Falha ao obter token da Efí");
  tokenCache = {
    accessToken: response.access_token,
    expiresAt: Date.now() + (Number(response.expires_in ?? 0) * 1000)
  };
  return tokenCache.accessToken;
}

function createEfiAgent(settings: GatewaySettings) {
  const pfx = loadEfiCertificate(settings);
  const password = settings.efi_cert_password ?? env.EFI_CERT_PASSWORD ?? "";
  return new https.Agent({ pfx, passphrase: password });
}

function loadEfiCertificate(settings: GatewaySettings) {
  const base64 = settings.efi_cert_base64 ?? env.EFI_CERT_BASE64 ?? "";
  if (base64) {
    const normalized = base64.includes("base64,") ? base64.split("base64,").pop()! : base64;
    return Buffer.from(normalized.trim(), "base64");
  }
  const certPath = settings.efi_cert_path ?? env.EFI_CERT_PATH ?? "";
  if (certPath) return fs.readFileSync(path.resolve(certPath));
  throw new Error("Certificado Efí ausente");
}

async function requestEfiJson(baseUrl: string, agent: https.Agent, method: string, route: string, token: string | null, body?: unknown, extraHeaders: Record<string, string> = {}) {
  const url = new URL(route, baseUrl);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return await new Promise<any>((resolve, reject) => {
    const req = https.request(url, {
      method,
      agent,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
        ...extraHeaders
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw) return resolve(null);
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve({ raw });
        }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function buildDebtor(options: PixChargeOptions) {
  const name = options.payerName?.trim();
  const document = (options.payerDocument ?? "").replace(/\D/g, "");
  if (!name && !document) return undefined;
  const debtor: Record<string, string> = {};
  if (name) debtor.nome = clean(name, 60);
  if (document.length === 11) debtor.cpf = document;
  if (document.length === 14) debtor.cnpj = document;
  return debtor;
}

function canUseEfi(settings: GatewaySettings) {
  return Boolean(
    (settings.efi_client_id ?? env.EFI_CLIENT_ID) &&
    (settings.efi_client_secret ?? env.EFI_CLIENT_SECRET) &&
    (settings.efi_cert_base64 ?? env.EFI_CERT_BASE64 ?? settings.efi_cert_path ?? env.EFI_CERT_PATH)
  );
}

async function loadGatewaySettings(): Promise<GatewaySettings> {
  const rows = await prisma.platformConfig.findMany({
    where: {
      key: {
        in: [
          "payment_gateway",
          "efi_environment",
          "efi_client_id",
          "efi_client_secret",
          "efi_cert_path",
          "efi_cert_password",
          "efi_cert_base64",
          "efi_pix_key",
          "efi_receiver_name",
          "efi_receiver_city",
          "pix_key",
          "pix_receiver_name",
          "pix_receiver_city"
        ]
      }
    }
  });
  const config = Object.fromEntries(rows.map((row) => [row.key, row.value])) as GatewaySettings;
  return {
    payment_gateway: config.payment_gateway ?? env.PAYMENT_GATEWAY,
    efi_environment: config.efi_environment ?? env.EFI_ENVIRONMENT,
    efi_client_id: config.efi_client_id ?? env.EFI_CLIENT_ID,
    efi_client_secret: config.efi_client_secret ?? env.EFI_CLIENT_SECRET,
    efi_cert_path: config.efi_cert_path ?? env.EFI_CERT_PATH,
    efi_cert_password: config.efi_cert_password ?? env.EFI_CERT_PASSWORD,
    efi_cert_base64: config.efi_cert_base64 ?? env.EFI_CERT_BASE64,
    efi_pix_key: config.efi_pix_key ?? env.EFI_PIX_KEY,
    efi_receiver_name: config.efi_receiver_name ?? env.EFI_RECEIVER_NAME,
    efi_receiver_city: config.efi_receiver_city ?? env.EFI_RECEIVER_CITY,
    pix_key: config.pix_key ?? env.PIX_KEY,
    pix_receiver_name: config.pix_receiver_name ?? env.PIX_RECEIVER_NAME,
    pix_receiver_city: config.pix_receiver_city ?? env.PIX_RECEIVER_CITY
  };
}

function toDateOnly(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function expirationFromDueDate(dueDate?: Date | string | null) {
  if (!dueDate) return null;
  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const delta = Math.floor((date.getTime() - Date.now()) / 1000);
  return Number.isFinite(delta) ? Math.max(delta, 3600) : null;
}

function formatPixKey(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return value;
}
