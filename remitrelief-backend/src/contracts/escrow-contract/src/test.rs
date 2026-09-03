#![cfg(test)]

use crate::{EscrowContract, EscrowContractClient, EscrowError, Milestone};
use soroban_sdk::{token, Address, Env, Vec};
use soroban_sdk::testutils::Address as _;

fn setup_token(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract_v2(admin.clone()).address()
}

fn init_client<'a>(
    env: &'a Env,
    recipient: &Address,
    token: &Address,
    verifier: &Address,
    amounts: &[i128],
) -> EscrowContractClient<'a> {
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(env, &contract_id);

    let mut verifiers = Vec::new(env);
    verifiers.push_back(verifier.clone());

    let mut milestones = Vec::new(env);
    for a in amounts {
        milestones.push_back(*a);
    }

    client.initialize(recipient, token, &verifiers, &milestones);
    client
}

#[test]
fn initialize_succeeds() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = setup_token(&env, &admin);

    let client = init_client(&env, &recipient, &token, &verifier, &[100, 200]);
    assert!(client.is_initialized());
    assert_eq!(client.get_milestones().len(), 2);
}

#[test]
fn initialize_twice_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = setup_token(&env, &admin);

    let client = init_client(&env, &recipient, &token, &verifier, &[100]);
    let mut verifiers = Vec::new(&env);
    verifiers.push_back(verifier.clone());
    let mut milestones = Vec::new(&env);
    milestones.push_back(50i128);

    let result = client.try_initialize(&recipient, &token, &verifiers, &milestones);
    assert_eq!(result, Err(Ok(EscrowError::AlreadyInitialized)));
}

#[test]
fn initialize_rejects_empty_verifiers() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = EscrowContractClient::new(&env, &env.register(EscrowContract, ()));

    let verifiers = Vec::new(&env);
    let mut milestones = Vec::new(&env);
    milestones.push_back(100i128);

    let result = client.try_initialize(&recipient, &token, &verifiers, &milestones);
    assert_eq!(result, Err(Ok(EscrowError::EmptyVerifiers)));
}

#[test]
fn initialize_rejects_zero_milestone() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = EscrowContractClient::new(&env, &env.register(EscrowContract, ()));

    let mut verifiers = Vec::new(&env);
    verifiers.push_back(verifier);
    let mut milestones = Vec::new(&env);
    milestones.push_back(0i128);

    let result = client.try_initialize(&recipient, &token, &verifiers, &milestones);
    assert_eq!(result, Err(Ok(EscrowError::InvalidMilestoneAmount)));
}

#[test]
fn initialize_rejects_token_equals_recipient() {
    let env = Env::default();
    env.mock_all_auths();
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let client = EscrowContractClient::new(&env, &env.register(EscrowContract, ()));

    let mut verifiers = Vec::new(&env);
    verifiers.push_back(verifier);
    let mut milestones = Vec::new(&env);
    milestones.push_back(100i128);

    let result = client.try_initialize(&recipient, &recipient, &verifiers, &milestones);
    assert_eq!(result, Err(Ok(EscrowError::InvalidToken)));
}

#[test]
fn deposit_updates_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let donor = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[1_000]);

    let token_client = token::Client::new(&env, &token);
    token::StellarAssetClient::new(&env, &token).mint(&donor, &5_000);

    client.deposit(&donor, &1_500);
    assert_eq!(client.balance(), 1_500);
    assert_eq!(token_client.balance(&donor), 3_500);
}

#[test]
fn deposit_zero_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let donor = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[1_000]);

    let result = client.try_deposit(&donor, &0);
    assert_eq!(result, Err(Ok(EscrowError::InvalidDepositAmount)));
}

#[test]
fn verify_authorized_succeeds() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[100, 200]);

    client.verify_milestone(&verifier, &0);
    let m: Milestone = client.get_milestones().get(0).unwrap();
    assert!(m.verified);
    assert!(!m.released);
}

#[test]
fn verify_unauthorized_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let stranger = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[100]);

    let result = client.try_verify_milestone(&stranger, &0);
    assert_eq!(result, Err(Ok(EscrowError::UnauthorizedVerifier)));
}

#[test]
fn verify_bad_index_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[100]);

    let result = client.try_verify_milestone(&verifier, &9);
    assert_eq!(result, Err(Ok(EscrowError::BadMilestoneIndex)));
}

#[test]
fn verify_twice_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[100]);

    client.verify_milestone(&verifier, &0);
    let result = client.try_verify_milestone(&verifier, &0);
    assert_eq!(result, Err(Ok(EscrowError::MilestoneAlreadyVerified)));
}

#[test]
fn release_verified_pays_recipient() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let donor = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[1_000, 2_000]);

    let token_client = token::Client::new(&env, &token);
    token::StellarAssetClient::new(&env, &token).mint(&donor, &10_000);
    client.deposit(&donor, &5_000);

    client.verify_milestone(&verifier, &0);
    client.release(&0);

    assert_eq!(token_client.balance(&recipient), 1_000);
    assert_eq!(client.balance(), 4_000);
    let m: Milestone = client.get_milestones().get(0).unwrap();
    assert!(m.released);
}

#[test]
fn release_unverified_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let donor = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[1_000]);

    token::StellarAssetClient::new(&env, &token).mint(&donor, &5_000);
    client.deposit(&donor, &2_000);

    let result = client.try_release(&0);
    assert_eq!(result, Err(Ok(EscrowError::MilestoneNotVerified)));
}

#[test]
fn release_twice_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let donor = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[1_000]);

    token::StellarAssetClient::new(&env, &token).mint(&donor, &5_000);
    client.deposit(&donor, &2_000);
    client.verify_milestone(&verifier, &0);
    client.release(&0);

    let result = client.try_release(&0);
    assert_eq!(result, Err(Ok(EscrowError::MilestoneAlreadyReleased)));
}

#[test]
fn release_insufficient_balance_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = setup_token(&env, &admin);
    let client = init_client(&env, &recipient, &token, &verifier, &[5_000]);

    client.verify_milestone(&verifier, &0);
    let result = client.try_release(&0);
    assert!(result.is_err());
}
