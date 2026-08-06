# Deploying the escrow contract (Stellar testnet)

```bash
# 1. Build
cd remitrelief-backend/src/contracts/escrow-contract
rustup target add wasm32-unknown-unknown
stellar contract build

# 2. Deploy (prints the contract's C... address)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow_contract.wasm \
  --source <YOUR_DEPLOYER_SECRET_KEY> \
  --network testnet

# 3. Initialize the deployed instance for one campaign
stellar contract invoke \
  --id <CONTRACT_ADDRESS_FROM_STEP_2> \
  --source <YOUR_DEPLOYER_SECRET_KEY> \
  --network testnet \
  -- initialize \
  --recipient <RECIPIENT_STELLAR_ADDRESS> \
  --usdc_token <USDC_SAC_CONTRACT_ADDRESS_ON_TESTNET> \
  --verifiers '["<NGO_VERIFIER_ADDRESS_1>"]' \
  --milestone_amounts '[500,500,500,500]'
```

Drop the resulting contract address into `campaigns.js` as `escrowAddress`, and
into the backend `.env` as `DEMO_ESCROW_CONTRACT_ID` for local testing.

**Demo shortcut:** deploy once ahead of time, fund it via a couple of test
donations, and have `verify_milestone` + `release` ready to invoke live during
the pitch — this is the "look, it's really on-chain" moment.
