/**
 * Compatibility re-export — prefer importing from ../blockchain/soroban/
 */
export {
  getEscrowBalance,
  getMilestones,
  buildDepositXdr,
  buildVerifyMilestoneXdr,
  releaseMilestoneFunds,
  submitSignedXdr as submitSignedSorobanXdr,
  submitSignedXdr as verifyMilestoneOnChain,
} from "../blockchain/soroban/index.js";
