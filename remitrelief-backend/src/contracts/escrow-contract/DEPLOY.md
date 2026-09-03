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

# 3. Initialize once (re-initialize is rejected by the contract)
stellar contract invoke \
  --id <CONTRACT_ADDRESS_FROM_STEP_2> \
  --source <YOUR_DEPLOYER_SECRET_KEY> \
  --network testnet \
  -- initialize \
  --recipient <RECIPIENT_STELLAR_ADDRESS> \
  --usdc_token <USDC_SAC_CONTRACT_ADDRESS_ON_TESTNET> \
  --verifiers '["<NGO_VERIFIER_ADDRESS_1>"]' \
  --milestone_amounts '[5000000000,5000000000,5000000000,5000000000]'
```

Put the contract address in backend `.env` as `DEMO_ESCROW_CONTRACT_ID` (wired to the Oaxaca seed campaign via `store.js`).

**Security notes**

- `initialize` can only succeed once per contract instance.
- Deposits require `amount > 0`.
- Only allowlisted verifiers can call `verify_milestone`.
- `release` pays only the fixed recipient and cannot double-release a milestone.

```bash
cargo test --manifest-path src/contracts/escrow-contract/Cargo.toml
```
