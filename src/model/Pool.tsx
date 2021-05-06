import BN from 'bn.js';

export type Amount = string;

export type Address = string;

// TODO: when is it worth it creating a class / dedicated file?
export interface IPool {
  isActive: boolean; // currently "active" pool
  isToBeElected: boolean; // is to be elected.
  isPendingValidator: boolean; // pending validator for the next staking epoch.
  readonly stakingAddress: Address;
  ensName: string;
  miningAddress: Address;
  addedInEpoch: number;
  isCurrentValidator: boolean;
  candidateStake: Amount;
  totalStake: Amount;
  myStake: Amount;
  claimableStake: IClaimableStake;
  delegators: Array<IDelegator>; // TODO: how to cast to Array<IDelegator> ?
  isMe: boolean;
  validatorStakeShare: number; // percent
  validatorRewardShare: number; // percent
  claimableReward: Amount;
  isBanned(): boolean;
  bannedUntil: BN;
  banCount: number;
  blocksAuthored: number;
  parts: string; // if part of the treshhold key, or pending validator, this holds the PARTS
  numberOfAcks: number; // if part of the treshhold key, or pending validator, this holds the number of ACKS

  // availability
  availableSince: BN;
  availableSinceAsText(): string;
  isAvailable(): boolean;
}

export interface IClaimableStake {
  amount: Amount;
  unlockEpoch: number;
  canClaimNow(): boolean;
}

interface IDelegator {
  address: Address;
}
