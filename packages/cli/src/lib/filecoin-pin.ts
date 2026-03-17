import { readConfig } from "./config";

export interface FilecoinPinUploadResult {
  rootCid: string;
  pieceCid: string;
  dataSetId: number;
  network: string;
}

/**
 * Upload a file to Filecoin using the filecoin-pin library.
 * Requires PRIVATE_KEY env var or config.privateKey to be set.
 * Returns root CID, piece CID, and dataset ID.
 */
export async function uploadWithFilecoinPin(
  filePath: string
): Promise<FilecoinPinUploadResult> {
  const config = readConfig();
  const privateKey = process.env.PRIVATE_KEY || process.env.FILECOIN_PRIVATE_KEY || config.privateKey;

  if (!privateKey) {
    throw new Error(
      "No private key configured. Set PRIVATE_KEY env var or run: skillcoin config --key <key>"
    );
  }

  const hexKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;

  const fp = await import("filecoin-pin" as any);
  const { initializeSynapse, createCarFromPath, checkUploadReadiness, executeUpload } = fp;

  const synapse = await initializeSynapse({
    privateKey: hexKey as `0x${string}`,
  });

  const carResult = await createCarFromPath(filePath);
  const carData = carResult.car;
  const rootCid = carResult.rootCid;
  const fileSize = carData.byteLength;

  const readiness = await checkUploadReadiness({
    synapse,
    fileSize,
    autoConfigureAllowances: true,
  });

  if (readiness.status === "blocked") {
    const msg = readiness.validation?.errorMessage || "Upload blocked";
    const help = readiness.validation?.helpMessage || "";
    throw new Error(`${msg}${help ? `\n${help}` : ""}`);
  }

  let logger: any;
  try {
    const pino = await import("pino" as any);
    logger = pino.default({ level: "silent" });
  } catch {
    logger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      trace: () => {},
      fatal: () => {},
      child: () => logger,
      level: "silent",
    };
  }

  const result = await executeUpload(synapse, carData, rootCid, {
    logger,
    ipniValidation: { enabled: false },
    metadata: { source: "skillcoin-cli" },
  });

  return {
    rootCid: result.rootCid?.toString() || rootCid.toString(),
    pieceCid: result.pieceCid?.toString() || "",
    dataSetId: Number(result.dataSetId) || 0,
    network: result.network || "calibration",
  };
}

/**
 * Check whether the filecoin-pin library is available and importable.
 */
export async function isFilecoinPinAvailable(): Promise<boolean> {
  try {
    await import("filecoin-pin" as any);
    return true;
  } catch {
    return false;
  }
}
