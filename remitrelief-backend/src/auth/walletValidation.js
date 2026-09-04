import { StrKey } from "@stellar/stellar-sdk";
import { AppError, ErrorCodes } from "../lib/errors.js";

export function assertValidStellarPublicKey(address, fieldName = "walletAddress") {
  if (!address || typeof address !== "string") {
    throw new AppError(ErrorCodes.INVALID_REQUEST, `${fieldName} is required`);
  }
  const trimmed = address.trim();
  if (!trimmed.startsWith("G") || !StrKey.isValidEd25519PublicKey(trimmed)) {
    throw new AppError(ErrorCodes.INVALID_REQUEST, `${fieldName} is not a valid Stellar public key`);
  }
  return trimmed;
}
