#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec, token};

#[derive(Clone)]
#[contracttype]
pub struct Milestone {
    pub amount: i128,
    pub verified: bool,
    pub released: bool,
}

#[contracttype]
pub enum DataKey {
    Recipient,
    UsdcToken,
    Verifiers,
    Milestones,
    TotalDeposited,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// One-time setup when the campaign contract is deployed.
    pub fn initialize(
        env: Env,
        recipient: Address,
        usdc_token: Address,
        verifiers: Vec<Address>,
        milestone_amounts: Vec<i128>,
    ) {
        let mut milestones: Vec<Milestone> = Vec::new(&env);
        for amount in milestone_amounts.iter() {
            milestones.push_back(Milestone { amount, verified: false, released: false });
        }

        env.storage().instance().set(&DataKey::Recipient, &recipient);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::Verifiers, &verifiers);
        env.storage().instance().set(&DataKey::Milestones, &milestones);
        env.storage().instance().set(&DataKey::TotalDeposited, &0i128);
    }

    /// Donor deposits USDC into escrow. Called after the donor's Path Payment
    /// or direct transfer has approved this contract to pull funds.
    pub fn deposit(env: Env, from: Address, amount: i128) {
        from.require_auth();

        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let client = token::Client::new(&env, &usdc_token);
        client.transfer(&from, &env.current_contract_address(), &amount);

        let total: i128 = env.storage().instance().get(&DataKey::TotalDeposited).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalDeposited, &(total + amount));
    }

    /// A relief-partner NGO confirms a milestone was met on the ground.
    pub fn verify_milestone(env: Env, verifier: Address, index: u32) {
        verifier.require_auth();

        let verifiers: Vec<Address> = env.storage().instance().get(&DataKey::Verifiers).unwrap();
        if !verifiers.contains(&verifier) {
            panic!("not an authorized verifier");
        }

        let mut milestones: Vec<Milestone> =
            env.storage().instance().get(&DataKey::Milestones).unwrap();
        let mut m = milestones.get(index).expect("bad milestone index");
        m.verified = true;
        milestones.set(index, m);
        env.storage().instance().set(&DataKey::Milestones, &milestones);
    }

    /// Pays out a verified milestone's tranche to the recipient. Callable by
    /// anyone once verified — funds only move to the pre-set recipient.
    pub fn release(env: Env, index: u32) {
        let mut milestones: Vec<Milestone> =
            env.storage().instance().get(&DataKey::Milestones).unwrap();
        let mut m = milestones.get(index).expect("bad milestone index");

        if !m.verified {
            panic!("milestone not verified");
        }
        if m.released {
            panic!("milestone already released");
        }

        let recipient: Address = env.storage().instance().get(&DataKey::Recipient).unwrap();
        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let client = token::Client::new(&env, &usdc_token);
        client.transfer(&env.current_contract_address(), &recipient, &m.amount);

        m.released = true;
        milestones.set(index, m);
        env.storage().instance().set(&DataKey::Milestones, &milestones);
    }

    /// Read-only: current USDC balance held in escrow.
    pub fn balance(env: Env) -> i128 {
        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let client = token::Client::new(&env, &usdc_token);
        client.balance(&env.current_contract_address())
    }

    /// Read-only: milestone status list, for the frontend progress UI.
    pub fn get_milestones(env: Env) -> Vec<Milestone> {
        env.storage().instance().get(&DataKey::Milestones).unwrap()
    }
}
