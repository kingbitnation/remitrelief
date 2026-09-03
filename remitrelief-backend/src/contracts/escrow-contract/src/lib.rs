#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Vec,
};

#[derive(Clone)]
#[contracttype]
pub struct Milestone {
    pub amount: i128,
    pub verified: bool,
    pub released: bool,
}

#[contracttype]
pub enum DataKey {
    Initialized,
    Recipient,
    UsdcToken,
    Verifiers,
    Milestones,
    TotalDeposited,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidToken = 3,
    EmptyVerifiers = 4,
    EmptyMilestones = 5,
    InvalidMilestoneAmount = 6,
    InvalidDepositAmount = 7,
    UnauthorizedVerifier = 8,
    BadMilestoneIndex = 9,
    MilestoneAlreadyVerified = 10,
    MilestoneNotVerified = 11,
    MilestoneAlreadyReleased = 12,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// One-time setup. Fails if the contract was already initialized.
    pub fn initialize(
        env: Env,
        recipient: Address,
        usdc_token: Address,
        verifiers: Vec<Address>,
        milestone_amounts: Vec<i128>,
    ) -> Result<(), EscrowError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(EscrowError::AlreadyInitialized);
        }

        if recipient == usdc_token {
            return Err(EscrowError::InvalidToken);
        }
        if verifiers.is_empty() {
            return Err(EscrowError::EmptyVerifiers);
        }
        if milestone_amounts.is_empty() {
            return Err(EscrowError::EmptyMilestones);
        }

        let mut milestones: Vec<Milestone> = Vec::new(&env);
        for amount in milestone_amounts.iter() {
            if amount <= 0 {
                return Err(EscrowError::InvalidMilestoneAmount);
            }
            milestones.push_back(Milestone {
                amount,
                verified: false,
                released: false,
            });
        }

        let verifier_count = verifiers.len();
        let milestone_count = milestones.len();

        env.storage().instance().set(&DataKey::Recipient, &recipient);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::Verifiers, &verifiers);
        env.storage().instance().set(&DataKey::Milestones, &milestones);
        env.storage().instance().set(&DataKey::TotalDeposited, &0i128);
        env.storage().instance().set(&DataKey::Initialized, &true);

        // Topics: ("init", recipient)  Data: (token, verifier_count, milestone_count)
        env.events().publish(
            (symbol_short!("init"), recipient.clone()),
            (usdc_token.clone(), verifier_count, milestone_count),
        );

        Ok(())
    }

    /// Donor deposits USDC into escrow. Amount must be > 0.
    pub fn deposit(env: Env, from: Address, amount: i128) -> Result<(), EscrowError> {
        Self::require_initialized(&env)?;
        from.require_auth();

        if amount <= 0 {
            return Err(EscrowError::InvalidDepositAmount);
        }

        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let client = token::Client::new(&env, &usdc_token);
        client.transfer(&from, &env.current_contract_address(), &amount);

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDeposited)
            .unwrap_or(0);
        let new_total = total + amount;
        env.storage()
            .instance()
            .set(&DataKey::TotalDeposited, &new_total);

        // Topics: ("deposit", from)  Data: (amount, total_deposited)
        env.events()
            .publish((symbol_short!("deposit"), from.clone()), (amount, new_total));

        Ok(())
    }

    /// Authorized verifier confirms a milestone. Cannot re-verify.
    pub fn verify_milestone(env: Env, verifier: Address, index: u32) -> Result<(), EscrowError> {
        Self::require_initialized(&env)?;
        verifier.require_auth();

        let verifiers: Vec<Address> = env.storage().instance().get(&DataKey::Verifiers).unwrap();
        if !verifiers.contains(&verifier) {
            return Err(EscrowError::UnauthorizedVerifier);
        }

        let mut milestones: Vec<Milestone> =
            env.storage().instance().get(&DataKey::Milestones).unwrap();
        let mut m = milestones
            .get(index)
            .ok_or(EscrowError::BadMilestoneIndex)?;
        if m.verified {
            return Err(EscrowError::MilestoneAlreadyVerified);
        }

        m.verified = true;
        let amount = m.amount;
        milestones.set(index, m);
        env.storage()
            .instance()
            .set(&DataKey::Milestones, &milestones);

        // Topics: ("verify", verifier, index)  Data: amount
        env.events()
            .publish((symbol_short!("verify"), verifier.clone(), index), amount);

        Ok(())
    }

    /// Pays out a verified, unreleased milestone tranche to the fixed recipient.
    pub fn release(env: Env, index: u32) -> Result<(), EscrowError> {
        Self::require_initialized(&env)?;

        let mut milestones: Vec<Milestone> =
            env.storage().instance().get(&DataKey::Milestones).unwrap();
        let mut m = milestones
            .get(index)
            .ok_or(EscrowError::BadMilestoneIndex)?;

        if !m.verified {
            return Err(EscrowError::MilestoneNotVerified);
        }
        if m.released {
            return Err(EscrowError::MilestoneAlreadyReleased);
        }

        let recipient: Address = env.storage().instance().get(&DataKey::Recipient).unwrap();
        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let client = token::Client::new(&env, &usdc_token);
        let amount = m.amount;
        client.transfer(&env.current_contract_address(), &recipient, &amount);

        m.released = true;
        milestones.set(index, m);
        env.storage()
            .instance()
            .set(&DataKey::Milestones, &milestones);

        // Topics: ("release", recipient, index)  Data: amount
        env.events()
            .publish((symbol_short!("release"), recipient.clone(), index), amount);

        Ok(())
    }

    pub fn balance(env: Env) -> Result<i128, EscrowError> {
        Self::require_initialized(&env)?;
        let usdc_token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let client = token::Client::new(&env, &usdc_token);
        Ok(client.balance(&env.current_contract_address()))
    }

    pub fn get_milestones(env: Env) -> Result<Vec<Milestone>, EscrowError> {
        Self::require_initialized(&env)?;
        Ok(env.storage().instance().get(&DataKey::Milestones).unwrap())
    }

    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Initialized)
    }

    fn require_initialized(env: &Env) -> Result<(), EscrowError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            Ok(())
        } else {
            Err(EscrowError::NotInitialized)
        }
    }
}

#[cfg(test)]
mod test;
